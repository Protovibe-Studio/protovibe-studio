// plugins/protovibe/src/backend/github.ts
// GitHub integration for in-project git sync. Shares ~/.protovibe conventions
// with the Protovibe project manager (which owns the OAuth flow and the token
// file) without any runtime coupling — see the manager's server/github-auth.js
// and server/github-api.js for the other side of these conventions. The small
// helpers are deliberately duplicated: no shared package exists between the
// template plugin and the manager.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const GITHUB_APP_SLUG = process.env.PROTOVIBE_GITHUB_APP_SLUG || 'protovibe-studio-for-github';
export const INSTALL_URL = `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new`;

const TOKEN_FILE = path.join(os.homedir(), '.protovibe', 'github.json');

export interface StoredAuth {
  token: string;
  login: string | null;
  avatarUrl: string | null;
}

/**
 * Reads the token the manager stored after "Connect to GitHub". Read fresh on
 * every call so a (re)connect in the manager is picked up immediately. Don't
 * delete this file on API errors (an invalid token is the manager's to clear) —
 * only clearStoredAuth(), i.e. an explicit user log-out, removes it.
 */
export function readStoredAuth(): StoredAuth | null {
  try {
    const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
    if (typeof data?.token === 'string' && data.token) {
      return { token: data.token, login: data.login ?? null, avatarUrl: data.avatarUrl ?? null };
    }
  } catch {}
  return null;
}

/** Explicit user log-out: forgets the machine-wide token (manager included). */
export function clearStoredAuth(): void {
  try { fs.unlinkSync(TOKEN_FILE); } catch {}
}

// ---------------------------------------------------------------------------
// GitHub REST
// ---------------------------------------------------------------------------

/** The token was rejected (401) — the user must reconnect via the manager. */
export class GhAuthError extends Error {
  constructor() {
    super('github-auth-invalid');
    this.name = 'GhAuthError';
  }
}

async function ghFetch(token: string, apiPath: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`https://api.github.com${apiPath}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'vite-plugin-protovibe',
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 401) throw new GhAuthError();
  return res;
}

// ---------------------------------------------------------------------------
// Auth header for git-over-HTTPS + redaction
// ---------------------------------------------------------------------------

/** One-shot header for `git -c http.extraHeader=...` — never lands in .git/config. */
export function authHeaderFor(token: string): string {
  return `Authorization: Basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`;
}

/** Scrub the auth header (and its bare base64 value) from any outbound text. */
export function redactAuth(text: string, header: string): string {
  const b64 = header.slice('Authorization: Basic '.length);
  return text.replaceAll(header, 'Authorization: Basic ***').replaceAll(b64, '***');
}

// ---------------------------------------------------------------------------
// Repos
// ---------------------------------------------------------------------------

export interface CreatedRepo {
  owner: string;
  name: string;
  htmlUrl: string;
}

/**
 * The GitHub App lacks (or the user hasn't approved) the Administration
 * permission that `POST /user/repos` needs.
 */
export class RepoCreateForbiddenError extends Error {
  constructor() {
    super('GitHub would not let Protovibe create a repository for this account.');
    this.name = 'RepoCreateForbiddenError';
  }
}

/**
 * Creates a private repo under the connected user's personal account. On a
 * name collision, retries with -2, -3… so backup stays one-click.
 */
export async function createUserRepo(baseName: string): Promise<CreatedRepo> {
  const auth = readStoredAuth();
  if (!auth) throw new GhAuthError();

  for (let attempt = 1; attempt <= 5; attempt++) {
    const name = attempt === 1 ? baseName : `${baseName}-${attempt}`;
    const res = await ghFetch(auth.token, '/user/repos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, private: true }),
    });
    if (res.ok) {
      const repo = await res.json();
      return { owner: repo.owner?.login ?? auth.login ?? '', name: repo.name ?? name, htmlUrl: repo.html_url ?? '' };
    }
    if (res.status === 403 || res.status === 404) throw new RepoCreateForbiddenError();
    if (res.status === 422) {
      const data = await res.json().catch(() => ({} as any));
      const nameTaken = JSON.stringify(data.errors ?? data).includes('already exists');
      if (nameTaken) continue;
      throw new Error(data.message || 'GitHub rejected the repository name.');
    }
    throw new Error(`GitHub returned ${res.status} creating the repository.`);
  }
  throw new Error(`Could not find a free repository name near “${baseName}”.`);
}

export type RepoAccess = 'ok' | 'no-push' | 'not-covered' | 'not-connected';

/**
 * Can the stored token see and push to owner/repo? 404 (and 403) mean the app
 * installation doesn't cover the repo — the fix is the INSTALL_URL page.
 */
export async function checkRepoAccess(owner: string, repo: string): Promise<RepoAccess> {
  const auth = readStoredAuth();
  if (!auth) return 'not-connected';
  const res = await ghFetch(auth.token, `/repos/${owner}/${repo}`);
  if (res.status === 404 || res.status === 403) return 'not-covered';
  if (!res.ok) throw new Error(`GitHub returned ${res.status} checking repository access.`);
  const data = await res.json();
  return data.permissions?.push ? 'ok' : 'no-push';
}

/** Parses https://github.com/owner/repo(.git); SSH / non-GitHub → null. */
export function parseGithubHttpsRemote(url: string | null): { owner: string; repo: string } | null {
  const m = url?.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  return m ? { owner: m[1], repo: m[2] } : null;
}

/** Repo name derived from the project's display name in protovibe-data.json. */
export function slugFromProjectName(): string {
  let name = '';
  try {
    const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'protovibe-data.json'), 'utf-8'));
    name = String(data['project-name'] ?? '');
  } catch {}
  const slug = name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-{2,}/g, '-').replace(/^[-.]+|[-.]+$/g, '');
  return slug || 'protovibe-project';
}

// ---------------------------------------------------------------------------
// Manager probe (for the "Connect GitHub" deeplink)
// ---------------------------------------------------------------------------

/**
 * Only the manager can complete the OAuth flow (its callback URL is pinned to
 * its own port), so connecting is always a deeplink to the manager SPA. The
 * manager tells us where it is via PROTOVIBE_MANAGER_URL when it launched this
 * dev server; standalone projects fall back to probing the manager's usual
 * ports.
 */
export async function probeManager(): Promise<{ reachable: boolean; url: string | null }> {
  const candidates = process.env.PROTOVIBE_MANAGER_URL
    ? [process.env.PROTOVIBE_MANAGER_URL.replace(/\/$/, '')]
    : [5173, 5174, 5175, 5176].map((p) => `http://127.0.0.1:${p}`);

  for (const base of candidates) {
    try {
      const res = await fetch(`${base}/api/github/status`, { signal: AbortSignal.timeout(800) });
      if (!res.ok) continue;
      const data = await res.json().catch(() => null);
      if (data && typeof data.connected === 'boolean') return { reachable: true, url: base };
    } catch {}
  }
  return { reachable: false, url: null };
}
