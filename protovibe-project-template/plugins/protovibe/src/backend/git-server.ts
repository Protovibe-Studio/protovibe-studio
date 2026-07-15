// plugins/protovibe/src/backend/git-server.ts
// Backend endpoints for one-click Git sync (branch status, commit/pull/push).
// Mirrors the Cloudflare-publish async start/status model in server.ts: mutating
// ops (which touch the network and are slow) run in the background against an
// in-memory state object the frontend polls.

import { Connect, ViteDevServer } from 'vite';
import { spawnCmd } from './server';
import { resolveGit, type ResolvedGit } from './git-engine';
import {
  readStoredAuth,
  clearStoredAuth,
  authHeaderFor,
  redactAuth,
  parseGithubHttpsRemote,
  createUserRepo,
  checkRepoAccess,
  slugFromProjectName,
  probeManager,
  GhAuthError,
  RepoCreateForbiddenError,
  INSTALL_URL,
} from './github';

// ---------------------------------------------------------------------------
// git helpers
// ---------------------------------------------------------------------------

// Never let git block on an interactive auth prompt: with piped stdio (no TTY) an
// unauthenticated HTTPS/SSH remote would otherwise hang until the timeout. These
// make git fail fast with a readable error instead, which the UI turns into
// plain-language guidance.
function gitEnv(resolved: ResolvedGit): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ...resolved.env,
    GIT_TERMINAL_PROMPT: '0',
    GIT_SSH_COMMAND: 'ssh -oBatchMode=yes -oStrictHostKeyChecking=accept-new',
  };
}

/**
 * Auth args for network ops against the origin remote: when origin is a GitHub
 * HTTPS URL and the manager has stored a token, authenticate with a one-shot
 * HTTP header — the token never lands in .git/config. SSH and non-GitHub
 * remotes keep the machine's ambient credentials.
 */
async function originAuthHeader(): Promise<string | null> {
  const remote = (await gitTry(['remote', 'get-url', 'origin']))?.trim() || null;
  if (!parseGithubHttpsRemote(remote)) return null;
  const auth = readStoredAuth();
  return auth ? authHeaderFor(auth.token) : null;
}

/**
 * Run a git command, returning its combined stdout+stderr. Rejects on non-zero exit.
 * With `header`, authenticate the remote from the stored token instead of the
 * machine's credentials; without it, git uses whatever the machine already has.
 */
async function runGit(args: string[], timeoutMs: number, header: string | null): Promise<string> {
  const resolved = resolveGit();
  if (!resolved) throw new Error('Git isn’t available on this computer yet.');

  const fullArgs = header
    ? ['-c', 'credential.helper=', '-c', `http.extraHeader=${header}`, ...args]
    : args;

  try {
    // shell: false — the auth header travels in argv and must never hit a shell.
    return await spawnCmd(resolved.binary, fullArgs, { cwd: process.cwd(), env: gitEnv(resolved), timeoutMs, shell: false });
  } catch (err) {
    // spawnCmd errors embed child stderr, and op errors reach the UI — scrub the token.
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(header ? redactAuth(msg, header) : msg);
  }
}

/** Local (no-network) git command. Rejects on non-zero exit. */
async function git(args: string[], timeoutMs = 15_000): Promise<string> {
  return runGit(args, timeoutMs, null);
}

/** Local git command, returning its output or `null` if it exits non-zero / errors. */
async function gitTry(args: string[], timeoutMs = 15_000): Promise<string | null> {
  try {
    return await git(args, timeoutMs);
  } catch {
    return null;
  }
}

/**
 * Does this failure mean "these credentials aren't allowed here" rather than
 * "the operation itself was wrong"? Only the former is worth retrying with a
 * different credential — a non-fast-forward rejection, say, would fail
 * identically no matter who pushes.
 */
function isAccessDenied(text: string): boolean {
  return /\b(401|403)\b|not granted|permission denied|authentication failed|repository not found|access denied|could not read (username|password)|terminal prompts disabled/i.test(text);
}

/**
 * A network op against origin (fetch / push), with a credential fallback.
 *
 * We prefer the token the manager stored, but it only carries the GitHub App's
 * installation rights: if the app isn't installed on this repo, the token is
 * rejected even when the user's own machine can push it perfectly well (SSH key,
 * credential helper, gh CLI). So when the token is refused, retry once with the
 * machine's ambient credentials — that path succeeding is a real success, and
 * the user sees no error at all.
 *
 * If both are refused we surface the *token* error: it's the one that tells the
 * UI to send the user to the app-installation page.
 */
