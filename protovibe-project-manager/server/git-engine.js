// Git resolution + embedded git download + authenticated clone.
//
// Resolution order: PROTOVIBE_GIT_PATH env → system git on PATH → the shell's
// bundled git tree (PROTOVIBE_BUNDLED_GIT_ROOT) → embedded dugite-native
// binaries in ~/.protovibe/git/<version>/ (downloaded on first use). The
// home-dir location is a machine-global cache shared with other Protovibe
// tooling (project git sync), so it needs no per-repo gitignore.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn, execFileSync } from 'node:child_process'
import { pipeline } from 'node:stream/promises'
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)
const tar = require_('tar')

// Pinned from dugite's script/embedded-git.json (release v2.53.0-3). Asset
// names embed a build hash, so full URLs are pinned rather than constructed.
export const EMBEDDED_GIT_VERSION = '2.53.0'
const GIT_MANIFEST = {
  'darwin-x64': {
    url: 'https://github.com/desktop/dugite-native/releases/download/v2.53.0-3/dugite-native-v2.53.0-f49d009-macOS-x64.tar.gz',
    checksum: 'caf27c36b8834969550535bcd5e58186f970e080d1e175e76d9c1de3aac409ed',
  },
  'darwin-arm64': {
    url: 'https://github.com/desktop/dugite-native/releases/download/v2.53.0-3/dugite-native-v2.53.0-f49d009-macOS-arm64.tar.gz',
    checksum: 'e561cfc80c755e6f3e938653e81efcd025c9827a5b76dd42778b1159b3fab437',
  },
  'linux-x64': {
    url: 'https://github.com/desktop/dugite-native/releases/download/v2.53.0-3/dugite-native-v2.53.0-f49d009-ubuntu-x64.tar.gz',
    checksum: 'b3a85433c8dfde76d21b90938ad2f971653deff4340b1b4d347258c63250eafc',
  },
  'linux-arm64': {
    url: 'https://github.com/desktop/dugite-native/releases/download/v2.53.0-3/dugite-native-v2.53.0-f49d009-ubuntu-arm64.tar.gz',
    checksum: 'd562ad433ed0dc1907f44a92fc701597bc577c48d07fe69ee7adddfee836ef4c',
  },
  'win32-x64': {
    url: 'https://github.com/desktop/dugite-native/releases/download/v2.53.0-3/dugite-native-v2.53.0-f49d009-windows-x64.tar.gz',
    checksum: 'f843a87a693bfdabed83b8492bca59db6f64d1168c74d23e2c8dfb7388a97142',
  },
  'win32-arm64': {
    url: 'https://github.com/desktop/dugite-native/releases/download/v2.53.0-3/dugite-native-v2.53.0-f49d009-windows-arm64.tar.gz',
    checksum: 'e16e7023942499c093c8520a145bf20287a08d38d8d69197355df154a8598b06',
  },
}

const EMBEDDED_GIT_ROOT = path.join(os.homedir(), '.protovibe', 'git', EMBEDDED_GIT_VERSION)
const READY_MARKER = path.join(EMBEDDED_GIT_ROOT, '.ready')

function gitBinaryIn(root) {
  return process.platform === 'win32'
    ? path.join(root, 'cmd', 'git.exe')
    : path.join(root, 'bin', 'git')
}

function embeddedGitBinary() {
  return gitBinaryIn(EMBEDDED_GIT_ROOT)
}

