// Keep this check conservative: an intentionally empty app is valid, and a
// portal or an error boundary may provide usable UI outside the app root.
export function hasPreviewContent(doc: Document): boolean {
  const root = doc.getElementById('root');
  if (root && (root.childElementCount > 0 || root.textContent?.trim())) return true;
  return Array.from(doc.body?.childNodes ?? []).some(node => {
    if (node.nodeType === 3) return !!node.textContent?.trim();
    return node.nodeType === 1 && (node as Element).id !== 'root' &&
      !(node as Element).matches('script, style, link, vite-error-overlay, [data-pv-ui]');
  });
}

// Detection lives outside React, so it survives a root unmount caused by an
// uncaught render error. The shell owns all retries and the final error state;
// reloading this document must never reset that budget.
export function installBlankPreviewRecovery() {
  if (window.parent === window || window.name.startsWith('pv-spec-') ||
      window.location.pathname.endsWith('/components.html')) return;

  const SETTLE_MS = 1_500;
  let pending: { detail: string; sawBlank: boolean } | null = null;
  let timer: number | undefined;
  let reportedHealthy = false;
  let reportedContent = false;
  const blank = () => !!document.getElementById('root') && !hasPreviewContent(document);
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
    // First content is enough to dismiss the ordinary loading indicator.
    // Recovery confirmation still waits for a complete, healthy document below.
    if (!reportedContent && hasPreviewContent(document)) {
      window.parent.postMessage({ type: 'PV_APP_PREVIEW_READY' }, window.location.origin);
      reportedContent = true;
    }
    const isBlank = blank();
    if (pending) {
      // React may report the error just before it unmounts the root. Conversely,
      // a successful render invalidates an earlier blank-page error, even if
      // the app intentionally renders nothing again later.
      if (isBlank) pending.sawBlank = true;
      else if (pending.sawBlank && hasPreviewContent(document)) cancel();
    }
    const healthy = document.readyState === 'complete' && hasPreviewContent(document) &&
      !document.querySelector('vite-error-overlay');
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
