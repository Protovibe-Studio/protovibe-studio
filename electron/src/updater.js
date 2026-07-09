const { app, dialog } = require('electron');

const CHECK_INTERVAL = 6 * 60 * 60 * 1000;

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

  autoUpdater.on('update-downloaded', async (info) => {
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
