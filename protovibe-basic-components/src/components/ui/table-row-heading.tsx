import React from 'react';
import { cn } from '@/lib/utils';
import { TableCellHeading } from '@/components/ui/table-cell-heading';

export interface TableRowHeadingProps extends React.HTMLAttributes<HTMLTableRowElement> {}

export function TableRowHeading({ className, children, ...props }: TableRowHeadingProps) {
  return (
    <tr
      className={cn("bg-background-secondary border-b border-border-default", className)}
      {...props}
      data-pv-component-id="TableRowHeading"
    >
      {children}
    </tr>
  );
}

export function PvDefaultContent() {
  return (
    <>
      {/* pv-editable-zone-start */}
        {/* pv-block-start */}
        <TableCellHeading data-pv-block="" label="Name" />
        {/* pv-block-end */}
        {/* pv-block-start */}
        <TableCellHeading data-pv-block="" label="Status" />
        {/* pv-block-end */}
        {/* pv-block-start */}
        <TableCellHeading data-pv-block="" suffixIcon="SortAsc" label="Date" />
        {/* pv-block-end */}
      {/* pv-editable-zone-end */}
    </>
  );
}

export const pvConfig = {
  name: 'TableRowHeading',
  componentId: 'TableRowHeading',
  displayName: 'Table Row Heading',
  description: 'A header row (<tr>) for use inside <thead>, with secondary background.',
  importPath: '@/components/ui/table-row-heading',
  defaultProps: '',
  defaultContent: <PvDefaultContent />,
  additionalImportsForDefaultContent: [
    { name: 'TableCellHeading', path: '@/components/ui/table-cell-heading' },
  ],
  props: {},
};
