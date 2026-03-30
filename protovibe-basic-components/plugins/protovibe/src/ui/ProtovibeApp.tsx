// plugins/protovibe/src/ui/ProtovibeApp.tsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
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
  const { inspectorOpen, toggleInspector, clearFocus } = useProtovibe();
  const appIframeRef = useRef<HTMLIFrameElement>(null);
  const sketchpadIframeRef = useRef<HTMLIFrameElement>(null);
  const componentsIframeRef = useRef<HTMLIFrameElement>(null);

  // Inspector bridge targets all iframes — identifies source via e.source
  useIframeBridge(appIframeRef, sketchpadIframeRef, componentsIframeRef);
  useKeyboardShortcuts();

  const handleIframeTabChange = useCallback((tab: IframeTab) => {
    clearFocus();
    setActiveIframeTab(tab);
  }, [clearFocus]);

  // Re-send state whenever a specific iframe reloads (e.g. HMR full-reload)
  const handleIframeLoad = useCallback((ref: React.RefObject<HTMLIFrameElement | null>) => {
    ref.current?.contentWindow?.postMessage(
      { type: 'PV_SET_THEME', theme: iframeTheme },
      '*'
    );
    ref.current?.contentWindow?.postMessage(
      { type: 'PV_SET_PREVIEW_MODE', active: inspectorOpen },
      '*'
    );
  }, [iframeTheme, inspectorOpen]);

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
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ flex: 1, display: activeIframeTab === 'app' ? 'flex' : 'none', minHeight: 0 }}>
            <iframe
              ref={appIframeRef}
              src="/app.html"
              style={{ flex: 1, border: 'none', minWidth: 0 }}
              title="App Preview"
              onLoad={() => handleIframeLoad(appIframeRef)}
            />
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
