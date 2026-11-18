const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const vm = require('node:vm');

function fixture({ argv = [] } = {}) {
  const app = Object.assign(new EventEmitter(), { isPackaged: true, setAsDefaultProtocolClient() {} });
  const ipcMain = new EventEmitter();
  const sandbox = { module: { exports: {} }, URL, process: { argv }, require: name => name === 'electron' ? { app, ipcMain } : require(name) };
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/deeplink'), 'utf8'), sandbox);
  const { Deeplink, parseAnnotationLink } = sandbox.module.exports;
  const sent = [], loaded = [];
  const webContents = Object.assign(new EventEmitter(), { mainFrame: {}, send: (...args) => sent.push(args) });
  let focused = 0, restored = 0;
  const win = { webContents, loadURL: url => loaded.push(url), isMinimized: () => true, restore: () => restored++, focus: () => focused++ };
  let currentWindow = null;
  const link = new Deeplink();
  link.register({ getWindow: () => currentWindow });
  const ready = () => ipcMain.emit('deeplink:annotations-ready', { sender: webContents, senderFrame: webContents.mainFrame });
  const start = () => { currentWindow = win; link.attachWindow(win); link.setManagerUrl('http://127.0.0.1:5173'); };
  return { app, ipcMain, link, parseAnnotationLink, sent, loaded, webContents, ready, start, focusCounts: () => [focused, restored] };
}
const annotation = 'protovibe://annotation/k3f9x2m1qa/a-9z8y7x6w';

test('annotation brings existing editor forward and delivers IDs without navigation', () => {
  const f = fixture(); f.start(); f.ready(); f.link.handle(annotation);
  assert.deepEqual(JSON.parse(JSON.stringify(f.sent)), [['deeplink:annotation', { specId: 'k3f9x2m1qa', itemId: 'a-9z8y7x6w' }]]);
  assert.deepEqual(f.loaded, []);
  assert.deepEqual(f.focusCounts(), [1, 1]);
});

for (const source of ['open-url', 'argv']) {
  test(`cold start via ${source} waits for window and renderer subscription`, () => {
    const f = fixture({ argv: source === 'argv' ? ['electron', annotation] : [] });
    if (source === 'open-url') f.app.emit('open-url', { preventDefault() {} }, annotation);
    assert.equal(f.sent.length, 0);
    f.start(); assert.equal(f.sent.length, 0);
    f.ready(); assert.equal(f.sent.length, 1);
    f.ready(); assert.equal(f.sent.length, 1);
    assert.deepEqual(f.loaded, []);
  });
}

test('second instance and links during navigation wait for the current main-frame subscriber', () => {
  const f = fixture(); f.start(); f.ready();
  f.webContents.emit('did-start-navigation', {}, 'http://localhost:3000/protovibe.html', false, true);
  f.app.emit('second-instance', {}, ['app', annotation]);
  f.ipcMain.emit('deeplink:annotations-ready', { sender: f.webContents, senderFrame: {} });
  f.ipcMain.emit('deeplink:annotations-ready', { sender: {}, senderFrame: f.webContents.mainFrame });
  assert.equal(f.sent.length, 0);
  f.ready(); assert.equal(f.sent.length, 1);
  f.webContents.emit('did-start-navigation', {}, 'http://localhost:3000/', false, false);
  f.link.handle(annotation); assert.equal(f.sent.length, 2);
});

test('bare and manager links retain existing behavior', () => {
  const f = fixture(); f.start();
  f.link.handle('protovibe://'); assert.deepEqual(f.loaded, []);
  f.link.handle('protovibe://project/project-id?tab=details');
  assert.deepEqual(f.loaded, ['http://127.0.0.1:5173/project/project-id?tab=details']);
});

test('malformed annotation links cannot navigate or send arbitrary payloads', () => {
  const f = fixture(); f.start(); f.ready();
  for (const url of ['invalid', 'https://annotation/s/a', 'protovibe://annotation',
    'protovibe://annotation/s', 'protovibe://annotation/s/a/extra',
    'protovibe://annotation/spec/a', 'protovibe://annotation/s/a?url=https://example.com',
    'protovibe://annotation/s/a#fragment', 'protovibe://user@annotation/s/a',
    'protovibe://annotation:42/s/a', 'protovibe://annotation/s/%2fetc',
    'protovibe://annotation/s/a%22', 'protovibe://annotation/s/../a']) f.link.handle(url);
  assert.deepEqual(f.sent, []); assert.deepEqual(f.loaded, []);
});
