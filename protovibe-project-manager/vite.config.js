import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { spawn, execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)
const treeKill = require_('tree-kill')
const archiver = require_('archiver')
const unzipper = require_('unzipper')
const ignoreFactory = require_('ignore')

const ROOT = path.resolve(import.meta.dirname)
const REPO_ROOT = path.resolve(ROOT, '..')
const PROJECTS_DIR = path.join(REPO_ROOT, 'projects')
const PROJECTS_JSON = path.join(PROJECTS_DIR, 'projects.json')
const TEMPLATE_DIR = path.join(REPO_ROOT, 'protovibe-project-template')
const PLUGIN_REL_DIR = path.join('plugins', 'protovibe')
const SOURCE_PLUGIN_DIR = path.join(TEMPLATE_DIR, PLUGIN_REL_DIR)
const REMOTE_REPO = 'Protovibe-Studio/protovibe-studio'
const REMOTE_BRANCH = 'main'
// Plugin sync exclusions: huge / generated / lockfile artefacts stay
// project-local instead of being overwritten by the template.
const PLUGIN_EXCLUDE = new Set(['node_modules', 'dist'])
const NAME_RE = /^[a-zA-Z0-9_-]+$/
const PORT_RE = /Local:\s+http:\/\/localhost:(\d+)/

// In-memory process registry — lives for the duration of the dev server
const processes = new Map() // id → { proc, logs: [], port: null, status }

// ── Helpers ──────────────────────────────────────────────────────────────────

function readProjects() {
  try {
    const list = JSON.parse(fs.readFileSync(PROJECTS_JSON, 'utf-8'))
    // Stored paths are relative to PROJECTS_DIR. Resolve them to absolute for
    // internal use. Absolute paths are also accepted for backward compatibility.
    return list.map((p) => ({
      ...p,
      path: path.isAbsolute(p.path)
        ? p.path
        : path.resolve(PROJECTS_DIR, p.path),
    }))
  } catch {
    return []
  }
}

function writeProjects(list) {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true })
  // Always persist paths as relative to PROJECTS_DIR so the file is portable
  // across machines regardless of where the repo is cloned.
  const stripped = list.map(({ id, path: absPath, createdAt }) => ({
    id,
    path: path.relative(PROJECTS_DIR, absPath),
    createdAt,
  }))
  fs.writeFileSync(PROJECTS_JSON, JSON.stringify(stripped, null, 2), 'utf-8')
}

function ensureProjectsDir() {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true })
}

// Pick up protovibe projects that appeared on disk without going through the
// in-app create/import flow — e.g. a user cloned their repo straight into
// projects/. A direct subdirectory counts as a project when it contains a
// protovibe-data.json marker; that keeps stray folders out of the registry.
function scanProjectsFolder() {
  ensureProjectsDir()
  const projects = readProjects()
  const known = new Set(projects.map((p) => p.path))

  let entries
  try {
    entries = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
  } catch {
    return projects
  }

  let changed = false
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue
    const abs = path.join(PROJECTS_DIR, entry.name)
    if (known.has(abs)) continue
    if (!fs.existsSync(path.join(abs, 'protovibe-data.json'))) continue

    let createdAt
    try { createdAt = fs.statSync(abs).birthtime.toISOString() } catch {
      createdAt = new Date().toISOString()
    }
    projects.push({ id: generateId(), path: abs, createdAt })
    changed = true
  }

  if (changed) writeProjects(projects)
  return projects
}

function safePath(name) {
  const resolved = path.resolve(PROJECTS_DIR, name)
  const separator = path.sep
  if (!resolved.startsWith(PROJECTS_DIR + separator) && resolved !== PROJECTS_DIR) {
    return null
  }
  return resolved
}

function copyDir(src, dest) {
  fs.cpSync(src, dest, {
    recursive: true,
    filter: (srcPath) => {
      const rel = path.relative(src, srcPath)
      const segments = rel.split(path.sep)
      return (
        !segments.includes('node_modules') &&
        !segments.includes('dist') &&
        !segments.includes('.git')
      )
    },
  })
}

function readProtovibeData(projectPath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(projectPath, 'protovibe-data.json'), 'utf-8'))
  } catch {
    return null
  }
}

function readProjectName(projectPath) {
  const data = readProtovibeData(projectPath)
  const name = data?.['project-name']
  if (typeof name === 'string' && name.trim()) return name.trim()
  return path.basename(projectPath)
}

function writeProtovibeData(projectPath, name, { resetCloudflare = false } = {}) {
  const existing = readProtovibeData(projectPath) ?? {}
  const data = {
    ...existing,
    'project-name': name,
    'cloudflare-wrangler-project-name': resetCloudflare ? name : (existing['cloudflare-wrangler-project-name'] ?? name),
    'cloudflare-pages-url': resetCloudflare ? '' : (existing['cloudflare-pages-url'] ?? ''),
    'cloudflare-deploy-history': resetCloudflare ? [] : (existing['cloudflare-deploy-history'] ?? []),
  }
  fs.writeFileSync(path.join(projectPath, 'protovibe-data.json'), JSON.stringify(data, null, 2), 'utf-8')
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

// ── Plugin sync helpers ─────────────────────────────────────────────────────
// Replaces the former protovibe-project-template/scripts/sync-plugin.js,
// targeted at a single project instead of every project at once.

function readSourcePluginVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(SOURCE_PLUGIN_DIR, 'package.json'), 'utf-8'))
    return typeof pkg?.version === 'string' ? pkg.version : null
  } catch {
    return null
  }
}

function isPluginExcluded(entry) {
  if (PLUGIN_EXCLUDE.has(entry.name)) return true
  if (!entry.isDirectory() && entry.name.endsWith('.lock')) return true
  return false
}

// Remove anything under `dest` that no longer exists under `src`. Skips
// excluded entries (node_modules / dist / *.lock) so the project keeps its
// local install + lockfile.
function cleanPluginDir(src, dest) {
  if (!fs.existsSync(dest)) return
  for (const entry of fs.readdirSync(dest, { withFileTypes: true })) {
    if (isPluginExcluded(entry)) continue
    const destPath = path.join(dest, entry.name)
    const srcPath = path.join(src, entry.name)
    if (entry.isDirectory()) {
      if (!fs.existsSync(srcPath)) {
        fs.rmSync(destPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 })
      } else {
        cleanPluginDir(srcPath, destPath)
      }
    } else if (!fs.existsSync(srcPath)) {
      fs.unlinkSync(destPath)
    }
  }
}

