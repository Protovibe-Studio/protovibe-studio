import React, { useEffect } from 'react';
import { useDialogContext } from '@/components/ui/dialog-trigger';
import { cn } from '@/lib/utils';
import { DialogWindow } from '@/components/ui/dialog-window';
import { DialogCloseTrigger } from '@/components/ui/dialog-close-trigger';
import { Button } from '@/components/ui/button';

export interface DialogOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export function DialogOverlay({ children, className, ...props }: DialogOverlayProps) {
  const dialog = useDialogContext();

  // Lock body scroll while overlay is mounted
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      dialog?.close();
    }
  };

  return (
    <div
      className={cn('fixed top-0 right-0 bottom-0 left-0 overflow-hidden flex items-center justify-center bg-background-overlay', className)}
      onClick={handleBackdropClick}
      {...props}
      data-pv-component-id="DialogOverlay"
    >
      <div className="overflow-y-auto max-h-screen w-full flex justify-center items-start p-8 pointer-events-none">
        <div className="pointer-events-auto w-full flex justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}

export const pvConfig = {
  name: 'DialogOverlay',
  componentId: 'DialogOverlay',
  displayName: 'Dialog Overlay',
  description: 'Fixed full-screen backdrop for a dialog. Place inside DialogTrigger as the second child.',
  importPath: '@/components/ui/dialog-overlay',
  defaultProps: '',
  defaultContent: (
    <>
      {/* pv-editable-zone-start */}
        {/* pv-block-start */}
        <DialogWindow data-pv-block="" size="md">
          {/* pv-editable-zone-start */}
          {/* pv-block-start */}
          <h2 data-pv-block="" className="text-xl font-semibold text-foreground-default mb-2">Dialog Title</h2>
          {/* pv-block-end */}
          {/* pv-block-start */}
          <p data-pv-block="" className="text-foreground-secondary mb-6">This is the dialog content. Click the button below or press Escape to close.</p>
          {/* pv-block-end */}
          {/* pv-block-start */}
          <DialogCloseTrigger data-pv-block="">
            <Button variant="ghost" color="neutral" size="sm" iconOnly={true} leftIcon="X" />
          </DialogCloseTrigger>
          {/* pv-block-end */}
          {/* pv-editable-zone-end */}
        </DialogWindow>
        {/* pv-block-end */}
      {/* pv-editable-zone-end */}
    </>
  ),
  additionalImportsForDefaultContent: [
    { name: 'DialogWindow', path: '@/components/ui/dialog-window' },
    { name: 'DialogCloseTrigger', path: '@/components/ui/dialog-close-trigger' },
    { name: 'Button', path: '@/components/ui/button' },
  ],
  props: {},
};
