import React from 'react';
import { cn } from '@/lib/utils';
import { DropdownItem } from '@/components/ui/dropdown-item';
import { SelectDropdownSearch } from '@/components/ui/select-dropdown-search';

export interface SelectDropdownMenuProps extends React.HTMLAttributes<HTMLDivElement> {
  menuMinWidth?: 'auto' | 'sm' | 'md' | 'lg' | 'xl';
  children?: React.ReactNode;
}

export function SelectDropdownMenu({
  menuMinWidth = 'md',
  className,
  children,
  ...props
}: SelectDropdownMenuProps) {
  return (
    <div
      role="menu"
      data-width={menuMinWidth}
      className={cn("shadow-lg ring-1 ring-border-default py-1 overflow-auto data-[width=sm]:w-40 data-[width=md]:w-56 data-[width=lg]:w-72 data-[width=xl]:w-96 rounded bg-background-elevated", className)}
      {...props}
      data-pv-component-id="SelectDropdownMenu"
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
        <SelectDropdownSearch data-pv-block="" placeholder="Search..." />
        {/* pv-block-end */}
        {/* pv-block-start */}
        <DropdownItem data-pv-block="" value="opt1" label="Option One" selected={true} />
        {/* pv-block-end */}
        {/* pv-block-start */}
        <DropdownItem data-pv-block="" value="opt2" label="Option Two" selected={false} />
        {/* pv-block-end */}
        {/* pv-block-start */}
        <DropdownItem data-pv-block="" value="opt3" label="Option Three" selected={false} />
        {/* pv-block-end */}
      {/* pv-editable-zone-end */}
    </>
  );
}

export const pvConfig = {
  name: 'SelectDropdownMenu',
  componentId: 'SelectDropdownMenu',
  displayName: 'Select Menu (Mock)',
  description: 'A static dropdown menu shell, perfect for visually designing lists in Sketchpad.',
  importPath: '@/components/ui/select-dropdown-menu',
  defaultProps: 'menuMinWidth="md"',
  defaultContent: <PvDefaultContent />,
  additionalImportsForDefaultContent: [
    { name: 'DropdownItem', path: '@/components/ui/dropdown-item' },
    { name: 'SelectDropdownSearch', path: '@/components/ui/select-dropdown-search' },
  ],
  props: {
    menuMinWidth: { type: 'select', options: ['auto', 'sm', 'md', 'lg', 'xl'] },
  },
};
