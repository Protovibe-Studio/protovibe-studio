// Authenticated GitHub REST helpers for the "Connect to GitHub" flow:
// listing repos the Protovibe app installation can access, and probing a repo
// for protovibe-data.json before cloning.

import {
  readStoredAuth,
  clearStoredAuth,
  clearInstallRequested,
  GITHUB_APP_SLUG,
} from './github-auth.js'

export class GhAuthError extends Error {
  constructor(message = 'GitHub token is invalid or was revoked') {
    super(message)
    this.name = 'GhAuthError'
  }
}

export async function ghFetch(pathOrUrl, { method = 'GET', headers = {} } = {}) {
  const auth = readStoredAuth()
  if (!auth) throw new GhAuthError('Not connected to GitHub')

  const url = pathOrUrl.startsWith('https://') ? pathOrUrl : `https://api.github.com${pathOrUrl}`
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${auth.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'protovibe-project-manager',
      ...headers,
    },
    signal: AbortSignal.timeout(15000),
  })

  if (res.status === 401) throw new GhAuthError()
  return res
}

// Shared 401 handling: a revoked token means the stored file is useless —
// clear it so the UI's status poll immediately reports disconnected.
function handleGhError(res, err, sendJson) {
  if (err instanceof GhAuthError) {
    clearStoredAuth()
    return sendJson(res, 401, { error: 'github-auth-invalid' })
  }
  sendJson(res, 500, { error: err.message || 'GitHub request failed.' })
}

const PER_PAGE = 100
const MAX_PAGES = 10

async function listInstallationRepos(installationId) {
  const repos = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await ghFetch(`/user/installations/${installationId}/repositories?per_page=${PER_PAGE}&page=${page}`)
    if (!res.ok) throw new Error(`GitHub returned ${res.status} listing repositories`)
    const data = await res.json()
    const batch = data.repositories ?? []
    for (const r of batch) {
      repos.push({
        name: r.name,
        fullName: r.full_name,
        owner: r.owner?.login ?? '',
        private: !!r.private,
        defaultBranch: r.default_branch ?? 'main',
        updatedAt: r.pushed_at ?? r.updated_at ?? null,
        installationId,
      })
    }
    if (batch.length < PER_PAGE) break
  }
  return repos
}

export async function handleListRepos(_req, res, sendJson) {
  try {
    const auth = readStoredAuth()
    const instRes = await ghFetch(`/user/installations?per_page=${PER_PAGE}`)
    if (!instRes.ok) throw new Error(`GitHub returned ${instRes.status} listing installations`)
    const instData = await instRes.json()

    // Only installations of *our* app can grant clone access via this token.
    const installations = (instData.installations ?? [])
      .filter((i) => !GITHUB_APP_SLUG || i.app_slug === GITHUB_APP_SLUG)
      .map((i) => ({
        id: i.id,
        account: i.account?.login ?? '',
        accountType: i.account?.type ?? 'User',
        htmlUrl: i.html_url ?? null,
      }))

    const repoLists = await Promise.all(installations.map((i) => listInstallationRepos(i.id)))
    const repos = repoLists.flat().sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))

    // An org owner approving the request is the only signal we get that a
    // pending request is resolved — an installation simply shows up.
    if (installations.length > 0) clearInstallRequested()

    sendJson(res, 200, {
      installations,
      repos,
      installUrl: `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new`,
      installRequestedAt: installations.length === 0 ? (auth?.installRequestedAt ?? null) : null,
      login: auth?.login ?? null,
      avatarUrl: auth?.avatarUrl ?? null,
    })
  } catch (err) {
    handleGhError(res, err, sendJson)
  }
}

export async function handleValidateRepo(_req, res, url, sendJson) {
  const owner = url.searchParams.get('owner') || ''
  const repo = url.searchParams.get('repo') || ''
  const branch = url.searchParams.get('branch') || ''
  if (!owner || !repo) return sendJson(res, 400, { error: 'owner and repo are required.' })

  try {
    const ref = branch ? `?ref=${encodeURIComponent(branch)}` : ''
    const probe = await ghFetch(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/protovibe-data.json${ref}`)
    sendJson(res, 200, { isProtovibe: probe.ok })
  } catch (err) {
    handleGhError(res, err, sendJson)
  }
}
