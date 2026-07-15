// Renderer preload for the manager/editor window.
//
// The window-open policy in main.js lets local (localhost) URLs open as real
// in-app windows, which is right for manager popups like the "?connect-github=1"
// flow. But some local URLs are meant for the user's real browser — the editor's
// "Open in browser" action hands off the running app preview, which lives on
// localhost too. A URL check alone can't tell those apart, so the renderer says
// what it wants explicitly through this bridge.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
});
