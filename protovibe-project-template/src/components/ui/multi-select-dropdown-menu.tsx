import React from 'react';
import { cn } from '@/lib/utils';
import { MultiSelectDropdownItem } from '@/components/ui/multi-select-dropdown-item';
import { SelectDropdownSearch } from '@/components/ui/select-dropdown-search';
import { DropdownSeparator } from '@/components/ui/dropdown-separator';

export interface MultiSelectDropdownMenuProps extends React.HTMLAttributes<HTMLDivElement> {
  menuMinWidth?: 'auto' | 'sm' | 'md' | 'lg' | 'xl';
  children?: React.ReactNode;
}

export function MultiSelectDropdownMenu({
  menuMinWidth = 'md',
  className,
  children,
  ...props
}: MultiSelectDropdownMenuProps) {
  return (
    <div
      role="menu"
      data-width={menuMinWidth}
      className={cn(
        'bg-background-default shadow-lg ring-1 ring-border-default py-1 overflow-auto data-[width=sm]:w-40 data-[width=md]:w-56 data-[width=lg]:w-72 data-[width=xl]:w-96 rounded',
        className
      )}
      {...props}
      data-pv-component-id="MultiSelectDropdownMenu"
    >
      {children}
    </div>
  );
}

export function PvDefaultContent() {
  return (
    <>
      {/* pv-editable-zone-start */}
        {/* pv-block-start */}
        <SelectDropdownSearch data-pv-block="" placeholder="Search people..." />
        {/* pv-block-end */}
        {/* pv-block-start */}
        <MultiSelectDropdownItem data-pv-block="" value="all" label="All" />
        {/* pv-block-end */}
        {/* pv-block-start */}
        <DropdownSeparator data-pv-block="" />
        {/* pv-block-end */}
        {/* pv-block-start */}
        <MultiSelectDropdownItem data-pv-block="" value="alice" label="Alice Johnson" badgeLabel="Design" />
        {/* pv-block-end */}
        {/* pv-block-start */}
        <MultiSelectDropdownItem data-pv-block="" value="bob" label="Bob Smith" badgeLabel="Engineering" />
        {/* pv-block-end */}
        {/* pv-block-start */}
        <MultiSelectDropdownItem data-pv-block="" value="carol" label="Carol Davis" badgeLabel="Marketing" />
        {/* pv-block-end */}
      {/* pv-editable-zone-end */}
    </>
  );
}

export const pvConfig = {
  name: 'MultiSelectDropdownMenu',
  componentId: 'MultiSelectDropdownMenu',
  displayName: 'Multi-Select Menu (Mock)',
  description: 'A static multi-select menu shell, perfect for visually designing lists in Sketchpad.',
  importPath: '@/components/ui/multi-select-dropdown-menu',
  defaultProps: 'menuMinWidth="md"',
  defaultContent: <PvDefaultContent />,
  additionalImportsForDefaultContent: [
    { name: 'MultiSelectDropdownItem', path: '@/components/ui/multi-select-dropdown-item' },
    { name: 'SelectDropdownSearch', path: '@/components/ui/select-dropdown-search' },
  ],
  props: {
    menuMinWidth: { type: 'select', options: ['auto', 'sm', 'md', 'lg', 'xl'] },
  },
};
