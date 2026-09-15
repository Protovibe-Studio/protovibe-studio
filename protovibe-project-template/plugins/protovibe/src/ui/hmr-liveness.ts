// Runs inside every canvas iframe (index.html, components.html, sketchpad.html)
// as a Vite module, so it shares the page's HMR client and its websocket.
//
// Vite's client only recovers from a websocket that emits `close`. It sends a
// keepalive ping every 30s but never checks for a reply, so a half-open socket
// (laptop sleep, network switch, proxy hiccup) stays "open" forever while every
// HMR update is silently lost. From the user's point of view the canvas just
// stops hot reloading until they refresh.
//
// This module does the round trip Vite skips: it sends `protovibe:ping` over
// the HMR socket and expects `protovibe:pong` back from the plugin (see
// protovibe-source.ts). If the socket stays silent while the server still
// answers over HTTP, the socket is dead and the iframe reloads itself. A server
// that is down or busy answers neither, and that case is left to the shell's
// crash handling.
//
// Checks run on a timer and also on every user action, so a dead socket is
// caught within seconds of the user noticing: any message the shell posts into
// this iframe and any request this iframe makes to a plugin `/__…` endpoint.

const CHECK_INTERVAL_MS = 10_000;
const ACTION_CHECK_COOLDOWN_MS = 2_000;
const PONG_TIMEOUT_MS = 2_000;
const HTTP_PROBE_URL = '/__hmr-activity';

const hot = import.meta.hot;

// Spec thumbnails / the specs viewer embed many copies of the app; they reload
// with the page and never need their own liveness loop.
if (hot && !window.name.startsWith('pv-spec-')) {
  let pending: { resolve: (alive: boolean) => void; timer: number } | null = null;
  let checking = false;
  let reloading = false;
  let lastActionCheckAt = 0;
  const nativeFetch = window.fetch.bind(window);

  hot.on('protovibe:pong', () => {
    if (!pending) return;
    clearTimeout(pending.timer);
    pending.resolve(true);
    pending = null;
  });

  // Resolves true when a pong arrives within the timeout.
  const roundTrip = () =>
    new Promise<boolean>((resolve) => {
      const timer = window.setTimeout(() => {
        pending = null;
        resolve(false);
      }, PONG_TIMEOUT_MS);
      pending = { resolve, timer };
      hot.send('protovibe:ping', { at: Date.now() });
    });

  const serverReachable = async () => {
    try {
      const res = await nativeFetch(HTTP_PROBE_URL, { cache: 'no-store' });
      return res.ok;
    } catch {
      return false;
    }
  };

  const check = async () => {
    if (checking || reloading) return;
    checking = true;
    try {
      if (await roundTrip()) return;
      // The socket was silent. Rule out a server that is merely down or busy:
      // HTTP and the websocket share the same event loop, so a prompt HTTP
      // reply followed by a second silent ping means the socket itself is dead.
      if (!(await serverReachable())) return;
      if (await roundTrip()) return;
      reloading = true;
      console.warn('[protovibe] HMR websocket is unresponsive; reloading this canvas.');
      window.location.reload();
    } finally {
      checking = false;
    }
  };

  // Actions can fire in bursts (drag moves, hover messages); one check per
  // cooldown window is enough since a dead socket stays dead.
  const checkOnAction = () => {
    const now = Date.now();
    if (now - lastActionCheckAt < ACTION_CHECK_COOLDOWN_MS) return;
    lastActionCheckAt = now;
    void check();
  };

  window.setInterval(check, CHECK_INTERVAL_MS);
  // Sleep/wake and tab switches are when half-open sockets typically appear.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void check();
  });
  window.addEventListener('focus', () => void check());

  // Every command the shell sends into this iframe.
  window.addEventListener('message', (e) => {
    if (window.parent !== window && e.source === window.parent) checkOnAction();
  });

  // Every plugin API call this iframe makes (bridge postApi, sketchpad api).
  window.fetch = (input, init) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
    if (url.startsWith('/__') && url !== HTTP_PROBE_URL) checkOnAction();
    return nativeFetch(input, init);
  };
}
