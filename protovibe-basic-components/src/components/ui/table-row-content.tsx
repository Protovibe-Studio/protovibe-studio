import React from 'react';
import { cn } from '@/lib/utils';
import { TableCellContent } from '@/components/ui/table-cell-content';
import { TextBlock } from '@/components/ui/text-block';

export interface TableRowContentProps extends React.HTMLAttributes<HTMLTableRowElement> {}

export function TableRowContent({ className, children, ...props }: TableRowContentProps) {
  return (
    <tr
      className={cn("border-b border-border-default bg-background-default even:bg-background-secondary", className)}
      {...props}
      data-pv-component-id="TableRowContent"
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
        <TableCellContent data-pv-block="">
          {/* pv-editable-zone-start */}
            {/* pv-block-start */}
            <TextBlock data-pv-block="">Value</TextBlock>
            {/* pv-block-end */}
          {/* pv-editable-zone-end */}
        </TableCellContent>
        {/* pv-block-end */}
        {/* pv-block-start */}
        <TableCellContent data-pv-block="">
          {/* pv-editable-zone-start */}
            {/* pv-block-start */}
            <TextBlock data-pv-block="">Active</TextBlock>
            {/* pv-block-end */}
          {/* pv-editable-zone-end */}
        </TableCellContent>
        {/* pv-block-end */}
        {/* pv-block-start */}
        <TableCellContent data-pv-block="">
          {/* pv-editable-zone-start */}
            {/* pv-block-start */}
            <TextBlock data-pv-block="">Jan 1, 2024</TextBlock>
            {/* pv-block-end */}
          {/* pv-editable-zone-end */}
        </TableCellContent>
        {/* pv-block-end */}
      {/* pv-editable-zone-end */}
    </>
  );
}

export const pvConfig = {
  name: 'TableRowContent',
  componentId: 'TableRowContent',
  displayName: 'Table Row Content',
  description: 'A data row (<tr>) that applies secondary background on every even row.',
  importPath: '@/components/ui/table-row-content',
  defaultProps: '',
  defaultContent: <PvDefaultContent />,
  additionalImportsForDefaultContent: [
    { name: 'TableCellContent', path: '@/components/ui/table-cell-content' },
    { name: 'TextBlock', path: '@/components/ui/text-block' },
  ],
  props: {},
};
