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

// Fresh machines (VMs especially) hit ERR_SOCKET_TIMEOUT with pnpm's
// defaults (16 parallel tarball downloads, 60s timeout, 2 retries) —
// throttle and retry harder so first-run installs survive weak networks.
const INSTALL_NETWORK_FLAGS = [
  '--network-concurrency=4',
  '--fetch-retries=5',
  '--fetch-retry-maxtimeout=120000',
  '--fetch-timeout=120000',
];

function runPnpm(args, cwd, onOutput = () => {}) {
  if (args.includes('install')) args = [...args, ...INSTALL_NETWORK_FLAGS];
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

// Fail fast when offline instead of letting pnpm grind through minutes of
// socket-timeout retries that look like a hang on the splash screen.
function checkOnline(timeoutMs = 5_000) {
  return new Promise((resolve) => {
    const https = require('node:https');
    const req = https.get('https://registry.npmjs.org/-/ping', { timeout: timeoutMs }, (res) => {
      res.resume();
      resolve(true);
    });
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
  });
}

const STAMP_FILE = '.protovibe-install-stamp';

function stampValue(wsDir) {
  return `v1:${readVersion(wsDir)}`;
}

function readStamp(wsDir) {
  try {
    return fs.readFileSync(path.join(wsDir, 'node_modules', STAMP_FILE), 'utf8').trim();
  } catch {
    return null;
  }
}

function writeStamp(wsDir) {
  try {
    fs.writeFileSync(path.join(wsDir, 'node_modules', STAMP_FILE), stampValue(wsDir), 'utf8');
  } catch {}
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

  // A bare node_modules dir is NOT proof of a completed install — an
  // interrupted first run (e.g. network died mid-install) leaves a partial
  // tree with no .bin links and vite "command not found". Only the stamp we
  // write after a successful install counts; anything else reinstalls
  // (cheap: pnpm resumes from its content-addressable store).
  const needingInstall = WORKSPACES.filter((ws) => {
    const wsDir = path.join(root, ws);
    if (!fs.existsSync(wsDir)) return false;
    if (refreshed.has(ws)) return true;
    return readStamp(wsDir) !== stampValue(wsDir);
  });

  if (needingInstall.length) {
    progress({ step: 'Checking internet connection…' });
    if (!(await checkOnline())) {
      throw new Error(
        'No internet connection. Protovibe needs network access for first-time setup — connect and hit Retry.',
      );
    }
  }

  for (const ws of needingInstall) {
    const wsDir = path.join(root, ws);
    progress({ step: `Installing dependencies for ${ws}… (first run can take a few minutes)` });
    const args = ['install', '--prefer-offline'];
    if (forceReinstall) args.push('--force');
    await runPnpm(args, wsDir, (line) => progress({ line }));
    writeStamp(wsDir);
  }

  return root;
}

module.exports = { ensureProvisioned, runPnpm, semverGt };
