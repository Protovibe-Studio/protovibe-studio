const { app, dialog, shell, autoUpdater: nativeUpdater } = require('electron');
const { createInstallGate } = require('./install-gate');

const CHECK_INTERVAL = 6 * 60 * 60 * 1000;
// Squirrel.Mac fetches the zip from a localhost proxy and verifies it; that is
// seconds, so anything near this is a failure it never reported.
const INSTALL_READY_TIMEOUT = 3 * 60 * 1000;
const RELEASES_URL = 'https://github.com/Protovibe-Studio/protovibe-studio/releases/latest';

// Shell self-update via GitHub Releases (latest-mac.yml + dmg/zip published by
// CI on shell-v* tags). Independent of the in-app zipball updater, which keeps
// updating the manager/template source tree.
function initUpdater({ requestQuitAndInstall, log }) {
  if (!app.isPackaged) return;
  let autoUpdater;
  try {
    ({ autoUpdater } = require('electron-updater'));
  } catch (err) {
    log(`updater unavailable: ${err.message}`);
    return;
  }
  autoUpdater.logger = { info: log, warn: log, error: log, debug: () => {} };
  autoUpdater.autoDownload = true;

  const gate = createInstallGate({ nativeUpdater, log });
  const reportedFailures = new Set();

  function reportInstallFailure(version, err) {
    log(`update ${version} downloaded but cannot be installed: ${err.message}`);
    // Once per version per run — the periodic re-check would otherwise nag.
    if (reportedFailures.has(version)) return;
    reportedFailures.add(version);
    dialog.showMessageBox({
      type: 'warning',
      title: 'Protovibe update',
      message: `Protovibe ${version} was downloaded but could not be installed.`,
      detail: `${err.message}\n\nYou can download the new version manually from the releases page.`,
      buttons: ['Open releases page', 'Close'],
      defaultId: 0,
      cancelId: 1,
    }).then(({ response }) => {
      if (response === 0) shell.openExternal(RELEASES_URL);
    });
  }

  autoUpdater.on('update-downloaded', async (info) => {
    // Only offer the restart once the install can really happen (see
    // install-gate.js): accepting the prompt stops the dev server, and a
    // quitAndInstall() that then does nothing would strand the user on a
    // dead page.
    gate.reset();
    try {
      await gate.whenInstallable(INSTALL_READY_TIMEOUT);
    } catch (err) {
      reportInstallFailure(info.version, err);
      return;
    }
    const { response } = await dialog.showMessageBox({
      type: 'info',
      title: 'Protovibe update',
      message: `Protovibe ${info.version} has been downloaded.`,
      detail: 'Restart to apply the update. Running project servers will be stopped.',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) requestQuitAndInstall(autoUpdater);
  });
  autoUpdater.on('error', (err) => log(`updater error: ${err.message}`));

  const check = () => autoUpdater.checkForUpdates().catch((err) => log(`update check failed: ${err.message}`));
  setTimeout(check, 10_000);
  setInterval(check, CHECK_INTERVAL);
}

module.exports = { initUpdater };
