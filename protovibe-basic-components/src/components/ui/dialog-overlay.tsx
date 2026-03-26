import React, { useEffect } from 'react';
import { useDialogContext } from '@/components/ui/dialog-trigger';

export interface DialogOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export function DialogOverlay({ children, ...props }: DialogOverlayProps) {
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
      className="fixed top-0 right-0 bottom-0 left-0 overflow-hidden flex items-center justify-center bg-background-overlay"
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
  snippet: '',
  defaultContent: '{/* pv-editable-zone-start */}\n{/* pv-editable-zone-end */}',
  props: {},
};
