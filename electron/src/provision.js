const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const {
  SHIM_DIR,
  MANAGER_DIR_NAME,
  TEMPLATE_DIR_NAME,
  bundleDir,
  defaultInstallRoot,
  readProjectPath,
  writeProjectPath,
} = require('./paths');
const { buildChildEnv } = require('./toolchain');

const WORKSPACES = [MANAGER_DIR_NAME, TEMPLATE_DIR_NAME];

function readVersion(pkgDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8')).version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

// Same 3-part comparison the in-app updater uses.
function semverGt(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

function runPnpm(args, cwd, onOutput = () => {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(path.join(SHIM_DIR, 'pnpm'), args, {
      cwd,
      env: buildChildEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    proc.stdout.on('data', (c) => onOutput(c.toString()));
    proc.stderr.on('data', (c) => onOutput(c.toString()));
    proc.on('error', reject);
    proc.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pnpm ${args.join(' ')} exited with code ${code}`));
    });
  });
}

function copyWorkspace(fromDir, toDir) {
  fs.rmSync(toDir, { recursive: true, force: true });
  fs.cpSync(fromDir, toDir, { recursive: true });
}

// Returns the install root, provisioning it if needed. `progress({step, line})`
// feeds the splash window.
async function ensureProvisioned(progress) {
  const bundle = bundleDir();
  const manifest = JSON.parse(fs.readFileSync(path.join(bundle, 'manifest.json'), 'utf8'));

  let root = readProjectPath();
  const forceReinstall = process.env.PROTOVIBE_REINSTALL === '1';
  const refreshed = new Set();

  if (!root) {
    // First run: extract the bundled source tree.
    root = defaultInstallRoot();
    progress({ step: `Installing Protovibe to ${root}…` });
    fs.mkdirSync(root, { recursive: true });
    for (const entry of fs.readdirSync(bundle)) {
      if (entry === 'manifest.json') continue;
      const target = path.join(root, entry);
      if (fs.existsSync(target)) continue; // never clobber user files
      fs.cpSync(path.join(bundle, entry), target, { recursive: true });
    }
    fs.mkdirSync(path.join(root, 'projects'), { recursive: true });
    writeProjectPath(root);
    for (const ws of WORKSPACES) refreshed.add(ws);
  } else {
    // Adopted an existing install (old launcher or previous shell run).
    // Refresh a workspace from the bundle only when the bundled version is
    // strictly newer — the in-app updater may have moved it ahead of us.
    for (const ws of WORKSPACES) {
      const installed = readVersion(path.join(root, ws));
      const bundled = manifest[ws] || '0.0.0';
      if (forceReinstall || semverGt(bundled, installed)) {
        progress({ step: `Updating ${ws} to ${bundled}…` });
        const nodeModules = path.join(root, ws, 'node_modules');
        const keepModules = fs.existsSync(nodeModules) && !forceReinstall;
        const stash = `${nodeModules}.keep`;
        if (keepModules) fs.renameSync(nodeModules, stash);
        try {
          copyWorkspace(path.join(bundle, ws), path.join(root, ws));
        } finally {
          if (keepModules && fs.existsSync(stash)) fs.renameSync(stash, nodeModules);
        }
        refreshed.add(ws);
      }
    }
  }

  for (const ws of WORKSPACES) {
    const wsDir = path.join(root, ws);
    if (!fs.existsSync(wsDir)) continue;
    const needsInstall =
      refreshed.has(ws) || !fs.existsSync(path.join(wsDir, 'node_modules'));
    if (!needsInstall) continue;
    progress({ step: `Installing dependencies for ${ws}… (first run can take a few minutes)` });
    const args = ['install', '--prefer-offline'];
    if (forceReinstall) args.push('--force');
    await runPnpm(args, wsDir, (line) => progress({ line }));
  }

  return root;
}

module.exports = { ensureProvisioned, runPnpm, semverGt };
