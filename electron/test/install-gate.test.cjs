// Unit tests for the update install gate (src/install-gate.js) — the piece
// that decides when "Restart now" may stop the dev server. Pure Node, no
// Electron binary needed.
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createInstallGate } = require('../src/install-gate');

const tick = () => new Promise((r) => setImmediate(r));

test('non-mac platforms are installable as soon as electron-updater has the file', async () => {
  const gate = createInstallGate({ nativeUpdater: new EventEmitter(), isMac: false });
  assert.equal(gate.ready, true);
  await gate.whenInstallable(1000);
});

test('mac waits for Squirrel to fetch the update', async () => {
  const native = new EventEmitter();
  const gate = createInstallGate({ nativeUpdater: native, isMac: true });
  assert.equal(gate.ready, false);
  let settled = false;
  const p = gate.whenInstallable(10_000).then(() => { settled = true; });
  await tick();
  assert.equal(settled, false);
  native.emit('update-downloaded');
  await p;
  assert.equal(gate.ready, true);
  // sticky: later calls resolve immediately
  await gate.whenInstallable(1);
});

test('a Squirrel error before readiness rejects, both for waiting and later callers', async () => {
  const native = new EventEmitter();
  const gate = createInstallGate({ nativeUpdater: native, isMac: true });
  const p = gate.whenInstallable(10_000);
  native.emit('error', new Error('Code signature at URL did not pass validation'));
  await assert.rejects(p, /Code signature/);
  await assert.rejects(gate.whenInstallable(10_000), /Code signature/);
  assert.equal(gate.ready, false);
});

test('reset() clears a stale error so a fresh download can succeed', async () => {
  const native = new EventEmitter();
  const gate = createInstallGate({ nativeUpdater: native, isMac: true });
  native.emit('error', 'not-an-Error-object');
  await assert.rejects(gate.whenInstallable(10_000), /not-an-Error-object/);
  gate.reset();
  const p = gate.whenInstallable(10_000);
  native.emit('update-downloaded');
  await p;
});

test('errors after readiness do not flip the gate back', async () => {
  const native = new EventEmitter();
  const gate = createInstallGate({ nativeUpdater: native, isMac: true });
  native.emit('update-downloaded');
  native.emit('error', new Error('relaunch failed'));
  assert.equal(gate.ready, true);
  await gate.whenInstallable(1);
});

test('times out when Squirrel reports nothing at all', async () => {
  const gate = createInstallGate({ nativeUpdater: new EventEmitter(), isMac: true });
  await assert.rejects(gate.whenInstallable(20), /did not pick up the update/);
});
