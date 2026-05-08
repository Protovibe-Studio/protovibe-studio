import { useEffect } from 'react';
import { useProtovibe } from '../context/ProtovibeContext';
import { undo, redo, takeSnapshot, addBlock, deleteBlocks, uploadImage } from '../api/client';
import {
  executeBlockAction,
  executeClipboardBlockAction,
  type BlockMutationAction,
  type ClipboardBlockAction
} from '../utils/executeBlockAction';
import { emitToast } from '../events/toast';
import {
  getAllowedParent,
  getAllowedChild,
  getAllowedSibling,
} from '../utils/traversal';
import { isTypingInput } from '../utils/elementType';

export function useKeyboardShortcuts() {
  const { 
    inspectorOpen, 
    currentBaseTarget,
    selectedTargets,
    activeSourceId,
    activeData,
    refreshActiveData,
    zones,
    focusElement,
    clearFocus,
    focusNewBlock,
    isMutationLocked,
    runLockedMutation
  } = useProtovibe();

  useEffect(() => {
    if (!inspectorOpen) return;

    let pasteShiftRef = false;

    const focusRestoredElement = (sourceId: string | undefined): Promise<void> => {
      return new Promise((resolve) => {
        if (!sourceId) {
          clearFocus();
          refreshActiveData().finally(resolve);
          return;
        }

        let attempts = 0;
        const maxAttempts = 15;

        const tryFocus = () => {
          const selector = `[data-pv-loc-app-${sourceId}], [data-pv-loc-ui-${sourceId}]`;
          const allIframes = Array.from(document.querySelectorAll('iframe')) as HTMLIFrameElement[];
          let target: HTMLElement | null = null;

          for (const iframe of allIframes) {
            target = (iframe.contentDocument?.querySelector(selector) as HTMLElement | null) ?? null;
            if (target) break;
          }

          if (!target) target = document.querySelector(selector) as HTMLElement | null;

          if (target) {
            focusElement(target, true);
            resolve();
          } else {
            attempts++;
            if (attempts < maxAttempts) {
              setTimeout(tryFocus, 100);
            } else {
              clearFocus();
              refreshActiveData().finally(resolve);
            }
          }
        };

        setTimeout(tryFocus, 300);
      });
    };

    const handleKeyDown = async (e: KeyboardEvent) => {
      if (isMutationLocked) {
        e.preventDefault();
        return;
      }

      // 1. Do not intercept if the user is typing in a native input, a
      // contentEditable (e.g., the rich-text BlockEditor), or a select.
      // Allow shortcuts for non-text inputs like checkboxes, radios, sliders.
      if (isTypingInput(e.target as HTMLElement)) {
        return;
      }

      // 1.5. Clear focus on ESC
      if (e.key === 'Escape') {
        e.preventDefault();
        clearFocus();
        return;
      }

      // 2. Undo & Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        await runLockedMutation(async () => {
          let res;
          const isRedo = e.shiftKey;
          if (isRedo) {
            res = await redo();
          } else {
            res = await undo();
          }
          if (res?.success) {
            if (res.currentURLQueryString && res.currentURLQueryString !== window.location.search) {
              window.history.pushState({}, '', res.currentURLQueryString);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }
            Array.from(document.querySelectorAll('iframe')).forEach((iframe) => {
              iframe.contentWindow?.postMessage({ type: 'PV_UNDO_REDO_COMPLETE' }, '*');
            });
            emitToast({ message: isRedo ? 'Redone' : 'Undone', variant: 'info', durationMs: 800 });
          } else {
            emitToast({ message: isRedo ? 'Nothing to redo' : 'Nothing to undo', variant: 'error', durationMs: 800 });
          }
          await focusRestoredElement(res?.activeId);
        });
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        await runLockedMutation(async () => {
          const res = await redo();
          if (res?.success) {
            if (res.currentURLQueryString && res.currentURLQueryString !== window.location.search) {
              window.history.pushState({}, '', res.currentURLQueryString);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }
            Array.from(document.querySelectorAll('iframe')).forEach((iframe) => {
              iframe.contentWindow?.postMessage({ type: 'PV_UNDO_REDO_COMPLETE' }, '*');
            });
            emitToast({ message: 'Redone', variant: 'info', durationMs: 800 });
          } else {
            emitToast({ message: 'Nothing to redo', variant: 'error', durationMs: 800 });
          }
          await focusRestoredElement(res?.activeId);
        });
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        if (e.shiftKey) {
          window.dispatchEvent(new CustomEvent('pv:open-add-after-dialog'));
        } else {
          const canAdd = !!(activeData?.file && zones.length > 0);
          if (canAdd) window.dispatchEvent(new CustomEvent('pv:open-add-dialog'));
        }
        return;
      }

      if (!currentBaseTarget) return;

      // Copy, Cut, Paste, Duplicate
      const key = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && key === 'v') {
        // Defer to the `paste` event so we can route image clipboard data
        // to the image-insert flow even when a protovibe block was previously copied.
        pasteShiftRef = e.shiftKey;
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (key === 'c' || key === 'x' || key === 'd')) {
        e.preventDefault();
        const targets = selectedTargets?.length > 0 ? selectedTargets : (currentBaseTarget ? [currentBaseTarget] : []);
        const blockIds = [...new Set(
          targets
            .map(t => t.closest('[data-pv-block]')?.getAttribute('data-pv-block'))
            .filter(Boolean) as string[]
        )];
        const isBlockInCurrentFile = activeData?.componentProps?.some((p: any) => p.name === 'data-pv-block');

        if (!activeData?.file) return;

        {
          if (blockIds.length === 0 || !isBlockInCurrentFile) {
            emitToast(`Can't ${key === 'd' ? 'duplicate' : key === 'c' ? 'copy' : 'cut'} this element`);
            return;
          }

          if (key === 'd') {
            await runLockedMutation(async () => {
              await executeClipboardBlockAction({
                action: 'duplicate',
                blockId: blockIds,
                file: activeData.file,
                activeSourceId: activeSourceId!,
                focusElement,
                refreshActiveData
              });
            });
            emitToast({ message: 'Block duplicated', variant: 'info' });
            return;
          }

          if (key === 'x') {
            await runLockedMutation(async () => {
              await executeClipboardBlockAction({
                action: 'cut',
                blockId: blockIds,
                file: activeData.file,
                activeSourceId: activeSourceId!,
                focusElement,
                refreshActiveData
              });
            });
            emitToast({ message: 'Block cut to clipboard', variant: 'info' });
          } else {
            const action: ClipboardBlockAction = 'copy';
            await runLockedMutation(async () => {
              await executeClipboardBlockAction({
                action,
                blockId: blockIds,
                file: activeData.file,
                activeSourceId: activeSourceId!,
                focusElement,
                refreshActiveData
              });
            });
            emitToast({ message: 'Block copied to clipboard', variant: 'info' });
          }
          return;
        }
      }

      // 3. Wrap Block(s) — Shift+A
      if (e.shiftKey && e.key === 'A') {
        if (!activeData?.file) return;
        const targets = selectedTargets?.length > 0 ? selectedTargets : (currentBaseTarget ? [currentBaseTarget] : []);
        const blockIds = [...new Set(
          targets
            .map(t => t.closest('[data-pv-block]')?.getAttribute('data-pv-block'))
            .filter(Boolean) as string[]
        )];
        if (blockIds.length === 0) {
          emitToast({ message: "Can't wrap this element", variant: 'error' });
          return;
        }
        const isNested = targets.some(t1 => targets.some(t2 => t1 !== t2 && t1.contains(t2)));
        if (isNested) {
          emitToast({ message: "Can't wrap these elements", variant: 'error' });
          return;
        }
        e.preventDefault();
        const targetLayoutMode = currentBaseTarget?.parentElement?.closest('[data-layout-mode]')?.getAttribute('data-layout-mode') || currentBaseTarget?.getAttribute('data-layout-mode') || 'flow';
        const res = await runLockedMutation(async () => {
          await takeSnapshot(activeData.file, activeSourceId!);
          const response = await fetch('/__wrap-blocks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file: activeData.file, blockIds, targetLayoutMode }),
          });
          if (!response.ok) throw new Error('Failed to wrap blocks');
          return await response.json();
        });
        if (res?.wrapperId) focusNewBlock(res.wrapperId, { maxAttempts: 20 });
        return;
      }

      // 3.5. Delete multiple selected blocks (Backspace/Delete with multi-select)
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedTargets && selectedTargets.length > 1) {
        const multiBlockIds = [...new Set(
          selectedTargets
            .map(t => t.closest('[data-pv-block]')?.getAttribute('data-pv-block'))
            .filter(Boolean) as string[]
        )];
        if (multiBlockIds.length > 1 && activeData?.file) {
          const isBlockInCurrentFile = activeData?.componentProps?.some((p: any) => p.name === 'data-pv-block');
          if (!isBlockInCurrentFile) {
            emitToast({ message: "Can't modify these elements here", variant: 'error' });
            return;
          }
          const isNested = selectedTargets.some(t1 =>
            selectedTargets.some(t2 => t1 !== t2 && t1.contains(t2))
          );
          if (isNested) {
            emitToast({ message: "Can't delete nested selection together", variant: 'error' });
            return;
          }
          e.preventDefault();
          await runLockedMutation(async () => {
            await takeSnapshot(activeData.file, activeSourceId!);
            await deleteBlocks(activeData.file, multiBlockIds);
          });
          clearFocus();
          await refreshActiveData();
          return;
        }
        // If only 0-1 blocks resolved, fall through to single delete
      }

      // 4. Delete or Move Block
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '[' || e.key === ']') {
        const closestBlock = currentBaseTarget.closest('[data-pv-block]');
        // If the resolved block is a sketchpad frame's root element, defer to
        // SketchpadApp's keydown handler — it deletes the whole frame instead
        // of trying to mutate the file-root block (which can't be deleted).
        if (
          (e.key === 'Backspace' || e.key === 'Delete') &&
          closestBlock &&
          closestBlock.parentElement?.hasAttribute('data-sketchpad-frame')
        ) {
          return;
        }
        const blockId = closestBlock?.getAttribute('data-pv-block');
        const isBlockInCurrentFile = activeData?.componentProps?.some((p: any) => p.name === 'data-pv-block');
        
        if (blockId && activeData?.file) {
          if (!isBlockInCurrentFile) {
            emitToast({ message: `Can't modify this element here`, variant: 'error' });
            return;
          }
          e.preventDefault();

          let action: BlockMutationAction = 'delete';
          if (e.key === '[') action = 'move-up';
          if (e.key === ']') action = 'move-down';

          await runLockedMutation(async () => {
            await executeBlockAction({
              action,
              blockId,
              file: activeData.file,
              activeSourceId: activeSourceId!,
              focusElement,
              refreshActiveData
            });
          });
        }
        return;
      }

      // 4.5. Nudge Absolute Elements
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        const isAbsolute = currentBaseTarget?.style.position === 'absolute' || currentBaseTarget?.hasAttribute('data-pv-sketchpad-el');
        const inAbsoluteContainer = currentBaseTarget?.parentElement?.closest('[data-layout-mode="absolute"]');

        if (isAbsolute && inAbsoluteContainer) {
          e.preventDefault();
          Array.from(document.querySelectorAll('iframe')).forEach(iframe => {
            iframe.contentWindow?.postMessage({
              type: 'PV_NUDGE_KEYDOWN',
              key: e.key,
              shiftKey: e.shiftKey
            }, '*');
          });
          return; // Do not fall through to traversal
        }
      }

      // 5. Traversal
      const handleNavigate = (newTarget: HTMLElement | null) => {
        if (newTarget) {
          e.preventDefault();
          focusElement(newTarget);
        }
      };

      const navKey = e.key.toLowerCase();
      if (navKey === 'w') handleNavigate(getAllowedParent(currentBaseTarget));
      else if (navKey === 's') handleNavigate(getAllowedChild(currentBaseTarget));
      else if (navKey === 'a') handleNavigate(getAllowedSibling(currentBaseTarget, 'prev'));
      else if (navKey === 'd') handleNavigate(getAllowedSibling(currentBaseTarget, 'next'));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        Array.from(document.querySelectorAll('iframe')).forEach(iframe => {
          iframe.contentWindow?.postMessage({
            type: 'PV_NUDGE_KEYUP',
            key: e.key
          }, '*');
        });
      }
    };

    const getImageDimensions = (file: File): Promise<{ w: number; h: number }> =>
      new Promise((resolve) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { resolve({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(objectUrl); };
        img.onerror = () => { resolve({ w: 0, h: 0 }); URL.revokeObjectURL(objectUrl); };
        img.src = objectUrl;
      });

    const insertImageFile = async (imageFile: File) => {
      if (!activeData?.file || !currentBaseTarget) return;

      const targets = selectedTargets?.length > 0 ? selectedTargets : [currentBaseTarget];
      const blockIds = [...new Set(
        targets
          .map(t => t.closest('[data-pv-block]')?.getAttribute('data-pv-block'))
          .filter(Boolean) as string[]
      )];
      const isBlockInCurrentFile = activeData?.componentProps?.some((p: any) => p.name === 'data-pv-block');
      const targetZone = zones[0];
      const targetBlockId = blockIds[0];
      const wantAfter = !targetZone && !!targetBlockId && !!isBlockInCurrentFile;

      if (!wantAfter && !targetZone) {
        emitToast({ message: "Can't paste image here", variant: 'error' });
        return;
      }

      const targetContainer = wantAfter ? currentBaseTarget?.parentElement : currentBaseTarget;
      const targetLayoutMode = targetContainer?.getAttribute('data-layout-mode') || 'flow';

      await runLockedMutation(async () => {
        const [url, dims] = await Promise.all([uploadImage(imageFile), getImageDimensions(imageFile)]);
        await takeSnapshot(activeData.file, activeSourceId!);
        const res = await addBlock({
          file: activeData.file,
          zoneId: wantAfter ? undefined : targetZone.id,
          afterBlockId: wantAfter ? targetBlockId! : undefined,
          isPristine: wantAfter ? false : targetZone.isPristine,
          elementType: 'image',
          imageUrl: url,
          imageWidth: dims.w,
          imageHeight: dims.h,
          targetStartLine: activeData.startLine,
          targetEndLine: activeData.endLine,
          targetLayoutMode,
          pasteX: 100,
          pasteY: 100,
        });
        const focusIds: string[] = res?.newBlockIds?.length ? res.newBlockIds : (res?.blockId ? [res.blockId] : []);
        if (focusIds.length > 0) {
          emitToast({ message: 'Image inserted', variant: 'info' });
          focusNewBlock(focusIds);
        }
      }).catch((err: any) => {
        emitToast({ message: err.message || 'Failed to insert image', variant: 'error' });
      });
    };

    const handlePaste = async (e: ClipboardEvent) => {
      if (isMutationLocked) return;
      if (isTypingInput(e.target as HTMLElement)) return;
      if (!activeData?.file) return;
      if (!currentBaseTarget) return;

      const items = e.clipboardData?.items;
      const imageItem = items
        ? Array.from(items).find(it => it.kind === 'file' && it.type.startsWith('image/'))
        : null;
      const imageFile = imageItem?.getAsFile() || null;

      const isPasteAfter = pasteShiftRef;
      pasteShiftRef = false;

      if (imageFile) {
        e.preventDefault();
        await insertImageFile(imageFile);
        return;
      }

      const targets = selectedTargets?.length > 0 ? selectedTargets : (currentBaseTarget ? [currentBaseTarget] : []);
      const blockIds = [...new Set(
        targets
          .map(t => t.closest('[data-pv-block]')?.getAttribute('data-pv-block'))
          .filter(Boolean) as string[]
      )];
      const isBlockInCurrentFile = activeData?.componentProps?.some((p: any) => p.name === 'data-pv-block');
      const targetZone = zones[0];
      const targetBlockId = blockIds[0];
      const wantAfter = isPasteAfter;

      if (wantAfter && (!targetBlockId || !isBlockInCurrentFile)) {
        emitToast({ message: "Can't paste after this element", variant: 'error' });
        return;
      }
      if (!wantAfter && !targetZone) {
        emitToast({ message: "Can't paste inside this element", variant: 'error' });
        return;
      }

      e.preventDefault();

      const targetContainer = wantAfter ? currentBaseTarget?.parentElement : currentBaseTarget;
      const targetLayoutMode = targetContainer?.getAttribute('data-layout-mode') || 'flow';

      await runLockedMutation(async () => {
        await takeSnapshot(activeData.file, activeSourceId!);
        const res = await addBlock({
          file: activeData.file,
          zoneId: wantAfter ? undefined : targetZone.id,
          afterBlockId: wantAfter ? targetBlockId! : undefined,
          isPristine: wantAfter ? false : targetZone.isPristine,
          elementType: 'paste',
          targetStartLine: activeData.startLine,
          targetEndLine: activeData.endLine,
          targetLayoutMode,
          pasteX: 100,
          pasteY: 100,
        });
        const focusIds: string[] = res?.newBlockIds?.length ? res.newBlockIds : (res?.blockId ? [res.blockId] : []);
        if (focusIds.length > 0) {
          emitToast({ message: 'Pasted successfully', variant: 'info' });
          focusNewBlock(focusIds);
        }
      }).catch((err: any) => {
        emitToast({ message: err.message || 'Failed to paste block', variant: 'error' });
      });
    };

    const handleDragOver = (e: DragEvent) => {
      if (!activeData?.file || !currentBaseTarget) return;
      const types = e.dataTransfer?.types;
      if (types && Array.from(types).includes('Files')) {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDrop = async (e: DragEvent) => {
      if (isMutationLocked) return;
      if (!activeData?.file || !currentBaseTarget) return;
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      const imageFile = Array.from(files).find(f => f.type.startsWith('image/'));
      if (!imageFile) return;
      e.preventDefault();
      await insertImageFile(imageFile);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('paste', handlePaste);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    // Mirror drag/drop listeners onto same-origin iframe documents so users can
    // drop image files onto the canvas (which lives inside an iframe).
    const attachedDocs = new WeakSet<Document>();
    const attachToIframeDoc = (doc: Document | null | undefined) => {
      if (!doc || attachedDocs.has(doc)) return;
      attachedDocs.add(doc);
      doc.addEventListener('dragover', handleDragOver as unknown as EventListener);
      doc.addEventListener('drop', handleDrop as unknown as EventListener);
    };
    const iframeLoadHandlers = new Map<HTMLIFrameElement, () => void>();
    const wireIframes = () => {
      Array.from(document.querySelectorAll('iframe')).forEach((iframe) => {
        const el = iframe as HTMLIFrameElement;
        try { attachToIframeDoc(el.contentDocument); } catch {}
        if (!iframeLoadHandlers.has(el)) {
          const onLoad = () => { try { attachToIframeDoc(el.contentDocument); } catch {} };
          el.addEventListener('load', onLoad);
          iframeLoadHandlers.set(el, onLoad);
        }
      });
    };
    wireIframes();
    const iframeObserver = new MutationObserver(wireIframes);
    iframeObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
      iframeObserver.disconnect();
      iframeLoadHandlers.forEach((handler, el) => el.removeEventListener('load', handler));
      Array.from(document.querySelectorAll('iframe')).forEach((iframe) => {
        try {
          const doc = (iframe as HTMLIFrameElement).contentDocument;
          if (doc) {
            doc.removeEventListener('dragover', handleDragOver as unknown as EventListener);
            doc.removeEventListener('drop', handleDrop as unknown as EventListener);
          }
        } catch {}
      });
    };
  }, [inspectorOpen, currentBaseTarget, activeSourceId, activeData, focusElement, refreshActiveData, zones, focusNewBlock, isMutationLocked, runLockedMutation]);
}