// Copy `src` into `dest`, respecting the exclusion set. Creates `dest` if it
// is missing — useful for projects that never had plugins/protovibe before.
function copyPluginDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (isPluginExcluded(entry)) continue
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyPluginDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

// Wait for the project's running process to exit. Caller decides which signal
// to send first; we escalate to SIGKILL if it's still alive after the grace
// period so we never block plugin updates on a stuck dev server.
function stopProjectProcess(id, { timeoutMs = 4000 } = {}) {
  const state = processes.get(id)
  if (!state?.proc?.pid || state.status === 'stopped') return Promise.resolve(false)

  return new Promise((resolve) => {
    let settled = false
    const finish = (killed) => {
      if (settled) return
      settled = true
      state.status = 'stopped'
      state.port = null
      resolve(killed)
    }

    const onExit = () => finish(true)
    state.proc.once('exit', onExit)

    treeKill(state.proc.pid, 'SIGTERM', () => {})

    const escalate = setTimeout(() => {
      if (!settled && state.proc?.pid) {
        treeKill(state.proc.pid, 'SIGKILL', () => {})
      }
    }, Math.max(500, timeoutMs - 1000))

    setTimeout(() => {
      clearTimeout(escalate)
      // Even if the process never reported exit, give up so we can proceed.
      // Files held open after SIGKILL are extremely unusual on macOS/Linux.
      finish(true)
    }, timeoutMs)
  })
}

function readPluginInfo(projectPath) {
  const data = readProtovibeData(projectPath)
  return {
    pluginVersion: data?.['plugin-version'] ?? null,
    pluginLastUpdated: data?.['plugin-last-updated'] ?? null,
  }
}

function writePluginMetadata(projectPath, version) {
  const dataPath = path.join(projectPath, 'protovibe-data.json')
  let data = {}
  if (fs.existsSync(dataPath)) {
    try { data = JSON.parse(fs.readFileSync(dataPath, 'utf-8')) } catch { /* overwrite */ }
  }
  if (version) data['plugin-version'] = version
  const today = new Date().toISOString().split('T')[0]
  data['plugin-last-updated'] = today
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
  return { pluginVersion: version ?? data['plugin-version'] ?? null, pluginLastUpdated: today }
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
  })
  res.end(body)
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => { data += chunk.toString() })
    req.on('end', () => {
      try { resolve(JSON.parse(data) || {}) } catch { resolve({}) }
    })
    req.on('error', reject)
  })
}

// ── Route handlers ────────────────────────────────────────────────────────────

function handleGetProjects(_req, res) {
  const stored = scanProjectsFolder()
  const list = stored.map((p) => {
    const proc = processes.get(p.id)
    let updatedAt = null
    try { updatedAt = fs.statSync(p.path).mtime.toISOString() } catch {}
    const { pluginVersion, pluginLastUpdated } = readPluginInfo(p.path)
    return {
      id: p.id,
      path: p.path,
      createdAt: p.createdAt,
      name: readProjectName(p.path),
      updatedAt,
      status: proc?.status ?? 'stopped',
      port: proc?.port ?? null,
      pluginVersion,
      pluginLastUpdated,
    }
  })
  sendJson(res, 200, list)
}

async function handleCreateProject(req, res) {
  const body = await parseBody(req)
  const name = (body.name || '').trim()

  if (!NAME_RE.test(name)) {
    return sendJson(res, 400, { error: 'Invalid name. Use only letters, numbers, hyphens, and underscores.' })
  }

  const projects = readProjects()
  const destPath = safePath(name)
  if (!destPath) return sendJson(res, 400, { error: 'Invalid name.' })

  if (fs.existsSync(destPath) || projects.some((p) => p.path === destPath)) {
    return sendJson(res, 409, { error: 'A project folder with that name already exists.' })
  }

  ensureProjectsDir()

  if (!fs.existsSync(TEMPLATE_DIR)) {
    return sendJson(res, 500, { error: 'Template directory not found.' })
  }

  try {
    copyDir(TEMPLATE_DIR, destPath)
  } catch (err) {
    return sendJson(res, 500, { error: `Failed to copy template: ${err.message}` })
  }

  try {
    writeProtovibeData(destPath, name, { resetCloudflare: true })
    // Stamp the plugin version/date so the project page can show it from day
    // one without a separate "Update plugin" round-trip.
    try { writePluginMetadata(destPath, readSourcePluginVersion()) } catch {}
  } catch (err) {
    return sendJson(res, 500, { error: `Failed to write protovibe-data.json: ${err.message}` })
  }

  const entry = {
    id: generateId(),
    path: destPath,
    createdAt: new Date().toISOString(),
  }

  projects.push(entry)
  writeProjects(projects)
  sendJson(res, 201, { ...entry, name })
}

async function handleDuplicate(_req, res, id) {
  const projects = readProjects()
  const original = projects.find((p) => p.id === id)
  if (!original) return sendJson(res, 404, { error: 'Project not found.' })

  if (!fs.existsSync(original.path)) {
    return sendJson(res, 404, { error: 'Project folder not found on disk.' })
  }

  const originalFolder = path.basename(original.path)
  let newName = `${originalFolder}-copy`
  let counter = 2
  let destPath = safePath(newName)
  while (destPath && fs.existsSync(destPath)) {
    newName = `${originalFolder}-copy-${counter++}`
    destPath = safePath(newName)
  }
  if (!destPath) return sendJson(res, 400, { error: 'Invalid name.' })

  try {
    copyDir(original.path, destPath)
  } catch (err) {
    return sendJson(res, 500, { error: `Failed to duplicate: ${err.message}` })
  }

  try {
    writeProtovibeData(destPath, newName, { resetCloudflare: true })
  } catch (err) {
    return sendJson(res, 500, { error: `Failed to write protovibe-data.json: ${err.message}` })
  }

  const entry = {
    id: generateId(),
    path: destPath,
    createdAt: new Date().toISOString(),
  }

  projects.push(entry)
  writeProjects(projects)
  sendJson(res, 201, { ...entry, name: newName })
}

async function handleRename(req, res, id) {
  const body = await parseBody(req)
  const name = (body.name || '').trim()
  if (!name) return sendJson(res, 400, { error: 'Name is required.' })

  const projects = readProjects()
  const project = projects.find((p) => p.id === id)
  if (!project) return sendJson(res, 404, { error: 'Project not found.' })
  if (!fs.existsSync(project.path)) return sendJson(res, 404, { error: 'Project folder not found on disk.' })

  try {
    writeProtovibeData(project.path, name)
  } catch (err) {
    return sendJson(res, 500, { error: `Failed to write protovibe-data.json: ${err.message}` })
  }
  sendJson(res, 200, { ok: true, name })
}

