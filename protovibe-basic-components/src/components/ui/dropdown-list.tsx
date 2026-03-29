import React from 'react';
import { cn } from '@/lib/utils';
import { DropdownGroupLabel } from '@/components/ui/dropdown-group-label';
import { DropdownItem } from '@/components/ui/dropdown-item';
import { DropdownSeparator } from '@/components/ui/dropdown-separator';

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
        'rounded-md bg-background-default shadow-lg ring-1 ring-border-default py-1 overflow-auto',
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
  defaultProps: 'width="md"',
  defaultContent: (
    <>
      {/* pv-editable-zone-start */}
        {/* pv-block-start */}
        <DropdownGroupLabel data-pv-block="" label="Actions" />
        {/* pv-block-end */}
        {/* pv-block-start */}
        <DropdownItem data-pv-block="" label="Edit" prefixIcon="Edit2" />
        {/* pv-block-end */}
        {/* pv-block-start */}
        <DropdownItem data-pv-block="" label="Duplicate" prefixIcon="Copy" />
        {/* pv-block-end */}
        {/* pv-block-start */}
        <DropdownSeparator data-pv-block="" />
        {/* pv-block-end */}
        {/* pv-block-start */}
        <DropdownItem data-pv-block="" label="Delete" prefixIcon="Trash2" destructive={true} />
        {/* pv-block-end */}
      {/* pv-editable-zone-end */}
    </>
  ),
  additionalImportsForDefaultContent: [
    { name: 'DropdownGroupLabel', path: '@/components/ui/dropdown-group-label' },
    { name: 'DropdownItem', path: '@/components/ui/dropdown-item' },
    { name: 'DropdownSeparator', path: '@/components/ui/dropdown-separator' },
  ],
  props: {
    width: { type: 'select', options: ['auto', 'sm', 'md', 'lg', 'xl'] },
  },
};
