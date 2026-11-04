// Browser module-link errors are not Vite compile errors: they can leave #root
// empty without a vite-error-overlay or a failed <script> request. A reload
// gives the browser a fresh module map after a multi-file edit/sync race.
export function installBlankPreviewRecovery() {
  if (window.parent === window || window.name.startsWith('pv-spec-') ||
      window.location.pathname.endsWith('/components.html')) return;

  const SETTLE_MS = 1_500;
  const MAX_WAIT_MS = 30_000;
  // App navigation updates the URL without replacing this bridge. Charge the
  // URL being reloaded so the next document reads the same retry budget.
  const storageKey = () => `pv-blank-preview-retry:${location.pathname}${location.search}`;
  const nativeFetch = window.fetch.bind(window);
  let pending = false;

  const emptyRoot = () => {
    const root = document.getElementById('root');
    return !!root && root.childElementCount === 0 && !root.textContent?.trim();
  };
  // React portals can render a functioning UI outside #root. Treat any other
  // body element or non-whitespace text as app content, ignoring infrastructure.
  const hasOutsideContent = () => Array.from(document.body.childNodes).some(node => {
    if (node.nodeType === Node.TEXT_NODE) return !!node.textContent?.trim();
    return node instanceof Element && node.id !== 'root' &&
      !node.matches('script, style, link, vite-error-overlay, [data-pv-ui]');
  });
  const eligible = () => document.readyState === 'complete' && emptyRoot() &&
    !hasOutsideContent() && !document.querySelector('vite-error-overlay');

  // The budget survives iframe reloads. Re-arm only after a rendered app has
  // stayed healthy for five seconds, never just because a new document loaded.
  let healthySince = 0;
  const healthyTimer = window.setInterval(() => {
    if (!document.getElementById('root') || emptyRoot() || document.querySelector('vite-error-overlay')) {
      healthySince = 0;
      return;
    }
    healthySince ||= Date.now();
    if (Date.now() - healthySince < 5_000) return;
    try { sessionStorage.removeItem(storageKey()); } catch { /* recovery fails closed */ }
    clearInterval(healthyTimer);
  }, 1_000);

  const onModuleError = (message: string) => {
    if (pending || !/(does not provide an export named|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed)/i.test(message)) return;
    if (!emptyRoot() || hasOutsideContent()) return;
    try {
      if (sessionStorage.getItem(storageKey())) return;
    } catch { return; } // No durable budget means no safe automatic retry.
    pending = true;
    healthySince = 0;
    const deadline = Date.now() + MAX_WAIT_MS;
    let cancelled = false;
    const stop = () => {
      cancelled = true;
      pending = false;
      observer.disconnect();
    };
    // A successful render during the grace period invalidates this evidence,
    // even if the app deliberately renders nothing again before the probe ends.
    const observer = new MutationObserver(() => { if (!emptyRoot() || hasOutsideContent()) stop(); });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    const check = async () => {
      if (cancelled) return;
      if (Date.now() >= deadline) return stop();
      // If React mounted or Vite owns the error, leave recovery to the app or
      // the existing crash overlay. Never turn an unrelated console error into
      // a refresh of an already rendered page.
      if (!emptyRoot() || hasOutsideContent() || document.querySelector('vite-error-overlay')) return stop();
      if (document.readyState !== 'complete') {
        window.setTimeout(check, SETTLE_MS);
        return;
      }
      try {
        const response = await nativeFetch('/__hmr-activity', {
          cache: 'no-store', signal: AbortSignal.timeout(2_000),
        });
        if (!response.ok) throw new Error('Server unavailable');
        const { msSinceLastChange } = await response.json();
        if (msSinceLastChange !== null &&
            (typeof msSinceLastChange !== 'number' || msSinceLastChange < SETTLE_MS)) {
          window.setTimeout(check, SETTLE_MS);
          return;
        }
        // A render, overlay, or another document can win while HTTP is pending.
        const key = storageKey();
        if (cancelled || !eligible() || Date.now() >= deadline || sessionStorage.getItem(key)) return stop();
        sessionStorage.setItem(key, '1');
        stop();
        console.warn('[protovibe] Module error left the app root empty; retrying this preview once.');
        window.location.reload();
      } catch {
        window.setTimeout(check, SETTLE_MS);
      }
    };
    window.setTimeout(check, SETTLE_MS);
  };

  window.addEventListener('error', event => onModuleError(event.message || ''));
  window.addEventListener('unhandledrejection', event => {
    onModuleError(typeof event.reason?.message === 'string' ? event.reason.message : '');
  });
}