async function handleDeleteProject(_req, res, id) {
  const projects = readProjects()
  const project = projects.find((p) => p.id === id)
  if (!project) return sendJson(res, 404, { error: 'Project not found.' })

  // 1. Kill running process aggressively to drop locks
  const proc = processes.get(id)
  if (proc?.proc?.pid) {
    // Changed from SIGTERM to SIGKILL
    await new Promise((resolve) => treeKill(proc.proc.pid, 'SIGKILL', resolve))
    processes.delete(id)
  }

  // Delete folder
  if (fs.existsSync(project.path)) {
    if (process.platform !== 'win32') {
      try {
        execFileSync('chmod', ['-R', 'u+rwx', project.path])
      } catch {}
    }
    try {
      // 2. Use Node's built-in retry logic for file lock race conditions
      fs.rmSync(project.path, { 
        recursive: true, 
        force: true,
        maxRetries: 5,     // Try 5 times before giving up
        retryDelay: 300    // Wait 300ms between attempts
      })
    } catch (err) {
      let stuckFiles = []
      try {
        stuckFiles = fs.readdirSync(project.path)
      } catch (readErr) {
        stuckFiles = ['(Could not read remaining contents)']
      }

      const advice =
        process.platform === 'win32'
          ? 'Close VS Code, File Explorer, and any terminal open in this folder, then try again.'
          : 'Close VS Code, Finder windows, and any terminal open in this folder, then try again.'

      console.error(`[protovibe-home] Delete failed. Stuck items:`, stuckFiles)

      return sendJson(res, 500, {
        error: `Couldn't fully delete the project. ${advice} (Stuck items: ${stuckFiles.join(', ')})`,
      })
    }
  }

  writeProjects(projects.filter((p) => p.id !== id))
  sendJson(res, 200, { ok: true })
}

function handleStart(_req, res, id) {
  const projects = readProjects()
  const project = projects.find((p) => p.id === id)
  if (!project) return sendJson(res, 404, { error: 'Project not found.' })

  if (updatingPlugins.has(id)) {
    return sendJson(res, 409, { error: 'Plugin update is in progress.' })
  }

  const existing = processes.get(id)
  if (existing?.status === 'running' || existing?.status === 'starting') {
    return sendJson(res, 409, { error: 'Project is already running.' })
  }
  if (existing?.status === 'updating-plugin') {
    return sendJson(res, 409, { error: 'Plugin update is in progress.' })
  }

  const proc = spawn('pnpm', ['run', 'dev'], {
    cwd: project.path,
    stdio: 'pipe',
    shell: true,
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
  })

  const state = { proc, logs: existing?.logs ?? [], port: null, status: 'starting' }
  state.logs.push(`--- starting pnpm run dev ---`)
  processes.set(id, state)

  const onData = (chunk) => {
    const text = chunk.toString()
    text.split('\n').forEach((line) => {
      if (line.trim()) state.logs.push(line)
    })
    const match = text.match(PORT_RE)
    if (match) {
      state.port = parseInt(match[1], 10)
      state.status = 'running'
    }
  }

  proc.stdout.on('data', onData)
  proc.stderr.on('data', onData)

  proc.on('exit', (code) => {
    state.status = 'stopped'
    state.port = null
    state.logs.push(`--- process exited with code ${code} ---`)
  })

  proc.on('error', (err) => {
    state.status = 'stopped'
    state.logs.push(`--- process error: ${err.message} ---`)
  })

  sendJson(res, 200, { ok: true })
}

function handleShowFolder(_req, res, id) {
  const projects = readProjects()
  const project = projects.find((p) => p.id === id)
  if (!project) return sendJson(res, 404, { error: 'Project not found.' })
  if (!fs.existsSync(project.path)) return sendJson(res, 404, { error: 'Project folder not found on disk.' })

  const platform = process.platform
  let cmd, args
  if (platform === 'darwin') {
    cmd = 'open'; args = [project.path]
  } else if (platform === 'win32') {
    cmd = 'explorer'; args = [project.path]
  } else {
    cmd = 'xdg-open'; args = [project.path]
  }

  spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref()
  sendJson(res, 200, { ok: true })
}

function handleOpenVSCode(_req, res, id) {
  const projects = readProjects()
  const project = projects.find((p) => p.id === id)
  if (!project) return sendJson(res, 404, { error: 'Project not found.' })
  if (!fs.existsSync(project.path)) return sendJson(res, 404, { error: 'Project folder not found on disk.' })

  const uri = `vscode://file/${project.path}/`
  let cmd, args
  if (process.platform === 'darwin') {
    cmd = 'open'; args = [uri]
  } else if (process.platform === 'win32') {
    cmd = 'cmd'; args = ['/c', 'start', '', uri]
  } else {
    cmd = 'xdg-open'; args = [uri]
  }

  spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref()
  sendJson(res, 200, { ok: true })
}

function handleStop(_req, res, id) {
  const proc = processes.get(id)
  if (!proc?.proc?.pid) {
    return sendJson(res, 404, { error: 'Process not found or already stopped.' })
  }
  treeKill(proc.proc.pid, 'SIGTERM', (err) => {
    if (err) console.error('[protovibe-home] tree-kill error:', err)
  })
  proc.status = 'stopped'
  proc.port = null
  proc.logs.push('--- stopped by user ---')
  sendJson(res, 200, { ok: true })
}

// Tracks which projects currently have an in-flight plugin update so two
// concurrent button clicks don't race on the same files.
const updatingPlugins = new Set()

