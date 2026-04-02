import { blockAction, takeSnapshot } from '../api/client';

export type BlockMutationAction = 'delete' | 'move-up' | 'move-down';

function findBlockElement(blockId: string): HTMLElement | null {
  const allIframes = Array.from(document.querySelectorAll('iframe')) as HTMLIFrameElement[];
  for (const iframe of allIframes) {
    const el = iframe.contentDocument?.querySelector(`[data-pv-block="${blockId}"]`) as HTMLElement | null;
    if (el) return el;
  }
  return document.querySelector(`[data-pv-block="${blockId}"]`) as HTMLElement | null;
}
export type ClipboardBlockAction = 'copy' | 'cut' | 'duplicate';

interface ExecuteBlockActionParams {
  action: BlockMutationAction;
  blockId: string;
  file: string;
  activeSourceId: string;
  focusElement: (el: HTMLElement) => void;
  refreshActiveData: () => Promise<void>;
}

interface ExecuteClipboardBlockActionParams {
  action: ClipboardBlockAction;
  blockId: string;
  file: string;
  activeSourceId: string;
  focusElement: (el: HTMLElement) => void;
  refreshActiveData: () => Promise<void>;
}

export async function executeBlockAction({
  action,
  blockId,
  file,
  activeSourceId,
  focusElement,
  refreshActiveData
}: ExecuteBlockActionParams): Promise<void> {
  const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
  const oldTarget = findBlockElement(blockId);
  const parentBlockId = oldTarget?.parentElement?.closest('[data-pv-block]')?.getAttribute('data-pv-block');

  const getPvLocAttr = (el: Element | null) => {
    if (!el) return null;
    for (let i = 0; i < el.attributes.length; i++) {
      if (el.attributes[i].name.startsWith('data-pv-loc-')) return el.attributes[i].name;
    }
    return null;
  };

  const oldLoc = getPvLocAttr(oldTarget);

  await takeSnapshot(file, activeSourceId);
  await blockAction(action, blockId, file);

  const maxAttempts = 15;

  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    let focusTarget: HTMLElement | null = null;

    if (action === 'delete') {
      const stillExists = findBlockElement(blockId);
      if (stillExists && attempts < maxAttempts - 1) {
        await wait(100);
        continue;
      }
      if (parentBlockId) {
        focusTarget = findBlockElement(parentBlockId);
      }
    } else {
      focusTarget = findBlockElement(blockId);
      const newLoc = getPvLocAttr(focusTarget);

      if (focusTarget && focusTarget === oldTarget && newLoc === oldLoc && attempts < maxAttempts - 1) {
        await wait(100);
        continue;
      }
    }

    if (focusTarget) {
      focusElement(focusTarget);
      return;
    } else {
      await refreshActiveData();
      return;
    }
  }
}

export async function executeClipboardBlockAction({
  action,
  blockId,
  file,
  activeSourceId,
  focusElement,
  refreshActiveData
}: ExecuteClipboardBlockActionParams): Promise<void> {
  const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
  if (action === 'copy') {
    await blockAction('copy', blockId, file);
    return;
  }

  const oldTarget = findBlockElement(blockId);

  await takeSnapshot(file, activeSourceId);
  await blockAction(action, blockId, file);

  if (action === 'duplicate') {
    await wait(300);
    await refreshActiveData();
    return;
  }

  const parent = oldTarget?.parentElement as HTMLElement | null;
  await wait(300);
  if (parent) {
    focusElement(parent);
  } else {
    await refreshActiveData();
  }
}
