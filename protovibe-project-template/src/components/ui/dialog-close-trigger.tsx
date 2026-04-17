import React from 'react';
import { useDialogContext } from '@/components/ui/dialog-trigger';
import { Button } from '@/components/ui/button';

export interface DialogCloseTriggerProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
}

export function DialogCloseTrigger({ children, ...props }: DialogCloseTriggerProps) {
  const dialog = useDialogContext();

  return (
    <span
      style={{ display: 'inline-flex', cursor: 'pointer' }}
      onClick={() => dialog?.close()}
      {...props}
      data-pv-component-id="DialogCloseTrigger"
    >
      {children}
    </span>
  );
}

export function PvDefaultContent() {
  return (
    <>
      {/* pv-editable-zone-start */}
        {/* pv-block-start */}
        <Button data-pv-block="" variant="ghost" color="neutral" size="sm" iconOnly={true} leftIcon="material-symbols:close" />
        {/* pv-block-end */}
      {/* pv-editable-zone-end */}
    </>
  );
}

export const pvConfig = {
  name: 'DialogCloseTrigger',
  componentId: 'DialogCloseTrigger',
  displayName: 'Dialog Close Trigger',
  description: 'Placed inside a DialogOverlay; closes the dialog when clicked.',
  importPath: '@/components/ui/dialog-close-trigger',
  defaultProps: '',
  defaultContent: <PvDefaultContent />,
  additionalImportsForDefaultContent: [
    { name: 'Button', path: '@/components/ui/button' },
  ],
  props: {},
};
