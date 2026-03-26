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
  const { inspectorOpen, toggleInspector } = useProtovibe();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useIframeBridge(iframeRef);
  useKeyboardShortcuts();

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
  }, [activeIframeTab]);

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
        <iframe
          ref={iframeRef}
          src="/app.html"
          style={{ flex: 1, border: 'none', minWidth: 0 }}
          title="App Preview"
          onLoad={handleIframeLoad}
        />

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
