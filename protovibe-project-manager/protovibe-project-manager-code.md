

## package.json
**Lines:** 26 | **Size:** 550 bytes | **Modified:** 2026-04-15

```json
{
  "name": "protovibe-home",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@floating-ui/react": "^0.27.19",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.13.2"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.0",
    "@vitejs/plugin-react": "^5.0.0",
    "tailwindcss": "^4.2.2",
    "tree-kill": "^1.2.2",
    "vite": "^6.2.0"
  }
}

```

## vite.config.js
**Lines:** 701 | **Size:** 22055 bytes | **Modified:** 2026-04-19

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import { spawn, execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const treeKill = createRequire(import.meta.url)('tree-kill')

const ROOT = path.resolve(import.meta.dirname)
const REPO_ROOT = path.resolve(ROOT, '..')
const PROJECTS_DIR = path.join(REPO_ROOT, 'projects')
const PROJECTS_JSON = path.join(PROJECTS_DIR, 'projects.json')
const TEMPLATE_DIR = path.join(REPO_ROOT, 'protovibe-project-template')
const NAME_RE = /^[a-zA-Z0-9_-]+$/
const PORT_RE = /Local:\s+http:\/\/localhost:(\d+)/

// In-memory process registry — lives for the duration of the dev server
const processes = new Map() // id → { proc, logs: [], port: null, status }

// ── Helpers ──────────────────────────────────────────────────────────────────

function readProjects() {
  try {
    return JSON.parse(fs.readFileSync(PROJECTS_JSON, 'utf-8'))
  } catch {
    return []
  }
}

function writeProjects(list) {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true })
  const stripped = list.map(({ id, path, createdAt }) => ({ id, path, createdAt }))
  fs.writeFileSync(PROJECTS_JSON, JSON.stringify(stripped, null, 2), 'utf-8')
}

