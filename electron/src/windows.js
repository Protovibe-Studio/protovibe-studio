const path = require('node:path');
const { BrowserWindow, shell } = require('electron');

const LOCAL_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/;

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
  // Anything that isn't the local manager/editor opens in the user's real
  // browser. Critical for GitHub OAuth: Electron has no passkeys and no saved
  // passwords, so the sign-in must happen in the default browser — it calls
  // back to the local /api server, which the manager UI polls.
  win.webContents.setWindowOpenHandler(({ url: target }) => {
    if (/^https?:/.test(target) && !LOCAL_RE.test(target)) shell.openExternal(target);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, target) => {
    if (/^https?:/.test(target) && !LOCAL_RE.test(target)) {
      event.preventDefault();
      shell.openExternal(target);
    }
  });
  win.loadURL(url);
  return win;
}

module.exports = { createSplashWindow, createMainWindow };
