import React from 'react';
import { cn } from '@/lib/utils';

export interface DropdownSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DropdownSeparator({ className, ...props }: DropdownSeparatorProps) {
  return (
    <div
      role="separator"
      className={cn("h-px bg-border-default flex-1 my-0.5", className)}
      {...props}
      data-pv-component-id="DropdownSeparator"
    />
  );
}

export function PvDefaultContent() {
  return <></>;
}

export const pvConfig = {
  name: 'DropdownSeparator',
  componentId: 'DropdownSeparator',
  displayName: 'Dropdown Separator',
  description: 'A horizontal divider line between dropdown items or groups.',
  importPath: '@/components/ui/dropdown-separator',
  defaultProps: '',
  defaultContent: <PvDefaultContent />,
  props: {},
};
