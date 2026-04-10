// plugins/protovibe/src/ui/hooks/useIframeBridge.ts
// Manages the postMessage bridge between the parent shell and the app iframe.
// Runs in the PARENT frame only.

import { useEffect, RefObject } from 'react';
import { useProtovibe } from '../context/ProtovibeContext';
import { PV_FOCUS_TEXT_CONTENT_EVENT } from '../utils/elementType';

interface PvLoc {
  name: string;
  value: string;
}

interface PvElementClickMessage {
  type: 'PV_ELEMENT_CLICK';
  pvLocs: PvLoc[];
  componentId: string | null;
  runtimeIds: string[];
}

interface PvDoubleClickMessage {
  type: 'PV_DOUBLE_CLICK';
}

interface PvKeyDownMessage {
  type: 'PV_KEYDOWN';
  key: string;
  code: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

type BridgeMessage = PvElementClickMessage | PvDoubleClickMessage | PvKeyDownMessage;

export function useIframeBridge(...iframeRefs: RefObject<HTMLIFrameElement | null>[]) {
  const { focusElement, clearFocus, isMutationLocked, highlightedElement, inspectorOpen, activeSourceId } = useProtovibe();

  // Handle incoming messages from any iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent<BridgeMessage>) => {
      if (!e.data || typeof e.data !== 'object') return;

      if (e.data.type === 'PV_ELEMENT_CLICK') {
        const { pvLocs, componentId, runtimeIds, skipSnapshot } = e.data;
        console.log('[Protovibe Shell] Received Click Event:', { pvLocs, componentId, runtimeIds, skipSnapshot });

        const sourceRef = iframeRefs.find(ref => ref.current?.contentWindow === e.source);
        const iframeDoc = sourceRef?.current?.contentDocument;
        if (!iframeDoc) return;

        const els = runtimeIds.map(id => iframeDoc.querySelector<HTMLElement>(`[data-pv-runtime-id="${id}"]`)).filter(Boolean) as HTMLElement[];
        if (els.length === 0) return;

        focusElement(els, skipSnapshot);
      }

      if (e.data.type === 'PV_ELEMENT_DESELECT') {
        clearFocus();
      }

      if (e.data.type === 'PV_DOUBLE_CLICK') {
        window.dispatchEvent(new Event(PV_FOCUS_TEXT_CONTENT_EVENT));
      }

      if (e.data.type === 'PV_KEYDOWN') {
        const { key, code, metaKey, ctrlKey, shiftKey, altKey } = e.data;
        window.dispatchEvent(new KeyboardEvent('keydown', {
          key, code, metaKey, ctrlKey, shiftKey, altKey,
          bubbles: true, cancelable: true,
        }));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [focusElement, clearFocus, ...iframeRefs]);

  // Sync mutation lock state into all iframes
  useEffect(() => {
    iframeRefs.forEach(ref => {
      ref.current?.contentWindow?.postMessage(
        { type: 'PV_SET_LOCKED', locked: isMutationLocked },
        '*'
      );
    });
  }, [isMutationLocked, ...iframeRefs]);

  // Sync live preview mode into all iframes whenever inspector open state changes
  useEffect(() => {
    iframeRefs.forEach(ref => {
      ref.current?.contentWindow?.postMessage(
        { type: 'PV_SET_INSPECTOR_ACTIVE', active: inspectorOpen },
        '*'
      );
      if (!inspectorOpen) {
        ref.current?.contentWindow?.postMessage(
          { type: 'PV_CLEAR_SELECTION' },
          '*'
        );
      }
    });
  }, [inspectorOpen, ...iframeRefs]);

  // Sync activeSourceId into all iframes
  useEffect(() => {
    iframeRefs.forEach(ref => {
      ref.current?.contentWindow?.postMessage(
        { type: 'PV_SET_ACTIVE_SOURCE_ID', activeSourceId },
        '*'
      );
    });
  }, [activeSourceId, ...iframeRefs]);
}