// Env for a git child process using a dugite-native distribution rooted at
// `root` — mirrors what dugite sets so hooks, templates, and TLS work outside a
// system install. Shared by the runtime-downloaded tree (~/.protovibe/git) and
// the shell's bundled tree (PROTOVIBE_BUNDLED_GIT_ROOT).
function gitEnvFor(root) {
  const env = {}
  if (process.platform === 'win32') {
    env.PATH = `${path.join(root, 'cmd')};${path.join(root, 'mingw64', 'bin')};${process.env.PATH ?? ''}`
    env.GIT_EXEC_PATH = path.join(root, 'mingw64', 'libexec', 'git-core')
    env.GIT_TEMPLATE_DIR = path.join(root, 'mingw64', 'share', 'git-core', 'templates')
  } else {
    env.PATH = `${path.join(root, 'bin')}:${process.env.PATH ?? ''}`
    env.GIT_EXEC_PATH = path.join(root, 'libexec', 'git-core')
    env.GIT_TEMPLATE_DIR = path.join(root, 'share', 'git-core', 'templates')
    if (process.platform === 'linux') {
      env.GIT_SSL_CAINFO = path.join(root, 'ssl', 'cacert.pem')
    }
  }
  return env
}

function embeddedGitEnv() {
  return gitEnvFor(EMBEDDED_GIT_ROOT)
}

function probeGit(binary) {
  try {
    execFileSync(binary, ['--version'], { stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 })
    return true
  } catch {
    return false
  }
}

// Absolute path of the `git` on PATH, or null when there is none.
function whichGit() {
  const finder = process.platform === 'win32' ? 'where' : 'which'
  try {
    const out = execFileSync(finder, ['git'], { stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 })
    return out.toString().split(/\r?\n/)[0].trim() || null
  } catch {
    return null
  }
}

// macOS ships a /usr/bin/git stub that pops the Xcode Command Line Tools
// installer when the tools aren't present. `xcode-select -p` answers whether
// they are without triggering that dialog, and only the stub needs the check —
// a Homebrew or system-installed git elsewhere on PATH is always fine.
function systemGitIsSafeToProbe(binary) {
  if (process.platform !== 'darwin' || binary !== '/usr/bin/git') return true
  try {
    execFileSync('xcode-select', ['-p'], { stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 })
    return true
  } catch {
    return false
  }
}

// Returns { binary, env, source } or null when git isn't available yet.
// `env` contains only the git-specific extras — the caller merges it over
// process.env for the child.
export function resolveGit() {
  const override = process.env.PROTOVIBE_GIT_PATH
  if (override && probeGit(override)) {
    return { binary: override, env: {}, source: 'env' }
  }
  // System git wins over our own trees: it carries the user's credential
  // helpers and keychain logins, so pushing works with the account they're
  // already signed into. Ours are the fallback for machines without one.
  if (!override) {
    const systemBinary = whichGit()
    if (systemBinary && systemGitIsSafeToProbe(systemBinary) && probeGit(systemBinary)) {
      return { binary: systemBinary, env: {}, source: 'system' }
    }
  }
  // Bundled git — the shell packages a signed+notarized dugite tree and points
  // here, so a fresh Mac with no git still works and never sees the CLT dialog.
  const bundledRoot = process.env.PROTOVIBE_BUNDLED_GIT_ROOT
  if (bundledRoot) {
    const bundledBinary = gitBinaryIn(bundledRoot)
    if (probeGit(bundledBinary)) {
      return { binary: bundledBinary, env: gitEnvFor(bundledRoot), source: 'bundled' }
    }
  }
  if (fs.existsSync(READY_MARKER) && probeGit(embeddedGitBinary())) {
    return { binary: embeddedGitBinary(), env: embeddedGitEnv(), source: 'embedded' }
  }
  return null
}

// ── Embedded git download ────────────────────────────────────────────────────

let installPromise = null

export function ensureEmbeddedGit(onLog = () => {}) {
  // Serialize: two concurrent clones on a git-less machine share one download.
  if (!installPromise) {
    installPromise = installEmbeddedGit(onLog).catch((err) => {
      installPromise = null
      throw err
    })
  }
  return installPromise
}

