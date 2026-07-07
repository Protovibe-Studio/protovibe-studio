import React from 'react';
import { cn } from '@/lib/utils';

export interface DropdownGroupLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
}

export function DropdownGroupLabel({ label, className, ...props }: DropdownGroupLabelProps) {
  return (
    <div
      className={cn("text-xs font-semibold text-foreground-tertiary uppercase tracking-wider pt-2 pb-0 px-3", className)}
      {...props}
      data-pv-component-id="DropdownGroupLabel"
    >
      {label}
    </div>
  );
}

export function PvDefaultContent() {
  return <></>;
}

export const pvConfig = {
  name: 'DropdownGroupLabel',
  componentId: 'DropdownGroupLabel',
  displayName: 'Dropdown Group Label',
  description: 'A small section header label inside a dropdown list.',
  importPath: '@/components/ui/dropdown-group-label',
  defaultProps: 'label="Section"',
  defaultContent: <PvDefaultContent />,
  props: {
    label: { type: 'string', exampleValue: 'Lorem ipsum' },
  },
};
