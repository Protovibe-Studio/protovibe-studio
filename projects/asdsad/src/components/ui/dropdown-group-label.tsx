import React from 'react';
import { cn } from '@/lib/utils';

export interface DropdownGroupLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
}

export function DropdownGroupLabel({ label, className, ...props }: DropdownGroupLabelProps) {
  return (
    <div
      className={cn(
        'px-3 py-1 text-xs font-semibold text-foreground-tertiary uppercase tracking-wider',
        className
      )}
      {...props}
      data-pv-component-id="DropdownGroupLabel"
    >
      {label}
    </div>
  );
}

export const pvConfig = {
  name: 'DropdownGroupLabel',
  componentId: 'DropdownGroupLabel',
  displayName: 'Dropdown Group Label',
  description: 'A small section header label inside a dropdown list.',
  importPath: '@/components/ui/dropdown-group-label',
  snippet: 'label="Section"',
  defaultContent: '',
  props: {
    label: { type: 'string', exampleValue: 'Lorem ipsum' },
  },
};