async function gitNet(args: string[], timeoutMs: number): Promise<string> {
  const header = await originAuthHeader();
  if (!header) return runGit(args, timeoutMs, null);

  try {
    return await runGit(args, timeoutMs, header);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!isAccessDenied(msg)) throw err;
    try {
      return await runGit(args, timeoutMs, null);
    } catch {
      throw err;
    }
  }
}

/** Network git op against origin, returning its output or `null` on failure. */
async function gitNetTry(args: string[], timeoutMs: number): Promise<string | null> {
  try {
    return await gitNet(args, timeoutMs);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// status (cheap, no network unless ?fetch=1)
// ---------------------------------------------------------------------------

export interface GitStatus {
  gitInstalled: boolean;
  isRepo: boolean;
  root: string;
  branch: string | null;
  hasUpstream: boolean;
  hasOrigin: boolean;
  dirty: boolean;
  changedCount: number;
  ahead: number;
  behind: number;
  remoteUrl: string | null;
  remoteKind: 'github-https' | 'ssh-or-other' | null;
}

const BASE_STATUS: Omit<GitStatus, 'gitInstalled' | 'isRepo'> = {
  root: process.cwd(),
  branch: null, hasUpstream: false, hasOrigin: false,
  dirty: false, changedCount: 0, ahead: 0, behind: 0, remoteUrl: null, remoteKind: null,
};

const GIT_MISSING: GitStatus = { ...BASE_STATUS, gitInstalled: false, isRepo: false };
const NOT_A_REPO: GitStatus = { ...BASE_STATUS, gitInstalled: true, isRepo: false };

async function readStatus(): Promise<GitStatus> {
  // Distinguish "git binary not installed" from "not a git repo" — a copywriter on
  // a fresh Mac may have neither. resolveGit() also finds the embedded git the
  // manager may have downloaded, so those machines don't see install guidance.
  if (resolveGit() == null) return GIT_MISSING;

  const inside = (await gitTry(['rev-parse', '--is-inside-work-tree']))?.trim();
  if (inside !== 'true') return NOT_A_REPO;

  const branch = (await gitTry(['rev-parse', '--abbrev-ref', 'HEAD']))?.trim() || null;

  const porcelain = (await gitTry(['status', '--porcelain'])) ?? '';
  const changedCount = porcelain.split('\n').filter((l) => l.trim().length > 0).length;

  // `--left-right --count @{u}...HEAD` prints "<behind>\t<ahead>" (left = upstream,
  // right = HEAD). Fails when no upstream is configured — that's our hasUpstream probe.
  let hasUpstream = false;
  let behind = 0;
  let ahead = 0;
  const counts = await gitTry(['rev-list', '--left-right', '--count', '@{u}...HEAD']);
  if (counts != null) {
    hasUpstream = true;
    const [b, a] = counts.trim().split(/\s+/).map((n) => Number(n) || 0);
    behind = b || 0;
    ahead = a || 0;
  }

  const remoteUrl = (await gitTry(['remote', 'get-url', 'origin']))?.trim() || null;
  const remoteKind = remoteUrl ? (parseGithubHttpsRemote(remoteUrl) ? 'github-https' as const : 'ssh-or-other' as const) : null;

  return { gitInstalled: true, isRepo: true, root: process.cwd(), branch, hasUpstream, hasOrigin: remoteUrl != null, dirty: changedCount > 0, changedCount, ahead, behind, remoteUrl, remoteKind };
}

// ---------------------------------------------------------------------------
// mutating ops — async start/status state machine
// ---------------------------------------------------------------------------

export type GitOp = 'sync' | 'commit' | 'pull' | 'push' | 'backup';
export type GitOpStatus = 'idle' | 'committing' | 'pulling' | 'pushing' | 'success' | 'error';

export interface GitOpState {
  status: GitOpStatus;
  message: string;
  op?: GitOp;
  resolvedConflict?: boolean;
  error?: string;
  /** The app installation doesn't cover this repo — send the user to installUrl. */
  needsInstall?: boolean;
  installUrl?: string;
  /** Set on backup success: the repo the project now lives in. */
  repoUrl?: string;
}

let gitOpState: GitOpState = { status: 'idle', message: '' };
let gitOpTimestamp = 0;

/** If an op wedges (crashed runner, killed process), treat it as stale so the UI can retry. */
const GIT_OP_STALE_MS = 5 * 60 * 1000;

function setGitOpState(state: GitOpState): void {
  gitOpState = state;
  gitOpTimestamp = Date.now();
}

function isGitBusy(): boolean {
  const active: GitOpStatus[] = ['committing', 'pulling', 'pushing'];
  if (!active.includes(gitOpState.status)) return false;
  if (Date.now() - gitOpTimestamp > GIT_OP_STALE_MS) {
    setGitOpState({ status: 'error', message: 'Previous operation timed out.' });
    return false;
  }
  return true;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Auto commit message: "Protovibe sync — YYYY-MM-DD HH:mm" (local time). */
function autoCommitMessage(): string {
  const d = new Date();
  return `Protovibe sync — ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Fresh machines often have no git identity configured, and `git commit` then
 * fails with "please tell me who you are" — which reads like an auth problem.
 * When the manager has a connected GitHub account, borrow its login for a
 * per-invocation identity instead of failing (noreply address, nothing written
 * to the user's git config).
 */
async function identityArgs(): Promise<string[]> {
  const email = (await gitTry(['config', 'user.email']))?.trim();
  if (email) return [];
  const login = readStoredAuth()?.login;
  if (!login) return [];
  return ['-c', `user.name=${login}`, '-c', `user.email=${login}@users.noreply.github.com`];
}

/** Stage everything and commit; returns false if there was nothing to commit. */
async function stageAndCommit(message: string): Promise<boolean> {
  await git(['add', '-A']);
  const staged = (await gitTry(['diff', '--cached', '--name-only']))?.trim();
  if (!staged) return false;
  await git([...(await identityArgs()), 'commit', '-m', message]);
  return true;
}

/**
 * Fetch remote work and rebase our local commits on top of it, with last-write-wins
 * on true same-line conflicts. Returns whether a conflict was auto-resolved.
 *
 * Two-phase so we can detect conflicts deterministically (a `-X theirs` rebase
 * resolves silently — it prints no "CONFLICT" — so grepping output is unreliable):
 *   1. Try a plain `git rebase @{u}`. If it succeeds, there was no overlap → false.
 *   2. If it stops on a conflict, abort and retry with `-X theirs` (during a rebase,
 *      "theirs" = the commits being replayed = our local edits), so the syncer wins.
 *      Success here means we overrode a conflicting edit → true.
 * A rebase that even `-X theirs` can't settle (e.g. rename/delete) aborts and rethrows.
 */
async function fetchAndRebase(): Promise<boolean> {
  await gitNet(['fetch'], 90_000);

  // Fast path: clean rebase (no overlapping edits, or nothing to integrate).
  try {
    await git(['rebase', '@{u}'], 60_000);
    return false;
  } catch {
    await gitTry(['rebase', '--abort']);
  }

  // Conflict path: replay our commits, resolving conflicting hunks in our favour.
  try {
    await git(['rebase', '-X', 'theirs', '@{u}'], 60_000);
    return true;
  } catch (err) {
    await gitTry(['rebase', '--abort']);
    throw err;
  }
}

async function runGitSync(): Promise<void> {
  try {
    setGitOpState({ status: 'committing', message: 'Saving your changes…', op: 'sync' });
    await stageAndCommit(autoCommitMessage());

    setGitOpState({ status: 'pulling', message: 'Getting the latest…', op: 'sync' });
    let resolvedConflict = false;
    try {
      resolvedConflict = await fetchAndRebase();
    } catch (err) {
      setGitOpState({
        status: 'error',
        message: 'Could not merge remote changes automatically. Ask your coding agent for help.',
        op: 'sync',
        error: String(err),
      });
      return;
    }

    setGitOpState({ status: 'pushing', message: 'Publishing…', op: 'sync' });
    await gitNet(['push'], 90_000);

    setGitOpState({
      status: 'success',
      message: resolvedConflict ? 'Synced — resolved a conflicting edit' : 'Synced',
      op: 'sync',
      resolvedConflict,
    });
  } catch (err) {
    setGitOpState({ status: 'error', message: 'Sync failed.', op: 'sync', error: String(err) });
  }
}

/**
 * "Add project to GitHub" — one click for a non-technical user takes a project
 * with no repo (or no remote) to a private GitHub repo with upstream tracking:
 * init if needed → commit → create the repo under the personal account → add
 * origin → authenticated push. From there the project can be shared, commented
 * on and synced. Reuses the same op state machine as sync.
 */
async function runBackup(): Promise<void> {
  try {
    if (!resolveGit()) {
      setGitOpState({ status: 'error', message: 'Git isn’t available on this computer yet.', op: 'backup' });
      return;
    }
    if (!readStoredAuth()) {
      setGitOpState({ status: 'error', message: 'Connect your GitHub account in the Protovibe app first.', op: 'backup' });
      return;
    }

    setGitOpState({ status: 'committing', message: 'Setting up your project…', op: 'backup' });
    const inside = (await gitTry(['rev-parse', '--is-inside-work-tree']))?.trim();
    if (inside !== 'true') await git(['init', '-b', 'main']);

    const committed = await stageAndCommit('Initial commit from Protovibe');
    if (!committed && (await gitTry(['rev-parse', 'HEAD'])) == null) {
      // Pristine tree with no history — push still needs a commit to send.
      await git([...(await identityArgs()), 'commit', '--allow-empty', '-m', 'Initial commit from Protovibe']);
    }

    let repoUrl: string | undefined;
    const existingRemote = (await gitTry(['remote', 'get-url', 'origin']))?.trim() || null;
    if (!existingRemote) {
      setGitOpState({ status: 'committing', message: 'Creating a private space on GitHub…', op: 'backup' });
      const repo = await createUserRepo(slugFromProjectName());
      // Plain URL — auth stays per-invocation, never in .git/config.
      await git(['remote', 'add', 'origin', `https://github.com/${repo.owner}/${repo.name}.git`]);
      repoUrl = repo.htmlUrl;
    } else {
      const parsed = parseGithubHttpsRemote(existingRemote);
      if (parsed) repoUrl = `https://github.com/${parsed.owner}/${parsed.repo}`;
    }

    setGitOpState({ status: 'pushing', message: 'Uploading your project…', op: 'backup' });
    try {
      await gitNet(['push', '-u', 'origin', 'HEAD'], 120_000);
    } catch (err) {
      // Neither the stored token nor the machine's own credentials could push.
      // A 403/404 on a GitHub HTTPS remote usually means the app installation
      // doesn't cover the repo (e.g. "only selected repositories" doesn't
      // auto-include a freshly created one). Confirm via the API so the UI can
      // send the user straight to the install page.
      const parsed = parseGithubHttpsRemote((await gitTry(['remote', 'get-url', 'origin']))?.trim() || null);
      if (parsed && readStoredAuth()) {
        try {
          const access = await checkRepoAccess(parsed.owner, parsed.repo);
          if (access === 'not-covered' || access === 'no-push') {
            setGitOpState({
              status: 'error',
              message: 'GitHub needs permission for this repository.',
              op: 'backup',
              needsInstall: true,
              installUrl: INSTALL_URL,
              error: String(err),
            });
            return;
          }
        } catch {}
      }
      throw err;
    }

    setGitOpState({ status: 'success', message: 'Your project is on GitHub', op: 'backup', repoUrl });
  } catch (err) {
    if (err instanceof RepoCreateForbiddenError) {
      setGitOpState({
        status: 'error',
        message: 'GitHub needs updated permissions for Protovibe before it can create repositories.',
        op: 'backup',
        needsInstall: true,
        installUrl: INSTALL_URL,
        error: String(err),
      });
      return;
    }
    if (err instanceof GhAuthError) {
      setGitOpState({ status: 'error', message: 'Your GitHub connection expired — reconnect in the Protovibe app.', op: 'backup', error: String(err) });
      return;
    }
    setGitOpState({ status: 'error', message: 'Couldn’t add this project to GitHub.', op: 'backup', error: String(err) });
  }
}

async function runManualOp(op: GitOp, message?: string): Promise<void> {
  try {
    if (op === 'commit') {
      setGitOpState({ status: 'committing', message: 'Committing…', op });
      const committed = await stageAndCommit((message && message.trim()) || autoCommitMessage());
      setGitOpState({ status: 'success', message: committed ? 'Committed' : 'Nothing to commit', op });
      return;
    }
    if (op === 'pull') {
      setGitOpState({ status: 'pulling', message: 'Getting the latest…', op });
      let resolvedConflict = false;
      try {
        resolvedConflict = await fetchAndRebase();
      } catch (err) {
        setGitOpState({ status: 'error', message: 'Could not merge remote changes automatically.', op, error: String(err) });
        return;
      }
      setGitOpState({ status: 'success', message: resolvedConflict ? 'Pulled — resolved a conflicting edit' : 'Pulled', op, resolvedConflict });
      return;
    }
    if (op === 'push') {
      setGitOpState({ status: 'pushing', message: 'Publishing…', op });
      await gitNet(['push'], 90_000);
      setGitOpState({ status: 'success', message: 'Pushed', op });
      return;
    }
    if (op === 'backup') {
      await runBackup();
      return;
    }
    // op === 'sync'
    await runGitSync();
  } catch (err) {
    setGitOpState({ status: 'error', message: `${op} failed.`, op, error: String(err) });
  }
}

// ---------------------------------------------------------------------------
// middleware registration
// ---------------------------------------------------------------------------

function sendJson(res: Parameters<Connect.NextHandleFunction>[1], body: unknown, statusCode = 200): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export function registerGitMiddleware(server: ViteDevServer): void {
  // GET /__git-status[?fetch=1]
  server.middlewares.use('/__git-status', async (req, res) => {
    try {
      const url = new URL(req.url || '', 'http://localhost');
      if (url.searchParams.get('fetch') === '1') {
        await gitNetTry(['fetch'], 20_000);
      }
      sendJson(res, await readStatus());
    } catch (err) {
      sendJson(res, { ...NOT_A_REPO, error: String(err) }, 500);
    }
  });

  // POST /__git-op-start  { op, message? }
  server.middlewares.use('/__git-op-start', (req, res) => {
    if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405);
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try {
        const { op, message } = JSON.parse(body || '{}') as { op?: GitOp; message?: string };
        if (!op || !['sync', 'commit', 'pull', 'push', 'backup'].includes(op)) {
          return sendJson(res, { error: 'Invalid op' }, 400);
        }
        if (isGitBusy()) {
          return sendJson(res, { error: 'A git operation is already in progress.' }, 409);
        }
        // Mark busy synchronously so the frontend's first status poll observes an
        // active state (same reasoning as the Cloudflare publish handler).
        setGitOpState({ status: 'committing', message: 'Starting…', op });
        runManualOp(op, message).catch((err) => {
          setGitOpState({ status: 'error', message: 'Unexpected error.', op, error: String(err) });
        });
        sendJson(res, { success: true });
      } catch (err) {
        sendJson(res, { error: String(err) }, 500);
      }
    });
  });

  // GET /__git-op-status
  server.middlewares.use('/__git-op-status', (_req, res) => {
    sendJson(res, gitOpState);
  });

  // GET /__github-status[?probe=1]
  // Plain form is a cheap token-file read (safe to poll while the user finishes
  // connecting in the manager); probe=1 additionally locates a running manager
  // for the "Connect GitHub" deeplink.
  server.middlewares.use('/__github-status', async (req, res) => {
    try {
      const url = new URL(req.url || '', 'http://localhost');
      const auth = readStoredAuth();
      const out: Record<string, unknown> = {
        connected: !!auth,
        login: auth?.login ?? null,
        avatarUrl: auth?.avatarUrl ?? null,
        installUrl: INSTALL_URL,
      };
      if (url.searchParams.get('probe') === '1') {
        const manager = await probeManager();
        out.managerReachable = manager.reachable;
        out.managerUrl = manager.url;
      }
      sendJson(res, out);
    } catch (err) {
      sendJson(res, { error: String(err) }, 500);
    }
  });

  // POST /__github-logout — forget the shared token (logs the manager out too).
  server.middlewares.use('/__github-logout', (req, res) => {
    if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405);
    clearStoredAuth();
    sendJson(res, { ok: true });
  });

  // GET /__github-repo-access — can the stored token see and push to origin?
  server.middlewares.use('/__github-repo-access', async (_req, res) => {
    try {
      const remote = (await gitTry(['remote', 'get-url', 'origin']))?.trim() || null;
      if (!remote) return sendJson(res, { state: 'no-remote', installUrl: INSTALL_URL });
      const parsed = parseGithubHttpsRemote(remote);
      if (!parsed) return sendJson(res, { state: 'not-github', installUrl: INSTALL_URL });
      try {
        const state = await checkRepoAccess(parsed.owner, parsed.repo);
        sendJson(res, { state, owner: parsed.owner, repo: parsed.repo, installUrl: INSTALL_URL });
      } catch (err) {
        if (err instanceof GhAuthError) {
          return sendJson(res, { state: 'not-connected', tokenInvalid: true, installUrl: INSTALL_URL });
        }
        throw err;
      }
    } catch (err) {
      sendJson(res, { error: String(err) }, 500);
    }
  });
}
