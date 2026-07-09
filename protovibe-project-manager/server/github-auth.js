// GitHub App OAuth for "Connect to GitHub".
//
// The manager never sees the app's client secret: the browser authorizes on
// github.com, GitHub redirects back to /api/github/oauth/callback on this
// local server, and the code→token exchange is delegated to the
// protovibe-oauth-worker (see ../../protovibe-oauth-worker/README.md).
//
// The resulting user token is stored in ~/.protovibe/github.json so other
// Protovibe tooling (e.g. a project's git sync plugin) can share it.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'

// Filled in after creating the GitHub App + deploying the worker — see the
// setup checklist in protovibe-oauth-worker/README.md. Env vars override for
// local testing against a dev worker or a test app.
const DEFAULT_CLIENT_ID = 'Iv23livuSUxZGL9QGc6M'
const DEFAULT_APP_SLUG = 'protovibe-studio-for-github'
const DEFAULT_WORKER_URL = 'https://protovibe-oauth.protovibe-studio.workers.dev'

export const GITHUB_CLIENT_ID = process.env.PROTOVIBE_GITHUB_CLIENT_ID || DEFAULT_CLIENT_ID
export const GITHUB_APP_SLUG = process.env.PROTOVIBE_GITHUB_APP_SLUG || DEFAULT_APP_SLUG
const OAUTH_WORKER_URL = process.env.PROTOVIBE_OAUTH_WORKER_URL || DEFAULT_WORKER_URL

// The GitHub App registers http://127.0.0.1:5173/... as its callback, but
// GitHub does not validate the PORT of loopback redirect URIs — so when 5173
// is taken and Vite picks another port, we send the actual port and the
// callback still lands on this server instance.
function callbackUrl(req) {
  const hostHeader = req.headers.host ?? '127.0.0.1:5173'
  const port = hostHeader.split(':')[1] ?? '5173'
  return `http://127.0.0.1:${port}/api/github/oauth/callback`
}

const PROTOVIBE_HOME = path.join(os.homedir(), '.protovibe')
const TOKEN_FILE = path.join(PROTOVIBE_HOME, 'github.json')

// ── Token file ───────────────────────────────────────────────────────────────

export function readStoredAuth() {
  try {
    const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'))
    if (typeof data?.token === 'string' && data.token) return data
  } catch {}
  return null
}

export function storedGithubToken() {
  return readStoredAuth()?.token ?? null
}

function writeStoredAuth(data) {
  fs.mkdirSync(PROTOVIBE_HOME, { recursive: true })
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2), { mode: 0o600 })
  // mode in writeFileSync only applies on create — enforce on rewrite too.
  try { fs.chmodSync(TOKEN_FILE, 0o600) } catch {}
}

export function clearStoredAuth() {
  try { fs.unlinkSync(TOKEN_FILE) } catch {}
}

// ── CSRF state ───────────────────────────────────────────────────────────────

const STATE_TTL_MS = 10 * 60 * 1000
const pendingStates = new Map() // state → expiry timestamp

function createState() {
  const state = crypto.randomBytes(24).toString('hex')
  pendingStates.set(state, Date.now() + STATE_TTL_MS)
  return state
}

function consumeState(state) {
  // Prune expired states while we're here.
  const now = Date.now()
  for (const [s, exp] of pendingStates) {
    if (exp < now) pendingStates.delete(s)
  }
  if (!state || !pendingStates.has(state)) return false
  pendingStates.delete(state)
  return true
}

// ── Handlers ─────────────────────────────────────────────────────────────────

export function handleOauthStart(req, res, sendJson) {
  const state = createState()
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: callbackUrl(req),
    state,
  })
  sendJson(res, 200, { url: `https://github.com/login/oauth/authorize?${params}` })
}

function callbackPage(title, body, { backToApp = false } = {}) {
  // Under the desktop shell the OAuth flow runs in the user's real browser
  // (passkeys, saved passwords); offer a protovibe:// link that brings the
  // app back to the front. The shell's single-instance handler just focuses.
  const backLink = backToApp
    ? `<p><a href="protovibe://">Back to Protovibe</a></p>
<script>setTimeout(() => { location.href = 'protovibe://' }, 400)</script>`
    : ''
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 90vh; margin: 0; color: #333; background: #fafafa; }
  @media (prefers-color-scheme: dark) { body { color: #ddd; background: #1a1a1a; } }
  main { text-align: center; padding: 2rem; }
  h1 { font-size: 1.1rem; }
  p { font-size: 0.9rem; opacity: 0.7; }
  a { color: inherit; }
</style></head>
<body><main><h1>${title}</h1><p>${body}</p>${backLink}</main>
<script>setTimeout(() => window.close(), 1500)</script>
</body></html>`
}

function sendHtml(res, status, html) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(html)
}

export async function handleOauthCallback(req, res, url) {
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (!consumeState(state)) {
    return sendHtml(res, 400, callbackPage('Connection failed', 'This sign-in link expired or was already used. Go back to Protovibe and try again.'))
  }
  if (!code) {
    return sendHtml(res, 400, callbackPage('Connection failed', 'GitHub did not return an authorization code. Go back to Protovibe and try again.'))
  }

  // Exchange the code via the worker (which holds the client secret).
  let token
  try {
    const exchangeRes = await fetch(`${OAUTH_WORKER_URL}/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      signal: AbortSignal.timeout(15000),
    })
    const data = await exchangeRes.json().catch(() => ({}))
    if (!exchangeRes.ok || !data.access_token) {
      throw new Error(data.error || `exchange failed (${exchangeRes.status})`)
    }
    token = data.access_token
  } catch (err) {
    return sendHtml(res, 502, callbackPage('Connection failed', `Could not complete the token exchange: ${err.message}. Go back to Protovibe and try again.`))
  }

  // Who did we just connect? Stored so the UI can show the account chip
  // without an extra API round-trip.
  let login = null
  let avatarUrl = null
  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'protovibe-project-manager',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (userRes.ok) {
      const user = await userRes.json()
      login = user.login ?? null
      avatarUrl = user.avatar_url ?? null
    }
  } catch {}

  try {
    writeStoredAuth({ token, login, avatarUrl, connectedAt: new Date().toISOString() })
  } catch (err) {
    return sendHtml(res, 500, callbackPage('Connection failed', `Could not save the token: ${err.message}`))
  }

  sendHtml(res, 200, callbackPage(
    login ? `Connected as ${login}` : 'Connected to GitHub',
    'You can close this tab and return to Protovibe.',
    { backToApp: process.env.PROTOVIBE_SHELL === '1' },
  ))
}

export function handleStatus(_req, res, sendJson) {
  const auth = readStoredAuth()
  if (!auth) return sendJson(res, 200, { connected: false })
  sendJson(res, 200, { connected: true, login: auth.login ?? null, avatarUrl: auth.avatarUrl ?? null })
}

export function handleLogout(_req, res, sendJson) {
  clearStoredAuth()
  sendJson(res, 200, { ok: true })
}
