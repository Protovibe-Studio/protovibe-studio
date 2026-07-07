import React from 'react';
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
      className={cn("text-left text-xs font-semibold uppercase whitespace-nowrap py-2 px-4 tracking-wide text-foreground-tertiary", className)}
      {...props}
      data-pv-component-id="TableCellHeading"
    >
      <span className="inline-flex items-center gap-1.5">
        {prefixIcon && <Icon iconSymbol={prefixIcon} size="xs" />}
        {label && <span>{label}</span>}
        {suffixIcon && <Icon iconSymbol={suffixIcon} size="xs" />}
      </span>
    </th>
  );
}

export function PvPreviewWrapper({ children }: { children: React.ReactNode }) {
  return <table className="w-full"><tbody><tr>{children}</tr></tbody></table>;
}

export function PvDefaultContent() {
  return <></>;
}

export const pvConfig = {
  name: 'TableCellHeading',
  componentId: 'TableCellHeading',
  displayName: 'Table Cell Heading',
  description: 'A header cell (<th>) with label text and optional prefix/suffix icon.',
  importPath: '@/components/ui/table-cell-heading',
  defaultProps: 'label="Column"',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  props: {
    label: { type: 'string', exampleValue: 'Column' },
    prefixIcon: { type: 'iconSearch', exampleValue: 'cog' },
    suffixIcon: { type: 'iconSearch', exampleValue: 'arrow-right' },
  },
};
