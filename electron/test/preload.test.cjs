const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const vm = require('node:vm');
const fs = require('node:fs');

test('preload subscribes before announcing readiness, strips IPC event, and cleans up', () => {
  const ipcRenderer = new EventEmitter();
  const messages = [], received = [];
  ipcRenderer.send = channel => {
    messages.push(channel);
    if (channel === 'deeplink:annotations-ready') ipcRenderer.emit('deeplink:annotation', { secret: true }, { specId: 's', itemId: 'a' });
  };
  let api;
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/preload'), 'utf8'), {
    require: () => ({ ipcRenderer, contextBridge: { exposeInMainWorld: (_name, value) => { api = value; } } }),
  });
  const unsubscribe = api.onAnnotationLink((...args) => received.push(args));
  assert.deepEqual(received, [[{ specId: 's', itemId: 'a' }]]);
  unsubscribe();
  ipcRenderer.emit('deeplink:annotation', {}, { specId: 'ignored' });
  assert.equal(received.length, 1);
  assert.equal(ipcRenderer.listenerCount('deeplink:annotation'), 0);
  assert.deepEqual(messages, ['deeplink:annotations-ready', 'deeplink:annotations-not-ready']);
});
