import React from 'react';
import { TableRowContent } from '@/components/ui/table-row-content';
import { TableCellContent } from '@/components/ui/table-cell-content';
import { TextBlock } from '@/components/ui/text-block';

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
                <TextBlock data-pv-block="" label="Value" />
                {/* pv-block-end */}
              {/* pv-editable-zone-end */}
            </TableCellContent>
            {/* pv-block-end */}
            {/* pv-block-start */}
            <TableCellContent data-pv-block="">
              {/* pv-editable-zone-start */}
                {/* pv-block-start */}
                <TextBlock data-pv-block="" label="Active" />
                {/* pv-block-end */}
              {/* pv-editable-zone-end */}
            </TableCellContent>
            {/* pv-block-end */}
            {/* pv-block-start */}
            <TableCellContent data-pv-block="">
              {/* pv-editable-zone-start */}
                {/* pv-block-start */}
                <TextBlock data-pv-block="" label="Jan 1, 2024" />
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
                <TextBlock data-pv-block="" label="Value 2" />
                {/* pv-block-end */}
              {/* pv-editable-zone-end */}
            </TableCellContent>
            {/* pv-block-end */}
            {/* pv-block-start */}
            <TableCellContent data-pv-block="">
              {/* pv-editable-zone-start */}
                {/* pv-block-start */}
                <TextBlock data-pv-block="" label="Inactive" />
                {/* pv-block-end */}
              {/* pv-editable-zone-end */}
            </TableCellContent>
            {/* pv-block-end */}
            {/* pv-block-start */}
            <TableCellContent data-pv-block="">
              {/* pv-editable-zone-start */}
                {/* pv-block-start */}
                <TextBlock data-pv-block="" label="Jan 2, 2024" />
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
                <TextBlock data-pv-block="" label="Value 3" />
                {/* pv-block-end */}
              {/* pv-editable-zone-end */}
            </TableCellContent>
            {/* pv-block-end */}
            {/* pv-block-start */}
            <TableCellContent data-pv-block="">
              {/* pv-editable-zone-start */}
                {/* pv-block-start */}
                <TextBlock data-pv-block="" label="Active" />
                {/* pv-block-end */}
              {/* pv-editable-zone-end */}
            </TableCellContent>
            {/* pv-block-end */}
            {/* pv-block-start */}
            <TableCellContent data-pv-block="">
              {/* pv-editable-zone-start */}
                {/* pv-block-start */}
                <TextBlock data-pv-block="" label="Jan 3, 2024" />
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
  additionalImportsForDefaultContent: [
    { name: 'TableRowContent', path: '@/components/ui/table-row-content' },
    { name: 'TableCellContent', path: '@/components/ui/table-cell-content' },
    { name: 'TextBlock', path: '@/components/ui/text-block' },
  ],
  props: {},
};