async function installEmbeddedGit(onLog) {
  if (fs.existsSync(READY_MARKER)) return

  const key = `${process.platform}-${process.arch}`
  const asset = GIT_MANIFEST[key]
  if (!asset) {
    throw new Error(`No embedded git build available for ${key}. Install git manually or set PROTOVIBE_GIT_PATH.`)
  }

  // Clean any partial previous attempt.
  fs.rmSync(EMBEDDED_GIT_ROOT, { recursive: true, force: true })
  fs.mkdirSync(EMBEDDED_GIT_ROOT, { recursive: true })

  const archivePath = path.join(EMBEDDED_GIT_ROOT, 'git.tar.gz')
  try {
    onLog(`Downloading Git ${EMBEDDED_GIT_VERSION} for ${key}...`)
    const res = await fetch(asset.url, { redirect: 'follow' })
    if (!res.ok || !res.body) {
      throw new Error(`Download failed: server returned ${res.status}`)
    }

    const total = parseInt(res.headers.get('content-length') ?? '0', 10)
    let received = 0
    let lastPct = -1
    const progress = new TransformStream({
      transform(chunk, controller) {
        received += chunk.byteLength
        if (total) {
          const pct = Math.floor((received / total) * 100)
          if (pct >= lastPct + 10) {
            lastPct = pct
            onLog(`Downloading Git... ${pct}%`)
          }
        }
        controller.enqueue(chunk)
      },
    })
    await pipeline(res.body.pipeThrough(progress), fs.createWriteStream(archivePath))

    onLog('Verifying checksum...')
    const digest = await new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256')
      fs.createReadStream(archivePath)
        .on('data', (chunk) => hash.update(chunk))
        .on('end', () => resolve(hash.digest('hex')))
        .on('error', reject)
    })
    if (digest !== asset.checksum) {
      throw new Error(`Checksum mismatch for downloaded git (expected ${asset.checksum}, got ${digest}).`)
    }

    onLog('Extracting...')
    await tar.x({ file: archivePath, cwd: EMBEDDED_GIT_ROOT })
    fs.rmSync(archivePath, { force: true })

    if (!probeGit(embeddedGitBinary())) {
      throw new Error('Embedded git failed its post-install check.')
    }
    fs.writeFileSync(READY_MARKER, new Date().toISOString())
    onLog(`Git ${EMBEDDED_GIT_VERSION} installed.`)
  } catch (err) {
    fs.rmSync(EMBEDDED_GIT_ROOT, { recursive: true, force: true })
    throw err
  }
}

// ── Clone ────────────────────────────────────────────────────────────────────

// Spawns `git clone` authenticated via a one-shot HTTP header so the token
// never lands in .git/config or the remote URL. Returns the child process.
export function cloneRepo(git, { owner, repo, token, dest, onLog }) {
  const authHeader = `Authorization: Basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`
  const args = [
    '-c', 'credential.helper=',
    '-c', `http.extraHeader=${authHeader}`,
    'clone', '--progress',
    `https://github.com/${owner}/${repo}.git`,
    dest,
  ]

  onLog(`$ git clone https://github.com/${owner}/${repo}.git`)
  const child = spawn(git.binary, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    // Never shell:true — the token is in the argument list.
    env: { ...process.env, ...git.env, GIT_TERMINAL_PROMPT: '0' },
  })

  const redact = (text) => text.replaceAll(authHeader, 'Authorization: Basic ***')
  const forward = (chunk) => {
    // git writes progress with \r; normalize so each update is a line.
    redact(chunk.toString()).split(/[\r\n]+/).forEach((line) => {
      if (line.trim()) onLog(line)
    })
  }
  child.stdout.on('data', forward)
  child.stderr.on('data', forward)
  return child
}

// ── SSE endpoint: GET /api/github/clone?owner=&repo=&name= ───────────────────

let cloneInProgress = false

