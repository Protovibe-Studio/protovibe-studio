const fs = require('node:fs');
const path = require('node:path');
const { SHIM_DIR, pnpmCjsPath, bundledGitRoot } = require('./paths');
const PRELOAD_SOURCE = require('./preload-source');

const PRELOAD_PATH = path.join(SHIM_DIR, 'pv-node-preload.cjs');

// node/pnpm shims for zero-dev-tools machines: `node` is our own Electron
// binary in ELECTRON_RUN_AS_NODE mode, `pnpm` is the bundled standalone
// pnpm.cjs run through it. Rewritten on every boot because process.execPath
// changes across app updates and install locations.
function writeShims() {
  fs.mkdirSync(SHIM_DIR, { recursive: true });
  fs.writeFileSync(PRELOAD_PATH, PRELOAD_SOURCE, 'utf8');
  const shims = {
    node: `#!/bin/sh
export ELECTRON_RUN_AS_NODE=1
exec "${process.execPath}" "$@"
`,
    pnpm: `#!/bin/sh
export ELECTRON_RUN_AS_NODE=1
exec "${process.execPath}" "${pnpmCjsPath()}" "$@"
`,
    npx: `#!/bin/sh
echo "npx is not available in the Protovibe shell toolchain" >&2
exit 1
`,
  };
  for (const [name, body] of Object.entries(shims)) {
    const p = path.join(SHIM_DIR, name);
    fs.writeFileSync(p, body, 'utf8');
    fs.chmodSync(p, 0o755);
  }
}

// Env for the vite child and every process it spawns. The shim dir leads PATH
// so `pnpm run dev` in projects, template postinstall, and vite bin shebangs
// all resolve the shims. ELECTRON_RUN_AS_NODE must NOT leak from here — the
// shims export it themselves, and inheriting it would break any child that
// happens to exec the Electron binary expecting app APIs.
function buildChildEnv(extra = {}) {
  const env = { ...process.env, ...extra };
  delete env.ELECTRON_RUN_AS_NODE;
  const basePath = env.PATH || '/usr/bin:/bin:/usr/sbin:/sbin';
  env.PATH = basePath.split(path.delimiter).includes(SHIM_DIR)
    ? basePath
    : `${SHIM_DIR}${path.delimiter}${basePath}`;
  env.NODE_NO_WARNINGS = '1';
  env.PROTOVIBE_NO_OPEN = '1';
  // Fix yargs' Electron-app misdetection for every node child (wrangler etc.).
  // Append so we never clobber an inherited NODE_OPTIONS. Quote for any space
  // in the home path; NODE_OPTIONS supports double-quoted values.
  const requireArg = `--require "${PRELOAD_PATH}"`;
  env.NODE_OPTIONS = env.NODE_OPTIONS ? `${env.NODE_OPTIONS} ${requireArg}` : requireArg;
  // Lets the manager adapt when running under the desktop shell (e.g. the
  // OAuth callback page offers a protovibe:// link back to the app).
  env.PROTOVIBE_SHELL = '1';
  // Point the manager's git resolver at the bundled, signed+notarized git tree
  // so it never downloads git at runtime or falls back to the Xcode CLT stub.
  // Only set in the packaged app; dev has no bundled tree and uses system git.
  const gitRoot = bundledGitRoot();
  if (gitRoot) env.PROTOVIBE_BUNDLED_GIT_ROOT = gitRoot;
  // Weak-network defaults for every pnpm in the tree (incl. the manager's own
  // `pnpm install` when creating projects): fewer parallel tarball downloads,
  // more retries. pnpm reads npm_config_* from the environment.
  env.npm_config_network_concurrency ??= '4';
  env.npm_config_fetch_retries ??= '5';
  env.npm_config_fetch_timeout ??= '120000';
  env.npm_config_fetch_retry_maxtimeout ??= '120000';
  return env;
}

module.exports = { writeShims, buildChildEnv };
