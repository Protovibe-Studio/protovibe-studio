export const previewRootIds = { app: 'root', components: 'pv-previewer-root', sketchpad: 'sketchpad-root' } as const;

// Keep this check conservative: an intentionally empty app is valid, and a
// portal or an error boundary may provide usable UI outside the app root.
export function hasPreviewContent(doc: Document, rootId: string): boolean {
  const root = doc.getElementById(rootId);
  if (root && (root.childElementCount > 0 || root.textContent?.trim())) return true;
  if (rootId !== previewRootIds.app) return false;
  return Array.from(doc.body?.childNodes ?? []).some(node => {
    if (node.nodeType === 3) return !!node.textContent?.trim();
    return node.nodeType === 1 && (node as Element).id !== 'root' &&
      !(node as Element).matches('script, style, link, vite-error-overlay, [data-pv-ui]');
  });
}

// Detection lives outside React, so it survives a root unmount caused by an
// uncaught render error. The shell owns all retries and the final error state;
// reloading this document must never reset that budget.
export function installBlankPreviewRecovery(rootId: string) {
  if (window.parent === window || window.name.startsWith('pv-spec-')) return;

  const SETTLE_MS = 1_500;
  let pending: { detail: string; sawBlank: boolean } | null = null;
  let timer: number | undefined;
  let reportedHealthy = false;
  let reportedContent = false;
  let failedScript: string | null = null;
  let lastViteState: 'overlay' | 'module' | 'clear' | undefined;
  const blank = () => !!document.getElementById(rootId) && !hasPreviewContent(document, rootId);
  const cancel = () => {
    pending = null;
    window.clearTimeout(timer);
  };
  const check = () => {
    if (!pending || document.readyState !== 'complete') return;
    if (blank() && !document.querySelector('vite-error-overlay')) {
      window.parent.postMessage({ type: 'PV_BLANK_PREVIEW_ERROR', detail: pending.detail }, window.location.origin);
    }
    cancel();
  };
  const observeContent = () => {
    const hasOverlay = !!document.querySelector('vite-error-overlay');
    const hasContent = hasPreviewContent(document, rootId);
    const viteState = hasOverlay ? 'overlay' : failedScript && !hasContent ? 'module' : 'clear';
    if (viteState !== lastViteState && (viteState !== 'clear' || document.readyState !== 'loading')) {
      lastViteState = viteState;
      window.parent.postMessage(viteState === 'clear'
        ? { type: 'PV_VITE_ERROR_CLEARED' }
        : { type: 'PV_VITE_ERROR', moduleLoadError: viteState === 'module', detail: failedScript }, location.origin);
    }
    // Dismiss ordinary loading as soon as the preview renders. Recovery
    // confirmation still waits for a complete, healthy document below.
    if (!reportedContent && hasContent) {
      window.parent.postMessage({ type: 'PV_APP_PREVIEW_READY' }, window.location.origin);
      reportedContent = true;
    }
    const isBlank = !!document.getElementById(rootId) && !hasContent;
    if (pending) {
      // React may report the error just before it unmounts the root. Conversely,
      // a successful render invalidates an earlier blank-page error, even if
      // the app intentionally renders nothing again later.
      if (isBlank) pending.sawBlank = true;
      else if (pending.sawBlank && hasContent) cancel();
    }
    const healthy = document.readyState === 'complete' && hasContent && !hasOverlay;
    if (healthy && !reportedHealthy) {
      window.parent.postMessage({ type: 'PV_BLANK_PREVIEW_RECOVERED' }, window.location.origin);
    } else if (!healthy && reportedHealthy) {
      window.parent.postMessage({ type: 'PV_BLANK_PREVIEW_UNHEALTHY' }, window.location.origin);
    }
    reportedHealthy = healthy;
  };
  const onError = (reason: unknown, fallback = 'Unknown runtime error') => {
    const detail = (typeof reason === 'string' ? reason :
      reason && typeof (reason as Error).message === 'string'
        ? (typeof (reason as Error).stack === 'string' ? (reason as Error).stack! : (reason as Error).message) : '') || fallback;
    if (pending) {
      pending.detail = detail.slice(0, 8_000);
      return;
    }
    pending = { detail: detail.slice(0, 8_000), sawBlank: blank() };
    timer = window.setTimeout(check, SETTLE_MS);
  };

  // A failed entry module can leave a fresh document blank without a Vite
  // overlay. Ignore failures in auxiliary scripts when the canvas is usable.
  window.addEventListener('error', event => {
    const script = event.target;
    if (!(script instanceof HTMLScriptElement) || !script.src) return;
    const url = new URL(script.src);
    if (url.origin !== location.origin) return;
    failedScript = `Could not load ${url.pathname.split('/').pop()} or one of its imports.`;
    observeContent();
  }, true);
  window.addEventListener('error', event => onError(event.error || event.message));
  window.addEventListener('unhandledrejection', event => onError(event.reason, 'Unhandled promise rejection'));
  // A reload or navigation also interrupts the shell's confirmation period.
  window.addEventListener('pagehide', () => {
    window.parent.postMessage({ type: 'PV_BLANK_PREVIEW_UNHEALTHY' }, window.location.origin);
    reportedHealthy = false;
  });
  const observer = new MutationObserver(observeContent);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  window.addEventListener('pageshow', () => {
    reportedContent = false;
    observeContent();
  });
  window.addEventListener('load', () => {
    observeContent();
    if (pending) {
      window.clearTimeout(timer);
      timer = window.setTimeout(check, SETTLE_MS);
    }
  });
  observeContent();
}
