const path = require('node:path');
const { app, ipcMain } = require('electron');

// protovibe://x/y?q → http://127.0.0.1:<port>/x/y?q
// The URL "host" becomes the first path segment; the SPA's router owns
// interpretation. Annotation links are delivered to the current renderer instead.
const ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

function parseAnnotationLink(url) {
  if (url.protocol !== 'protovibe:' || url.host !== 'annotation' || url.username || url.password || url.search || url.hash) return null;
  const parts = url.pathname.split('/');
  if (parts.length !== 3) return null;
  const [, specId, itemId] = parts;
  if (![specId, itemId].every(id => ID.test(id) && id !== 'spec')) return null;
  return { specId, itemId };
}
class Deeplink {
  constructor() {
    this.managerUrl = null;
    this.getWindow = () => null;
    this.queue = [];
    this.annotationQueue = [];
    this.rendererReady = false;
  }

  // Must run before app 'ready' so cold-start open-url events are caught.
  register({ getWindow }) {
    this.getWindow = getWindow;
    ipcMain.on('deeplink:annotations-ready', (event) => {
      const contents = this.getWindow()?.webContents;
      if (event.sender !== contents || event.senderFrame !== contents?.mainFrame) return;
      this.rendererReady = true;
      this.flushAnnotations();
    });
    ipcMain.on('deeplink:annotations-not-ready', (event) => {
      const contents = this.getWindow()?.webContents;
      if (event.sender === contents && event.senderFrame === contents?.mainFrame) this.rendererReady = false;
    });
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
    const initialLink = process.argv.find((arg) => arg.startsWith('protovibe://'));
    if (initialLink) this.handle(initialLink);
  }

  // Full document navigations replace the preload and its subscriptions.
  attachWindow(win) {
    win.webContents.on('did-start-navigation', (_event, _url, isInPlace, isMainFrame) => {
      if (isMainFrame && !isInPlace) this.rendererReady = false;
    });
  }

  flushAnnotations() {
    const win = this.getWindow();
    if (!win || !this.rendererReady) return;
    while (this.annotationQueue.length) {
      win.webContents.send('deeplink:annotation', this.annotationQueue.shift());
    }
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
    if (parsed.hostname === 'annotation') {
      const annotation = parseAnnotationLink(parsed);
      if (annotation) {
        this.annotationQueue.push(annotation);
        this.flushAnnotations();
      }
      return;
    }
    // Bare protovibe:// just brings the app to the front (e.g. the OAuth
    // "Back to Protovibe" link) — don't blow away the current UI state.
    const segments = [parsed.host, parsed.pathname.replace(/^\/+/, '')].filter(Boolean);
    if (!segments.length && !parsed.search) return;
    win.loadURL(`${this.managerUrl}/${segments.join('/')}${parsed.search}`);
  }
}

module.exports = { Deeplink, parseAnnotationLink };