function ensureProjectsDir() {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true })
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
  const stored = readProjects()
  const list = stored.map((p) => {
    const proc = processes.get(p.id)
    let updatedAt = null
    try { updatedAt = fs.statSync(p.path).mtime.toISOString() } catch {}
    return {
      id: p.id,
      path: p.path,
      createdAt: p.createdAt,
      name: readProjectName(p.path),
      updatedAt,
      status: proc?.status ?? 'stopped',
      port: proc?.port ?? null,
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

  // Kill running process first
  const proc = processes.get(id)
  if (proc?.proc?.pid) {
    await new Promise((resolve) => treeKill(proc.proc.pid, 'SIGTERM', resolve))
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
      fs.rmSync(project.path, { recursive: true, force: true })
    } catch (err) {
      return sendJson(res, 500, { error: `Failed to delete folder: ${err.message}` })
    }
  }

  writeProjects(projects.filter((p) => p.id !== id))
  sendJson(res, 200, { ok: true })
}

function handleStart(_req, res, id) {
  const projects = readProjects()
  const project = projects.find((p) => p.id === id)
  if (!project) return sendJson(res, 404, { error: 'Project not found.' })

  const existing = processes.get(id)
  if (existing?.status === 'running' || existing?.status === 'starting') {
    return sendJson(res, 409, { error: 'Project is already running.' })
  }

  const proc = spawn('pnpm', ['run', 'dev'], {
    cwd: project.path,
    stdio: 'pipe',
    shell: process.platform === 'win32',
    env: { ...process.env },
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

function handleInstall(_req, res, id) {
  const projects = readProjects()
  const project = projects.find((p) => p.id === id)
  if (!project) return sendJson(res, 404, { error: 'Project not found.' })

  const existing = processes.get(id)
  if (existing?.status === 'running' || existing?.status === 'starting') {
    return sendJson(res, 409, { error: 'Stop the project before installing.' })
  }
  if (existing?.status === 'installing') {
    return sendJson(res, 409, { error: 'Install already in progress.' })
  }

  const proc = spawn('pnpm', ['install'], {
    cwd: project.path,
    stdio: 'pipe',
    shell: process.platform === 'win32',
    env: { ...process.env },
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
    shell: process.platform === 'win32',
    env: { ...process.env },
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
      shell: process.platform === 'win32',
      env: { ...process.env },
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

          const match = pathname.match(/^\/projects\/([^/]+)(?:\/(.+))?$/)
          if (match) {
            const [, id, action] = match
            if (method === 'DELETE' && !action) return await handleDeleteProject(req, res, id)
            if (method === 'POST' && action === 'duplicate') return await handleDuplicate(req, res, id)
            if (method === 'POST' && action === 'rename') return await handleRename(req, res, id)
            if (method === 'POST' && action === 'start') return handleStart(req, res, id)
            if (method === 'POST' && action === 'stop') return handleStop(req, res, id)
            if (method === 'POST' && action === 'install') return handleInstall(req, res, id)
            if (method === 'POST' && action === 'show-folder') return handleShowFolder(req, res, id)
            if (method === 'POST' && action === 'open-vscode') return handleOpenVSCode(req, res, id)
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

// ── Config ────────────────────────────────────────────────────────────────────

export default defineConfig({
  plugins: [react(), tailwindcss(), projectManagerPlugin()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    watch: {
      ignored: ['**/projects/**', '**/projects.json'],
    },
  },
})

```

## src/App.jsx
**Lines:** 356 | **Size:** 13446 bytes | **Modified:** 2026-04-19

```jsx
import { useState, useEffect, useCallback } from 'react'
import ProjectCard from './components/ProjectCard.jsx'
import ProjectPage from './components/ProjectPage.jsx'
import CreateProjectModal from './components/CreateProjectModal.jsx'
import DeleteProjectModal from './components/DeleteProjectModal.jsx'
import SetupScreen from './components/SetupScreen.jsx'

async function apiFetch(method, path, body) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  return res
}

export default function App() {
  // Data
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Navigation: 'list' | 'project' | 'setup'
  const [view, setView] = useState('list')
  const [activeProjectId, setActiveProjectId] = useState(null)

  // Modals
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteConfirmProject, setDeleteConfirmProject] = useState(null)
  const [setupStage, setSetupStage] = useState(null)
  const [pendingName, setPendingName] = useState('')

  // Search
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname
      if (path.startsWith('/project/')) {
        const id = path.split('/')[2]
        setActiveProjectId(id)
        setView('project')
      } else {
        setView('list')
        setActiveProjectId(null)
      }
    }
    handlePopState()
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        setProjects(data)
      }
    } catch {
      // swallow network errors during polling
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
    const interval = setInterval(fetchProjects, 2000)
    return () => clearInterval(interval)
  }, [fetchProjects])

  // ── Navigation helpers ──

  const openProject = (id) => {
    window.history.pushState(null, '', `/project/${id}`)
    setActiveProjectId(id)
    setView('project')
  }

  const openSetup = (id) => {
    setActiveProjectId(id)
    setView('setup')
  }

  const goHome = () => {
    window.history.pushState(null, '', `/`)
    setView('list')
    setActiveProjectId(null)
  }

  // ── Actions ──

  const handleCreateProject = async (name) => {
    setCreateOpen(false)
    setError('')
    setPendingName(name)
    setSetupStage('creating')
    setView('setup')
    setActiveProjectId(null)
    try {
      const res = await apiFetch('POST', '/projects', { name })
      if (res.ok) {
        const project = await res.json()
        fetchProjects()
        setActiveProjectId(project.id)
        setSetupStage(null)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to create project.')
        setSetupStage(null)
        setView('list')
      }
    } catch {
      setError('Network error. Make sure the dev server is running.')
      setSetupStage(null)
      setView('list')
    }
  }

  const handleDuplicate = async (id) => {
    setError('')
    const original = projects.find((p) => p.id === id)
    setPendingName(original?.name ? `${original.name}-copy` : '')
    setSetupStage('duplicating')
    setView('setup')
    setActiveProjectId(null)
    try {
      const res = await apiFetch('POST', `/projects/${id}/duplicate`)
      if (res.ok) {
        const project = await res.json()
        fetchProjects()
        setPendingName(project.name || '')
        setActiveProjectId(project.id)
        setSetupStage(null)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to duplicate project.')
        setSetupStage(null)
        setView('list')
      }
    } catch {
      setError('Network error. Make sure the dev server is running.')
      setSetupStage(null)
      setView('list')
    }
  }

  const handleDelete = (id) => {
    const project = projects.find((p) => p.id === id)
    if (project) setDeleteConfirmProject(project)
  }

  const handleDeleteConfirmed = async () => {
    const { id } = deleteConfirmProject
    const res = await apiFetch('DELETE', `/projects/${id}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to delete project.')
    }
    fetchProjects()
    if (view === 'project' && activeProjectId === id) goHome()
  }

  const handleStop = async (id) => {
    setError('')
    try {
      const res = await apiFetch('POST', `/projects/${id}/stop`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to stop project.')
      }
      fetchProjects()
    } catch {
      setError('Network error. Make sure the dev server is running.')
    }
  }

  const handleShowFolder = async (id) => {
    try {
      await apiFetch('POST', `/projects/${id}/show-folder`)
    } catch {}
  }

  const handleOpenVSCode = async (id) => {
    try {
      await apiFetch('POST', `/projects/${id}/open-vscode`)
    } catch {}
  }

  // ── Derived state ──

  const activeProject = projects.find((p) => p.id === activeProjectId)

  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))

  // ── Setup screen overlay (renders on top of list) ──

  const setupOverlay = view === 'setup' && (
    <SetupScreen
      projectId={activeProjectId}
      projectName={activeProject?.name ?? pendingName ?? 'Project'}
      onBack={goHome}
      initialStage={setupStage ?? 'installing'}
      onReady={() => { if (activeProjectId) openProject(activeProjectId) }}
    />
  )

  const renderContent = () => {
    if (view === 'project' && activeProject) {
      return <ProjectPage project={activeProject} onBack={goHome} onSetup={() => openSetup(activeProjectId)} onShowFolder={() => handleShowFolder(activeProjectId)} onOpenVSCode={() => handleOpenVSCode(activeProjectId)} onDuplicate={() => handleDuplicate(activeProjectId)} onDelete={() => handleDelete(activeProjectId)} onStop={() => handleStop(activeProjectId)} onRenamed={fetchProjects} />
    }

    // ── List view ──
    return (
      <main className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-foreground-tertiary text-sm">
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 rounded-2xl bg-background-secondary flex items-center justify-center text-foreground-tertiary">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="13" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-foreground-default font-medium mb-1">No projects yet</p>
              <p className="text-foreground-tertiary text-sm">Create your first project to get started</p>
            </div>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              </svg>
              Create Project
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground-default tracking-tight">Your projects</h2>
                <button
                  onClick={() => setCreateOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium rounded-lg transition-colors cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                  </svg>
                  New Project
                </button>
              </div>
              <div className="relative w-full">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary">
                  <path d="M6 11.5a5.5 5.5 0 100-11 5.5 5.5 0 000 11zM13.5 13.5l-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm text-foreground-default bg-background-secondary placeholder-foreground-tertiary outline-none transition-colors border-border-default focus:border-border-focus focus:ring-2 focus:ring-border-focus/20"
                />
              </div>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-2">
                <p className="text-foreground-default font-medium">No results found</p>
                <p className="text-foreground-tertiary text-sm">Try emptying your search query</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onOpen={() => openProject(project.id)}
                    onDuplicate={() => handleDuplicate(project.id)}
                    onDelete={() => handleDelete(project.id)}
                    onStop={() => handleStop(project.id)}
                    onShowFolder={() => handleShowFolder(project.id)}
                    onOpenVSCode={() => handleOpenVSCode(project.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-background-default">
      {/* Header */}
      <header className="border-b border-border-default bg-background-elevated sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={goHome} className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 3h4v4H3zM9 3h4v4H9zM3 9h4v4H3zM9 9h4v4H9z" fill="currentColor" className="text-primary-foreground" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-foreground-default tracking-tight">Protovibe Projects</h1>
          </button>
        </div>
      </header>

      {/* Error toast */}
      {error && (
        <div className="max-w-4xl mx-auto px-6 pt-4">
          <div className="flex items-center gap-3 rounded-xl bg-background-destructive-subtle border border-border-destructive px-4 py-3">
            <p className="text-sm text-foreground-destructive flex-1">{error}</p>
            <button
              onClick={() => setError('')}
              className="text-foreground-destructive hover:text-foreground-default transition-colors shrink-0 cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      {renderContent()}

      {createOpen && (
        <CreateProjectModal
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreateProject}
        />
      )}

      {deleteConfirmProject && (
        <DeleteProjectModal
          projectName={deleteConfirmProject.name}
          onConfirm={handleDeleteConfirmed}
          onClose={() => setDeleteConfirmProject(null)}
        />
      )}

      {setupOverlay}
    </div>
  )
}

```

## src/index.css
**Lines:** 95 | **Size:** 3058 bytes | **Modified:** 2026-04-19

```css
@import "tailwindcss";

@theme {
  /* Backgrounds */
  --color-background-default: var(--background-default);
  --color-background-secondary: var(--background-secondary);
  --color-background-tertiary: var(--background-tertiary);
  --color-background-elevated: var(--background-elevated);
  --color-background-primary-subtle: var(--background-primary-subtle);
  --color-background-destructive-subtle: var(--background-destructive-subtle);
  --color-background-success-subtle: var(--background-success-subtle);
  --color-background-warning-subtle: var(--background-warning-subtle);
  --color-background-overlay: var(--background-overlay);

  /* Text */
  --color-foreground-default: var(--foreground-default);
  --color-foreground-secondary: var(--foreground-secondary);
  --color-foreground-tertiary: var(--foreground-tertiary);
  --color-foreground-disabled: var(--foreground-disabled);
  --color-foreground-destructive: var(--foreground-destructive);
  --color-foreground-success: var(--foreground-success);
  --color-foreground-warning: var(--foreground-warning);

  /* Borders */
  --color-border-default: var(--border-default);
  --color-border-secondary: var(--border-secondary);
  --color-border-strong: var(--border-strong);
  --color-border-focus: var(--border-focus);
  --color-border-destructive: var(--border-destructive);

  /* Solid accents */
  --color-primary: var(--primary);
  --color-primary-hover: var(--primary-hover);
  --color-primary-foreground: var(--primary-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-hover: var(--destructive-hover);
  --color-success: var(--success);
  --color-warning: var(--warning);
}

:root {
  color-scheme: dark;

  --background-default: #0a0a0a;
  --background-secondary: #222222;
  --background-tertiary: #343434;
  --background-elevated: #131313;
  --background-primary-subtle: rgba(24, 160, 251, 0.15);
  --background-destructive-subtle: rgba(242, 72, 34, 0.15);
  --background-success-subtle: rgba(26, 188, 156, 0.15);
  --background-warning-subtle: rgba(242, 201, 76, 0.15);
  --background-overlay: rgba(0, 0, 0, 0.6);

  /* Text */
  --foreground-default: #FFFFFF;
  --foreground-secondary: #B3B3B3;
  --foreground-tertiary: #7c7c7c;
  --foreground-disabled: #646464;
  --foreground-destructive: #F24822;
  --foreground-success: #1ABC9C;
  --foreground-warning: #F2C94C;

  /* Borders */
  --border-default: #3c3c3c;
  --border-secondary: #333333;
  --border-strong: #6a6a6a;
  --border-focus: #18A0FB;
  --border-destructive: #F24822;

  /* Accents (Figma Blue) */
  --primary: #18A0FB;
  --primary-hover: #0D8CE6;
  --primary-foreground: #FFFFFF;

  /* Destructive */
  --destructive: #F24822;
  --destructive-hover: #DC3411;

  /* Success */
  --success: #1ABC9C;

  /* Warning */
  --warning: #F2C94C;
}

*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--background-default);
  color: var(--foreground-default);
  min-height: 100vh;
}

```

## src/main.jsx
**Lines:** 11 | **Size:** 229 bytes | **Modified:** 2026-03-26

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

```

## src/components/CreateProjectModal.jsx
**Lines:** 105 | **Size:** 3921 bytes | **Modified:** 2026-04-19

```jsx
import { useState, useEffect, useRef } from 'react'

const NAME_RE = /^[a-zA-Z0-9_-]+$/

export default function CreateProjectModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = name.trim()

    if (!trimmed) {
      setError('Project name is required.')
      return
    }
    if (!NAME_RE.test(trimmed)) {
      setError('Name may only contain letters, numbers, hyphens, and underscores.')
      return
    }

    setError('')
    onCreate(trimmed)
  }

  return (
    <div
      className="fixed inset-0 bg-background-overlay z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-background-elevated border border-border-default rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground-default">New Project</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-foreground-tertiary hover:text-foreground-default hover:bg-background-secondary transition-colors cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="project-name" className="text-sm font-medium text-foreground-default">
              Project name
            </label>
            <input
              ref={inputRef}
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError('')
              }}
              placeholder="my-project"
              className="w-full px-3 py-2 rounded-lg border text-sm text-foreground-default bg-background-secondary placeholder-foreground-tertiary outline-none transition-colors disabled:opacity-50
                border-border-default
                focus:border-border-focus focus:ring-2 focus:ring-border-focus/20"
            />
            {error && (
              <p className="text-xs text-foreground-destructive">{error}</p>
            )}
            <p className="text-xs text-foreground-tertiary">
              Letters, numbers, hyphens, and underscores only
            </p>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-foreground-secondary hover:text-foreground-default hover:bg-background-secondary transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary-hover text-primary-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

```

## src/components/DeleteProjectModal.jsx
**Lines:** 79 | **Size:** 3305 bytes | **Modified:** 2026-04-19

```jsx
import { useState, useEffect } from 'react'

export default function DeleteProjectModal({ projectName, onConfirm, onClose }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && !deleting) onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, deleting])

  const handleConfirm = async () => {
    setDeleting(true)
    setError('')
    try {
      await onConfirm()
      onClose()
    } catch (e) {
      setError(e.message || 'Failed to delete project.')
      setDeleting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-background-overlay z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !deleting) onClose() }}
    >
      <div className="bg-background-elevated border border-border-default rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground-default">Delete project</h2>
          <button
            onClick={onClose}
            disabled={deleting}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-foreground-tertiary hover:text-foreground-default hover:bg-background-secondary transition-colors disabled:opacity-40 cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <p className="text-sm text-foreground-secondary">
          Are you sure you want to delete <span className="font-semibold text-foreground-default">{projectName}</span>? This action cannot be undone.
        </p>

        {error && (
          <p className="text-xs text-foreground-destructive">{error}</p>
        )}

        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 rounded-lg text-sm font-medium text-foreground-secondary hover:text-foreground-default hover:bg-background-secondary transition-colors disabled:opacity-40 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-background-destructive-subtle hover:bg-background-destructive text-foreground-destructive transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
          >
            {deleting && (
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.75" strokeDasharray="28" strokeDashoffset="10" strokeLinecap="round"/>
              </svg>
            )}
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