async function handleUpdatePlugin(_req, res, id) {
  const projects = readProjects()
  const project = projects.find((p) => p.id === id)
  if (!project) return sendJson(res, 404, { error: 'Project not found.' })
  if (!fs.existsSync(project.path)) {
    return sendJson(res, 404, { error: 'Project folder not found on disk.' })
  }

  if (updatingPlugins.has(id)) {
    return sendJson(res, 409, { error: 'Plugin update already in progress.' })
  }

  if (!fs.existsSync(SOURCE_PLUGIN_DIR)) {
    return sendJson(res, 500, { error: `Source plugin not found at ${SOURCE_PLUGIN_DIR}` })
  }

  const existing = processes.get(id)
  if (existing?.status === 'installing' || existing?.status === 'starting') {
    return sendJson(res, 409, { error: 'Wait for setup to finish before updating the plugin.' })
  }

  // Stop the dev server before swapping plugin files — Vite holds open file
  // handles on plugins/protovibe/dist and would otherwise serve stale modules.
  if (existing?.proc?.pid && existing.status === 'running') {
    const pid = existing.proc.pid
    existing.logs.push('--- stopping project before plugin update ---')
    try {
      await new Promise((resolve) => {
        let settled = false
        const finish = () => { if (!settled) { settled = true; resolve() } }
        existing.proc.once('exit', finish)
        treeKill(pid, 'SIGTERM', (err) => {
          if (err) console.error('[protovibe-home] tree-kill error:', err)
        })
        // Safety net: if 'exit' never fires (already-dead proc), unblock after 5s.
        setTimeout(finish, 5000)
      })
    } catch (err) {
      console.error('[protovibe-home] stop-before-update error:', err)
    }
    existing.status = 'stopped'
    existing.port = null
  }

  updatingPlugins.add(id)

  // Reuse / create a state slot so the existing /api/projects/:id/logs SSE
  // streams build output to the UI.
  let state = processes.get(id)
  if (!state) {
    state = { proc: null, logs: [], port: null, status: 'stopped' }
    processes.set(id, state)
  }

  try {
    state.logs.push('--- updating protovibe plugin ---')

    const targetPluginDir = path.join(project.path, PLUGIN_REL_DIR)

    // 2) Sync source → target. cleanPluginDir removes files that no longer
    //    exist in the source (renames, deletions) before copyPluginDir writes
    //    the fresh tree. Both helpers preserve node_modules / dist / *.lock.
    try {
      cleanPluginDir(SOURCE_PLUGIN_DIR, targetPluginDir)
      copyPluginDir(SOURCE_PLUGIN_DIR, targetPluginDir)
    } catch (err) {
      state.status = 'stopped'
      state.proc = null
      state.logs.push(`--- copy failed: ${err.message} ---`)
      return sendJson(res, 500, { error: `Failed to copy plugin files: ${err.message}` })
    }

    // 3) pnpm install + rebuild dist inside plugins/protovibe. The project's
    //    own postinstall does this for whole-project installs, but a targeted
    //    plugin update has to repeat the steps so the runtime sees fresh dist.
    const runStep = (label, command) => new Promise((resolve, reject) => {
      state.logs.push(`--- ${label} ---`)
      const proc = spawn(command, {
        cwd: targetPluginDir,
        stdio: 'pipe',
        shell: true,
        env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
      })
      const onData = (chunk) => {
        chunk.toString().split('\n').forEach((line) => {
          if (line.trim()) state.logs.push(line)
        })
      }
      proc.stdout.on('data', onData)
      proc.stderr.on('data', onData)
      proc.on('exit', (code) => {
        state.logs.push(`--- ${label} exited with code ${code} ---`)
        if (code === 0) resolve()
        else reject(new Error(`${label} failed (exit code ${code})`))
      })
      proc.on('error', reject)
    })

    try {
      await runStep('pnpm install (plugins/protovibe)', 'pnpm install')
      // Force a clean rebuild so stale dist artefacts can never shadow the
      // freshly copied source — same recipe as the project's postinstall.
      try { fs.rmSync(path.join(targetPluginDir, 'dist'), { recursive: true, force: true }) } catch {}
      await runStep('pnpm run build (plugins/protovibe)', 'pnpm run build')
    } catch (err) {
      state.logs.push(`--- update failed: ${err.message} ---`)
      return sendJson(res, 500, { error: err.message || 'Plugin install/build failed.' })
    }

    // 4) Stamp plugin-version + plugin-last-updated in protovibe-data.json.
    let info
    try {
      info = writePluginMetadata(project.path, readSourcePluginVersion())
    } catch (err) {
      return sendJson(res, 500, { error: `Failed to write protovibe-data.json: ${err.message}` })
    }

    state.logs.push('--- protovibe plugin updated successfully ---')

    sendJson(res, 200, {
      ok: true,
      pluginVersion: info.pluginVersion,
      pluginLastUpdated: info.pluginLastUpdated,
    })
  } catch (err) {
    console.error('[protovibe-home] update-plugin error:', err)
    if (!res.headersSent) sendJson(res, 500, { error: err.message || 'Failed to update plugin.' })
  } finally {
    updatingPlugins.delete(id)
  }
}

function handleInstall(_req, res, id) {
  const projects = readProjects()
  const project = projects.find((p) => p.id === id)
  if (!project) return sendJson(res, 404, { error: 'Project not found.' })

  if (updatingPlugins.has(id)) {
    return sendJson(res, 409, { error: 'Plugin update is in progress.' })
  }

  const existing = processes.get(id)
  if (existing?.status === 'running' || existing?.status === 'starting') {
    return sendJson(res, 409, { error: 'Stop the project before installing.' })
  }
  if (existing?.status === 'installing' || existing?.status === 'updating-plugin') {
    return sendJson(res, 409, { error: 'Another operation is already in progress.' })
  }

  const proc = spawn('pnpm', ['install'], {
    cwd: project.path,
    stdio: 'pipe',
    shell: true,
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
  })

  const state = { proc, logs: existing?.logs ?? [], port: null, status: 'installing' }
  state.logs.push('--- starting pnpm install ---')
  processes.set(id, state)

  const onData = (chunk) => {
    chunk.toString().split('\n').forEach((line) => {
      if (line.trim()) state.logs.push(line)
    })
  }

  proc.stdout.on('data', onData)
  proc.stderr.on('data', onData)

  proc.on('exit', (code) => {
    state.status = 'stopped'
    state.logs.push(`--- pnpm install exited with code ${code} ---`)
  })

  proc.on('error', (err) => {
    state.status = 'stopped'
    state.logs.push(`--- install error: ${err.message} ---`)
  })

  sendJson(res, 200, { ok: true })
}

function handleLogs(req, res, id) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
  })
  res.write(':\n\n') // SSE keep-alive comment

  const state = processes.get(id)

  // Flush buffered logs first
  if (state) {
    for (const line of state.logs) {
      res.write(`data: ${line}\n\n`)
    }
  }

  let lastIndex = state?.logs.length ?? 0

  const interval = setInterval(() => {
    const current = processes.get(id)
    if (!current) return
    const newLines = current.logs.slice(lastIndex)
    for (const line of newLines) {
      res.write(`data: ${line}\n\n`)
    }
    lastIndex = current.logs.length
  }, 100)

  req.on('close', () => {
    clearInterval(interval)
  })
}

