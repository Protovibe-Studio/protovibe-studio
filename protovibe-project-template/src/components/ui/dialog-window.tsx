import React from 'react';
import { cn } from '@/lib/utils';
import { DialogCloseTrigger } from '@/components/ui/dialog-close-trigger';
import { Button } from '@/components/ui/button';

export interface DialogWindowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Maximum width of the dialog window */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Whether to show the built-in close button in the top-right corner */
  showCloseButton?: boolean;
  children?: React.ReactNode;
}

export function DialogWindow({ size = 'md', showCloseButton = true, children, className, ...props }: DialogWindowProps) {
  return (
    <div
      data-size={size}
      data-show-close-button={showCloseButton}
      className={cn("shadow-2xl p-8 w-full max-h-[90vh] overflow-y-auto data-[size=sm]:max-w-sm data-[size=md]:max-w-lg data-[size=lg]:max-w-2xl data-[size=xl]:max-w-4xl data-[size=full]:max-w-full bg-background-elevated relative rounded", className)}
      {...props}
      data-pv-component-id="DialogWindow"
    >
      {showCloseButton && (
        <DialogCloseTrigger className="absolute top-1 right-1">
          <Button variant="ghost" color="neutral" size="sm" iconOnly={true} leftIcon="close" />
        </DialogCloseTrigger>
      )}
      {children}
    </div>
  );
}

export function PvDefaultContent() {
  return (
    <>
      {/* pv-editable-zone-start */}
        {/* pv-block-start */}
        <h2 data-pv-block="" className="text-xl font-semibold text-foreground-default mb-2">Dialog Title</h2>
        {/* pv-block-end */}
        {/* pv-block-start */}
        <p data-pv-block="" className="text-foreground-secondary mb-6">This is the dialog content. Click the button below or press Escape to close.</p>
        {/* pv-block-end */}
        <div>
          {/* pv-editable-zone-start */}
            {/* pv-block-start */}
            <p data-pv-block="" className="text-foreground-secondary mb-6">This is additional editable content.</p>
            {/* pv-block-end */}
          {/* pv-editable-zone-end */}
        </div>
      {/* pv-editable-zone-end */}
    </>
  );
}

export const pvConfig = {
  name: 'DialogWindow',
  componentId: 'DialogWindow',
  displayName: 'Dialog Window',
  description: 'Styled container for dialog content. Place inside DialogOverlay.',
  importPath: '@/components/ui/dialog-window',
  defaultProps: '',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  additionalImportsForDefaultContent: [],
  props: {
    size: { type: 'select', options: ['sm', 'md', 'lg', 'xl', 'full'] },
    showCloseButton: { type: 'boolean' },
  },
};
