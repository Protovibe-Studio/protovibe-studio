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
    activeSourceId,
    activeData,
    refreshActiveData,
    zones,
    focusElement,
    focusNewBlock,
    isMutationLocked,
    runLockedMutation
  } = useProtovibe();

  useEffect(() => {
    if (!inspectorOpen) return;

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
          if (e.shiftKey) await redo();
          else await undo();
        });
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        await runLockedMutation(async () => {
          await redo();
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

          const targetLayoutMode = currentBaseTarget?.getAttribute('data-layout-mode') || 'flow';

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

      // 3. Delete or Move Block
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

      // 4. Traversal
      const handleNavigate = (newTarget: HTMLElement | null) => {
        if (newTarget) {
          e.preventDefault();
          focusElement(newTarget);
        }
      };

      if (e.key === 'ArrowUp') handleNavigate(getAllowedParent(currentBaseTarget));
      else if (e.key === 'ArrowDown') handleNavigate(getAllowedChild(currentBaseTarget));
      else if (e.key === 'ArrowLeft') handleNavigate(getAllowedSibling(currentBaseTarget, 'prev'));
      else if (e.key === 'ArrowRight') handleNavigate(getAllowedSibling(currentBaseTarget, 'next'));
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectorOpen, currentBaseTarget, activeSourceId, activeData, focusElement, refreshActiveData, zones, focusNewBlock, isMutationLocked, runLockedMutation]);
}