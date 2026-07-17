// plugins/protovibe/src/ui/ProtovibeApp.tsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, RotateCw, RefreshCw, Home, ExternalLink, Smartphone, X, Undo2, HelpCircle, BookOpen, Keyboard, Bug, Eraser, ListTree } from 'lucide-react';
import { useFloatingDropdownPosition } from './hooks/useFloatingDropdownPosition';
import { ShellNavBar, IframeTab, SidebarTab } from './components/ShellNavBar';
import { TokensTab } from './components/TokensTab';
import { PromptsTab } from './components/PromptsTab';
import { CommentsTab } from './components/CommentsTab';
import { Sidebar } from './components/Sidebar';
import { ElementsPanel } from './components/ElementsPanel';
import { FloatingToolbar } from './components/FloatingToolbar';
import { NotEditableDialog } from './components/NotEditableDialog';
import { ToastViewport } from './components/ToastViewport';
import { GitMenu } from './components/GitMenu';
import { GitSyncBanner } from './components/GitSyncBanner';
import { CrashLoadingOverlay, CrashErrorOverlay } from './components/CrashLoadingOverlay';
import { useGitSync } from './hooks/useGitSync';
import { useIframeBridge } from './hooks/useIframeBridge';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useProtovibe } from './context/ProtovibeContext';
import { theme } from './theme';
import { INSPECTOR_WIDTH_PX } from './constants/layout';
import { restartServer, undo } from './api/client';
import { emitToast, formatUndoRedoMessage } from './events/toast';
import { openInBrowser, handleExternalLinkClick } from './utils/openExternal';
import { commentIdSelector } from '../shared/comments';
import type { CommentContext } from '../shared/comments';
import { consumePersistedAppPath, persistAppPath, setCurrentAppPath, getCurrentAppPath } from './utils/appPath';

// A Vite crash is often a transient state while an AI agent edits code, so the
// shell runs each crash as an "episode" behind a loading cover instead of
// alarming the user immediately:
//   t+5s / t+10s — auto-refresh the app iframe (Vite doesn't always manage to
//                  auto-reload out of a broken state; a refresh sometimes does)
//   t+15s        — show the full error state, but only once watched source
//                  files have stopped changing — an agent mid-task keeps the
//                  loading cover up for as long as it keeps writing.
// The episode clock is retained across those refreshes: a reloading document
// re-reports its error state (see bridge.ts), which must not reset the counter.
const CRASH_AUTO_REFRESH_AT_MS = [5_000, 10_000];
const CRASH_FINAL_ERROR_AT_MS = 15_000;
// A source change within this window counts as "agent still working" and
// postpones the final error until the writes stop.
const CRASH_ACTIVITY_EXTEND_MS = 10_000;
// How long after an ambiguous "no error yet" report (a freshly loaded document
// that may still crash — see bridge.ts) before the episode counts as recovered.
const CRASH_RECOVERY_CONFIRM_MS = 2_500;
const CRASH_TICK_MS = 1_000;

// none: healthy · pending: crash inside the grace period (canvas covered by a
// loading state) · error: crash outlived the grace period (full error shown).
type ViteErrorPhase = 'none' | 'pending' | 'error';

// The shell itself is a Vite client, so error payloads pushed over the HMR
// websocket create a vite-error-overlay in this document too (hidden by
// shell.css). Read it to recover the error text for the blank-canvas case,
// where the app iframe has no overlay of its own to show.
function readOwnViteOverlayError(): string | null {
  try {
    const root = (document.querySelector('vite-error-overlay') as HTMLElement & { shadowRoot?: ShadowRoot | null })?.shadowRoot;
    if (!root) return null;
    const part = (sel: string) => root.querySelector(sel)?.textContent?.trim() || '';
    const text = [part('.plugin'), part('.message-body'), part('.file'), part('.frame')]
      .filter(Boolean)
      .join('\n\n');
    return text || null;
  } catch {
    return null;
  }
}

function parseTabParam(search: string): IframeTab {
  const tab = new URLSearchParams(search).get('tab');
  return tab === 'components' || tab === 'sketchpad' ? tab : 'app';
}

function syncTabToURL(tab: IframeTab) {
  const url = new URL(window.location.href);
  url.searchParams.set('tab', tab);
  window.history.pushState({}, '', url.toString());
}

