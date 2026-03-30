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
  runtimeId: string;
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
  const { focusElement, clearFocus, isMutationLocked, highlightedElement, inspectorOpen } = useProtovibe();

  // Handle incoming messages from any iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent<BridgeMessage>) => {
      if (!e.data || typeof e.data !== 'object') return;

      if (e.data.type === 'PV_ELEMENT_CLICK') {
        const { pvLocs, componentId, runtimeId } = e.data;
        console.log('[Protovibe Shell] Received Click Event:', { pvLocs, componentId, runtimeId });

        // Identify which iframe sent the message by matching e.source
        const sourceRef = iframeRefs.find(ref => ref.current?.contentWindow === e.source);
        const iframeDoc = sourceRef?.current?.contentDocument;
        if (!iframeDoc) return;

        // Use the exact runtimeId to avoid the "first matched element" bug
        const el = iframeDoc.querySelector<HTMLElement>(`[data-pv-runtime-id="${runtimeId}"]`);
        if (!el) {
          console.warn('[Protovibe Shell] Could not resolve element with runtimeId:', runtimeId);
          return;
        }

        focusElement(el);
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
        { type: 'PV_SET_PREVIEW_MODE', active: inspectorOpen },
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
}