```

## src/components/ProjectCard.jsx
**Lines:** 223 | **Size:** 8484 bytes | **Modified:** 2026-04-19

```jsx
import { useState } from 'react'
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useClick,
  useDismiss,
  useInteractions,
  FloatingPortal,
} from '@floating-ui/react'

const STATUS_LABELS = {
  running: 'Running',
  stopped: 'Stopped',
  installing: 'Installing',
  starting: 'Starting',
}

function MenuItem({ icon, label, onClick, danger, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-danger={danger}
      className="flex items-center gap-3 w-full px-3 py-2 text-sm text-foreground-secondary rounded-lg hover:bg-background-tertiary data-[danger=true]:text-foreground-destructive data-[danger=true]:hover:bg-background-destructive-subtle transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-left"
    >
      {icon}
      {label}
    </button>
  )
}

export default function ProjectCard({ project, onOpen, onDuplicate, onDelete, onStop, onShowFolder, onOpenVSCode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { status, port } = project

  const isRunning = status === 'running'
  const isBusy = status === 'installing' || status === 'starting'

  const { refs, floatingStyles, context } = useFloating({
    open: menuOpen,
    onOpenChange: setMenuOpen,
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
    placement: 'bottom-end',
  })

  const click = useClick(context)
  const dismiss = useDismiss(context)
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss])

  const handleDelete = (e) => {
    e.stopPropagation()
    setMenuOpen(false)
    onDelete()
  }

  const createdDate = project.createdAt
    ? new Date(project.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  const updatedDate = project.updatedAt
    ? new Date(project.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div
      onClick={onOpen}
      className="bg-background-elevated border border-border-default rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs hover:shadow-md hover:border-border-focus/40 transition-all cursor-pointer group"
    >
      {/* Left: Header */}
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-foreground-default truncate group-hover:text-foreground-primary transition-colors">
          {project.name}
        </h2>
        <div className="flex items-center gap-2 text-xs text-foreground-tertiary">
          {createdDate && <span>Created {createdDate}</span>}
          {updatedDate && updatedDate !== createdDate && (
            <>
              <span className="w-1 h-1 rounded-full bg-foreground-tertiary/50 inline-block flex-shrink-0" />
              <span>Modified {updatedDate}</span>
            </>
          )}
        </div>
      </div>

      {/* Right: Status + menu button */}
      <div className="flex items-center gap-3 shrink-0">
        {status !== 'stopped' && (
          <span
            data-status={status}
            className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium
              data-[status=running]:bg-background-success-subtle data-[status=running]:text-foreground-success
              data-[status=installing]:bg-background-warning-subtle data-[status=installing]:text-foreground-warning
              data-[status=starting]:bg-background-info-subtle data-[status=starting]:text-foreground-info"
          >
            {STATUS_LABELS[status] ?? status}
          </span>
        )}


        {/* Three-dot menu button */}
        <button
          ref={refs.setReference}
          {...getReferenceProps({ onClick: (e) => e.stopPropagation() })}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-foreground-tertiary hover:text-foreground-default hover:bg-background-tertiary transition-colors cursor-pointer"
          title="Actions"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="3.5" r="1.25" fill="currentColor" />
            <circle cx="8" cy="8" r="1.25" fill="currentColor" />
            <circle cx="8" cy="12.5" r="1.25" fill="currentColor" />
          </svg>
        </button>
      </div>

      {/* Dropdown menu */}
      {menuOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-50 min-w-48 bg-background-elevated border border-border-default rounded-xl shadow-xl p-1.5 flex flex-col gap-0.5"
          >
            {isRunning && port && (
              <MenuItem
                label="Open Protovibe editor"
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(`http://localhost:${port}/protovibe.html`, '_blank')
                  setMenuOpen(false)
                }}
                icon={
                  <svg width="14" height="14" viewBox="0 0 19 19" fill="none" className="shrink-0">
                    <path d="M8.5 3.5H4a1.5 1.5 0 00-1.5 1.5v10A1.5 1.5 0 004 16.5h10A1.5 1.5 0 0015.5 15v-4.5M12 2.5h4.5V7M16 3L9 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                }
              />
            )}

            {isRunning && (
              <MenuItem
                label="Stop"
                onClick={(e) => {
                  e.stopPropagation()
                  onStop && onStop()
                  setMenuOpen(false)
                }}
                icon={
                  <svg width="14" height="14" viewBox="0 0 19 19" fill="none" className="shrink-0">
                    <rect x="5" y="5" width="9" height="9" rx="2" fill="currentColor" />
                  </svg>
                }
              />
            )}

            <MenuItem
              label="Show in Finder"
              onClick={(e) => {
                e.stopPropagation()
                onShowFolder && onShowFolder()
                setMenuOpen(false)
              }}
              icon={
                <svg width="14" height="14" viewBox="0 0 19 19" fill="none" className="shrink-0">
                  <path d="M2.5 5.5C2.5 4.67 3.17 4 4 4H7.5l1.5 2H15c.83 0 1.5.67 1.5 1.5v7c0 .83-.67 1.5-1.5 1.5H4c-.83 0-1.5-.67-1.5-1.5V5.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                </svg>
              }
            />

            <MenuItem
              label="Open in VS Code"
              onClick={(e) => {
                e.stopPropagation()
                onOpenVSCode && onOpenVSCode()
                setMenuOpen(false)
              }}
              icon={
                <svg width="14" height="14" viewBox="0 0 19 19" fill="none" className="shrink-0">
                  <path d="M5.5 6L2 9.5 5.5 13M13.5 6L17 9.5 13.5 13M11 3.5l-3 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
            />

            <MenuItem
              label="Duplicate"
              disabled={isBusy}
              onClick={(e) => {
                e.stopPropagation()
                onDuplicate()
                setMenuOpen(false)
              }}
              icon={
                <svg width="14" height="14" viewBox="0 0 19 19" fill="none" className="shrink-0">
                  <rect x="6" y="6" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M3 13V3h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
            />

            <div className="h-px bg-border-default mx-1 my-0.5" />

            <MenuItem
              label="Delete"
              danger
              disabled={isBusy || isRunning}
              onClick={handleDelete}
              icon={
                <svg width="14" height="14" viewBox="0 0 19 19" fill="none" className="shrink-0">
                  <path d="M3 5.5h13M7.5 5.5V4h4v1.5M8.5 9v5M10.5 9v5M4.5 5.5l.75 10h8.5l.75-10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
            />
          </div>
        </FloatingPortal>
      )}
    </div>
  )
}

```

## src/components/ProjectMoreMenu.jsx
**Lines:** 187 | **Size:** 6877 bytes | **Modified:** 2026-04-19

```jsx
import { useState } from 'react'
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useClick,
  useDismiss,
  useInteractions,
  FloatingPortal,
} from '@floating-ui/react'

