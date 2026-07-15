const path = require('node:path');
const { app, dialog, ipcMain, session, shell } = require('electron');
const { devRepoRoot } = require('./paths');
const { writeShims } = require('./toolchain');
const { Logger } = require('./logger');
const { Supervisor } = require('./supervisor');
const { Deeplink } = require('./deeplink');
const { applyStagedUpdate } = require('./staged-update');
const { ensureProvisioned, runPnpm } = require('./provision');
const { createSplashWindow, createMainWindow } = require('./windows');
const { initUpdater } = require('./updater');

const logger = new Logger();
const deeplink = new Deeplink();
let mainWindow = null;
let splashWindow = null;
let supervisor = null;
let quitting = false;

// App-wide navigation policy, applied to every window (including local popups
// the manager/editor open, e.g. the "?connect-github=1" connect flow):
// - local (manager/editor) URLs may open as real child windows
// - anything else opens in the user's default browser — critical for GitHub
//   OAuth, where passkeys and saved passwords only exist in the real browser.
//   GitHub still calls back to the local /api server, which the UI polls.
const LOCAL_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/;
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(({ url: target }) => {
    if (!/^https?:/.test(target)) return { action: 'deny' };
    if (LOCAL_RE.test(target)) return { action: 'allow' };
    shell.openExternal(target);
    return { action: 'deny' };
  });
  contents.on('will-navigate', (event, target) => {
    if (/^https?:/.test(target) && !LOCAL_RE.test(target)) {
      event.preventDefault();
      shell.openExternal(target);
    }
  });
});

// Explicit renderer request to hand a URL to the system browser, used for local
// URLs the policy above would otherwise open in-app (the editor's "Open in
// browser" preview action). Restricted to http(s) so a compromised renderer
// can't launch arbitrary schemes/files through the shell.
ipcMain.handle('shell:open-external', (_event, url) => {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return;
  shell.openExternal(url);
});

// Everything this shell loads is code being edited right now: the manager, the
// editor, and the preview iframe are all served by a local vite dev server. A
// disk cache over that only ever hands back a stale version of a file the user
// just changed, so turn it off — the switch must be set before app ready.
app.commandLine.appendSwitch('disable-http-cache');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  deeplink.register({ getWindow: () => mainWindow });
  app.whenReady().then(boot).catch(fatal);
}

function splashProgress(payload) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('provision:progress', payload);
  }
  if (payload.step) logger.line(payload.step);
}

function splashError(message) {
  logger.line(`ERROR: ${message}`);
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('provision:error', { message, tail: logger.tail(60) });
  } else {
    fatal(new Error(message));
  }
}

async function boot() {
  writeShims();

  // The switch above stops new cache writes, but a user upgrading from a build
  // that cached is still carrying those entries on disk. Drop them once at boot
  // (cheap: everything in there came from localhost).
  await session.defaultSession.clearCache();

  splashWindow = createSplashWindow();
  ipcMain.on('provision:retry', () => { provisionAndStart(); });
  ipcMain.on('provision:open-log', () => {
    if (logger.logPath) shell.openPath(logger.logPath);
  });

  await provisionAndStart();
}

async function provisionAndStart() {
  try {
    const devRoot = devRepoRoot();
    let root;
    if (devRoot) {
      root = devRoot;
      splashProgress({ step: 'Dev mode — using checked-out repo' });
    } else {
      root = await ensureProvisioned(splashProgress);
    }
    logger.attachFile(root);

    // Consume any update the in-app updater staged before vite boots.
    await applyStagedUpdate(
      root,
      (args, cwd) => runPnpm(args, cwd, (line) => splashProgress({ line })),
      (step) => splashProgress({ step }),
    );

    splashProgress({ step: 'Starting Protovibe…' });
    await startSupervisor(root);
  } catch (err) {
    splashError(err.message);
  }
}

function startSupervisor(root) {
  return new Promise((resolve) => {
    supervisor = new Supervisor(root, logger);

    supervisor.once('ready', (url) => {
      deeplink.setManagerUrl(url);
      mainWindow = createMainWindow(url);
      if (supervisor.attached) {
        mainWindow.setTitle('Protovibe (attached to running server)');
      }
      mainWindow.once('ready-to-show', () => mainWindow.focus());
      if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
      splashWindow = null;
      initUpdater({ requestQuitAndInstall, log: (m) => logger.line(String(m)) });
      resolve();
    });

    supervisor.on('failed', (err) => {
      if (quitting) return;
      if (mainWindow && !mainWindow.isDestroyed()) {
        dialog.showMessageBox(mainWindow, {
          type: 'error',
          title: 'Protovibe',
          message: 'The Protovibe server stopped and could not be restarted.',
          detail: logger.tail(30),
          buttons: ['Quit'],
        }).then(() => app.quit());
      } else {
        splashError(err.message);
      }
      resolve();
    });

    supervisor.start();
  });
}

function requestQuitAndInstall(autoUpdater) {
  const stop = supervisor ? supervisor.stop() : Promise.resolve();
  stop.then(() => {
    quitting = true;
    autoUpdater.quitAndInstall();
  });
}

app.on('before-quit', (event) => {
  if (quitting) return;
  event.preventDefault();
  quitting = true;
  const stop = supervisor ? supervisor.stop() : Promise.resolve();
  stop.then(() => app.quit());
});

// The window IS the app: closing it quits (and tree-kills the vite child)
// on every platform, mac included — a hidden headless server would keep
// project dev servers running with no way to see them.
app.on('window-all-closed', () => {
  app.quit();
});

function fatal(err) {
  logger.line(`FATAL: ${err.stack || err.message}`);
  dialog.showErrorBox('Protovibe failed to start', err.message);
  app.exit(1);
}
