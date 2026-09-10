// Tells us when a downloaded shell update can actually be installed.
//
// electron-updater's 'update-downloaded' only means *it* has the zip. On macOS
// the install itself is done by Squirrel.Mac (Electron's native autoUpdater):
// electron-updater serves the zip to it over a local proxy, Squirrel fetches it
// and verifies the code signature, and only then fires its own
// 'update-downloaded'. Until that happens electron-updater's quitAndInstall()
// does nothing but register a listener — and if Squirrel errors instead
// (signature mismatch, translocated/read-only app bundle, ...) that listener
// never fires, so a "restart now" would silently do nothing. The shell must not
// tear the dev server down on such a no-op, and the user must learn why the
// update is not happening; this gate is how the updater knows which case it is.
//
// Readiness is sticky once Squirrel has fetched an update, mirroring
// electron-updater's own `squirrelDownloadedUpdate` flag so both agree on
// whether quitAndInstall() installs immediately.
function createInstallGate({ nativeUpdater, isMac = process.platform === 'darwin', log = () => {} }) {
  let ready = !isMac;
  let error = null;
  let waiters = [];

  const settle = () => {
    if (!ready && !error) return;
    const pending = waiters;
    waiters = [];
    for (const w of pending) w.settle();
  };

  if (isMac && nativeUpdater) {
    nativeUpdater.on('update-downloaded', () => {
      log('Squirrel.Mac fetched the update; install is possible');
      ready = true;
      error = null;
      settle();
    });
    nativeUpdater.on('error', (err) => {
      if (ready) return; // install-time errors are handled by whoever called quitAndInstall
      error = err instanceof Error ? err : new Error(String(err));
      settle();
    });
  }

  return {
    get ready() { return ready; },

    // electron-updater just reported a fresh download: Squirrel is about to
    // (re-)fetch it, so an error from an earlier attempt no longer applies.
    reset() { error = null; },

    // Resolves once the native side can install, rejects with Squirrel's error
    // (or a timeout, which should never happen for a localhost fetch).
    whenInstallable(timeoutMs) {
      if (ready) return Promise.resolve();
      if (error) return Promise.reject(error);
      return new Promise((resolve, reject) => {
        const waiter = {
          settle() {
            clearTimeout(timer);
            if (ready) resolve();
            else reject(error);
          },
        };
        const timer = setTimeout(() => {
          waiters = waiters.filter((w) => w !== waiter);
          reject(new Error(`the installer did not pick up the update within ${Math.round(timeoutMs / 1000)}s`));
        }, timeoutMs);
        waiters.push(waiter);
      });
    },
  };
}

module.exports = { createInstallGate };
