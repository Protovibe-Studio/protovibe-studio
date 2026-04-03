import React from 'react';
import { cn } from '@/lib/utils';
import { TableRowHeading } from '@/components/ui/table-row-heading';
import { TableBody } from '@/components/ui/table-body';
import { TableCellHeading } from '@/components/ui/table-cell-heading';
import { TableCellContent } from '@/components/ui/table-cell-content';
import { TableRowContent } from '@/components/ui/table-row-content';
import { TextBlock } from '@/components/ui/text-block';

export interface TableProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Table({ className, children, ...props }: TableProps) {
  return (
    <div
      className={cn("w-full overflow-x-auto rounded-md border border-border-default", className)}
      {...props}
      data-pv-component-id="Table"
    >
      <table className="w-full border-collapse">
        {children}
      </table>
    </div>
  );
}

export function PvDefaultContent() {
  return (
    <>
      {/* pv-editable-zone-start */}
        {/* pv-block-start */}
        <TableRowHeading data-pv-block="">
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
        </TableRowHeading>
        {/* pv-block-end */}
        {/* pv-block-start */}
        <TableBody data-pv-block="">
          {/* pv-editable-zone-start */}
            {/* pv-block-start */}
            <TableRowContent data-pv-block="">
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
            </TableRowContent>
            {/* pv-block-end */}
            {/* pv-block-start */}
            <TableRowContent data-pv-block="">
              {/* pv-editable-zone-start */}
                {/* pv-block-start */}
                <TableCellContent data-pv-block="">
                  {/* pv-editable-zone-start */}
                    {/* pv-block-start */}
                    <TextBlock data-pv-block="">Value 2</TextBlock>
                    {/* pv-block-end */}
                  {/* pv-editable-zone-end */}
                </TableCellContent>
                {/* pv-block-end */}
                {/* pv-block-start */}
                <TableCellContent data-pv-block="">
                  {/* pv-editable-zone-start */}
                    {/* pv-block-start */}
                    <TextBlock data-pv-block="">Inactive</TextBlock>
                    {/* pv-block-end */}
                  {/* pv-editable-zone-end */}
                </TableCellContent>
                {/* pv-block-end */}
                {/* pv-block-start */}
                <TableCellContent data-pv-block="">
                  {/* pv-editable-zone-start */}
                    {/* pv-block-start */}
                    <TextBlock data-pv-block="">Jan 2, 2024</TextBlock>
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
                    <TextBlock data-pv-block="">Value 3</TextBlock>
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
                    <TextBlock data-pv-block="">Jan 3, 2024</TextBlock>
                    {/* pv-block-end */}
                  {/* pv-editable-zone-end */}
                </TableCellContent>
                {/* pv-block-end */}
              {/* pv-editable-zone-end */}
            </TableRowContent>
            {/* pv-block-end */}
          {/* pv-editable-zone-end */}
        </TableBody>
        {/* pv-block-end */}
      {/* pv-editable-zone-end */}
    </>
  );
}

export const pvConfig = {
  name: 'Table',
  componentId: 'Table',
  displayName: 'Table',
  description: 'A data table with a header row and alternating content rows.',
  importPath: '@/components/ui/table',
  defaultProps: '',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  additionalImportsForDefaultContent: [
    { name: 'TableRowHeading', path: '@/components/ui/table-row-heading' },
    { name: 'TableBody', path: '@/components/ui/table-body' },
    { name: 'TableRowContent', path: '@/components/ui/table-row-content' },
    { name: 'TableCellHeading', path: '@/components/ui/table-cell-heading' },
    { name: 'TableCellContent', path: '@/components/ui/table-cell-content' },
    { name: 'TextBlock', path: '@/components/ui/text-block' },
  ],
  props: {},
};
