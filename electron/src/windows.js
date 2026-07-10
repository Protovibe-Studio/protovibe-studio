const path = require('node:path');
const { BrowserWindow } = require('electron');

function createSplashWindow() {
  const win = new BrowserWindow({
    width: 520,
    height: 360,
    resizable: false,
    fullscreenable: false,
    title: 'Protovibe',
    webPreferences: {
      preload: path.join(__dirname, '..', 'splash', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.removeMenu?.();
  win.loadFile(path.join(__dirname, '..', 'splash', 'provision.html'));
  return win;
}

// The manager SPA needs no preload — deep links arrive as plain URL
// navigations and the app talks to its own /api backend.
function createMainWindow(url) {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 800,
    minHeight: 560,
    title: 'Protovibe',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadURL(url);
  return win;
}

module.exports = { createSplashWindow, createMainWindow };