function handleSetup(req, res, id) {
  const projects = readProjects()
  const project = projects.find((p) => p.id === id)
  if (!project) return sendJson(res, 404, { error: 'Project not found.' })

  if (updatingPlugins.has(id)) {
    return sendJson(res, 409, { error: 'Plugin update is in progress.' })
  }

  const existing = processes.get(id)

  const SSE_HEADERS = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
  }

  // Already running — immediately report ready
  if (existing?.status === 'running' && existing.port) {
    res.writeHead(200, SSE_HEADERS)
    res.write(`event: ready\ndata: ${JSON.stringify({ port: existing.port })}\n\n`)
    return res.end()
  }

  if (existing?.status === 'updating-plugin') {
    return sendJson(res, 409, { error: 'Plugin update is in progress.' })
  }

  // Setup already in progress — attach to it instead of spawning again
  if (existing?.status === 'installing' || existing?.status === 'starting') {
    res.writeHead(200, SSE_HEADERS)
    res.write(':\n\n')

    let aborted = false
    req.on('close', () => { aborted = true })

    // Replay buffered logs
    let lastKnownStage = existing.status
    try { res.write(`event: stage\ndata: ${JSON.stringify({ stage: lastKnownStage })}\n\n`) } catch {}
    for (const line of existing.logs) {
      try { res.write(`event: log\ndata: ${JSON.stringify({ text: line })}\n\n`) } catch {}
    }

    let lastIndex = existing.logs.length

    const interval = setInterval(() => {
      if (aborted) { clearInterval(interval); return }
      const state = processes.get(id)
      if (!state) { clearInterval(interval); return }

      const newLines = state.logs.slice(lastIndex)
      for (const line of newLines) {
        try { res.write(`event: log\ndata: ${JSON.stringify({ text: line })}\n\n`) } catch {}
      }
      lastIndex = state.logs.length

      if (state.status !== lastKnownStage && (state.status === 'starting' || state.status === 'running')) {
        lastKnownStage = state.status
        try { res.write(`event: stage\ndata: ${JSON.stringify({ stage: state.status })}\n\n`) } catch {}
      }
      if (state.status === 'running' && state.port) {
        clearInterval(interval)
        try { res.write(`event: ready\ndata: ${JSON.stringify({ port: state.port })}\n\n`) } catch {}
        try { res.end() } catch {}
      } else if (state.status === 'stopped') {
        clearInterval(interval)
        try { res.write(`event: fail\ndata: ${JSON.stringify({ message: 'Process stopped unexpectedly' })}\n\n`) } catch {}
        try { res.end() } catch {}
      }
    }, 100)

    return
  }

  res.writeHead(200, SSE_HEADERS)
  res.write(':\n\n')

  let aborted = false
  req.on('close', () => { aborted = true })

  function send(event, data) {
    if (!aborted) {
      try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`) } catch {}
    }
  }

  function end() {
    if (!aborted) { try { res.end() } catch {} }
  }

  // Phase 1: pnpm install
  send('stage', { stage: 'installing' })

  const install = spawn('pnpm', ['install'], {
    cwd: project.path,
    stdio: 'pipe',
    shell: true,
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
  })

  const state = { proc: install, logs: [], port: null, status: 'installing' }
  state.logs.push('--- starting pnpm install ---')
  processes.set(id, state)

  const pipeOutput = (chunk) => {
    chunk.toString().split('\n').forEach((line) => {
      if (line.trim()) {
        state.logs.push(line)
        send('log', { text: line })
      }
    })
  }

  install.stdout.on('data', pipeOutput)
  install.stderr.on('data', pipeOutput)

  install.on('error', (err) => {
    state.status = 'stopped'
    state.logs.push(`--- install error: ${err.message} ---`)
    send('fail', { message: err.message })
    end()
  })

  install.on('exit', (code) => {
    state.logs.push(`--- pnpm install exited with code ${code} ---`)

    if (code !== 0) {
      state.status = 'stopped'
      send('fail', { message: `pnpm install failed (exit code ${code})` })
      end()
      return
    }

    // Phase 2: pnpm run dev
    send('stage', { stage: 'starting' })

    const dev = spawn('pnpm', ['run', 'dev'], {
      cwd: project.path,
      stdio: 'pipe',
      shell: true,
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    })

    state.proc = dev
    state.status = 'starting'
    state.logs.push('--- starting pnpm run dev ---')

    const devOutput = (chunk) => {
      const text = chunk.toString()
      text.split('\n').forEach((line) => {
        if (line.trim()) {
          state.logs.push(line)
          send('log', { text: line })
        }
      })
      const match = text.match(PORT_RE)
      if (match) {
        state.port = parseInt(match[1], 10)
        state.status = 'running'
        send('ready', { port: state.port })
        end()
      }
    }

    dev.stdout.on('data', devOutput)
    dev.stderr.on('data', devOutput)

    dev.on('exit', (exitCode) => {
      state.status = 'stopped'
      state.port = null
      state.logs.push(`--- process exited with code ${exitCode} ---`)
      send('fail', { message: `Dev server exited (code ${exitCode})` })
      end()
    })

    dev.on('error', (err) => {
      state.status = 'stopped'
      state.logs.push(`--- process error: ${err.message} ---`)
      send('fail', { message: err.message })
      end()
    })
  })
}

// ── App self-update ──────────────────────────────────────────────────────────
// Reads protovibe-project-manager/protovibe-project-template versions locally
// and from GitHub, downloads + applies updates in pure Node so it works on
// both macOS and Windows.

function readLocalVersion(pkgPath) {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
    return typeof pkg?.version === 'string' ? pkg.version : null
  } catch { return null }
}

function semverGt(a, b) {
  if (!a || !b) return false
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < 3; i++) {
    const x = pa[i] || 0, y = pb[i] || 0
    if (x > y) return true
    if (x < y) return false
  }
  return false
}

// Cache so we only shell out to `gh` once per dev-server lifetime.
let cachedGhToken = null
function githubToken() {
  const env = process.env.PROTOVIBE_GITHUB_TOKEN || process.env.GITHUB_TOKEN
  if (env) return env
  if (cachedGhToken !== null) return cachedGhToken
  try {
    // shell:true on Windows so `gh.cmd` / `gh.exe` resolves via PATHEXT.
    const out = execFileSync('gh', ['auth', 'token'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
      shell: process.platform === 'win32',
    }).trim()
    cachedGhToken = out || ''
  } catch {
    cachedGhToken = ''
  }
  return cachedGhToken
}

async function fetchRemoteVersion(folder) {
  // Contents API works for both public and private repos and accepts a token.
  const url = `https://api.github.com/repos/${REMOTE_REPO}/contents/${folder}/package.json?ref=${REMOTE_BRANCH}`
  const token = githubToken()
  const headers = {
    Accept: 'application/vnd.github.raw+json',
    'User-Agent': 'protovibe-project-manager',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) })
    if (!res.ok) return { version: null, error: `GitHub returned ${res.status}` }
    const pkg = await res.json()
    const version = typeof pkg?.version === 'string' ? pkg.version : null
    if (!version) return { version: null, error: 'Remote package.json has no version field' }
    return { version, error: null }
  } catch (e) {
    return { version: null, error: e?.message || 'Network error' }
  }
}

