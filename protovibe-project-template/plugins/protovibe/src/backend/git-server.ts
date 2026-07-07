// plugins/protovibe/src/backend/git-server.ts
// Backend endpoints for one-click Git sync (branch status, commit/pull/push).
// Mirrors the Cloudflare-publish async start/status model in server.ts: mutating
// ops (which touch the network and are slow) run in the background against an
// in-memory state object the frontend polls.

import { Connect, ViteDevServer } from 'vite';
import { spawnCmd } from './server';

// ---------------------------------------------------------------------------
// git helpers
// ---------------------------------------------------------------------------

/** Run a git command, returning its combined stdout+stderr. Rejects on non-zero exit. */
function git(args: string[], timeoutMs = 15_000): Promise<string> {
  return spawnCmd('git', args, { cwd: process.cwd(), timeoutMs });
}

/** Run a git command, returning its output or `null` if it exits non-zero / errors. */
async function gitTry(args: string[], timeoutMs = 15_000): Promise<string | null> {
  try {
    return await git(args, timeoutMs);
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
  branch: string | null;
  hasUpstream: boolean;
  dirty: boolean;
  changedCount: number;
  ahead: number;
  behind: number;
  remoteUrl: string | null;
}

const BASE_STATUS: Omit<GitStatus, 'gitInstalled' | 'isRepo'> = {
  branch: null, hasUpstream: false,
  dirty: false, changedCount: 0, ahead: 0, behind: 0, remoteUrl: null,
};

const GIT_MISSING: GitStatus = { ...BASE_STATUS, gitInstalled: false, isRepo: false };
const NOT_A_REPO: GitStatus = { ...BASE_STATUS, gitInstalled: true, isRepo: false };

async function readStatus(): Promise<GitStatus> {
  // Distinguish "git binary not installed" from "not a git repo" — a copywriter on
  // a fresh Mac may have neither. `git --version` failing (ENOENT / not recognized)
  // means the binary is absent; the UI surfaces install guidance in that case.
  const version = await gitTry(['--version'], 5_000);
  if (version == null) return GIT_MISSING;

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

  return { gitInstalled: true, isRepo: true, branch, hasUpstream, dirty: changedCount > 0, changedCount, ahead, behind, remoteUrl };
}

// ---------------------------------------------------------------------------
// mutating ops — async start/status state machine
// ---------------------------------------------------------------------------

export type GitOp = 'sync' | 'commit' | 'pull' | 'push';
export type GitOpStatus = 'idle' | 'committing' | 'pulling' | 'pushing' | 'success' | 'error';

export interface GitOpState {
  status: GitOpStatus;
  message: string;
  op?: GitOp;
  resolvedConflict?: boolean;
  error?: string;
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

/** Stage everything and commit; returns false if there was nothing to commit. */
async function stageAndCommit(message: string): Promise<boolean> {
  await git(['add', '-A']);
  const staged = (await gitTry(['diff', '--cached', '--name-only']))?.trim();
  if (!staged) return false;
  await git(['commit', '-m', message]);
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
  await git(['fetch'], 90_000);

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
        message: 'Could not merge remote changes automatically. Ask a developer to help.',
        op: 'sync',
        error: String(err),
      });
      return;
    }

    setGitOpState({ status: 'pushing', message: 'Publishing…', op: 'sync' });
    await git(['push'], 90_000);

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
      await git(['push'], 90_000);
      setGitOpState({ status: 'success', message: 'Pushed', op });
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
        await gitTry(['fetch'], 20_000);
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
        if (!op || !['sync', 'commit', 'pull', 'push'].includes(op)) {
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
}
