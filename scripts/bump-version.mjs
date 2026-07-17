#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const TARGETS = {
  manager: ['protovibe-project-manager/package.json'],
  template: [
    'protovibe-project-template/package.json',
    'protovibe-project-template/plugins/protovibe/package.json',
  ],
  // The Electron shell versions independently of the source (manager/template).
  shell: ['electron/package.json'],
};
// `manager-and-template` is the source-only bundle; `all` is everything, the shell
// included. The shell can still be bumped on its own (`shell`) when it ships a fix
// without a source change — see scripts/release.mjs.
TARGETS['manager-and-template'] = [...TARGETS.manager, ...TARGETS.template];
TARGETS.all = [...TARGETS['manager-and-template'], ...TARGETS.shell];

// Accept one or more targets, e.g. `bump-version.mjs all shell`.
const requested = process.argv.slice(2);
if (requested.length === 0 || requested.some((t) => !TARGETS[t])) {
  console.error(`Usage: bump-version.mjs <${Object.keys(TARGETS).join('|')}> [more targets...]`);
  process.exit(1);
}
// Dedupe files across targets (e.g. `all shell` shares nothing, but `all manager` would).
const files = [...new Set(requested.flatMap((t) => TARGETS[t]))];

for (const file of files) {
  const path = resolve(root, file);
  const raw = readFileSync(path, 'utf8');
  const match = raw.match(/^(\s*"version":\s*")(\d+)\.(\d+)\.(\d+)(")/m);
  if (!match) {
    console.error(`No semver "version" field found in ${file}`);
    process.exit(1);
  }
  const [, prefix, major, minor, patch, suffix] = match;
  const from = `${major}.${minor}.${patch}`;
  const to = `${major}.${minor}.${Number(patch) + 1}`;
  writeFileSync(path, raw.replace(match[0], `${prefix}${to}${suffix}`));
  console.log(`${file}: ${from} -> ${to}`);
}
