import React, { createContext, forwardRef, useContext, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { DialogOverlay } from '@/components/ui/dialog-overlay';
import { DialogWindow } from '@/components/ui/dialog-window';

export const DialogContext = createContext<{ isOpen: boolean; close: () => void } | null>(null);

export function useDialogContext() {
  return useContext(DialogContext);
}

export interface DialogHandle {
  close: () => void;
  open: () => void;
  toggle: () => void;
}

export interface DialogTriggerProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Whether pressing Escape closes the dialog. Default true. */
  closeOnEscape?: boolean;
  children?: React.ReactNode;
}

export const DialogTrigger = forwardRef<DialogHandle, DialogTriggerProps>(function DialogTrigger({
  closeOnEscape = true,
  children,
  ...props
}, ref) {
  const [isOpen, setIsOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    close: () => setIsOpen(false),
    open: () => setIsOpen(true),
    toggle: () => setIsOpen((prev) => !prev),
  }));

  // Close on Escape
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape]);

  const childArray = React.Children.toArray(children);
  const triggerChild = childArray[0];
  const panelChildren = childArray.slice(1);

  const portalTarget =
    typeof document !== 'undefined'
      ? document.body
      : null;

  return (
    <DialogContext.Provider value={{ isOpen, close: () => setIsOpen(false) }}>
      <span
        style={{ display: 'inline-flex', cursor: 'pointer' }}
        onClick={() => setIsOpen((prev) => !prev)}
        {...props}
        data-pv-component-id="DialogTrigger"
      >
        {triggerChild}
      </span>

      {isOpen && portalTarget
        ? createPortal(
            <div>
              {panelChildren}
            </div>,
            portalTarget
          )
        : null}
    </DialogContext.Provider>
  );
});

export function PvDefaultContent() {
  return (
    <>
      {/* pv-editable-zone-start */}
        {/* pv-block-start */}
        <Button data-pv-block="" variant="outline" iconOnly leftIcon="Pencil" />
        {/* pv-block-end */}
        {/* pv-block-start */}
        <DialogOverlay data-pv-block="">
          <DialogWindow size="md">
            {/* pv-editable-zone-start */}
            {/* pv-block-start */}
            <h2 data-pv-block="" className="text-xl font-semibold text-foreground-default mb-2">Dialog Title</h2>
            {/* pv-block-end */}
            {/* pv-block-start */}
            <p data-pv-block="" className="text-foreground-secondary mb-6">This is the dialog content. Click the button below or press Escape to close.</p>
            {/* pv-block-end */}
            {/* pv-editable-zone-end */}
          </DialogWindow>
        </DialogOverlay>
        {/* pv-block-end */}
      {/* pv-editable-zone-end */}
    </>
  );
}

export const pvConfig = {
  name: 'DialogTrigger',
  componentId: 'DialogTrigger',
  displayName: 'Dialog Trigger',
  description: 'Wraps a trigger element; first child is the trigger, remaining children are shown in a dialog overlay on click.',
  importPath: '@/components/ui/dialog-trigger',
  defaultProps: '',
  defaultContent: <PvDefaultContent />,
  additionalImportsForDefaultContent: [
    { name: 'Button', path: '@/components/ui/button' },
    { name: 'DialogOverlay', path: '@/components/ui/dialog-overlay' },
    { name: 'DialogWindow', path: '@/components/ui/dialog-window' },
  ],
  props: {
    closeOnEscape: { type: 'boolean' },
  },
};
