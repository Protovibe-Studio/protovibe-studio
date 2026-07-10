const path = require('node:path');
const { BrowserWindow, Menu, MenuItem, clipboard } = require('electron');

// Wire up a native right-click context menu with the standard editing
// actions. Chromium disables the default context menu in packaged apps, so
// without this the user can't copy/paste text via right-click.
function attachContextMenu(win) {
  win.webContents.on('context-menu', (_event, params) => {
    const menu = new Menu();
    const { editFlags } = params;
    const hasText = params.selectionText.trim().length > 0;
    const isEditable = params.isEditable;

    if (isEditable || hasText) {
      menu.append(new MenuItem({ role: 'cut', enabled: isEditable && editFlags.canCut }));
      menu.append(new MenuItem({ role: 'copy', enabled: editFlags.canCopy }));
      menu.append(
        new MenuItem({
          role: 'paste',
          enabled: isEditable && editFlags.canPaste && clipboard.readText().length > 0,
        }),
      );
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ role: 'selectAll', enabled: editFlags.canSelectAll }));
      menu.popup({ window: win });
    }
  });
}

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
  attachContextMenu(win);
  win.loadURL(url);
  return win;
}

module.exports = { createSplashWindow, createMainWindow };
