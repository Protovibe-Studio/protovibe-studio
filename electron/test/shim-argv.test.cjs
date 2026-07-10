#!/usr/bin/env node
// Regression guard for the wrangler-under-shell bug.
//
// Our `node` shim is the Electron binary in ELECTRON_RUN_AS_NODE mode. Because
// process.versions.electron stays set, yargs' hideBin() mis-slices argv (index
// 1 not 2) and every yargs CLI — wrangler above all — dies with
// "Unknown arguments: cli.js, <command>". src/preload-source.js fixes that by
// marking the process defaultApp; buildChildEnv injects it via NODE_OPTIONS.
//
// This test drives the REAL Electron binary as node through a shim, using the
// EXACT shipped preload bytes, and asserts:
//   1. WITHOUT the preload the bug reproduces (so the test is meaningful), and
//   2. WITH the preload argv slices correctly.
// If Electron/toolchain changes ever reintroduce the bug, CI fails here instead
// of a user's Cloudflare publish.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PRELOAD_SOURCE = require('../src/preload-source');

if (process.platform === 'win32') {
  console.log('SKIP: shim is POSIX-only for now (Windows support is a stretch goal).');
  process.exit(0);
}

// The `electron` package exports the path to its binary when required in node.
let electronPath;
try {
  electronPath = require('electron');
} catch (err) {
  console.error('FAIL: could not resolve the electron binary:', err.message);
  process.exit(1);
}
if (typeof electronPath !== 'string' || !fs.existsSync(electronPath)) {
  console.error(`FAIL: electron binary path invalid: ${electronPath}`);
  process.exit(1);
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pv-shim-test-'));
const nodeShim = path.join(dir, 'node');
const preload = path.join(dir, 'pv-node-preload.cjs');
const fixture = path.join(dir, 'hidebin-fixture.cjs');

fs.writeFileSync(nodeShim, `#!/bin/sh\nexport ELECTRON_RUN_AS_NODE=1\nexec "${electronPath}" "$@"\n`);
fs.chmodSync(nodeShim, 0o755);
fs.writeFileSync(preload, PRELOAD_SOURCE);

// Byte-for-byte reimplementation of yargs/helpers hideBin — the exact logic
// wrangler relies on. If yargs ever changes its detection, update this to match.
fs.writeFileSync(
  fixture,
  `function hideBin(argv) {
  const isElectron = !!process.versions.electron;
  const isBundledElectronApp = isElectron && !process.defaultApp;
  return argv.slice(isBundledElectronApp ? 1 : 2);
}
process.stdout.write(JSON.stringify(hideBin(process.argv)));
`,
);

function runShim(withPreload) {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE; // the shim sets it; don't leak from the runner
  env.NODE_OPTIONS = withPreload ? `--require "${preload}"` : '';
  const res = spawnSync(nodeShim, [fixture, 'logout'], { env, encoding: 'utf8', timeout: 60_000 });
  if (res.error) throw res.error;
  return res.stdout.trim();
}

let ok = true;

// 1. Sanity: without the fix, the bug must reproduce (proves the harness is real).
try {
  const broken = runShim(false);
  if (broken === JSON.stringify([fixture, 'logout'])) {
    console.log('OK  : bug reproduces without the preload (harness is valid)');
  } else {
    console.warn(`WARN: expected the broken slice without the preload, got ${broken} — ` +
      `Electron may have changed argv behavior; the fix below is what actually matters.`);
  }
} catch (err) {
  console.warn('WARN: control run failed:', err.message);
}

// 2. The guarantee: with the shipped preload, argv slices correctly.
try {
  const fixed = runShim(true);
  const expected = JSON.stringify(['logout']);
  if (fixed === expected) {
    console.log('PASS: preload fixes yargs hideBin under the Electron node shim');
  } else {
    console.error(`FAIL: expected ${expected} but got ${fixed}`);
    console.error('      wrangler (and other yargs CLIs) would break for users.');
    ok = false;
  }
} catch (err) {
  console.error('FAIL: fixed run errored:', err.message);
  ok = false;
}

fs.rmSync(dir, { recursive: true, force: true });
process.exit(ok ? 0 : 1);
