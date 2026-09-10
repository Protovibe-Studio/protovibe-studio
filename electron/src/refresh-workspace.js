const fs = require('node:fs');
const path = require('node:path');

// Big trees (node_modules is ~100k files) intermittently fail to delete on
// macOS with ENOTEMPTY/EBUSY as the filesystem catches up; Node retries those
// exact errors when asked to. Every recursive delete in the shell goes
// through here.
const RM_OPTS = { recursive: true, force: true, maxRetries: 5, retryDelay: 200 };
function rmTree(p) {
  fs.rmSync(p, RM_OPTS);
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
