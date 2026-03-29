// plugins/protovibe/src/ui/ProtovibeApp.tsx
import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { ShellNavBar, IframeTab, SidebarTab } from './components/ShellNavBar';
import { TokensTab } from './components/TokensTab';
import { Sidebar } from './components/Sidebar';
import { ToastViewport } from './components/ToastViewport';
import { useIframeBridge } from './hooks/useIframeBridge';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useProtovibe } from './context/ProtovibeContext';
import { theme } from './theme';
import { INSPECTOR_WIDTH_PX } from './constants/layout';

export const ProtovibeApp: React.FC = () => {
  const [activeIframeTab, setActiveIframeTab] = useState<IframeTab>('app');
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('design');
  const [iframeTheme, setIframeTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('pv-iframe-theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'light';
  });

  const updateIframeTheme = useCallback((t: 'light' | 'dark') => {
    setIframeTheme(t);
    try { localStorage.setItem('pv-iframe-theme', t); } catch {}
  }, []);
  const { inspectorOpen, toggleInspector } = useProtovibe();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useIframeBridge(iframeRef);
  useKeyboardShortcuts();

  const iframeSrc = useMemo(() => {
    if (activeIframeTab === 'sketchpad') return '/sketchpad.html';
    return '/app.html';
  }, [activeIframeTab]);

  // Tell the in-iframe overlay to show/hide when the Components iframe tab is toggled
  useEffect(() => {
    const show = activeIframeTab === 'components';
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'PV_TOGGLE_COMPONENTS_OVERLAY', show },
      '*'
    );
  }, [activeIframeTab]);

  // Re-send overlay state whenever the iframe reloads (e.g. HMR full-reload)
  const handleIframeLoad = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'PV_TOGGLE_COMPONENTS_OVERLAY', show: activeIframeTab === 'components' },
      '*'
    );
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'PV_SET_THEME', theme: iframeTheme },
      '*'
    );
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'PV_SET_PREVIEW_MODE', active: inspectorOpen },
      '*'
    );
  }, [activeIframeTab, iframeTheme, inspectorOpen]);

  // Sync iframe theme whenever it changes
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'PV_SET_THEME', theme: iframeTheme },
      '*'
    );
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
        onIframeTabChange={setActiveIframeTab}
        activeSidebarTab={activeSidebarTab}
        onSidebarTabChange={setActiveSidebarTab}
        inspectorOpen={inspectorOpen}
        onToggleInspector={() => toggleInspector()}
      />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            style={{ flex: 1, border: 'none', minWidth: 0 }}
            title={activeIframeTab === 'sketchpad' ? 'Sketchpad' : 'App Preview'}
            onLoad={handleIframeLoad}
          />
          <div
            style={{
              height: 32,
              background: theme.bg_strong,
              borderTop: `1px solid ${theme.border_default}`,
              display: 'flex',
              alignItems: 'center',
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
                  onClick={() => updateIframeTheme(t)}
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
          </div>
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

        <ToastViewport />
      </div>
    </div>
  );
};
