import React from 'react';
import { cn } from '@/lib/utils';
import { TextParagraph } from '@/components/ui/text-paragraph';

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
        <TextParagraph data-pv-block="">Value</TextParagraph>
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
    { name: 'TextParagraph', path: '@/components/ui/text-paragraph' },
  ],
  props: {},
};
