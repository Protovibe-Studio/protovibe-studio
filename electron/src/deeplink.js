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
    const segments = [parsed.host, parsed.pathname.replace(/^\/+/, '')].filter(Boolean);
    const target = `${this.managerUrl}/${segments.join('/')}${parsed.search}`;
    const win = this.getWindow();
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
    win.loadURL(target);
  }
}

module.exports = { Deeplink };
