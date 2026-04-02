import React from 'react';
import { cn } from '@/lib/utils';
import { TableRowHeading } from '@/components/ui/table-row-heading';
import { TableRowContent } from '@/components/ui/table-row-content';
import { TableCellHeading } from '@/components/ui/table-cell-heading';
import { TableCellContent } from '@/components/ui/table-cell-content';
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
        <thead data-pv-block="">
          <TableRowHeading>
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
        </thead>
        {/* pv-block-end */}
        {/* pv-block-start */}
        <tbody data-pv-block="">
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
        </tbody>
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
  additionalImportsForDefaultContent: [
    { name: 'TableRowHeading', path: '@/components/ui/table-row-heading' },
    { name: 'TableRowContent', path: '@/components/ui/table-row-content' },
    { name: 'TableCellHeading', path: '@/components/ui/table-cell-heading' },
    { name: 'TableCellContent', path: '@/components/ui/table-cell-content' },
    { name: 'TextBlock', path: '@/components/ui/text-block' },
  ],
  props: {},
};
