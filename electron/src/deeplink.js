const path = require('node:path');
const { app } = require('electron');

// protovibe://x/y?q → http://127.0.0.1:<port>/x/y?q
// The URL "host" becomes the first path segment; the SPA's router owns
// interpretation — the shell has no per-route knowledge.
class Deeplink {
  constructor() {
    this.managerUrl = null;
    this.getWindow = () => null;
    this.queue = [];
  }

  // Must run before app 'ready' so cold-start open-url events are caught.
  register({ getWindow }) {
    this.getWindow = getWindow;
    if (app.isPackaged) {
      app.setAsDefaultProtocolClient('protovibe');
    } else {
      // Dev registration on macOS needs the explicit exec form.
      app.setAsDefaultProtocolClient('protovibe', process.execPath, [path.resolve(app.getAppPath())]);
    }
    app.on('open-url', (event, url) => {
      event.preventDefault();
      this.handle(url);
    });
    app.on('second-instance', (_event, argv) => {
      const win = this.getWindow();
      if (win) {
        if (win.isMinimized()) win.restore();
        win.focus();
      }
      const link = argv.find((a) => a.startsWith('protovibe://'));
      if (link) this.handle(link);
    });
  }

  setManagerUrl(url) {
    this.managerUrl = url;
    while (this.queue.length) this.navigate(this.queue.shift());
  }

  handle(rawUrl) {
    if (!this.managerUrl) {
      this.queue.push(rawUrl);
      return;
    }
    this.navigate(rawUrl);
  }

  navigate(rawUrl) {
    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return;
    }
    if (parsed.protocol !== 'protovibe:') return;
    const win = this.getWindow();
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
    // Bare protovibe:// just brings the app to the front (e.g. the OAuth
    // "Back to Protovibe" link) — don't blow away the current UI state.
    const segments = [parsed.host, parsed.pathname.replace(/^\/+/, '')].filter(Boolean);
    if (!segments.length && !parsed.search) return;
    win.loadURL(`${this.managerUrl}/${segments.join('/')}${parsed.search}`);
  }
}

module.exports = { Deeplink };
