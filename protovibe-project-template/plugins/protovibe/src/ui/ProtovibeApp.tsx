// plugins/protovibe/src/ui/ProtovibeApp.tsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, RotateCw, Home, ExternalLink, Smartphone, X, Undo2, MoreHorizontal } from 'lucide-react';
import { useFloatingDropdownPosition } from './hooks/useFloatingDropdownPosition';
import { ShellNavBar, IframeTab, SidebarTab } from './components/ShellNavBar';
import { TokensTab } from './components/TokensTab';
import { PromptsTab } from './components/PromptsTab';
import { Sidebar } from './components/Sidebar';
import { ToastViewport } from './components/ToastViewport';
import { useIframeBridge } from './hooks/useIframeBridge';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useProtovibe } from './context/ProtovibeContext';
import { theme } from './theme';
import { INSPECTOR_WIDTH_PX } from './constants/layout';
import { restartServer, undo } from './api/client';

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
  const [showErrorBanner, setShowErrorBanner] = useState(false);

  const { inspectorOpen, toggleInspector, clearFocus, refreshComponents, setHtmlFontSize, runLockedMutation, iframeTheme, setIframeTheme } = useProtovibe();
  const [appIframePath, setAppIframePath] = useState('/');
  const [mobileWidth, setMobileWidth] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const appIframeRef = useRef<HTMLIFrameElement>(null);
  const sketchpadIframeRef = useRef<HTMLIFrameElement>(null);
  const componentsIframeRef = useRef<HTMLIFrameElement>(null);
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

  // Canonical tab-switch: always clears inspector focus and iframe outlines.
  // Use this everywhere instead of calling setActiveIframeTab directly.
  const handleIframeTabChange = useCallback((tab: IframeTab) => {
    clearFocus();
    setActiveIframeTab(tab);
    syncTabToURL(tab);
    [appIframeRef, sketchpadIframeRef, componentsIframeRef].forEach(ref => {
      ref.current?.contentWindow?.postMessage({ type: 'PV_CLEAR_SELECTION' }, '*');
    });
    refreshComponents();
    if (tab === 'components') {
      componentsIframeRef.current?.contentWindow?.postMessage({ type: 'PV_REFRESH_COMPONENTS' }, '*');
    }
    if (tab === 'sketchpad') {
      (document.activeElement as HTMLElement | null)?.blur?.();
      requestAnimationFrame(() => {
        sketchpadIframeRef.current?.contentWindow?.focus();
      });
    }
  }, [clearFocus, refreshComponents]);

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
      clearFocus();
      [appIframeRef, sketchpadIframeRef, componentsIframeRef].forEach(ref => {
        ref.current?.contentWindow?.postMessage({ type: 'PV_CLEAR_SELECTION' }, '*');
      });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [clearFocus]);

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

  // Listen for Vite error overlay detection from iframe bridge
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'PV_VITE_ERROR') setShowErrorBanner(true);
      if (e.data?.type === 'PV_VITE_ERROR_CLEARED') setShowErrorBanner(false);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

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
    if (ref === appIframeRef) {
      const iframeDoc = ref.current?.contentDocument;
      if (iframeDoc?.defaultView) {
        const fs = parseFloat(iframeDoc.defaultView.getComputedStyle(iframeDoc.documentElement).fontSize);
        if (!isNaN(fs) && fs > 0) setHtmlFontSize(fs);
      }
      try {
        const loc = ref.current?.contentWindow?.location;
        if (loc) setAppIframePath(loc.pathname + loc.search + loc.hash);
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
      }
    });
  }, [runLockedMutation]);

  // Restart the development server when the banner's restart button is clicked
  const handleRestart = async () => {
    try {
      await restartServer();
      setShowErrorBanner(false);
    } catch (e) {
      console.error('Restart failed', e);
    }
  };

  // Track app iframe URL changes (client-side navigation via postMessage)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'PV_URL_CHANGE' && e.source === appIframeRef.current?.contentWindow) {
        setAppIframePath(e.data.path || '/');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

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
        inspectorOpen={inspectorOpen}
        onToggleInspector={() => toggleInspector()}
      />
      {showErrorBanner && (
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
            <button onClick={handleUndo} style={{ background: theme.destructive_default, color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Undo2 size={16} />
              Undo
            </button>
            <button onClick={handleRestart} style={{ background: theme.destructive_default, color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RotateCw size={16} />
              Restart
            </button>
          </div>
          <button onClick={() => setShowErrorBanner(false)} style={{ background: 'transparent', color: theme.destructive_default, border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ flex: 1, display: activeIframeTab === 'app' ? 'flex' : 'none', minHeight: 0, flexDirection: 'column' }}>
            <div
              style={{
                height: 36,
                background: theme.bg_strong,
                borderBottom: `1px solid ${theme.border_default}`,
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
                title="Back"
                style={{
                  width: 26, height: 26, border: 'none', borderRadius: 4,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent', color: theme.text_secondary, fontSize: 14,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = theme.bg_secondary)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <ArrowLeft size={16} />
              </button>
              <button
                onClick={() => appIframeRef.current?.contentWindow?.history.forward()}
                title="Forward"
                style={{
                  width: 26, height: 26, border: 'none', borderRadius: 4,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent', color: theme.text_secondary,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = theme.bg_secondary)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <ArrowRight size={16} />
              </button>
              <button
                onClick={() => appIframeRef.current?.contentWindow?.location.reload()}
                title="Refresh"
                style={{
                  width: 26, height: 26, border: 'none', borderRadius: 4,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent', color: theme.text_secondary,
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
                title="Home"
                style={{
                  width: 26, height: 26, border: 'none', borderRadius: 4,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent', color: theme.text_secondary,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = theme.bg_secondary)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Home size={16} />
              </button>

              {/* URL bar */}
              <div
                style={{
                  flex: 1, margin: '0 4px', height: 24,
                  background: theme.bg_secondary, border: `1px solid ${theme.border_secondary}`,
                  borderRadius: 5, display: 'flex', alignItems: 'center',
                  padding: '0 8px', minWidth: 0,
                }}
              >
                <span
                  style={{
                    fontSize: 12, color: theme.text_secondary,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    userSelect: 'all',
                  }}
                >
                  {window.location.host}{appIframePath}
                </span>
              </div>

              {/* Open in new tab */}
              <button
                onClick={() => {
                  try {
                    const loc = appIframeRef.current?.contentWindow?.location;
                    if (loc) window.open(loc.href, '_blank');
                  } catch {
                    window.open('/', '_blank');
                  }
                }}
                title="Open in new tab"
                style={{
                  width: 26, height: 26, border: 'none', borderRadius: 4,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent', color: theme.text_secondary,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = theme.bg_secondary)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <ExternalLink size={16} />
              </button>
              <button
                onClick={() => setMobileWidth(v => !v)}
                title={mobileWidth ? 'Full width' : 'Mobile width'}
                style={{
                  width: 26, height: 26, border: 'none', borderRadius: 4,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: mobileWidth ? theme.accent_default : 'transparent',
                  color: mobileWidth ? theme.text_default : theme.text_secondary,
                }}
                onMouseEnter={e => { if (!mobileWidth) e.currentTarget.style.background = theme.bg_secondary; }}
                onMouseLeave={e => { if (!mobileWidth) e.currentTarget.style.background = 'transparent'; }}
              >
                <Smartphone size={16} />
              </button>
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', minHeight: 0, background: mobileWidth ? theme.bg_strong : 'transparent' }}>
              <iframe
                ref={appIframeRef}
                src="/"
                style={{
                  flex: mobileWidth ? 'none' : 1,
                  width: mobileWidth ? 390 : '100%',
                  border: 'none',
                  minWidth: 0,
                }}
                title="App Preview"
                onLoad={() => handleIframeLoad(appIframeRef)}
              />
            </div>
          </div>
          <div style={{ flex: 1, display: activeIframeTab === 'sketchpad' ? 'flex' : 'none', minHeight: 0 }}>
            <iframe
              ref={sketchpadIframeRef}
              src="/sketchpad.html"
              style={{ flex: 1, border: 'none', minWidth: 0 }}
              title="Sketchpad"
              onLoad={() => handleIframeLoad(sketchpadIframeRef)}
            />
          </div>
          <div style={{ flex: 1, display: activeIframeTab === 'components' ? 'flex' : 'none', minHeight: 0 }}>
            <iframe
              ref={componentsIframeRef}
              src="/components.html"
              style={{ flex: 1, border: 'none', minWidth: 0 }}
              title="Components Preview"
              onLoad={() => handleIframeLoad(componentsIframeRef)}
            />
          </div>
          <div
            style={{
              height: 32,
              background: theme.bg_strong,
              borderTop: `1px solid ${theme.border_default}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 12px',
              gap: 8,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                background: theme.bg_secondary,
                border: `1px solid ${theme.border_secondary}`,
                borderRadius: 5,
                overflow: 'hidden',
              }}
            >
              {(['light', 'dark'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setIframeTheme(t)}
                  title={t === 'light' ? 'Light mode' : 'Dark mode'}
                  style={{
                    width: 26,
                    height: 24,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    background: iframeTheme === t ? theme.bg_tertiary : 'transparent',
                    color: iframeTheme === t ? theme.text_default : theme.text_tertiary,
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  {t === 'light' ? '☀' : '☽'}
                </button>
              ))}
            </div>
            <button
              ref={moreButtonRef}
              onClick={() => setMoreMenuOpen(v => !v)}
              title="More actions"
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
              <MoreHorizontal size={16} />
            </button>
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
            </div>,
            document.body,
          )}
        </div>

        {activeSidebarTab === 'design' && (
          <Sidebar isOpen={inspectorOpen} />
        )}

        {activeSidebarTab === 'tokens' && inspectorOpen && (
          <div
            style={{
              width: `${INSPECTOR_WIDTH_PX}px`,
              flexShrink: 0,
              borderLeft: `1px solid ${theme.border_default}`,
              overflow: 'hidden',
              display: 'flex',
            }}
          >
            <TokensTab />
          </div>
        )}

        {activeSidebarTab === 'prompts' && inspectorOpen && (
          <div
            style={{
              width: `${INSPECTOR_WIDTH_PX}px`,
              flexShrink: 0,
              borderLeft: `1px solid ${theme.border_default}`,
              overflow: 'hidden',
              display: 'flex',
            }}
          >
            <PromptsTab />
          </div>
        )}

        <ToastViewport />
      </div>
    </div>
  );
};