async function handleGetVersion(_req, res) {
  const managerCurrent = readLocalVersion(path.join(ROOT, 'package.json'))
  const templateCurrent = readLocalVersion(path.join(TEMPLATE_DIR, 'package.json'))
  const [managerRemote, templateRemote] = await Promise.all([
    fetchRemoteVersion('protovibe-project-manager'),
    fetchRemoteVersion('protovibe-project-template'),
  ])
  sendJson(res, 200, {
    manager: {
      current: managerCurrent,
      latest: managerRemote.version,
      error: managerRemote.error,
      outdated: semverGt(managerRemote.version, managerCurrent),
    },
    template: {
      current: templateCurrent,
      latest: templateRemote.version,
      error: templateRemote.error,
      outdated: semverGt(templateRemote.version, templateCurrent),
    },
  })
}

let updateInProgress = false

// ── Pure-Node updater ───────────────────────────────────────────────────────
// Replaces download-newest-version.sh for the in-app "Download new version"
// flow so it works on both macOS and Windows (where bash isn't on PATH).
// The .sh script remains for CLI use on Unix.

async function downloadZipball(destPath, log) {
  const url = `https://api.github.com/repos/${REMOTE_REPO}/zipball/${REMOTE_BRANCH}`
  const token = githubToken()
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'protovibe-project-manager',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  log(`Downloading latest protovibe from github.com/${REMOTE_REPO}@${REMOTE_BRANCH} ...`)
  const res = await fetch(url, { headers, redirect: 'follow' })
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download zipball: GitHub returned ${res.status}`)
  }
  await pipeline(res.body, fs.createWriteStream(destPath))
}

async function extractZip(zipPath, destDir) {
  const directory = await unzipper.Open.file(zipPath)
  for (const file of directory.files) {
    const outPath = path.join(destDir, file.path)
    if (file.type === 'Directory') {
      fs.mkdirSync(outPath, { recursive: true })
      continue
    }
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    await pipeline(file.stream(), fs.createWriteStream(outPath))
  }
}

function findExtractedRoot(extractDir) {
  for (const entry of fs.readdirSync(extractDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const candidate = path.join(extractDir, entry.name)
    if (
      fs.existsSync(path.join(candidate, 'protovibe-project-manager')) &&
      fs.existsSync(path.join(candidate, 'protovibe-project-template'))
    ) {
      return candidate
    }
  }
  return null
}

// In-place sync: overwrite `dest` with `src` contents and remove stale entries,
// but keep paths listed in `preserve` (e.g., node_modules) and never delete the
// `dest` directory itself. Avoids EPERM on Windows when OneDrive / IDE / file
// watchers hold a handle on the directory.
function syncDir(src, dest, preserve, log) {
  const norm = (p) => path.normalize(p)
  const preserveSet = new Set(preserve.map(norm))
  const isPreserved = (rel) => {
    const r = norm(rel)
    for (const p of preserveSet) {
      if (r === p || r.startsWith(p + path.sep)) return true
    }
    return false
  }

  const srcPaths = new Set()
  const walk = (dir, rel) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const r = rel ? path.join(rel, ent.name) : ent.name
      srcPaths.add(norm(r))
      if (ent.isDirectory()) walk(path.join(dir, ent.name), r)
    }
  }
  walk(src, '')

  // Remove dest entries that aren't in src and aren't preserved. Best-effort —
  // a locked file on Windows shouldn't abort the whole update.
  const cleanup = (dir, rel) => {
    if (!fs.existsSync(dir)) return
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const r = rel ? path.join(rel, ent.name) : ent.name
      if (isPreserved(r)) continue
      const abs = path.join(dir, ent.name)
      if (srcPaths.has(norm(r))) {
        if (ent.isDirectory()) cleanup(abs, r)
        continue
      }
      try {
        fs.rmSync(abs, { recursive: true, force: true })
      } catch (err) {
        log?.(`  warning: could not remove stale ${r}: ${err.message}`)
      }
    }
  }
  cleanup(dest, '')

  // Copy src over dest. force:true overwrites existing files. We do not
  // descend into preserved subtrees because src never contains them
  // (node_modules isn't shipped in the zipball).
  fs.cpSync(src, dest, { recursive: true, force: true })
}

function runPnpmInstall(cwd, log) {
  return new Promise((resolve, reject) => {
    const proc = spawn('pnpm', ['install'], {
      cwd,
      stdio: 'pipe',
      shell: true, // pnpm.cmd on Windows; harmless on Unix
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    })
    let buf = ''
    const onChunk = (chunk) => {
      buf += chunk.toString()
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      for (const line of lines) if (line.trim()) log(line)
    }
    proc.stdout.on('data', onChunk)
    proc.stderr.on('data', onChunk)
    proc.on('error', reject)
    proc.on('exit', (code) => {
      if (buf.trim()) log(buf)
      if (code === 0) resolve()
      else reject(new Error(`pnpm install exited with code ${code} in ${cwd}`))
    })
  })
}

async function runUpdate(which, log) {
  const PM_DIR = path.join(REPO_ROOT, 'protovibe-project-manager')
  const TPL_DIR = TEMPLATE_DIR

  const localPmVer = readLocalVersion(path.join(PM_DIR, 'package.json'))
  const localTplVer = readLocalVersion(path.join(TPL_DIR, 'package.json'))

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'protovibe-update-'))
  try {
    const zipPath = path.join(tmp, 'repo.zip')
    await downloadZipball(zipPath, log)
    const extractDir = path.join(tmp, 'extract')
    fs.mkdirSync(extractDir, { recursive: true })
    log('Extracting archive ...')
    await extractZip(zipPath, extractDir)

    const srcRoot = findExtractedRoot(extractDir)
    if (!srcRoot) throw new Error('Could not find protovibe folders in extracted archive.')

    const remotePmVer = readLocalVersion(path.join(srcRoot, 'protovibe-project-manager', 'package.json'))
    const remoteTplVer = readLocalVersion(path.join(srcRoot, 'protovibe-project-template', 'package.json'))

    const wantPm = which !== 'template'
    const wantTpl = which !== 'manager'
    const updatePm = wantPm && !!(remotePmVer && localPmVer && semverGt(remotePmVer, localPmVer))
    const updateTpl = wantTpl && !!(remoteTplVer && localTplVer && semverGt(remoteTplVer, localTplVer))

    if (!updatePm && !updateTpl) {
      log(`Already up to date — manager ${localPmVer}, template ${localTplVer}.`)
      return {
        manager: false, template: false,
        managerVersion: remotePmVer, templateVersion: remoteTplVer,
      }
    }

    if (updatePm) {
      // Staged: write to sibling .pending dir; launcher swaps on next start.
      const pendingDir = path.join(REPO_ROOT, 'protovibe-project-manager.pending')
      log(`Staging protovibe-project-manager: ${localPmVer} → ${remotePmVer} (apply on next launch)`)
      fs.rmSync(pendingDir, { recursive: true, force: true })
      fs.mkdirSync(pendingDir, { recursive: true })
      fs.cpSync(path.join(srcRoot, 'protovibe-project-manager'), pendingDir, { recursive: true })
    }

    if (updateTpl) {
      log(`Updating protovibe-project-template: ${localTplVer} → ${remoteTplVer}`)
      syncDir(
        path.join(srcRoot, 'protovibe-project-template'),
        TPL_DIR,
        ['node_modules', path.join('plugins', 'protovibe', 'node_modules')],
        log,
      )
      log('Running pnpm install in protovibe-project-template ...')
      await runPnpmInstall(TPL_DIR, log)
    }

    log('Update complete.')
    return {
      manager: updatePm, template: updateTpl,
      managerVersion: remotePmVer, templateVersion: remoteTplVer,
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
}

function handleUpdateApp(req, res, which) {
  if (updateInProgress) {
    return sendJson(res, 409, { error: 'Update already in progress.' })
  }
  updateInProgress = true

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
  })
  res.write(':\n\n')

  let aborted = false
  req.on('close', () => { aborted = true })
  const send = (event, data) => {
    if (aborted) return
    try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`) } catch {}
  }
  const log = (text) => send('log', { text })

  runUpdate(which, log).then((result) => {
    send('done', {
      managerUpdated: !!result.manager,
      templateUpdated: !!result.template,
      managerVersion: result.managerVersion ?? null,
      templateVersion: result.templateVersion ?? null,
      restartRequired: !!result.manager,
    })
    updateInProgress = false
    try { res.end() } catch {}
  }).catch((err) => {
    updateInProgress = false
    send('fail', { message: err?.message || String(err) })
    try { res.end() } catch {}
  })
}

