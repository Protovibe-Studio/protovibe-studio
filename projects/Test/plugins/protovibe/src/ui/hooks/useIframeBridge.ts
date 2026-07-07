// plugins/protovibe/src/ui/hooks/useIframeBridge.ts
// Manages the postMessage bridge between the parent shell and the app iframe.
// Runs in the PARENT frame only.

import { useEffect, RefObject } from 'react';
import { useProtovibe } from '../context/ProtovibeContext';
import { PV_FOCUS_TEXT_CONTENT_EVENT, isTypingInput } from '../utils/elementType';

interface PvLoc {
  name: string;
  value: string;
}

interface PvElementClickMessage {
  type: 'PV_ELEMENT_CLICK';
  pvLocs: PvLoc[];
  componentId: string | null;
  runtimeIds: string[];
  skipSnapshot?: boolean;
}

interface PvDoubleClickMessage {
  type: 'PV_DOUBLE_CLICK';
}

interface PvElementDeselectMessage {
  type: 'PV_ELEMENT_DESELECT';
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

interface PvKeyUpMessage {
  type: 'PV_KEYUP';
  key: string;
  code: string;
}

type BridgeMessage = PvElementClickMessage | PvDoubleClickMessage | PvElementDeselectMessage | PvKeyDownMessage | PvKeyUpMessage;

export function useIframeBridge(...iframeRefs: RefObject<HTMLIFrameElement | null>[]) {
  const { focusElement, clearFocus, isMutationLocked, highlightedElement, inspectorOpen, activeSourceId } = useProtovibe();

  // Handle incoming messages from any iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent<BridgeMessage>) => {
      if (!e.data || typeof e.data !== 'object') return;

      if (e.data.type === 'PV_ELEMENT_CLICK') {
        const { pvLocs, componentId, runtimeIds, skipSnapshot } = e.data;

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

      if (e.data.type === 'PV_KEYUP') {
        const { key, code } = e.data;
        window.dispatchEvent(new KeyboardEvent('keyup', {
          key, code,
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

  // Global Space key tracking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        if (isTypingInput(document.activeElement as HTMLElement | null)) return;
        iframeRefs.forEach(ref => {
          ref.current?.contentWindow?.postMessage({ type: 'PV_SPACE_MODE', active: true }, '*');
        });
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        iframeRefs.forEach(ref => {
          ref.current?.contentWindow?.postMessage({ type: 'PV_SPACE_MODE', active: false }, '*');
        });
      }
    };
    const handleBlur = () => {
      iframeRefs.forEach(ref => {
        ref.current?.contentWindow?.postMessage({ type: 'PV_SPACE_MODE', active: false }, '*');
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [...iframeRefs]);
}
