import React, { createContext, forwardRef, useContext, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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
        style={{ display: 'inline-flex' }}
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

export const pvConfig = {
  name: 'DialogTrigger',
  componentId: 'DialogTrigger',
  displayName: 'Dialog Trigger',
  description: 'Wraps a trigger element; first child is the trigger, remaining children are shown in a dialog overlay on click.',
  importPath: '@/components/ui/dialog-trigger',
  snippet: '',
  defaultContent: '{/* pv-editable-zone-start */}\n{/* pv-editable-zone-end */}',
  props: {
    closeOnEscape: { type: 'boolean' },
  },
};
