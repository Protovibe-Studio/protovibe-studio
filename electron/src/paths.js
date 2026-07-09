const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const { app } = require('electron');

const PROTOVIBE_CONFIG_DIR = path.join(os.homedir(), '.protovibe');
const PROJECT_PATH_FILE = path.join(PROTOVIBE_CONFIG_DIR, 'project-path');
const SHIM_DIR = path.join(PROTOVIBE_CONFIG_DIR, 'toolchain', 'bin');
const MANAGER_DIR_NAME = 'protovibe-project-manager';
const TEMPLATE_DIR_NAME = 'protovibe-project-template';

// --protovibe-repo=<path> points the shell at a checked-out repo instead of a
// provisioned ~/Protovibe install. Used by `pnpm dev`; also implied when
// running unpackaged so a plain `electron .` behaves sanely.
function devRepoRoot() {
  const arg = process.argv.find((a) => a.startsWith('--protovibe-repo='));
  if (arg) return path.resolve(app.getAppPath(), arg.slice('--protovibe-repo='.length));
  if (!app.isPackaged) return path.resolve(app.getAppPath(), '..');
  return null;
}

function defaultInstallRoot() {
  return process.env.PROTOVIBE_DIR || path.join(os.homedir(), 'Protovibe');
}

// Bundled app source (manager + template) packed as extraResources.
function bundleDir() {
  return path.join(process.resourcesPath, 'bundle');
}

// The whole pnpm package is bundled (dist/pnpm.cjs is NOT standalone — it
// needs its sibling vendor files and reflink natives). require.resolve can't
// reach it: pnpm's package exports map blocks subpath resolution.
function pnpmCjsPath() {
  if (app.isPackaged) return path.join(process.resourcesPath, 'pnpm', 'dist', 'pnpm.cjs');
  return path.join(app.getAppPath(), 'node_modules', 'pnpm', 'dist', 'pnpm.cjs');
}

function readProjectPath() {
  try {
    const root = fs.readFileSync(PROJECT_PATH_FILE, 'utf8').trim();
    if (root && fs.existsSync(path.join(root, MANAGER_DIR_NAME, 'package.json'))) return root;
  } catch {}
  return null;
}

function writeProjectPath(root) {
  fs.mkdirSync(PROTOVIBE_CONFIG_DIR, { recursive: true });
  fs.writeFileSync(PROJECT_PATH_FILE, root, 'utf8');
}

module.exports = {
  PROTOVIBE_CONFIG_DIR,
  PROJECT_PATH_FILE,
  SHIM_DIR,
  MANAGER_DIR_NAME,
  TEMPLATE_DIR_NAME,
  devRepoRoot,
  defaultInstallRoot,
  bundleDir,
  pnpmCjsPath,
  readProjectPath,
  writeProjectPath,
};
