import React from 'react';
import { cn } from '@/lib/utils';

export interface DropdownListProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: 'auto' | 'sm' | 'md' | 'lg' | 'xl';
  children?: React.ReactNode;
}

export function DropdownList({ width = 'auto', children, className, ...props }: DropdownListProps) {
  return (
    <div
      role="menu"
      data-width={width}
      className={cn(
        'rounded-md bg-background-default shadow-lg ring-1 ring-border py-1 overflow-auto',
        'data-[width=sm]:w-40 data-[width=md]:w-56 data-[width=lg]:w-72 data-[width=xl]:w-96',
        className
      )}
      {...props}
      data-pv-component-id="DropdownList"
    >
      {children}
    </div>
  );
}

export const pvConfig = {
  name: 'DropdownList',
  componentId: 'DropdownList',
  displayName: 'Dropdown List',
  description: 'A floating list container for dropdown menu items.',
  importPath: '@/components/ui/dropdown-list',
  snippet: 'width="md"',
  defaultContent: '{/* pv-editable-zone-start */}\n{/* pv-editable-zone-end */}',
  props: {
    width: { type: 'select', options: ['auto', 'sm', 'md', 'lg', 'xl'] },
  },
};
