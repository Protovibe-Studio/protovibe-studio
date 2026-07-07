import React, { useEffect } from 'react';
import { useDialogContext } from '@/components/ui/dialog-trigger';
import { cn } from '@/lib/utils';

export interface DrawerOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export function DrawerOverlay({ children, className, ...props }: DrawerOverlayProps) {
  const dialog = useDialogContext();

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
      className={cn('fixed inset-0 z-50 flex justify-end bg-background-overlay', className)}
      onClick={handleBackdropClick}
      {...props}
      data-pv-component-id="DrawerOverlay"
    >
      {children}
    </div>
  );
}

export function PvDefaultContent() {
  return <></>;
}

export const pvConfig = {
  name: 'DrawerOverlay',
  componentId: 'DrawerOverlay',
  displayName: 'Drawer Overlay',
  description: 'Fixed full-screen backdrop that aligns contents to the right. Usually wraps a DrawerPanel.',
  importPath: '@/components/ui/drawer-overlay',
  defaultProps: '',
  defaultContent: <PvDefaultContent />,
  props: {},
};
