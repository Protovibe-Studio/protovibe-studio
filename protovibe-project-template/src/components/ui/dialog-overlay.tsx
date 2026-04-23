import React, { useEffect } from 'react';
import { useDialogContext } from '@/components/ui/dialog-trigger';
import { cn } from '@/lib/utils';
import { DialogWindow } from '@/components/ui/dialog-window';

export interface DialogOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  /** Top padding in vh units before the dialog window */
  customDistanceFromTopEdge?: number;
  /** Whether the overlay backdrop itself scrolls when content overflows. Default false. */
  scrollable?: boolean;
}

export function DialogOverlay({ children, className, customDistanceFromTopEdge = 22, scrollable = true, ...props }: DialogOverlayProps) {
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
      data-scrollable={scrollable}
      className={cn(
        'fixed top-0 right-0 bottom-0 left-0 bg-background-overlay data-[scrollable=false]:overflow-hidden data-[scrollable=true]:overflow-y-auto',
        className
      )}
      onClick={handleBackdropClick}
      {...props}
      data-pv-component-id="DialogOverlay"
    >
      <div
        className={cn(
          'w-full flex justify-center px-8 pointer-events-none',
          scrollable ? 'pb-8' : 'h-full flex-col items-center'
        )}
        style={{ paddingTop: `${customDistanceFromTopEdge}vh` }}
      >
        <div className={cn('pointer-events-auto w-full flex justify-center', !scrollable && 'flex-1 min-h-0')}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function PvDefaultContent() {
  return (
    <>
      {/* pv-editable-zone-start */}
      {/* pv-editable-zone-end */}
    </>
  );
}

export const pvConfig = {
  name: 'DialogOverlay',
  componentId: 'DialogOverlay',
  displayName: 'Dialog Overlay',
  description: 'Fixed full-screen backdrop for a dialog. Place inside DialogTrigger as the second child.',
  importPath: '@/components/ui/dialog-overlay',
  defaultProps: '',
  defaultContent: <PvDefaultContent />,
  additionalImportsForDefaultContent: [
    { name: 'DialogWindow', path: '@/components/ui/dialog-window' },
  ],
  props: {
    customDistanceFromTopEdge: { type: 'string' },
    scrollable: { type: 'boolean' },
  },
};
