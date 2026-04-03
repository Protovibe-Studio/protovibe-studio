import React from 'react';
import { cn } from '@/lib/utils';
import { TextBlock } from '@/components/ui/text-block';

export interface TableCellContentProps extends React.TdHTMLAttributes<HTMLTableCellElement> {}

export function TableCellContent({ className, children, ...props }: TableCellContentProps) {
  return (
    <td
      className={cn("px-4 py-3 text-sm text-foreground-default", className)}
      {...props}
      data-pv-component-id="TableCellContent"
    >
      {children}
    </td>
  );
}

export function PvDefaultContent() {
  return (
    <>
      {/* pv-editable-zone-start */}
        {/* pv-block-start */}
        <TextBlock data-pv-block="">Value</TextBlock>
        {/* pv-block-end */}
      {/* pv-editable-zone-end */}
    </>
  );
}

export const pvConfig = {
  name: 'TableCellContent',
  componentId: 'TableCellContent',
  displayName: 'Table Cell Content',
  description: 'A data cell (<td>) that renders children inside an editable zone.',
  importPath: '@/components/ui/table-cell-content',
  defaultProps: '',
  defaultContent: <PvDefaultContent />,
  additionalImportsForDefaultContent: [
    { name: 'TextBlock', path: '@/components/ui/text-block' },
  ],
  props: {},
};
