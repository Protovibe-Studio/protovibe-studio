// Unit tests for src/refresh-workspace.js — the bundle→install workspace swap
// that must carry node_modules across. Pure Node with temp dirs.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { refreshWorkspace, stashPath } = require('../src/refresh-workspace');

const WS = 'protovibe-project-manager';

function write(file, content = '') {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function setup() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pv-refresh-'));
  const root = path.join(tmp, 'install');
  const bundle = path.join(tmp, 'bundle', WS);
  write(path.join(root, WS, 'package.json'), '{"version":"1.0.0"}');
  write(path.join(root, WS, 'src', 'old.js'), 'old');
  write(path.join(root, WS, 'node_modules', 'left-pad', 'index.js'), 'deps');
  write(path.join(root, WS, 'node_modules', '.protovibe-install-stamp'), 'v1:1.0.0');
  write(path.join(bundle, 'package.json'), '{"version":"1.1.0"}');
  write(path.join(bundle, 'src', 'new.js'), 'new');
  return { tmp, root, bundle, wsDir: path.join(root, WS) };
}

test('replaces sources but keeps node_modules', (t) => {
  const { tmp, root, bundle, wsDir } = setup();
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  refreshWorkspace({ root, ws: WS, fromDir: bundle });
  assert.equal(fs.readFileSync(path.join(wsDir, 'package.json'), 'utf8'), '{"version":"1.1.0"}');
  assert.ok(fs.existsSync(path.join(wsDir, 'src', 'new.js')));
  assert.ok(!fs.existsSync(path.join(wsDir, 'src', 'old.js')));
  assert.equal(fs.readFileSync(path.join(wsDir, 'node_modules', 'left-pad', 'index.js'), 'utf8'), 'deps');
  assert.ok(!fs.existsSync(stashPath(root, WS)), 'stash is cleaned up');
});

test('keepModules=false wipes node_modules with the workspace', (t) => {
  const { tmp, root, bundle, wsDir } = setup();
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  refreshWorkspace({ root, ws: WS, fromDir: bundle, keepModules: false });
  assert.ok(!fs.existsSync(path.join(wsDir, 'node_modules')));
  assert.ok(fs.existsSync(path.join(wsDir, 'src', 'new.js')));
});

test('the stash lives outside the workspace dir', () => {
  const stash = stashPath('/root', WS);
  assert.equal(path.dirname(stash), '/root');
  assert.ok(!stash.startsWith(path.join('/root', WS) + path.sep));
});

test('a stash left by an interrupted run is restored when it is the only copy', (t) => {
  const { tmp, root, bundle, wsDir } = setup();
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  // Simulate: previous run stashed node_modules, then died before restoring.
  fs.renameSync(path.join(wsDir, 'node_modules'), stashPath(root, WS));
  refreshWorkspace({ root, ws: WS, fromDir: bundle });
  assert.equal(fs.readFileSync(path.join(wsDir, 'node_modules', 'left-pad', 'index.js'), 'utf8'), 'deps');
  assert.ok(!fs.existsSync(stashPath(root, WS)));
});

test('a stale stash is dropped when the workspace already has node_modules', (t) => {
  const { tmp, root, bundle, wsDir } = setup();
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  write(path.join(stashPath(root, WS), 'stale', 'index.js'), 'stale');
  refreshWorkspace({ root, ws: WS, fromDir: bundle });
  assert.ok(fs.existsSync(path.join(wsDir, 'node_modules', 'left-pad')));
  assert.ok(!fs.existsSync(path.join(wsDir, 'node_modules', 'stale')));
  assert.ok(!fs.existsSync(stashPath(root, WS)));
});

test('node_modules is put back even when the copy fails', (t) => {
  const { tmp, root, wsDir } = setup();
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  assert.throws(() => refreshWorkspace({ root, ws: WS, fromDir: path.join(tmp, 'does-not-exist') }));
  assert.ok(fs.existsSync(path.join(wsDir, 'node_modules', 'left-pad', 'index.js')));
  assert.ok(!fs.existsSync(stashPath(root, WS)));
});