function MenuItem({ icon, label, onClick, danger, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-danger={danger}
      className="flex items-center gap-3 w-full px-3 py-2 text-sm text-foreground-secondary rounded-lg hover:bg-background-tertiary data-[danger=true]:text-foreground-destructive data-[danger=true]:hover:bg-background-destructive-subtle transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-left"
    >
      {icon}
      {label}
    </button>
  )
}

export default function ProjectMoreMenu({ project, onDuplicate, onDelete, onStop, onShowFolder, onOpenVSCode, onRename }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { status, port } = project

  const isRunning = status === 'running'
  const isBusy = status === 'installing' || status === 'starting'

  const { refs, floatingStyles, context } = useFloating({
    open: menuOpen,
    onOpenChange: setMenuOpen,
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
    placement: 'bottom-end',
  })

  const click = useClick(context)
  const dismiss = useDismiss(context)
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss])

  const handleDelete = (e) => {
    e.stopPropagation()
    setMenuOpen(false)
    onDelete && onDelete()
  }

  return (
    <>
      <button
        ref={refs.setReference}
        {...getReferenceProps({ onClick: (e) => e.stopPropagation() })}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-foreground-tertiary hover:text-foreground-default hover:bg-background-tertiary transition-colors cursor-pointer"
        title="Actions"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="3.5" r="1.25" fill="currentColor" />
          <circle cx="8" cy="8" r="1.25" fill="currentColor" />
          <circle cx="8" cy="12.5" r="1.25" fill="currentColor" />
        </svg>
      </button>

      {menuOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-50 min-w-48 bg-background-elevated border border-border-default rounded-xl shadow-xl p-1.5 flex flex-col gap-0.5"
          >
            {isRunning && port && (
              <MenuItem
                label="Open Protovibe editor"
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(`http://localhost:${port}/protovibe.html`, '_blank')
                  setMenuOpen(false)
                }}
                icon={
                  <svg width="14" height="14" viewBox="0 0 19 19" fill="none" className="shrink-0">
                    <path d="M8.5 3.5H4a1.5 1.5 0 00-1.5 1.5v10A1.5 1.5 0 004 16.5h10A1.5 1.5 0 0015.5 15v-4.5M12 2.5h4.5V7M16 3L9 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                }
              />
            )}

            {isRunning && (
              <MenuItem
                label="Stop"
                onClick={(e) => {
                  e.stopPropagation()
                  onStop && onStop()
                  setMenuOpen(false)
                }}
                icon={
                  <svg width="14" height="14" viewBox="0 0 19 19" fill="none" className="shrink-0">
                    <rect x="5" y="5" width="9" height="9" rx="2" fill="currentColor" />
                  </svg>
                }
              />
            )}

            <MenuItem
              label="Show in Finder"
              onClick={(e) => {
                e.stopPropagation()
                onShowFolder && onShowFolder()
                setMenuOpen(false)
              }}
              icon={
                <svg width="14" height="14" viewBox="0 0 19 19" fill="none" className="shrink-0">
                  <path d="M2.5 5.5C2.5 4.67 3.17 4 4 4H7.5l1.5 2H15c.83 0 1.5.67 1.5 1.5v7c0 .83-.67 1.5-1.5 1.5H4c-.83 0-1.5-.67-1.5-1.5V5.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                </svg>
              }
            />

            <MenuItem
              label="Open in VS Code"
              onClick={(e) => {
                e.stopPropagation()
                onOpenVSCode && onOpenVSCode()
                setMenuOpen(false)
              }}
              icon={
                <svg width="14" height="14" viewBox="0 0 19 19" fill="none" className="shrink-0">
                  <path d="M5.5 6L2 9.5 5.5 13M13.5 6L17 9.5 13.5 13M11 3.5l-3 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
            />

            {onRename && (
              <MenuItem
                label="Rename"
                onClick={(e) => {
                  e.stopPropagation()
                  onRename()
                  setMenuOpen(false)
                }}
                icon={
                  <svg width="14" height="14" viewBox="0 0 19 19" fill="none" className="shrink-0">
                    <path d="M12 3l4 4-9 9H3v-4l9-9z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                }
              />
            )}

            <MenuItem
              label="Duplicate"
              disabled={isBusy}
              onClick={(e) => {
                e.stopPropagation()
                onDuplicate && onDuplicate()
                setMenuOpen(false)
              }}
              icon={
                <svg width="14" height="14" viewBox="0 0 19 19" fill="none" className="shrink-0">
                  <rect x="6" y="6" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M3 13V3h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
            />

            <div className="h-px bg-border-default mx-1 my-0.5" />

            <MenuItem
              label="Delete"
              danger
              disabled={isBusy || isRunning}
              onClick={handleDelete}
              icon={
                <svg width="14" height="14" viewBox="0 0 19 19" fill="none" className="shrink-0">
                  <path d="M3 5.5h13M7.5 5.5V4h4v1.5M8.5 9v5M10.5 9v5M4.5 5.5l.75 10h8.5l.75-10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
            />
          </div>
        </FloatingPortal>
      )}
    </>
  )
}

```

## src/components/ProjectPage.jsx
**Lines:** 393 | **Size:** 18313 bytes | **Modified:** 2026-04-19

```jsx
import { useState, useEffect, useRef } from 'react'
import SetupScreen from './SetupScreen.jsx'
import ProjectMoreMenu from './ProjectMoreMenu.jsx'

export default function ProjectPage({ project, onBack, onSetup, onShowFolder, onOpenVSCode, onDuplicate, onDelete, onStop, onRenamed }) {
  const [lines, setLines] = useState([])
  const [error, setError] = useState('')
  const [showLogs, setShowLogs] = useState(false)
  const [setupMode, setSetupMode] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const bottomRef = useRef(null)

  const { id, name, status, port } = project
  const isRunning = status === 'running'
  const isStopped = status === 'stopped'
  const isBusy = status === 'installing' || status === 'starting'

  // Auto-enter setup mode when project is busy (e.g. navigated to mid-start)
  useEffect(() => {
    if (isBusy) setSetupMode(true)
  }, [isBusy])

  // SSE for logs
  useEffect(() => {
    const es = new EventSource(`/api/projects/${id}/logs`)
    es.onmessage = (e) => setLines((prev) => [...prev, e.data])
    es.onerror = () => es.close()
    return () => es.close()
  }, [id])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  const callAction = async (action) => {
    setError('')
    try {
      const res = await fetch(`/api/projects/${id}/${action}`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || `Failed to ${action}.`)
      }
    } catch {
      setError('Network error. Make sure the dev server is running.')
    }
  }

  const callRestart = async () => {
    setError('')
    try {
      await fetch(`/api/projects/${id}/stop`, { method: 'POST' })
      setSetupMode(true)
    } catch {
      setError('Network error. Make sure the dev server is running.')
    }
  }

  const fmt = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      : null

  const createdDate = fmt(project.createdAt)
  const updatedDate = fmt(project.updatedAt)

  const startRename = () => { setNameDraft(name); setEditingName(true) }
  const submitRename = async () => {
    const newName = nameDraft.trim()
    setEditingName(false)
    if (!newName || newName === name) return
    try {
      const res = await fetch(`/api/projects/${id}/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to rename.')
      } else {
        onRenamed && onRenamed()
      }
    } catch {
      setError('Network error.')
    }
  }

  const renderTitle = () => editingName ? (
    <input
      autoFocus
      value={nameDraft}
      onChange={(e) => setNameDraft(e.target.value)}
      onBlur={submitRename}
      onKeyDown={(e) => {
        if (e.key === 'Enter') submitRename()
        if (e.key === 'Escape') setEditingName(false)
      }}
      className="text-3xl font-bold text-foreground-default tracking-tight leading-tight bg-background-secondary border border-border-focus rounded-md px-2 -mx-2 outline-none w-full"
    />
  ) : (
    <h1
      onDoubleClick={startRename}
      title="Double-click to rename"
      className="text-3xl font-bold text-foreground-default tracking-tight leading-tight cursor-text"
    >
      {name}
    </h1>
  )

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-6">
      {/* Breadcrumb */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-foreground-tertiary hover:text-foreground-default transition-colors w-fit cursor-pointer"
      >
        <svg width="20" height="20" viewBox="0 0 14 14" fill="none">
          <path d="M11 7H3M3 7L6.5 3.5M3 7L6.5 10.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to projects
      </button>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-background-destructive-subtle border border-border-destructive px-4 py-3">
          <p className="text-sm text-foreground-destructive flex-1">{error}</p>
          <button
            onClick={() => setError('')}
            className="text-foreground-destructive hover:text-foreground-default transition-colors shrink-0 cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {/* Main card */}
      <div className="bg-background-elevated rounded-2xl border border-border-default shadow-sm overflow-hidden">
        {setupMode ? (
          <SetupScreen
            inline
            projectId={id}
            projectName={name}
            onBack={() => setSetupMode(false)}
            onReady={() => setSetupMode(false)}
          />
        ) : (
        <div className="p-8 flex flex-col gap-10">

          {/* Project title + dates — shown when busy (no left/right split) */}
          {isBusy && (
            <div className="flex items-start justify-between gap-4">
              <div>
                {renderTitle()}
                <div className="flex items-center gap-2.5 mt-2 text-sm text-foreground-tertiary">
                  {createdDate && <span>Created {createdDate}</span>}
                  {updatedDate && updatedDate !== createdDate && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-foreground-tertiary/50 inline-block flex-shrink-0" />
                      <span>Modified {updatedDate}</span>
                    </>
                  )}
                </div>
              </div>
              <ProjectMoreMenu project={project} onDuplicate={onDuplicate} onDelete={onDelete} onStop={onStop} onShowFolder={onShowFolder} onOpenVSCode={onOpenVSCode} onRename={startRename} />
            </div>
          )}

          {/* ── Running state ── */}
          {isRunning && (
            <div className="flex items-start justify-between gap-6">
              {/* Left: title + status */}
              <div className="flex flex-col gap-3">
                <div>
                  {renderTitle()}
                  <div className="flex items-center gap-2.5 mt-2 text-sm text-foreground-tertiary">
                    {createdDate && <span>Created {createdDate}</span>}
                    {updatedDate && updatedDate !== createdDate && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-foreground-tertiary/50 inline-block flex-shrink-0" />
                        <span>Modified {updatedDate}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
                  </span>
                  <span className="text-xl font-semibold text-foreground-success">Project is running...</span>
                </div>
              </div>

              {/* Right: action cards */}
              <div className="flex flex-col gap-3 flex-shrink-0">
                <div className="flex justify-end">
                  <ProjectMoreMenu project={project} onDuplicate={onDuplicate} onDelete={onDelete} onStop={onStop} onShowFolder={onShowFolder} onOpenVSCode={onOpenVSCode} onRename={startRename} />
                </div>
                <div className="grid grid-cols-3 gap-3 auto-rows-[7rem]">
                  {port && (
                    <a
                      href={`http://localhost:${port}/protovibe.html`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="col-span-2 flex flex-col items-center justify-center gap-2.5 rounded-2xl bg-background-primary-subtle hover:shadow-md transition-all text-foreground-primary cursor-pointer"
                    >
                      <svg width="28" height="28" viewBox="0 0 19 19" fill="none">
                        <path d="M8.5 3.5H4a1.5 1.5 0 00-1.5 1.5v10A1.5 1.5 0 004 16.5h10A1.5 1.5 0 0015.5 15v-4.5M12 2.5h4.5V7M16 3L9 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="text-xs font-semibold">Open Protovibe editor</span>
                    </a>
                  )}

                  <button
                    onClick={() => callAction('stop')}
                    className="flex flex-col items-center justify-center gap-2.5 w-28 rounded-2xl bg-background-destructive-subtle hover:shadow-md transition-all text-foreground-destructive/50 hover:text-foreground-destructive cursor-pointer"
                  >
                    <svg width="28" height="28" viewBox="0 0 19 19" fill="none">
                      <rect x="5" y="5" width="9" height="9" rx="2" fill="currentColor" />
                    </svg>
                    <span className="text-xs font-semibold">Stop</span>
                  </button>

                  <button
                    onClick={callRestart}
                    className="flex flex-col items-center justify-center gap-2.5 w-28 rounded-2xl bg-background-secondary hover:bg-background-tertiary hover:shadow-md transition-all text-foreground-tertiary hover:text-foreground-default cursor-pointer"
                  >
                    <svg width="28" height="28" viewBox="0 0 19 19" fill="none">
                      <path d="M3 9.5a6.5 6.5 0 1 0 1.5-4.15M3 4v3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-xs font-semibold">Restart</span>
                  </button>

                  <button
                    onClick={onShowFolder}
                    className="flex flex-col items-center justify-center gap-2.5 w-28 rounded-2xl bg-background-secondary hover:bg-background-tertiary hover:shadow-md transition-all text-foreground-tertiary hover:text-foreground-default cursor-pointer"
                  >
                    <svg width="28" height="28" viewBox="0 0 19 19" fill="none">
                      <path d="M2.5 5.5C2.5 4.67 3.17 4 4 4H7.5l1.5 2H15c.83 0 1.5.67 1.5 1.5v7c0 .83-.67 1.5-1.5 1.5H4c-.83 0-1.5-.67-1.5-1.5V5.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-xs font-semibold">Show folder</span>
                  </button>

                  <button
                    onClick={onOpenVSCode}
                    className="flex flex-col items-center justify-center gap-2.5 w-28 rounded-2xl bg-background-secondary hover:bg-background-tertiary hover:shadow-md transition-all text-foreground-tertiary hover:text-foreground-default cursor-pointer"
                  >
                    <svg width="28" height="28" viewBox="0 0 19 19" fill="none">
                      <path d="M5.5 6L2 9.5 5.5 13M13.5 6L17 9.5 13.5 13M11 3.5l-3 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-xs font-semibold">VS Code</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Stopped state ── */}
          {isStopped && (
            <div className="flex items-start justify-between gap-6">
              {/* Left: title + status */}
              <div className="flex flex-col gap-3">
                <div>
                  {renderTitle()}
                  <div className="flex items-center gap-2.5 mt-2 text-sm text-foreground-tertiary">
                    {createdDate && <span>Created {createdDate}</span>}
                    {updatedDate && updatedDate !== createdDate && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-foreground-tertiary/50 inline-block flex-shrink-0" />
                        <span>Modified {updatedDate}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-foreground-disabled" />
                  </span>
                  <span className="text-xl font-semibold text-foreground-tertiary">Project is not running</span>
                </div>
              </div>

              {/* Right: action cards */}
              <div className="flex flex-col gap-3 flex-shrink-0">
                <div className="flex justify-end">
                  <ProjectMoreMenu project={project} onDuplicate={onDuplicate} onDelete={onDelete} onStop={onStop} onShowFolder={onShowFolder} onOpenVSCode={onOpenVSCode} onRename={startRename} />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSetupMode(true)}
                    className="flex flex-col items-center justify-center gap-2.5 w-full h-28 rounded-2xl bg-background-primary-subtle hover:shadow-md transition-all text-foreground-primary cursor-pointer"
                  >
                    <svg width="28" height="28" viewBox="0 0 19 19" fill="none">
                      <path d="M5 3.5l11 6-11 6V3.5z" fill="currentColor" />
                    </svg>
                    <span className="text-xs font-semibold">Run project</span>
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={onShowFolder}
                    className="flex flex-col items-center justify-center gap-2.5 w-28 h-28 rounded-2xl bg-background-secondary hover:bg-background-tertiary hover:shadow-md transition-all text-foreground-tertiary hover:text-foreground-default cursor-pointer"
                  >
                    <svg width="28" height="28" viewBox="0 0 19 19" fill="none">
                      <path d="M2.5 5.5C2.5 4.67 3.17 4 4 4H7.5l1.5 2H15c.83 0 1.5.67 1.5 1.5v7c0 .83-.67 1.5-1.5 1.5H4c-.83 0-1.5-.67-1.5-1.5V5.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-xs font-semibold">Show folder</span>
                  </button>

                  <button
                    onClick={onOpenVSCode}
                    className="flex flex-col items-center justify-center gap-2.5 w-28 h-28 rounded-2xl bg-background-secondary hover:bg-background-tertiary hover:shadow-md transition-all text-foreground-tertiary hover:text-foreground-default cursor-pointer"
                  >
                    <svg width="28" height="28" viewBox="0 0 19 19" fill="none">
                      <path d="M5.5 6L2 9.5 5.5 13M13.5 6L17 9.5 13.5 13M11 3.5l-3 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-xs font-semibold">VS Code</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Logs toggle — bottom left of card body */}
          <button
            onClick={() => setShowLogs((v) => !v)}
            className="flex items-center gap-2 text-sm text-foreground-tertiary hover:text-foreground-secondary transition-colors cursor-pointer w-fit"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 3.5h10M2 7h6M2 10.5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {showLogs ? 'Hide logs' : 'Show logs'}
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              className={`transition-transform duration-200 ${showLogs ? 'rotate-180' : ''}`}
            >
              <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        )}

        {!setupMode && (
        <>
        {/* Card footer: logs label */}
        {showLogs && (
        <div className="border-t border-border-default px-8 py-3.5 flex items-center justify-between">
          <span className="text-sm text-foreground-tertiary">Project logs</span>
          <button
            onClick={() => setLines([])}
            className="text-xs text-foreground-tertiary hover:text-foreground-secondary transition-colors cursor-pointer"
          >
            Clear
          </button>
        </div>
        )}

        {/* Logs panel */}
        {showLogs && (
          <div className="px-8 pb-8">
            <div className="h-72 overflow-y-auto rounded-xl bg-background-tertiary border border-border-default p-4 font-mono text-xs">
              {lines.length === 0 ? (
                <p className="text-foreground-tertiary italic">Waiting for output...</p>
              ) : (
                lines.map((line, i) => (
                  <p
                    key={i}
                    data-separator={line.startsWith('---')}
                    className="text-foreground-secondary leading-relaxed whitespace-pre-wrap break-all data-[separator=true]:text-foreground-tertiary data-[separator=true]:mt-2 data-[separator=true]:mb-1"
                  >
                    {line}
                  </p>
                ))
              )}
              <div ref={bottomRef} />
            </div>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  )
}

```

## src/components/SetupScreen.jsx
**Lines:** 216 | **Size:** 7368 bytes | **Modified:** 2026-04-19

```jsx
import { useState, useEffect, useRef } from 'react'

const FUNNY_MESSAGES = {
  creating: [
    'Copying template files...',
    'Laying the foundations...',
    'Carving out a new playground...',
  ],
  duplicating: [
    'Cloning your project...',
    'Making a photocopy of the template...',
    'Duplicating bits and bytes...',
  ],
  installing: [
    'Summoning node_modules from the void...',
    'Downloading the internet (just the good parts)...',
    'Teaching dependencies to get along...',
    'Negotiating with npm... this could take a while...',
    'Counting every single package...',
    'Making sure left-pad is included...',
    'Alphabetizing the electrons...',
  ],
  starting: [
    'Warming up the engines...',
    'Convincing Vite to cooperate...',
    'Almost there, pinky promise...',
    'Lighting the fuse...',
    'Polishing the pixels...',
  ],
}

const STAGE_LABELS = {
  creating: 'Creating project',
  duplicating: 'Duplicating project',
  installing: 'Installing dependencies',
  starting: 'Starting dev server',
  ready: 'Ready!',
  error: 'Something went wrong',
}

function Spinner() {
  return (
    <div className="w-12 h-12 rounded-full border-4 border-border-default border-t-primary animate-spin" />
  )
}

export default function SetupScreen({ projectId, projectName, onBack, onReady, inline = false, initialStage = 'installing' }) {
  const [stage, setStage] = useState(initialStage)
  const [funnyIndex, setFunnyIndex] = useState(0)
  const [logs, setLogs] = useState([])
  const [error, setError] = useState('')
  const [showLogs, setShowLogs] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const bottomRef = useRef(null)
  const esRef = useRef(null)

  const handleCancel = async () => {
    setCancelling(true)
    esRef.current?.close()
    if (projectId) {
      try {
        await fetch(`/api/projects/${projectId}/stop`, { method: 'POST' })
      } catch {}
    }
    onBack()
  }

  // Rotate funny messages
  useEffect(() => {
    if (stage === 'error' || stage === 'ready') return
    const interval = setInterval(() => {
      setFunnyIndex((i) => i + 1)
    }, 3000)
    return () => clearInterval(interval)
  }, [stage])

  // Sync stage with initialStage while projectId is not yet available
  useEffect(() => {
    if (!projectId) setStage(initialStage)
  }, [initialStage, projectId])

  // SSE connection to setup endpoint
  useEffect(() => {
    if (!projectId) return
    const es = new EventSource(`/api/projects/${projectId}/setup`)
    esRef.current = es

    es.addEventListener('stage', (e) => {
      const data = JSON.parse(e.data)
      setStage(data.stage)
      setFunnyIndex(0)
    })

    es.addEventListener('log', (e) => {
      const data = JSON.parse(e.data)
      setLogs((prev) => [...prev, data.text])
    })

    es.addEventListener('ready', () => {
      es.close()
      setStage('ready')
      onReady && onReady()
    })

    es.addEventListener('fail', (e) => {
      const data = JSON.parse(e.data)
      setError(data.message || 'Unknown error')
      setStage('error')
      es.close()
    })

    es.onerror = () => {
      es.close()
      setError('Connection to server lost')
      setStage('error')
    }

    return () => es.close()
  }, [projectId])

// Auto-scroll logs
  useEffect(() => {
    if (showLogs) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, showLogs])

  const messages = FUNNY_MESSAGES[stage] || []
  const funnyText = messages.length > 0 ? messages[funnyIndex % messages.length] : ''

  return (
    <div className={inline ? 'flex flex-col items-center gap-6 py-6' : 'fixed inset-0 z-50 bg-background-default flex flex-col items-center justify-center p-6'}>
      <div className="flex flex-col items-center gap-6 max-w-md w-full">
        {/* Spinner / ready / error icon */}
        {stage === 'ready' ? (
          <div className="relative w-12 h-12">
            <div className="w-12 h-12 rounded-full bg-background-success-subtle flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M6 12l4 4 8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground-success" />
              </svg>
            </div>
          </div>
        ) : stage === 'error' ? (
          <div className="w-12 h-12 rounded-full bg-background-destructive-subtle flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-foreground-destructive" />
            </svg>
          </div>
        ) : (
          <Spinner />
        )}

        {/* Project name */}
        <h2 className="text-lg font-semibold text-foreground-default">{projectName}</h2>

        {/* Stage label */}
        <p className="text-sm font-medium text-foreground-secondary">{STAGE_LABELS[stage]}</p>

        {/* Funny message */}
        {funnyText ? (
          <p className="text-xs text-foreground-tertiary text-center animate-pulse">{funnyText}</p>
        ) : null}

        {/* Error message */}
        {stage === 'error' && error && (
          <div className="w-full rounded-xl bg-background-destructive-subtle border border-border-destructive p-4">
            <p className="text-sm text-foreground-destructive">{error}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3 mt-2">
          {stage === 'error' ? (
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary-hover text-primary-foreground transition-colors cursor-pointer"
            >
              Back to projects
            </button>
          ) : stage !== 'ready' && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="px-4 py-2 rounded-lg text-sm font-medium text-foreground-secondary hover:text-foreground-default hover:bg-background-secondary transition-colors disabled:opacity-50 cursor-pointer"
            >
              {cancelling ? 'Cancelling...' : 'Cancel'}
            </button>
          )}
          <button
            onClick={() => setShowLogs((v) => !v)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-foreground-secondary hover:text-foreground-default hover:bg-background-secondary transition-colors cursor-pointer"
          >
            {showLogs ? 'Hide logs' : 'Show logs'}
          </button>
        </div>
      </div>

      {/* Collapsible log area */}
      {showLogs && (
        <div className={`mt-2 w-full max-h-64 overflow-y-auto rounded-xl bg-background-tertiary border border-border-default p-4 font-mono text-xs ${inline ? '' : 'max-w-2xl'}`}>
          {logs.length === 0 ? (
            <p className="text-foreground-tertiary italic">Waiting for output...</p>
          ) : (
            logs.map((line, i) => (
              <p key={i} className="text-foreground-secondary leading-relaxed whitespace-pre-wrap break-all">
                {line}
              </p>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}

```