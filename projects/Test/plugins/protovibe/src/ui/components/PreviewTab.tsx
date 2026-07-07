// plugins/protovibe/src/ui/components/PreviewTab.tsx
import React, { useRef } from 'react';
import { Sidebar } from './Sidebar';
import { ToastViewport } from './ToastViewport';
import { useIframeBridge } from '../hooks/useIframeBridge';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useProtovibe } from '../context/ProtovibeContext';

export const PreviewTab: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { inspectorOpen } = useProtovibe();

  useIframeBridge(iframeRef);
  useKeyboardShortcuts();

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
      <iframe
        ref={iframeRef}
        src="/app.html"
        style={{
          flex: 1,
          border: 'none',
          minWidth: 0,
        }}
      />
      <Sidebar isOpen={inspectorOpen} />
      <ToastViewport />
    </div>
  );
};
