const fs = require('node:fs');
const path = require('node:path');

// Big trees (node_modules is ~100k files) intermittently fail to delete on
// macOS with ENOTEMPTY/EBUSY as the filesystem catches up. Node's own
// maxRetries only re-issues the final rmdir() of a directory — it never
// re-walks the children — so when a child is still lingering (or Finder /
// Spotlight dropped a .DS_Store back in) every one of those retries fails
// the same way and the update dies with "ENOTEMPTY: rmdir '.../plugins'".
// The outer loop here restarts the whole recursive delete, which re-scans
// and removes whatever is left, with backoff between attempts (~6s total).
// Every recursive delete in the shell goes through here.
const RM_OPTS = { recursive: true, force: true, maxRetries: 3, retryDelay: 100 };
const RM_RETRY_CODES = new Set(['ENOTEMPTY', 'EBUSY', 'EPERM', 'EMFILE', 'ENFILE']);
const RM_ATTEMPTS = 7;
const RM_BASE_DELAY_MS = 100;

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function rmTree(p, { attempt = (target) => fs.rmSync(target, RM_OPTS), sleep = sleepSync } = {}) {
  for (let i = 1; ; i++) {
    try {
      return attempt(p);
    } catch (err) {
      if (i >= RM_ATTEMPTS || !RM_RETRY_CODES.has(err.code)) throw err;
      sleep(RM_BASE_DELAY_MS * 2 ** (i - 1));
    }
  }
}

// Where a workspace's node_modules is parked while its sources are replaced.
// It MUST be a sibling of the workspace, never inside it: the refresh wipes
// the workspace dir, and a stash inside it gets wiped along with it. (That was
// a real bug: the stash sat at <ws>/node_modules.keep, so every refresh
// deleted the whole dependency tree — the "keep" never kept anything — and
// the huge delete is what died with ENOTEMPTY and failed the update.)
function stashPath(root, ws) {
  return path.join(root, `${ws}.node_modules.keep`);
}

// Replace <root>/<ws> with a copy of fromDir, carrying <ws>/node_modules
// across the swap (unless keepModules is false). Idempotent about leftovers
// from an interrupted earlier run.
function refreshWorkspace({ root, ws, fromDir, keepModules = true }) {
  const wsDir = path.join(root, ws);
  const nodeModules = path.join(wsDir, 'node_modules');
  const stash = stashPath(root, ws);

  // A stash left by a crash mid-refresh is the only copy of node_modules if
  // the workspace has none; otherwise a later install already replaced it.
  if (fs.existsSync(stash)) {
    if (fs.existsSync(nodeModules)) {
      rmTree(stash);
    } else {
      fs.mkdirSync(wsDir, { recursive: true });
      fs.renameSync(stash, nodeModules);
    }
  }

  const stashing = keepModules && fs.existsSync(nodeModules);
  if (stashing) fs.renameSync(nodeModules, stash);
  try {
    rmTree(wsDir);
    fs.cpSync(fromDir, wsDir, { recursive: true });
  } finally {
    // Runs on failure too, so a half-done refresh never strands the stash.
    if (stashing && fs.existsSync(stash)) {
      fs.mkdirSync(wsDir, { recursive: true });
      rmTree(nodeModules);
      fs.renameSync(stash, nodeModules);
    }
  }
}

module.exports = { refreshWorkspace, rmTree, stashPath };
