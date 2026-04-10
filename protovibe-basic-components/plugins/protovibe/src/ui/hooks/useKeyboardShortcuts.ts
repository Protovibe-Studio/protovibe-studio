import { useEffect } from 'react';
import { useProtovibe } from '../context/ProtovibeContext';
import { undo, redo, takeSnapshot, addBlock } from '../api/client';
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

      // 1. Do not intercept if the user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      // 2. Undo & Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        await runLockedMutation(async () => {
          let res;
          if (e.shiftKey) {
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
      if ((e.metaKey || e.ctrlKey) && (key === 'c' || key === 'x' || key === 'v' || key === 'd')) {
        e.preventDefault();
        const closestBlock = currentBaseTarget.closest('[data-pv-block]');
        const blockId = closestBlock?.getAttribute('data-pv-block');
        const isBlockInCurrentFile = activeData?.componentProps?.some((p: any) => p.name === 'data-pv-block');

        if (!activeData?.file) return;

        if (key === 'c' || key === 'x' || key === 'd') {
          if (!blockId || !isBlockInCurrentFile) {
            emitToast(`Can't ${key === 'd' ? 'duplicate' : key === 'c' ? 'copy' : 'cut'} this element`);
            return;
          }

          if (key === 'd') {
            await runLockedMutation(async () => {
              await executeClipboardBlockAction({
                action: 'duplicate',
                blockId,
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
                blockId,
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
                blockId,
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

        if (key === 'v') {
          const isPasteAfter = e.shiftKey;

          if (isPasteAfter && (!blockId || !isBlockInCurrentFile)) {
            emitToast({ message: "Can't paste after this element", variant: 'error' });
            return;
          }

          if (!isPasteAfter && zones.length === 0) {
            emitToast({ message: "Can't paste inside this element", variant: 'error' });
            return;
          }

          // Fallback to the first available zone if 'inside-ID' isn't found
          // This allows pasting directly into pristine zones inside hardcoded elements!
          const expectedZoneId = blockId ? `inside-${blockId}` : null;
          const targetZone = (expectedZoneId ? zones.find(z => z.id === expectedZoneId) : null) || zones[0];

          if (!isPasteAfter && !targetZone) {
            emitToast({ message: "Can't paste inside this element", variant: 'error' });
            return;
          }

          const targetContainer = isPasteAfter ? currentBaseTarget?.parentElement : currentBaseTarget;
          const targetLayoutMode = targetContainer?.getAttribute('data-layout-mode') || 'flow';

          await runLockedMutation(async () => {
            await takeSnapshot(activeData.file, activeSourceId!);
            const res = await addBlock({
              file: activeData.file,
              zoneId: isPasteAfter ? undefined : targetZone.id,
              afterBlockId: isPasteAfter ? blockId! : undefined,
              isPristine: isPasteAfter ? false : targetZone.isPristine,
              elementType: 'paste',
              targetStartLine: activeData.startLine,
              targetEndLine: activeData.endLine,
              targetLayoutMode,
              pasteX: 100,
              pasteY: 100,
            });

            if (res.blockId) {
              emitToast({ message: 'Pasted successfully', variant: 'info' });
              focusNewBlock(res.blockId);
            }
          }).catch((err: any) => {
            emitToast({ message: err.message || 'Failed to paste block', variant: 'error' });
          });
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

      // 4. Delete or Move Block
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '[' || e.key === ']') {
        const closestBlock = currentBaseTarget.closest('[data-pv-block]');
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
              type: 'PV_NUDGE_ELEMENT',
              key: e.key,
              shiftKey: e.shiftKey
            }, '*');
          });
          return;
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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectorOpen, currentBaseTarget, activeSourceId, activeData, focusElement, refreshActiveData, zones, focusNewBlock, isMutationLocked, runLockedMutation]);
}