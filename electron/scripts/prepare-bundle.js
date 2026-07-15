#!/usr/bin/env node
// Build-time step: stage the manager + template source into bundle-staging/,
// which electron-builder packs as Resources/bundle. Mirrors the exclusions the
// in-app updater applies to zipballs — no node_modules, build output, or VCS.
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const STAGING = path.resolve(__dirname, '..', 'bundle-staging');
const WORKSPACES = ['protovibe-project-manager', 'protovibe-project-template'];
const ROOT_FILES = ['AGENTS.md', 'CLAUDE.md', 'README.md', 'LICENSE'];
const EXCLUDE_DIRS = new Set(['node_modules', 'dist', '.git', '.mac-installer']);

function shouldCopy(src) {
  const base = path.basename(src);
  if (EXCLUDE_DIRS.has(base)) return false;
  if (base.endsWith('.log')) return false;
  if (base === '.DS_Store') return false;
  return true;
}

fs.rmSync(STAGING, { recursive: true, force: true });
fs.mkdirSync(STAGING, { recursive: true });

const manifest = {};
for (const ws of WORKSPACES) {
  const from = path.join(REPO_ROOT, ws);
  if (!fs.existsSync(from)) {
    console.error(`missing workspace: ${from}`);
    process.exit(1);
  }
  fs.cpSync(from, path.join(STAGING, ws), { recursive: true, filter: shouldCopy });
  manifest[ws] = JSON.parse(fs.readFileSync(path.join(from, 'package.json'), 'utf8')).version;
}
for (const file of ROOT_FILES) {
  const from = path.join(REPO_ROOT, file);
  if (fs.existsSync(from)) fs.cpSync(from, path.join(STAGING, file));
}
fs.writeFileSync(path.join(STAGING, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Stage the full pnpm package for extraResources — dist/pnpm.cjs alone is NOT
// standalone (it silently fails without its vendor/reflink siblings), and the
// node_modules/pnpm dir is a pnpm-store symlink electron-builder would copy
// as a dangling link. Dereference into real files here.
const PNPM_STAGING = path.resolve(__dirname, '..', 'pnpm-staging');
// Plain fs path — pnpm's exports map blocks require.resolve of any subpath.
const pnpmPkg = path.resolve(__dirname, '..', 'node_modules', 'pnpm');
fs.rmSync(PNPM_STAGING, { recursive: true, force: true });
fs.cpSync(pnpmPkg, PNPM_STAGING, { recursive: true, dereference: true });
console.log(`pnpm staged at ${PNPM_STAGING}`);

console.log(`bundle staged at ${STAGING}`);
console.log(`versions: ${JSON.stringify(manifest)}`);
