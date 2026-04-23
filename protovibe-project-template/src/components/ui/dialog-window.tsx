import React from 'react';
import { cn } from '@/lib/utils';
import { DialogCloseTrigger } from '@/components/ui/dialog-close-trigger';
import { Button } from '@/components/ui/button';

export interface DialogWindowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Maximum width of the dialog window */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Whether to show the built-in close button in the top-right corner */
  showCloseButton?: boolean;
  /** Whether the window content scrolls when it overflows. Default false. */
  scrollable?: boolean;
  children?: React.ReactNode;
}

export function DialogWindow({ size = 'md', showCloseButton = true, scrollable = false, children, className, ...props }: DialogWindowProps) {
  return (
    <div
      data-size={size}
      data-show-close-button={showCloseButton}
      data-scrollable={scrollable}
      className={cn(
        'shadow-2xl w-full data-[size=sm]:max-w-sm data-[size=md]:max-w-lg data-[size=lg]:max-w-2xl data-[size=xl]:max-w-4xl data-[size=full]:max-w-full bg-background-elevated relative rounded data-[scrollable=true]:overflow-y-auto data-[scrollable=true]:max-h-full',
        className
      )}
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
        <div data-pv-block="" className="p-8 flex flex-col gap-2">
          {/* pv-editable-zone-start */}
            {/* pv-block-start */}
            <h2 data-pv-block="" className="text-xl font-semibold text-foreground-default">Dialog Title</h2>
            {/* pv-block-end */}
            {/* pv-block-start */}
            <p data-pv-block="" className="text-foreground-secondary">This is the modal dialog content. Click the button below or press Escape to close.</p>
            {/* pv-block-end */}
          {/* pv-editable-zone-end */}
        </div>
        {/* pv-block-end */}
      {/* pv-editable-zone-end */}
    </>
  );
}

export const pvConfig = {
  name: 'DialogWindow',
  componentId: 'DialogWindow',
  displayName: 'Dialog Window',
  description: 'Styled container for modal dialog content. Place inside DialogOverlay.',
  importPath: '@/components/ui/dialog-window',
  defaultProps: '',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  additionalImportsForDefaultContent: [],
  props: {
    size: { type: 'select', options: ['sm', 'md', 'lg', 'xl', 'full'] },
    showCloseButton: { type: 'boolean' },
    scrollable: { type: 'boolean' },
  },
};
