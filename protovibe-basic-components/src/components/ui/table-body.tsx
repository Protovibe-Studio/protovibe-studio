import React from 'react';
import { TableRowContent } from '@/components/ui/table-row-content';
import { TableCellContent } from '@/components/ui/table-cell-content';
import { TextParagraph } from '@/components/ui/text-paragraph';

export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export function TableBody({ children, ...props }: TableBodyProps) {
  return (
    <tbody
      {...props}
      data-pv-component-id="TableBody"
    >
      {children}
    </tbody>
  );
}

export function PvPreviewWrapper({ children }: { children: React.ReactNode }) {
  return <table className="w-full">{children}</table>;
}

export function PvDefaultContent() {
  return (
    <>
      {/* pv-editable-zone-start */}
        {/* pv-block-start */}
        <TableRowContent data-pv-block="">
          {/* pv-editable-zone-start */}
            {/* pv-block-start */}
            <TableCellContent data-pv-block="">
              {/* pv-editable-zone-start */}
                {/* pv-block-start */}
                <TextParagraph data-pv-block="">Value</TextParagraph>
                {/* pv-block-end */}
              {/* pv-editable-zone-end */}
            </TableCellContent>
            {/* pv-block-end */}
            {/* pv-block-start */}
            <TableCellContent data-pv-block="">
              {/* pv-editable-zone-start */}
                {/* pv-block-start */}
                <TextParagraph data-pv-block="">Active</TextParagraph>
                {/* pv-block-end */}
              {/* pv-editable-zone-end */}
            </TableCellContent>
            {/* pv-block-end */}
            {/* pv-block-start */}
            <TableCellContent data-pv-block="">
              {/* pv-editable-zone-start */}
                {/* pv-block-start */}
                <TextParagraph data-pv-block="">Jan 1, 2024</TextParagraph>
                {/* pv-block-end */}
              {/* pv-editable-zone-end */}
            </TableCellContent>
            {/* pv-block-end */}
          {/* pv-editable-zone-end */}
        </TableRowContent>
        {/* pv-block-end */}
        {/* pv-block-start */}
        <TableRowContent data-pv-block="">
          {/* pv-editable-zone-start */}
            {/* pv-block-start */}
            <TableCellContent data-pv-block="">
              {/* pv-editable-zone-start */}
                {/* pv-block-start */}
                <TextParagraph data-pv-block="">Value 2</TextParagraph>
                {/* pv-block-end */}
              {/* pv-editable-zone-end */}
            </TableCellContent>
            {/* pv-block-end */}
            {/* pv-block-start */}
            <TableCellContent data-pv-block="">
              {/* pv-editable-zone-start */}
                {/* pv-block-start */}
                <TextParagraph data-pv-block="">Inactive</TextParagraph>
                {/* pv-block-end */}
              {/* pv-editable-zone-end */}
            </TableCellContent>
            {/* pv-block-end */}
            {/* pv-block-start */}
            <TableCellContent data-pv-block="">
              {/* pv-editable-zone-start */}
                {/* pv-block-start */}
                <TextParagraph data-pv-block="">Jan 2, 2024</TextParagraph>
                {/* pv-block-end */}
              {/* pv-editable-zone-end */}
            </TableCellContent>
            {/* pv-block-end */}
          {/* pv-editable-zone-end */}
        </TableRowContent>
        {/* pv-block-end */}
        {/* pv-block-start */}
        <TableRowContent data-pv-block="">
          {/* pv-editable-zone-start */}
            {/* pv-block-start */}
            <TableCellContent data-pv-block="">
              {/* pv-editable-zone-start */}
                {/* pv-block-start */}
                <TextParagraph data-pv-block="">Value 3</TextParagraph>
                {/* pv-block-end */}
              {/* pv-editable-zone-end */}
            </TableCellContent>
            {/* pv-block-end */}
            {/* pv-block-start */}
            <TableCellContent data-pv-block="">
              {/* pv-editable-zone-start */}
                {/* pv-block-start */}
                <TextParagraph data-pv-block="">Active</TextParagraph>
                {/* pv-block-end */}
              {/* pv-editable-zone-end */}
            </TableCellContent>
            {/* pv-block-end */}
            {/* pv-block-start */}
            <TableCellContent data-pv-block="">
              {/* pv-editable-zone-start */}
                {/* pv-block-start */}
                <TextParagraph data-pv-block="">Jan 3, 2024</TextParagraph>
                {/* pv-block-end */}
              {/* pv-editable-zone-end */}
            </TableCellContent>
            {/* pv-block-end */}
          {/* pv-editable-zone-end */}
        </TableRowContent>
        {/* pv-block-end */}
      {/* pv-editable-zone-end */}
    </>
  );
}

export const pvConfig = {
  name: 'TableBody',
  componentId: 'TableBody',
  displayName: 'Table Body',
  description: 'A table body (<tbody>) that holds content rows.',
  importPath: '@/components/ui/table-body',
  defaultProps: '',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  additionalImportsForDefaultContent: [
    { name: 'TableRowContent', path: '@/components/ui/table-row-content' },
    { name: 'TableCellContent', path: '@/components/ui/table-cell-content' },
    { name: 'TextParagraph', path: '@/components/ui/text-paragraph' },
  ],
  props: {},
};
