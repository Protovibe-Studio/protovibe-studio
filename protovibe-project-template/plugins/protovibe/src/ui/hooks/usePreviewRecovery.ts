import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { hasPreviewContent, previewRootIds } from '../blank-preview-recovery';
import type { IframeTab } from '../components/ShellNavBar';
import { getCurrentAppPath } from '../utils/appPath';

const RETRY_AT_MS = [1_000, 5_000, 10_000];
const FINAL_ERROR_AT_MS = 15_000;
const ERROR_RETRY_MS = 5_000;
const RELOAD_TIMEOUT_MS = 30_000;
const SOURCE_SETTLE_MS = 1_500;
const SOURCE_IDLE_MS = 10_000;
const RECOVERY_CONFIRM_MS = 2_500;

type Phase = 'none' | 'pending' | 'error';

interface Episode {
  start: number;
  retries: number;
  nextRetry: number;
  blankPreview: boolean;
  detail: string | null;
}

function readViteError(doc: Document | null) {
  const root = doc?.querySelector('vite-error-overlay')?.shadowRoot;
  return ['.plugin', '.message-body', '.file', '.frame']
    .map(selector => root?.querySelector(selector)?.textContent?.trim())
    .filter(Boolean).join('\n\n') || null;
}

export function usePreviewRecovery(ref: RefObject<HTMLIFrameElement | null>, tab: IframeTab) {
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>('none');
  const [moduleLoadError, setModuleLoadError] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const episode = useRef<Episode | null>(null);
  const tick = useRef<number | undefined>(undefined);
  const confirmation = useRef<number | undefined>(undefined);
  const reloadStarted = useRef<number | null>(null);
  const rootId = previewRootIds[tab];

  const cancelConfirmation = useCallback(() => {
    window.clearTimeout(confirmation.current);
    confirmation.current = undefined;
  }, []);

  const clear = useCallback(() => {
    episode.current = null;
    reloadStarted.current = null;
    window.clearInterval(tick.current);
    cancelConfirmation();
  }, [cancelConfirmation]);

  const dismiss = useCallback(() => {
    clear();
    setPhase('none');
    setModuleLoadError(false);
    setDetail(null);
  }, [clear]);

  const reload = useCallback(() => {
    const frame = ref.current;
    if (!frame) return;
    setLoading(true);
    cancelConfirmation();
    if (episode.current) reloadStarted.current = Date.now();
    try {
      frame.contentWindow?.location.reload();
    } catch {
      frame.src = tab === 'app' ? getCurrentAppPath() : frame.src;
    }
  }, [ref, tab, cancelConfirmation]);

  // The shell retains this frame's clock across failed document loads, even
  // while another tab is visible. Only a manual retry starts a fresh budget.
  const start = useCallback(() => {
    const ep: Episode = {
      start: Date.now(), retries: 0, nextRetry: 0,
      blankPreview: episode.current?.blankPreview ?? false,
      detail: episode.current?.detail ?? null,
    };
    clear();
    episode.current = ep;
    setPhase('pending');
    let probing = false;
    tick.current = window.setInterval(async () => {
      if (probing || confirmation.current !== undefined) return;
      const inFlight = reloadStarted.current !== null && Date.now() - reloadStarted.current < RELOAD_TIMEOUT_MS;
      if (ep.nextRetry) {
        if (Date.now() < ep.nextRetry || inFlight) return;
        ep.nextRetry = Date.now() + ERROR_RETRY_MS;
        reload();
        return;
      }

      let ready = false;
      let idleFor = Infinity;
      probing = true;
      try {
        const response = await fetch('/__hmr-activity', { cache: 'no-store', signal: AbortSignal.timeout(2_000) });
        if (response.ok) {
          const { msSinceLastChange } = await response.json();
          idleFor = typeof msSinceLastChange === 'number' ? msSinceLastChange : Infinity;
          ready = msSinceLastChange === null || (typeof msSinceLastChange === 'number' && idleFor >= SOURCE_SETTLE_MS);
        }
      } catch {
        // An unavailable server must still reach the final error state.
      } finally {
        probing = false;
      }
      if (episode.current !== ep || confirmation.current !== undefined) return;
      const doc = ref.current?.contentDocument;
      const elapsed = Date.now() - ep.start;
      const canRetry = !ep.blankPreview || (ready && doc?.readyState === 'complete' && !hasPreviewContent(doc, rootId));
      if (!inFlight && ep.retries < RETRY_AT_MS.length && elapsed >= RETRY_AT_MS[ep.retries] && canRetry) {
        ep.retries++;
        reload();
      } else if (elapsed >= FINAL_ERROR_AT_MS && idleFor >= SOURCE_IDLE_MS) {
        ep.nextRetry = Date.now() + ERROR_RETRY_MS;
        setModuleLoadError(!doc?.querySelector('vite-error-overlay'));
        setDetail(ep.detail || readViteError(doc ?? null) || readViteError(document));
        setPhase('error');
      }
    }, 1_000);
    return ep;
  }, [ref, rootId, clear, reload]);

  const refresh = useCallback(() => {
    if (episode.current) start();
    reload();
  }, [start, reload]);

  const onPageHide = useCallback(() => {
    if (episode.current) reloadStarted.current ??= Date.now();
    setLoading(true);
    cancelConfirmation();
  }, [cancelConfirmation]);
  const onReady = useCallback(() => {
    setLoading(false);
    ref.current?.contentDocument?.defaultView?.addEventListener('pagehide', onPageHide, { once: true });
  }, [ref, onPageHide]);
  const onLoad = useCallback(() => {
    reloadStarted.current = null;
    onReady();
  }, [onReady]);

  useEffect(() => {
    const report = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== ref.current?.contentWindow) return;
      const { type, moduleLoadError: failedScript } = event.data ?? {};
      const doc = ref.current?.contentDocument;
      if (!doc) return;
      const ep = episode.current;
      if (type === 'PV_APP_PREVIEW_READY') {
        onReady();
      } else if (type === 'PV_BLANK_PREVIEW_UNHEALTHY') {
        cancelConfirmation();
      } else if (type === 'PV_VITE_ERROR' || type === 'PV_BLANK_PREVIEW_ERROR') {
        const blank = type === 'PV_BLANK_PREVIEW_ERROR';
        if (blank && hasPreviewContent(doc, rootId)) return;
        cancelConfirmation();
        const current = ep ?? start();
        const reportDetail = typeof event.data.detail === 'string' ? event.data.detail.slice(0, 8_000) : null;
        if (blank || (tab !== 'app' && failedScript)) current.blankPreview = true;
        if (blank) {
          current.detail = reportDetail ?? current.detail;
          setDetail(current.detail);
        } else {
          current.detail = readViteError(doc) || current.detail || reportDetail;
        }
        setModuleLoadError(blank || !!failedScript || (current.blankPreview && !doc.querySelector('vite-error-overlay')));
      } else if (ep && (type === 'PV_VITE_ERROR_CLEARED' || type === 'PV_BLANK_PREVIEW_RECOVERED')) {
        // A fresh Vite client without an overlay can still have a broken
        // module graph. A blank runtime crash or panel must actually render.
        const needsContent = ep.blankPreview || tab !== 'app';
        if (needsContent && type !== 'PV_BLANK_PREVIEW_RECOVERED') return;
        if (confirmation.current !== undefined) return;
        confirmation.current = window.setTimeout(() => {
          confirmation.current = undefined;
          if (ref.current?.contentDocument !== doc || doc.querySelector('vite-error-overlay')) return;
          if (needsContent && (doc.readyState !== 'complete' || !hasPreviewContent(doc, rootId))) return;
          dismiss();
        }, RECOVERY_CONFIRM_MS);
      }
    };
    window.addEventListener('message', report);
    return () => {
      window.removeEventListener('message', report);
      clear();
    };
  }, [ref, tab, rootId, clear, dismiss, cancelConfirmation, onReady, start]);

  return { loading, phase, moduleLoadError, detail, refresh, dismiss, onLoad };
}
