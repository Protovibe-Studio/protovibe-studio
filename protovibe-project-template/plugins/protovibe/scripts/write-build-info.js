// Stamps dist/ with the plugin version it was built from.
//
// dist/ is gitignored, so a project synced from Git receives new plugin SOURCE
// on top of whatever dist was last built on that machine. Running the project
// through the manager reconciles that (its `pnpm install` runs the root
// postinstall, which wipes and rebuilds dist), but until then the two disagree
// — and nothing else on disk records which source dist actually came from.
// This file is that record: read it to tell a stale build from a fresh one.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pluginDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(fs.readFileSync(path.join(pluginDir, 'package.json'), 'utf-8'));
const distDir = path.join(pluginDir, 'dist');

fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(
  path.join(distDir, 'build-info.json'),
  JSON.stringify({ version, builtAt: new Date().toISOString() }, null, 2) + '\n',
  'utf-8',
);
console.log(`[protovibe] dist stamped with plugin v${version}`);
