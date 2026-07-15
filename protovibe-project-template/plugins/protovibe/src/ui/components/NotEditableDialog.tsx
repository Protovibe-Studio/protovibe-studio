// plugins/protovibe/src/ui/components/NotEditableDialog.tsx
//
// Shown when the user tries a block action (add after, move, wrap, delete, …)
// on an element that is not tagged as a Protovibe block. Explains why the
// action is unavailable and offers a one-click copy of the "Make editable in
// Protovibe" prompt, pre-filled with the selected element's file/source
// context, ready to paste into a coding agent.
import React, { useCallback, useEffect, useState } from 'react';
import { useProtovibe } from '../context/ProtovibeContext';
import { ConfirmDialog } from './ConfirmDialog';
import { emitToast } from '../events/toast';
import { theme } from '../theme';
import { PROMPTS, renderPrompt, type PromptRenderContext } from '../prompts/prompts-registry';

export const PV_NOT_EDITABLE_EVENT = 'pv:open-not-editable-dialog';

/** Open the "element isn't editable yet" dialog from anywhere in the shell. */
export function openNotEditableDialog() {
  window.dispatchEvent(new CustomEvent(PV_NOT_EDITABLE_EVENT));
}

export const NotEditableDialog: React.FC = () => {
  const { activeData, currentBaseTarget } = useProtovibe();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener(PV_NOT_EDITABLE_EVENT, handler);
    return () => window.removeEventListener(PV_NOT_EDITABLE_EVENT, handler);
  }, []);

  const handleCopyPrompt = useCallback(async () => {
    const def = PROMPTS.find(p => p.id === 'enrich-with-blocks');
    if (!def) return;
    const closestBlock = currentBaseTarget?.closest('[data-pv-block]') as HTMLElement | null;
    const ctx: PromptRenderContext = {
      file: activeData?.file ?? null,
      startLine: activeData?.startLine ?? null,
      endLine: activeData?.endLine ?? null,
      blockId: closestBlock?.getAttribute('data-pv-block') || null,
      code: activeData?.code ?? null,
    };
    try {
      await navigator.clipboard.writeText(renderPrompt(def, ctx, ''));
      emitToast({ message: 'Prompt copied — paste it into your coding agent', variant: 'success' });
      setIsOpen(false);
    } catch {
      emitToast({ message: 'Failed to copy prompt', variant: 'error' });
    }
  }, [activeData, currentBaseTarget]);

  return (
    <ConfirmDialog
      isOpen={isOpen}
      title="This element isn't editable yet"
      message={
        <>
          The selected element is not tagged as a Protovibe block, so it can't be
          moved, wrapped, deleted, or extended on the canvas. Your coding agent
          probably forgot to tag it when writing the code.
          <br />
          <br />
          Ask your coding agent to fix it - just copy the prompt and paste it into your agent.
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginTop: 16,
              padding: '10px 12px',
              background: theme.accent_low,
              border: `1px solid ${theme.accent_tertiary}`,
              borderRadius: 8,
              color: theme.text_secondary,
              lineHeight: 1.5,
            }}
          >
            <span style={{ flexShrink: 0 }}>💡</span>
            <span>
              Tip: you can also select <span style={{ color: theme.text_default, fontWeight: 600 }}>Convert to Sketchpad…</span>{' '}
              from the menu at the bottom of the screen to freely edit this element.
            </span>
          </div>
        </>
      }
      confirmLabel="Copy prompt"
      confirmVariant="primary"
      onConfirm={handleCopyPrompt}
      onCancel={() => setIsOpen(false)}
    />
  );
};
