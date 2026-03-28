import React from 'react';
import { usePopoverClose } from '@/components/ui/popover-trigger';

export interface PopoverCloseTriggerProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
}

export function PopoverCloseTrigger({ children, ...props }: PopoverCloseTriggerProps) {
  const popover = usePopoverClose();

  return (
    <span
      style={{ display: 'inline-flex', cursor: 'pointer' }}
      onClick={() => popover?.close()}
      {...props}
      data-pv-component-id="PopoverCloseTrigger"
    >
      {children}
    </span>
  );
}

export const pvConfig = {
  name: 'PopoverCloseTrigger',
  componentId: 'PopoverCloseTrigger',
  displayName: 'Popover Close Trigger',
  description: 'Placed inside a PopoverTrigger panel; closes the popover when clicked.',
  importPath: '@/components/ui/popover-close-trigger',
  snippet: '',
  defaultContent: `
{/* pv-editable-zone-start */}
  {/* pv-block-start */}
  <Button data-pv-block="" variant="ghost" color="neutral" size="icon" leftIcon="X" />
  {/* pv-block-end */}
{/* pv-editable-zone-end */}`,
  additionalImports: [
    { name: 'Button', path: '@/components/ui/button' },
  ],
  props: {},
};