// ── Export / Import ──────────────────────────────────────────────────────────

function buildIgnoreFilter(projectPath) {
  const ig = ignoreFactory()
  // Always exclude these regardless of .gitignore content.
  ig.add(['.git', 'node_modules', 'dist', 'test-results'])
  try {
    const gi = fs.readFileSync(path.join(projectPath, '.gitignore'), 'utf-8')
    ig.add(gi)
  } catch {}
  return ig
}

function handleExportProject(_req, res, id) {
  const projects = readProjects()
  const project = projects.find((p) => p.id === id)
  if (!project) return sendJson(res, 404, { error: 'Project not found.' })
  if (!fs.existsSync(project.path)) {
    return sendJson(res, 404, { error: 'Project folder not found on disk.' })
  }

  const folderName = path.basename(project.path)
  const downloadName = `${readProjectName(project.path)}.zip`
  const ig = buildIgnoreFilter(project.path)

  res.writeHead(200, {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${downloadName.replace(/"/g, '')}"`,
    'Access-Control-Allow-Origin': '*',
  })

  const archive = archiver('zip', { zlib: { level: 9 } })
  archive.on('error', (err) => {
    console.error('[protovibe-home] archive error:', err)
    try { res.end() } catch {}
  })
  archive.pipe(res)

  const walk = (absDir, relDir) => {
    for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
      const abs = path.join(absDir, entry.name)
      const rel = relDir ? `${relDir}/${entry.name}` : entry.name
      // ignore package needs a trailing slash for dir matches.
      const testPath = entry.isDirectory() ? `${rel}/` : rel
      if (ig.ignores(testPath)) continue
      if (entry.isDirectory()) {
        walk(abs, rel)
      } else if (entry.isFile()) {
        archive.file(abs, { name: `${folderName}/${rel}` })
      }
    }
  }
  walk(project.path, '')
  archive.finalize()
}

function readRawBody(req, maxBytes = 500 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let total = 0
    req.on('data', (chunk) => {
      total += chunk.length
      if (total > maxBytes) {
        reject(new Error('Upload too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

async function handleImportProject(req, res, url) {
  let buffer
  try {
    buffer = await readRawBody(req)
  } catch (err) {
    return sendJson(res, 400, { error: err.message || 'Failed to read upload.' })
  }
  if (!buffer.length) return sendJson(res, 400, { error: 'Empty upload.' })

  let directory
  try {
    directory = await unzipper.Open.buffer(buffer)
  } catch (err) {
    return sendJson(res, 400, { error: `Invalid ZIP: ${err.message}` })
  }

  // Detect a single top-level folder so we can strip its prefix and use it as
  // the default project name.
  const tops = new Set()
  for (const f of directory.files) {
    const seg = f.path.split('/')[0]
    if (seg) tops.add(seg)
  }
  const singleTop = tops.size === 1 ? [...tops][0] : null

  const requestedName = (url.searchParams.get('name') || singleTop || '').trim()
  const overwrite = url.searchParams.get('overwrite') === '1'

  if (!NAME_RE.test(requestedName)) {
    return sendJson(res, 400, { error: 'Invalid project name. Use only letters, numbers, hyphens, and underscores.' })
  }

  const destPath = safePath(requestedName)
  if (!destPath) return sendJson(res, 400, { error: 'Invalid name.' })

  ensureProjectsDir()

  const projects = readProjects()
  const existingEntry = projects.find((p) => p.path === destPath)
  const folderExists = fs.existsSync(destPath)

  if ((existingEntry || folderExists) && !overwrite) {
    return sendJson(res, 409, { error: 'A project with that name already exists.', conflictName: requestedName })
  }

  // Overwrite: stop any running process, then remove the folder.
  if (existingEntry) {
    const proc = processes.get(existingEntry.id)
    if (proc?.proc?.pid) {
      await new Promise((resolve) => treeKill(proc.proc.pid, 'SIGKILL', resolve))
      processes.delete(existingEntry.id)
    }
  }
  if (folderExists) {
    if (process.platform !== 'win32') {
      try { execFileSync('chmod', ['-R', 'u+rwx', destPath]) } catch {}
    }
    try {
      fs.rmSync(destPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 })
    } catch (err) {
      return sendJson(res, 500, { error: `Failed to remove existing folder: ${err.message}` })
    }
  }

  fs.mkdirSync(destPath, { recursive: true })

  try {
    for (const file of directory.files) {
      // Strip the single top-level folder, if any.
      let rel = file.path
      if (singleTop) {
        if (rel === singleTop || rel === `${singleTop}/`) continue
        if (rel.startsWith(`${singleTop}/`)) rel = rel.slice(singleTop.length + 1)
      }
      if (!rel) continue
      // Defense: refuse path traversal.
      const target = path.join(destPath, rel)
      if (!target.startsWith(destPath + path.sep) && target !== destPath) continue
      if (file.type === 'Directory') {
        fs.mkdirSync(target, { recursive: true })
      } else {
        fs.mkdirSync(path.dirname(target), { recursive: true })
        const content = await file.buffer()
        fs.writeFileSync(target, content)
      }
    }
  } catch (err) {
    return sendJson(res, 500, { error: `Failed to extract ZIP: ${err.message}` })
  }

  try {
    writeProtovibeData(destPath, requestedName, { resetCloudflare: true })
    try { writePluginMetadata(destPath, readSourcePluginVersion()) } catch {}
  } catch (err) {
    return sendJson(res, 500, { error: `Failed to write protovibe-data.json: ${err.message}` })
  }

  let entry = existingEntry
  if (entry) {
    entry.createdAt = entry.createdAt || new Date().toISOString()
  } else {
    entry = { id: generateId(), path: destPath, createdAt: new Date().toISOString() }
    projects.push(entry)
  }
  writeProjects(projects)

  sendJson(res, 201, { ...entry, name: requestedName })
}

// ── Plugin ────────────────────────────────────────────────────────────────────

function projectManagerPlugin() {
  return {
    name: 'protovibe-project-manager',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res, next) => {
        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
          res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,DELETE', 'Access-Control-Allow-Headers': 'Content-Type' })
          return res.end()
        }

        const url = new URL(req.url, 'http://localhost')
        const pathname = url.pathname
        const method = req.method

        try {
          if (method === 'GET' && pathname === '/projects') {
            return handleGetProjects(req, res)
          }
          if (method === 'POST' && pathname === '/projects') {
            return await handleCreateProject(req, res)
          }
          if (method === 'GET' && pathname === '/version') {
            return await handleGetVersion(req, res)
          }
          if (method === 'POST' && pathname === '/projects/import') {
            return await handleImportProject(req, res, url)
          }
          if (method === 'GET' && pathname === '/projects-dir') {
            return sendJson(res, 200, { path: PROJECTS_DIR })
          }
          if (method === 'POST' && pathname === '/update-app') {
            const which = url.searchParams.get('which') || 'auto'
            return handleUpdateApp(req, res, which)
          }

          const match = pathname.match(/^\/projects\/([^/]+)(?:\/(.+))?$/)
          if (match) {
            const [, id, action] = match
            if (method === 'DELETE' && !action) return await handleDeleteProject(req, res, id)
            if (method === 'POST' && action === 'duplicate') return await handleDuplicate(req, res, id)
            if (method === 'POST' && action === 'rename') return await handleRename(req, res, id)
            if (method === 'POST' && action === 'start') return handleStart(req, res, id)
            if (method === 'POST' && action === 'stop') return handleStop(req, res, id)
            if (method === 'POST' && action === 'install') return handleInstall(req, res, id)
            if (method === 'POST' && action === 'update-plugin') return await handleUpdatePlugin(req, res, id)
            if (method === 'POST' && action === 'show-folder') return handleShowFolder(req, res, id)
            if (method === 'POST' && action === 'open-vscode') return handleOpenVSCode(req, res, id)
            if (method === 'GET' && action === 'export') return handleExportProject(req, res, id)
            if (method === 'GET' && action === 'logs') return handleLogs(req, res, id)
            if (method === 'GET' && action === 'setup') return handleSetup(req, res, id)
          }

          next()
        } catch (err) {
          console.error('[protovibe-home] API error:', err)
          if (!res.headersSent) {
            sendJson(res, 500, { error: 'Internal server error' })
          }
        }
      })
    },
  }
}

// ── Auto-open browser on dev start ───────────────────────────────────────────
// Vite's built-in `--open` uses sindresorhus/open, which on macOS drives the
// browser via AppleScript — that triggers a "Terminal wants to control Chrome"
// permission prompt and can land on the wrong Chrome profile. Shelling out to
// /usr/bin/open ourselves goes through LaunchServices, which behaves like any
// other app (last-used window, no automation prompt).
function autoOpenPlugin() {
  return {
    name: 'protovibe-auto-open',
    apply: 'serve',
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        if (process.env.PROTOVIBE_NO_OPEN) return
        const addr = server.httpServer.address()
        if (!addr || typeof addr === 'string') return
        const host = addr.address === '::' || addr.address === '0.0.0.0' ? '127.0.0.1' : addr.address
        const url = `http://${host}:${addr.port}/`
        const platform = process.platform
        const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'cmd' : 'xdg-open'
        const args = platform === 'win32' ? ['/c', 'start', '', url] : [url]
        try {
          spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref()
        } catch (err) {
          console.warn('[protovibe] failed to open browser:', err.message)
        }
      })
    },
  }
}

// ── Config ────────────────────────────────────────────────────────────────────

// `pnpm dev` is the end-user runtime (launched by Protovibe.exe) — HMR and the
// file watcher are pure overhead there, so we disable them. `pnpm dev:watch`
// (mode=watch) keeps the dev experience for working on the app itself.
export default defineConfig(({ mode }) => {
  const watchMode = mode === 'watch'
  return {
    plugins: [react(), tailwindcss(), projectManagerPlugin(), ...(watchMode ? [] : [autoOpenPlugin()])],
    server: {
      host: '127.0.0.1',
      port: 5173,
      hmr: watchMode,
      watch: watchMode ? { ignored: ['**/projects/**', '**/projects.json'] } : null,
    },
  }
})
