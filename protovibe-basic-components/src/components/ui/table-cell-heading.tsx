import React from 'react';
import * as LucideIcons from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export interface TableCellHeadingProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  label?: string;
  prefixIcon?: string;
  suffixIcon?: string;
}

export function TableCellHeading({
  label,
  prefixIcon,
  suffixIcon,
  className,
  ...props
}: TableCellHeadingProps) {
  return (
    <th
      className={cn("text-left text-xs font-semibold uppercase text-foreground-secondary whitespace-nowrap py-2 px-4 tracking-wide", className)}
      {...props}
      data-pv-component-id="TableCellHeading"
    >
      <span className="inline-flex items-center gap-1.5">
        {prefixIcon && <Icon name={prefixIcon} size="xs" />}
        {label && <span>{label}</span>}
        {suffixIcon && <Icon name={suffixIcon} size="xs" />}
      </span>
    </th>
  );
}

export const pvConfig = {
  name: 'TableCellHeading',
  componentId: 'TableCellHeading',
  displayName: 'Table Cell Heading',
  description: 'A header cell (<th>) with label text and optional prefix/suffix icon.',
  importPath: '@/components/ui/table-cell-heading',
  defaultProps: 'label="Column"',
  defaultContent: '',
  props: {
    label: { type: 'string', exampleValue: 'Column' },
    prefixIcon: { type: 'select', options: Object.keys(LucideIcons) },
    suffixIcon: { type: 'select', options: Object.keys(LucideIcons) },
  },
};