// deps: { readProjects, writeProjects, ensureProjectsDir, safePath,
//         generateId, sendJson, NAME_RE, readStoredAuth }
export async function handleClone(req, res, url, deps) {
  const { readProjects, writeProjects, ensureProjectsDir, safePath, generateId, sendJson, NAME_RE, readStoredAuth } = deps

  const owner = (url.searchParams.get('owner') || '').trim()
  const repo = (url.searchParams.get('repo') || '').trim()
  const name = (url.searchParams.get('name') || repo).trim()

  // All pre-flight failures are plain JSON — the SSE stream only starts once
  // the clone is actually going to run.
  const auth = readStoredAuth()
  if (!auth) return sendJson(res, 401, { error: 'github-auth-invalid' })
  if (!owner || !repo) return sendJson(res, 400, { error: 'owner and repo are required.' })
  if (!NAME_RE.test(name)) {
    return sendJson(res, 400, { error: 'Invalid name. Use only letters, numbers, hyphens, and underscores.' })
  }
  const destPath = safePath(name)
  if (!destPath) return sendJson(res, 400, { error: 'Invalid name.' })

  const projects = readProjects()
  if (fs.existsSync(destPath) || projects.some((p) => p.path === destPath)) {
    return sendJson(res, 409, { error: 'A project folder with that name already exists.', conflictName: name })
  }
  if (cloneInProgress) {
    return sendJson(res, 409, { error: 'Another clone is already in progress.' })
  }

  // dryRun: the UI runs all the pre-flight checks above as plain JSON before
  // opening the SSE stream — EventSource can't read a 4xx response body, so
  // collisions must be caught (and renamed inline) before this point.
  if (url.searchParams.get('dryRun') === '1') {
    return sendJson(res, 200, { ok: true, name })
  }
  cloneInProgress = true

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
  })
  res.write(':\n\n')

  let aborted = false
  let gitChild = null

  const send = (event, data) => {
    if (aborted) return
    try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`) } catch {}
  }
  const log = (text) => send('log', { text })
  const end = () => { try { res.end() } catch {} }

  const cleanupPartial = () => {
    try { fs.rmSync(destPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }) } catch {}
  }

  req.on('close', () => {
    if (aborted) return
    aborted = true
    if (gitChild?.pid) {
      try { gitChild.kill('SIGKILL') } catch {}
    }
  })

  try {
    // Stage 1: make sure we have a git binary at all.
    let git = resolveGit()
    if (!git) {
      send('stage', { stage: 'installing-git' })
      try {
        await ensureEmbeddedGit(log)
      } catch (err) {
        send('fail', { message: `Could not download Git: ${err.message} — install git yourself or set PROTOVIBE_GIT_PATH, then retry.` })
        return end()
      }
      git = resolveGit()
      if (!git) {
        send('fail', { message: 'Git installed but could not be resolved. Install git yourself or set PROTOVIBE_GIT_PATH.' })
        return end()
      }
    }
    if (aborted) return

    // Stage 2: clone.
    send('stage', { stage: 'cloning' })
    ensureProjectsDir()

    const exitCode = await new Promise((resolve, reject) => {
      gitChild = cloneRepo(git, { owner, repo, token: auth.token, dest: destPath, onLog: log })
      gitChild.on('error', reject)
      gitChild.on('exit', resolve)
    }).catch((err) => {
      log(`git error: ${err.message}`)
      return -1
    })
    gitChild = null

    if (aborted) {
      cleanupPartial()
      return
    }
    if (exitCode !== 0) {
      cleanupPartial()
      send('fail', { message: `git clone failed (exit code ${exitCode}). Check the logs for details.` })
      return end()
    }

    // Stage 3: register. Clones without protovibe-data.json would be ignored
    // by scanProjectsFolder, so write the registry entry explicitly.
    const isProtovibe = fs.existsSync(path.join(destPath, 'protovibe-data.json'))
    const entry = { id: generateId(), path: destPath, createdAt: new Date().toISOString() }
    const latest = readProjects()
    latest.push(entry)
    writeProjects(latest)

    send('done', { id: entry.id, name, isProtovibe })
    end()
  } catch (err) {
    cleanupPartial()
    send('fail', { message: err.message || 'Clone failed.' })
    end()
  } finally {
    cloneInProgress = false
  }
}
