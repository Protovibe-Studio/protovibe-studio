import React from 'react';
import { cn } from '@/lib/utils';

export interface DropdownSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DropdownSeparator({ className, ...props }: DropdownSeparatorProps) {
  return (
    <div
      role="separator"
      className={cn('my-1 h-px bg-border', className)}
      {...props}
      data-pv-component-id="DropdownSeparator"
    />
  );
}

export const pvConfig = {
  name: 'DropdownSeparator',
  componentId: 'DropdownSeparator',
  displayName: 'Dropdown Separator',
  description: 'A horizontal divider line between dropdown items or groups.',
  importPath: '@/components/ui/dropdown-separator',
  defaultProps: '',
  defaultContent: '',
  props: {},
};
