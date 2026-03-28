import React from 'react';

export interface DialogWindowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Maximum width of the dialog window */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children?: React.ReactNode;
}

export function DialogWindow({ size = 'md', children, ...props }: DialogWindowProps) {
  return (
    <div
      data-size={size}
      className="rounded-xl shadow-2xl p-8 w-full max-h-[90vh] overflow-y-auto data-[size=sm]:max-w-sm data-[size=md]:max-w-lg data-[size=lg]:max-w-2xl data-[size=xl]:max-w-4xl data-[size=full]:max-w-full bg-background-elevated"
      {...props}
      data-pv-component-id="DialogWindow"
    >
      {children}
    </div>
  );
}

export const pvConfig = {
  name: 'DialogWindow',
  componentId: 'DialogWindow',
  displayName: 'Dialog Window',
  description: 'Styled container for dialog content. Place inside DialogOverlay.',
  importPath: '@/components/ui/dialog-window',
  snippet: '',
  defaultContent: `
{/* pv-editable-zone-start */}
  {/* pv-block-start */}
  <h2 data-pv-block="" className="text-xl font-semibold text-foreground-default mb-2">Dialog Title</h2>
  {/* pv-block-end */}
  {/* pv-block-start */}
  <p data-pv-block="" className="text-foreground-secondary mb-6">This is the dialog content. Click the button below or press Escape to close.</p>
  {/* pv-block-end */}
  {/* pv-block-start */}
  <DialogCloseTrigger data-pv-block="">
    <Button variant="ghost" color="neutral" size="icon" leftIcon="X" />
  </DialogCloseTrigger>
  {/* pv-block-end */}
{/* pv-editable-zone-end */}`,
  additionalImports: [
    { name: 'DialogCloseTrigger', path: '@/components/ui/dialog-close-trigger' },
    { name: 'Button', path: '@/components/ui/button' },
  ],
  props: {
    size: { type: 'select', options: ['sm', 'md', 'lg', 'xl', 'full'] },
  },
};