export const ProtovibeApp: React.FC = () => {
  const [activeIframeTab, setActiveIframeTab] = useState<IframeTab>(
    () => parseTabParam(window.location.search)
  );
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('design');
  const [viteErrorPhase, setViteErrorPhase] = useState<ViteErrorPhase>('none');
  // A crash that leaves the canvas blank (failed module load on a fresh page,
  // no vite-error-overlay in the iframe) — the shell must render the final
  // error itself, using whatever detail it can recover.
  const [moduleLoadError, setModuleLoadError] = useState(false);
  const [viteErrorDetail, setViteErrorDetail] = useState<string | null>(null);
  // Ref mirror so the (once-registered) message handler and the episode tick
  // can read the current phase without re-subscribing on every change.
  const viteErrorPhaseRef = useRef<ViteErrorPhase>('none');
  // The active crash episode. It survives auto/manual refreshes so the
  // countdown to the final error isn't reset by a reloading document.
  // canvasBlanked: the app iframe was reloaded into a failed module load at
  // some point, so it may need one more reload to come back after recovery.
  const crashEpisodeRef = useRef<{ start: number; refreshesDone: number; canvasBlanked: boolean } | null>(null);
  const crashTickRef = useRef<number | null>(null);
  const crashRecoveryTimerRef = useRef<number | null>(null);
  // Freshness of the last watched-source change, polled from the dev server
  // during an episode (Infinity until a poll lands or when polling fails).
  const crashActivityMsAgoRef = useRef<number>(Infinity);

  const setViteError = useCallback((phase: ViteErrorPhase) => {
    viteErrorPhaseRef.current = phase;
    setViteErrorPhase(phase);
  }, []);

  const clearCrashRecoveryTimer = useCallback(() => {
    if (crashRecoveryTimerRef.current !== null) {
      window.clearTimeout(crashRecoveryTimerRef.current);
      crashRecoveryTimerRef.current = null;
    }
  }, []);

  const clearCrashTick = useCallback(() => {
    if (crashTickRef.current !== null) {
      window.clearInterval(crashTickRef.current);
      crashTickRef.current = null;
    }
  }, []);

  const endCrashEpisode = useCallback(() => {
    crashEpisodeRef.current = null;
    clearCrashTick();
    clearCrashRecoveryTimer();
    setViteError('none');
    setModuleLoadError(false);
    setViteErrorDetail(null);
  }, [clearCrashTick, clearCrashRecoveryTimer, setViteError]);
  // Unread-thread count broadcast by the (always-mounted) CommentsTab, surfaced
  // as a dot on the Comments nav tab even while that panel is hidden.
  const [unreadComments, setUnreadComments] = useState(0);

  useEffect(() => {
    const handler = (e: Event) => setUnreadComments((e as CustomEvent).detail?.count || 0);
    window.addEventListener('pv-comments-unread', handler);
    return () => window.removeEventListener('pv-comments-unread', handler);
  }, []);

  const { inspectorOpen, toggleInspector, refreshComponents, setHtmlFontSize, runLockedMutation, iframeTheme, setIframeTheme, focusElement } = useProtovibe();
  const git = useGitSync();
  // Restore the last app path once per refresh (the stored value is consumed
  // on read; interactions re-arm it — see utils/appPath.ts).
  const [initialAppSrc] = useState(consumePersistedAppPath);
  const [appIframePath, setAppIframePath] = useState(initialAppSrc);
  useEffect(() => { setCurrentAppPath(initialAppSrc); }, [initialAppSrc]);
  const [mobileWidth, setMobileWidth] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [elementsPanelOpen, setElementsPanelOpen] = useState(() => {
    try { return localStorage.getItem('pv-elements-panel-open') === 'true'; } catch { return false; }
  });
  const toggleElementsPanel = useCallback(() => {
    setElementsPanelOpen(v => {
      try { localStorage.setItem('pv-elements-panel-open', String(!v)); } catch {}
      return !v;
    });
  }, []);
  const appIframeRef = useRef<HTMLIFrameElement>(null);
  const sketchpadIframeRef = useRef<HTMLIFrameElement>(null);
  const componentsIframeRef = useRef<HTMLIFrameElement>(null);
  const appScrollPositionsRef = useRef<Array<{ el: Element; top: number; left: number }>>([]);

  // Reload one canvas iframe (used by the crash covers, the crash banner, and
  // the episode's auto-refresh schedule).
  const reloadIframe = useCallback((ref: React.RefObject<HTMLIFrameElement | null>) => {
    try {
      ref.current?.contentWindow?.location.reload();
    } catch {
      if (ref.current) ref.current.src = ref.current.src; // eslint-disable-line no-self-assign
    }
  }, []);

  // Begin a crash episode: cover the canvas and drive the auto-refresh /
  // final-error schedule off one retained clock.
  const startCrashEpisode = useCallback(() => {
    crashEpisodeRef.current = { start: Date.now(), refreshesDone: 0, canvasBlanked: false };
    crashActivityMsAgoRef.current = Infinity;
    setViteError('pending');
    clearCrashTick();
    crashTickRef.current = window.setInterval(() => {
      const ep = crashEpisodeRef.current;
      if (!ep || viteErrorPhaseRef.current !== 'pending') return;

      // Refresh the dev server's view of agent activity. A stale result is
      // fine — the deadline check just uses the latest poll that has landed.
      fetch('/__hmr-activity')
        .then(r => r.json())
        .then(d => {
          crashActivityMsAgoRef.current = typeof d?.msSinceLastChange === 'number' ? d.msSinceLastChange : Infinity;
        })
        .catch(() => { crashActivityMsAgoRef.current = Infinity; });

      const elapsed = Date.now() - ep.start;
      if (ep.refreshesDone < CRASH_AUTO_REFRESH_AT_MS.length && elapsed >= CRASH_AUTO_REFRESH_AT_MS[ep.refreshesDone]) {
        ep.refreshesDone += 1;
        reloadIframe(appIframeRef);
        return;
      }
      if (elapsed >= CRASH_FINAL_ERROR_AT_MS && crashActivityMsAgoRef.current >= CRASH_ACTIVITY_EXTEND_MS) {
        clearCrashTick();
        setViteErrorDetail(readOwnViteOverlayError());
        setViteError('error');
      }
    }, CRASH_TICK_MS);
  }, [setViteError, clearCrashTick, reloadIframe]);

  const captureAppScrollPositions = useCallback(() => {
    const doc = appIframeRef.current?.contentDocument;
    if (!doc) return;
    const positions: Array<{ el: Element; top: number; left: number }> = [];
    doc.querySelectorAll('*').forEach((el) => {
      if (el.scrollTop > 0 || el.scrollLeft > 0) {
        positions.push({ el, top: el.scrollTop, left: el.scrollLeft });
      }
    });
    appScrollPositionsRef.current = positions;
  }, []);

  const restoreAppScrollPositions = useCallback(() => {
    requestAnimationFrame(() => {
      appScrollPositionsRef.current.forEach(({ el, top, left }) => {
        el.scrollTop = top;
        el.scrollLeft = left;
      });
    });
  }, []);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const { style: moreMenuStyle } = useFloatingDropdownPosition({
    isOpen: moreMenuOpen,
    anchorRef: moreButtonRef,
    dropdownRef: moreMenuRef,
    preferredPlacement: 'top',
    offset: 6,
  });

  // Close the "More" menu when clicking outside
  useEffect(() => {
    if (!moreMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        moreButtonRef.current?.contains(e.target as Node) ||
        moreMenuRef.current?.contains(e.target as Node)
      ) return;
      setMoreMenuOpen(false);
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [moreMenuOpen]);

  // Inspector bridge targets all iframes — identifies source via e.source
  useIframeBridge(appIframeRef, sketchpadIframeRef, componentsIframeRef);
  useKeyboardShortcuts();

  // Canonical tab-switch: preserves inspector focus across tabs so users can
  // tweak a component in Components and preview it in App without re-selecting.
  const handleIframeTabChange = useCallback((tab: IframeTab) => {
    if (activeIframeTab === 'app' && tab !== 'app') {
      captureAppScrollPositions();
    }
    setActiveIframeTab(tab);
    syncTabToURL(tab);
    if (tab === 'app' && activeIframeTab !== 'app') {
      restoreAppScrollPositions();
    }
    refreshComponents();
    if (tab === 'components') {
      componentsIframeRef.current?.contentWindow?.postMessage({ type: 'PV_REFRESH_COMPONENTS' }, '*');
    }
    if (tab === 'sketchpad') {
      (document.activeElement as HTMLElement | null)?.blur?.();
      requestAnimationFrame(() => {
        sketchpadIframeRef.current?.contentWindow?.focus();
        sketchpadIframeRef.current?.contentWindow?.postMessage(
          { type: 'PV_SKETCHPAD_TAB_OPENED' },
          '*',
        );
      });
    }
  }, [refreshComponents, activeIframeTab, captureAppScrollPositions, restoreAppScrollPositions]);

  // Ensure ?tab param is always present in the URL on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('tab')) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', activeIframeTab);
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Sync tab when the user navigates with browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const tab = parseTabParam(window.location.search);
      setActiveIframeTab(tab);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // When a ui-source tab is clicked in the inspector, switch to the Components
  // iframe and tell the previewer to open that component's playground view.
  // Route through handleIframeTabChange so focus + outlines are always cleared.
  useEffect(() => {
    const handler = (e: Event) => {
      const { filePath, currentProps } = (e as CustomEvent<{ filePath: string, currentProps: any }>).detail;
      handleIframeTabChange('components');
      componentsIframeRef.current?.contentWindow?.postMessage(
        { type: 'PV_OPEN_COMPONENT', filePath, currentProps },
        '*'
      );
    };
    window.addEventListener('pv-open-component-preview', handler);
    return () => window.removeEventListener('pv-open-component-preview', handler);
  }, [handleIframeTabChange]);

  // Bring a comment's anchored element into view. Retries across iframes because
  // the element may only appear after a tab switch or an app-iframe navigation.
  const focusThreadElement = useCallback((threadId: string) => {
    // Each thread anchors its element via its own `data-pv-comment-{id}` attribute.
    const sel = commentIdSelector(threadId);
    let attempts = 0;
    const tryFind = () => {
      let el: HTMLElement | null = null;
      for (const iframe of Array.from(document.querySelectorAll('iframe')) as HTMLIFrameElement[]) {
        el = (iframe.contentDocument?.querySelector(sel) as HTMLElement | null) ?? null;
        if (el) break;
      }
      if (!el) el = document.querySelector(sel) as HTMLElement | null;
      if (el) {
        focusElement(el, true);
        try { el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); } catch {}
        return;
      }
      attempts++;
      if (attempts < 25) setTimeout(tryFind, 150);
    };
    setTimeout(tryFind, 120);
  }, [focusElement]);

  // The comments panel asks us to bring a thread's saved context into view.
  useEffect(() => {
    const handler = (e: Event) => {
      const { context, threadId } = (e as CustomEvent<{ context?: CommentContext; threadId: string }>).detail || {};
      if (!context || !threadId) return;

      if (context.tab === 'sketchpad') {
        handleIframeTabChange('sketchpad');
        // Defer so the iframe has non-zero dimensions before computing a transform.
        requestAnimationFrame(() => {
          sketchpadIframeRef.current?.contentWindow?.postMessage({
            type: 'PV_SKETCHPAD_FOCUS',
            sketchpadId: context.sketchpadId,
            frameId: context.frameId,
            position: context.position,
          }, '*');
        });
        return;
      }

      if (context.tab === 'components') {
        handleIframeTabChange('components');
        if (context.file) {
          componentsIframeRef.current?.contentWindow?.postMessage(
            { type: 'PV_OPEN_COMPONENT', filePath: context.file, currentProps: {} },
            '*',
          );
        }
        focusThreadElement(threadId);
        return;
      }

      // App: switch tab, navigate the iframe to the saved path when it differs,
      // then select + scroll to the element (the retry loop covers reload delay).
      handleIframeTabChange('app');
      const win = appIframeRef.current?.contentWindow;
      let targetPath = context.pathname;
      if (!targetPath && context.url) {
        try { const u = new URL(context.url); targetPath = u.pathname + u.search; } catch { /* ignore */ }
      }
      if (win && targetPath) {
        try {
          const current = win.location.pathname + win.location.search;
          if (current !== targetPath) win.location.href = targetPath;
        } catch {
          win.location.href = targetPath;
        }
      }
      focusThreadElement(threadId);
    };
    window.addEventListener('pv-comment-navigate', handler);
    return () => window.removeEventListener('pv-comment-navigate', handler);
  }, [handleIframeTabChange, focusThreadElement]);

  // Forward zoom shortcuts to the sketchpad iframe when it's the active tab
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (activeIframeTab !== 'sketchpad') return;
      if (!(e.metaKey || e.ctrlKey)) return;
      if (!['Digit0', 'Numpad0', 'Equal', 'NumpadAdd', 'Minus', 'NumpadSubtract'].includes(e.code)) return;
      e.preventDefault();
      sketchpadIframeRef.current?.contentWindow?.postMessage({ type: 'PV_SKETCHPAD_ZOOM', code: e.code }, '*');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeIframeTab]);

  // Listen for Vite error reports from the iframe bridges. A crash is often
  // just a transient state while an AI agent edits code, so it runs as an
  // episode (see the CRASH_* constants) instead of alarming the user right away.
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'PV_VITE_ERROR') {
        // Last write wins: an overlay appearing in the iframe means the canvas
        // is no longer blank, a failed module load means it is.
        if (typeof e.data.moduleLoadError === 'boolean') setModuleLoadError(e.data.moduleLoadError);
        if (e.data.moduleLoadError && crashEpisodeRef.current) crashEpisodeRef.current.canvasBlanked = true;
        // An error during recovery confirmation means the app is still broken
        // — keep the episode (and its clock).
        clearCrashRecoveryTimer();
        if (!crashEpisodeRef.current) startCrashEpisode();
      }
      if (e.data?.type === 'PV_VITE_ERROR_CLEARED') {
        if (!crashEpisodeRef.current) return;
        // No CLEARED is definitive: vite removes and re-adds the overlay on
        // every update cycle when a broken JS update rides along with a
        // successful CSS one, and a freshly loaded document merely hasn't
        // errored *yet*. Confirm recovery with a delay — a quick re-error
        // cancels it, retaining the episode clock.
        const fromAppIframe = e.source === appIframeRef.current?.contentWindow;
        if (crashRecoveryTimerRef.current === null) {
          crashRecoveryTimerRef.current = window.setTimeout(() => {
            crashRecoveryTimerRef.current = null;
            // A canvas left blank by a mid-crash reload can't apply HMR
            // updates, so the fix that other iframes just confirmed never
            // reaches it — revive it with one more reload.
            const revive = !!crashEpisodeRef.current?.canvasBlanked && !fromAppIframe;
            endCrashEpisode();
            if (revive) reloadIframe(appIframeRef);
          }, CRASH_RECOVERY_CONFIRM_MS);
        }
      }
    };
    window.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
      clearCrashTick();
      clearCrashRecoveryTimer();
    };
  }, [startCrashEpisode, endCrashEpisode, clearCrashRecoveryTimer, clearCrashTick, reloadIframe]);

  // Re-send state whenever a specific iframe reloads (e.g. HMR full-reload)
  const handleIframeLoad = useCallback((ref: React.RefObject<HTMLIFrameElement | null>) => {
    ref.current?.contentWindow?.postMessage(
      { type: 'PV_SET_THEME', theme: iframeTheme },
      '*'
    );
    ref.current?.contentWindow?.postMessage(
      { type: 'PV_SET_INSPECTOR_ACTIVE', active: inspectorOpen },
      '*'
    );
    // Block Mac trackpad pinch-to-zoom inside app and components-preview iframes.
    // Sketchpad intercepts pinch itself to zoom its infinite canvas, so skip it.
    if (ref !== sketchpadIframeRef) {
      const win = ref.current?.contentWindow;
      if (win) {
        const prevent = (e: Event) => e.preventDefault();
        win.addEventListener('wheel', (e) => {
          if ((e as WheelEvent).ctrlKey) e.preventDefault();
        }, { passive: false });
        win.addEventListener('gesturestart', prevent);
        win.addEventListener('gesturechange', prevent);
        win.addEventListener('gestureend', prevent);
        win.addEventListener('keydown', (e) => {
          const ke = e as KeyboardEvent;
          if ((ke.metaKey || ke.ctrlKey) && ['=', '+', '-', '_', '0'].includes(ke.key)) {
            ke.preventDefault();
          }
        });
      }
    }
    if (ref === appIframeRef) {
      const iframeDoc = ref.current?.contentDocument;
      if (iframeDoc?.defaultView) {
        const fs = parseFloat(iframeDoc.defaultView.getComputedStyle(iframeDoc.documentElement).fontSize);
        if (!isNaN(fs) && fs > 0) setHtmlFontSize(fs);
      }
      try {
        const loc = ref.current?.contentWindow?.location;
        if (loc) {
          const path = loc.pathname + loc.search + loc.hash;
          setAppIframePath(path);
          // Track for other shell components, but don't persist: a bare page
          // load isn't a user interaction, and persisting here would re-arm
          // the restored path in a refresh loop even on a broken page.
          setCurrentAppPath(path);
        }
      } catch {}
    }
  }, [iframeTheme, inspectorOpen, setHtmlFontSize]);

  // Undo the last operation with mutation locking
  const handleUndo = useCallback(async () => {
    await runLockedMutation(async () => {
      const res = await undo();
      if (res?.success) {
        if (res.currentURLQueryString && res.currentURLQueryString !== window.location.search) {
          window.history.pushState({}, '', res.currentURLQueryString);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
        Array.from(document.querySelectorAll('iframe')).forEach((iframe) => {
          iframe.contentWindow?.postMessage({ type: 'PV_UNDO_REDO_COMPLETE' }, '*');
        });
        // Keep the comments panel in sync — an undone thread/reply must drop out
        // of the list (and out of any open thread view).
        window.dispatchEvent(new CustomEvent('pv-comments-refresh'));
        emitToast({ message: formatUndoRedoMessage('Undo', res), variant: 'info', durationMs: 1600 });
      } else {
        emitToast({ message: 'Nothing to undo', variant: 'error', durationMs: 800 });
      }
    });
  }, [runLockedMutation]);

  const activeIframeRef =
    activeIframeTab === 'sketchpad' ? sketchpadIframeRef :
    activeIframeTab === 'components' ? componentsIframeRef :
    appIframeRef;

  // Wipe the prototype's persisted state. The clear runs inside the app iframe
  // (see PV_CLEAR_STORAGE in bridge.ts), which then reloads itself.
  const handleClearStorage = () => {
    appIframeRef.current?.contentWindow?.postMessage({ type: 'PV_CLEAR_STORAGE' }, '*');
    emitToast({ message: 'localStorage cleared', variant: 'info', durationMs: 1600 });
  };

  // Restart the development server when the banner's restart button is clicked
  const handleRestart = async () => {
    try {
      await restartServer();
      endCrashEpisode();
    } catch (e) {
      console.error('Restart failed', e);
    }
  };

  // Track app iframe URL changes (client-side navigation via postMessage)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.source !== appIframeRef.current?.contentWindow) return;
      if (e.data?.type === 'PV_URL_CHANGE') {
        const path = e.data.path || '/';
        setAppIframePath(path);
        setCurrentAppPath(path);
        persistAppPath(path);
      }
      // Selecting an element on the canvas also re-arms the persisted path,
      // so the next refresh restores the page the user is working on.
      if (e.data?.type === 'PV_ELEMENT_CLICK') {
        persistAppPath(getCurrentAppPath());
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Crash covers rendered over each canvas iframe: the loading state during the
  // grace period, and the shell-rendered final error when the canvas is blank
  // (a failed module load leaves no vite-error-overlay to show through to).
  const renderCrashCover = (ref: React.RefObject<HTMLIFrameElement | null>) => (
    <>
      {viteErrorPhase === 'pending' && (
        <CrashLoadingOverlay onRefresh={() => reloadIframe(ref)} onUndo={handleUndo} />
      )}
      {viteErrorPhase === 'error' && moduleLoadError && (
        <CrashErrorOverlay detail={viteErrorDetail} onRefresh={() => reloadIframe(ref)} onUndo={handleUndo} />
      )}
    </>
  );

  // Broadcast theme to all iframes whenever it changes
  useEffect(() => {
    [appIframeRef, sketchpadIframeRef, componentsIframeRef].forEach(ref => {
      ref.current?.contentWindow?.postMessage(
        { type: 'PV_SET_THEME', theme: iframeTheme },
        '*'
      );
    });
  }, [iframeTheme]);

  return (
    <div
      data-pv-ui="true"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        backgroundColor: theme.bg_default,
        overflow: 'hidden',
      }}
    >
      <ShellNavBar
        activeIframeTab={activeIframeTab}
        onIframeTabChange={handleIframeTabChange}
        activeSidebarTab={activeSidebarTab}
        onSidebarTabChange={setActiveSidebarTab}
        unreadComments={unreadComments}
        inspectorOpen={inspectorOpen}
        onToggleInspector={() => toggleInspector()}
      />
      {viteErrorPhase === 'error' && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', background: theme.destructive_low,
          borderBottom: `1px solid ${theme.destructive_default}`,
          flexShrink: 0, zIndex: 50, gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
            <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '2px' }}>⚠️</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ color: theme.destructive_default, fontSize: '15px', fontWeight: 600 }}>
                The app crashed
              </div>
              <div style={{ color: theme.destructive_default, fontSize: '13px', fontWeight: 400, lineHeight: '1.4' }}>
                Undo with Cmd+Z or restart the development. Ask your coding agent for help if the issue persists.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
            <button onClick={() => reloadIframe(activeIframeRef)} style={{ background: theme.destructive_default, color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={16} />
              Refresh
            </button>
            <button onClick={handleUndo} style={{ background: theme.destructive_default, color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Undo2 size={16} />
              Undo
            </button>
            <button onClick={handleRestart} style={{ background: theme.destructive_default, color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RotateCw size={16} />
              Restart
            </button>
          </div>
          <button onClick={endCrashEpisode} style={{ background: 'transparent', color: theme.destructive_default, border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {elementsPanelOpen && (
          <ElementsPanel
            activeIframeTab={activeIframeTab}
            iframeRef={activeIframeRef}
          />
        )}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ flex: 1, display: activeIframeTab === 'app' ? 'flex' : 'none', minHeight: 0, flexDirection: 'column' }}>
            <div
              style={{
                height: 38,
                background: 'rgb(40 40 40)',
                borderBottom: '1px solid rgb(60, 60, 60)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 8px',
                gap: 4,
                flexShrink: 0,
              }}
            >
              {/* Back / Forward / Refresh */}
              <button
                onClick={() => appIframeRef.current?.contentWindow?.history.back()}
                data-tooltip="Back"
                style={{
                  width: 26, height: 26, border: 'none', borderRadius: 4,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent', color: 'rgb(179, 179, 179)', fontSize: 14,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = theme.bg_secondary)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <ArrowLeft size={16} />
              </button>
              <button
                onClick={() => appIframeRef.current?.contentWindow?.history.forward()}
                data-tooltip="Forward"
                style={{
                  width: 26, height: 26, border: 'none', borderRadius: 4,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent', color: 'rgb(179, 179, 179)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = theme.bg_secondary)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <ArrowRight size={16} />
              </button>
              <button
                onClick={() => appIframeRef.current?.contentWindow?.location.reload()}
                data-tooltip="Refresh"
                style={{
                  width: 26, height: 26, border: 'none', borderRadius: 4,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent', color: 'rgb(179, 179, 179)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = theme.bg_secondary)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <RotateCw size={16} />
              </button>
              <button
                onClick={() => {
                  const win = appIframeRef.current?.contentWindow;
                  if (win) win.location.href = '/';
                }}
                data-tooltip="Home"
                style={{
                  width: 26, height: 26, border: 'none', borderRadius: 4,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent', color: 'rgb(179, 179, 179)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = theme.bg_secondary)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Home size={16} />
              </button>

              {/* URL bar */}
              <div
                style={{
                  flex: '1 1 0%', margin: '0 4px', height: 24,
                  background: 'rgb(56 56 56)', borderRadius: 118, display: 'flex', alignItems: 'center',
                  padding: '0 15px', minWidth: 0,
                }}
              >
                <span
                  style={{
                    fontSize: 12, color: 'rgb(179, 179, 179)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    userSelect: 'all',
                  }}
                >
                  {window.location.host}{appIframePath}
                </span>
              </div>

              {/* Open in browser */}
              <button
                onClick={() => {
                  const fallback = new URL('/', window.location.href).href;
                  try {
                    const loc = appIframeRef.current?.contentWindow?.location;
                    openInBrowser(loc?.href || fallback);
                  } catch {
                    openInBrowser(fallback);
                  }
                }}
                data-tooltip="Open in browser"
                style={{
                  width: 26, height: 26, border: 'none', borderRadius: 4,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent', color: 'rgb(179, 179, 179)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = theme.bg_secondary)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <ExternalLink size={16} />
              </button>
              <button
                onClick={() => setMobileWidth(v => !v)}
                data-tooltip={mobileWidth ? 'Full width' : 'Mobile width'}
                style={{
                  width: 26, height: 26, border: 'none', borderRadius: 4,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: mobileWidth ? theme.accent_default : 'transparent',
                  color: mobileWidth ? theme.text_default : 'rgb(179, 179, 179)',
                }}
                onMouseEnter={e => { if (!mobileWidth) e.currentTarget.style.background = theme.bg_secondary; }}
                onMouseLeave={e => { if (!mobileWidth) e.currentTarget.style.background = 'transparent'; }}
              >
                <Smartphone size={16} />
              </button>
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', minHeight: 0, position: 'relative', background: mobileWidth ? theme.bg_strong : 'transparent' }}>
              <iframe
                ref={appIframeRef}
                src={initialAppSrc}
                style={{
                  flex: mobileWidth ? 'none' : 1,
                  width: mobileWidth ? 390 : '100%',
                  border: 'none',
                  minWidth: 0,
                }}
                onLoad={() => handleIframeLoad(appIframeRef)}
              />
              {renderCrashCover(appIframeRef)}
            </div>
          </div>
          <div style={{ flex: 1, display: activeIframeTab === 'sketchpad' ? 'flex' : 'none', minHeight: 0, position: 'relative' }}>
            <iframe
              ref={sketchpadIframeRef}
              src="/sketchpad.html"
              style={{ flex: 1, border: 'none', minWidth: 0 }}
              onLoad={() => handleIframeLoad(sketchpadIframeRef)}
            />
            {renderCrashCover(sketchpadIframeRef)}
          </div>
          <div style={{ flex: 1, display: activeIframeTab === 'components' ? 'flex' : 'none', minHeight: 0, position: 'relative' }}>
            <iframe
              ref={componentsIframeRef}
              src="/components.html"
              style={{ flex: 1, border: 'none', minWidth: 0 }}
              onLoad={() => handleIframeLoad(componentsIframeRef)}
            />
            {renderCrashCover(componentsIframeRef)}
          </div>
          <div
            style={{
              height: 32,
              background: theme.bg_strong,
              borderTop: `1px solid ${theme.border_default}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 12px 0 4px',
              gap: 8,
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', gap: 2 }}>
              <button
                onClick={toggleElementsPanel}
                data-tooltip="Elements panel"
                style={{
                  width: 28,
                  height: 24,
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: elementsPanelOpen ? theme.bg_tertiary : 'transparent',
                  color: elementsPanelOpen ? theme.text_default : theme.text_secondary,
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { if (!elementsPanelOpen) { e.currentTarget.style.background = theme.bg_low; e.currentTarget.style.color = theme.text_default; } }}
                onMouseLeave={e => { if (!elementsPanelOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.text_secondary; } }}
              >
                <ListTree size={16} />
              </button>
              <div style={{ width: 1, height: 16, background: theme.border_default, margin: '4px 4px' }} />
              {(['light', 'dark'] as const).map(t => {
                const active = iframeTheme === t;
                return (
                  <button
                    key={t}
                    onClick={() => setIframeTheme(t)}
                    data-tooltip={t === 'light' ? 'Light mode' : 'Dark mode'}
                    style={{
                      width: 26,
                      height: 24,
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      background: active ? theme.bg_tertiary : 'transparent',
                      color: active ? theme.text_default : theme.text_tertiary,
                      transition: 'background 0.15s, color 0.15s',
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = theme.bg_low; e.currentTarget.style.color = theme.text_secondary; } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.text_tertiary; } }}
                  >
                    {t === 'light' ? '☀' : '☽'}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <GitMenu git={git} />
              <button
                ref={moreButtonRef}
                onClick={() => setMoreMenuOpen(v => !v)}
                data-tooltip="Help"
                style={{
                  width: 26,
                  height: 24,
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: moreMenuOpen ? theme.bg_tertiary : 'transparent',
                  color: moreMenuOpen ? theme.text_default : theme.text_tertiary,
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                <HelpCircle size={16} />
              </button>
            </div>
          </div>
          {moreMenuOpen && createPortal(
            <div
              ref={moreMenuRef}
              style={{
                ...moreMenuStyle,
                background: theme.bg_secondary,
                border: `1px solid ${theme.border_default}`,
                borderRadius: 6,
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                padding: '4px 0',
                zIndex: 9999,
                minWidth: 180,
              }}
            >
              <button
                onClick={() => {
                  setMoreMenuOpen(false);
                  handleClearStorage();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  border: 'none',
                  background: 'transparent',
                  color: theme.text_default,
                  fontSize: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = theme.bg_tertiary)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Eraser size={16} />
                Clear localStorage
              </button>
              <button
                onClick={() => {
                  setMoreMenuOpen(false);
                  handleRestart();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  border: 'none',
                  background: 'transparent',
                  color: theme.text_default,
                  fontSize: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = theme.bg_tertiary)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <RotateCw size={16} />
                Restart dev server
              </button>
              {([
                { href: 'https://protovibe-studio.github.io/docs', label: 'Docs', Icon: BookOpen },
                { href: 'https://protovibe-studio.github.io/docs#shortcuts', label: 'Keyboard shortcuts', Icon: Keyboard },
                { href: 'https://github.com/Protovibe-Studio/protovibe-studio/issues', label: 'Report a bug', Icon: Bug },
              ] as const).map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => { handleExternalLinkClick(e); setMoreMenuOpen(false); }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    background: 'transparent',
                    color: theme.text_default,
                    fontSize: 12,
                    cursor: 'pointer',
                    textAlign: 'left',
                    textDecoration: 'none',
                    boxSizing: 'border-box',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = theme.bg_tertiary)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Icon size={16} />
                  {label}
                </a>
              ))}
            </div>,
            document.body,
          )}
        </div>

        <div style={{ display: activeSidebarTab === 'design' ? 'contents' : 'none' }}>
          <Sidebar isOpen={inspectorOpen} />
        </div>

        {inspectorOpen && (
          <div
            style={{
              width: `${INSPECTOR_WIDTH_PX}px`,
              flexShrink: 0,
              borderLeft: `1px solid ${theme.border_default}`,
              overflow: 'hidden',
              display: activeSidebarTab === 'tokens' ? 'flex' : 'none',
            }}
          >
            <TokensTab />
          </div>
        )}

        {inspectorOpen && (
          <div
            style={{
              width: `${INSPECTOR_WIDTH_PX}px`,
              flexShrink: 0,
              borderLeft: `1px solid ${theme.border_default}`,
              overflow: 'hidden',
              display: activeSidebarTab === 'prompts' ? 'flex' : 'none',
            }}
          >
            <PromptsTab />
          </div>
        )}

        {inspectorOpen && (
          <div
            style={{
              width: `${INSPECTOR_WIDTH_PX}px`,
              flexShrink: 0,
              borderLeft: `1px solid ${theme.border_default}`,
              overflow: 'hidden',
              display: activeSidebarTab === 'comments' ? 'flex' : 'none',
            }}
          >
            <CommentsTab activeIframeTab={activeIframeTab} isActive={activeSidebarTab === 'comments'} />
          </div>
        )}

        <FloatingToolbar />
        <NotEditableDialog />
        <ToastViewport />
        <GitSyncBanner git={git} />
      </div>
    </div>
  );
};
