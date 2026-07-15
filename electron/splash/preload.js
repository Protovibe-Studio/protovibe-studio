const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('protovibeSplash', {
  onProgress: (cb) => ipcRenderer.on('provision:progress', (_e, payload) => cb(payload)),
  onError: (cb) => ipcRenderer.on('provision:error', (_e, payload) => cb(payload)),
  retry: () => ipcRenderer.send('provision:retry'),
  openLog: () => ipcRenderer.send('provision:open-log'),
});
