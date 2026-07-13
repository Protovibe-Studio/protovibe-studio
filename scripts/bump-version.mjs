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
};
TARGETS.all = [...TARGETS.manager, ...TARGETS.template];

const target = process.argv[2];
const files = TARGETS[target];
if (!files) {
  console.error(`Usage: bump-version.mjs <${Object.keys(TARGETS).join('|')}>`);
  process.exit(1);
}

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
