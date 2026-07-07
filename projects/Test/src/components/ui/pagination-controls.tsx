import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownButton } from '@/components/ui/dropdown-button';
import { DropdownItem } from '@/components/ui/dropdown-item';
import { TextParagraph } from '@/components/ui/text-paragraph';
import { cn } from '@/lib/utils';

export interface PaginationControlsProps extends React.HTMLAttributes<HTMLDivElement> {
  showSummary?: boolean;
  showPerPage?: boolean;
  page?: 'first' | 'middle' | 'last';
  perPageLabel?: string;
  summaryText?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PaginationControls({
  showSummary = true,
  showPerPage = true,
  page = 'middle',
  perPageLabel = 'Per page: 30',
  summaryText = '1 - 30 of 4359 items',
  size = 'md',
  className,
  ...props
}: PaginationControlsProps) {
  const prevDisabled = page === 'first';
  const nextDisabled = page === 'last';

  return (
    <div
      {...props}
      data-page={page}
      data-size={size}
      className={cn('flex items-center justify-end gap-3', className)}
      data-pv-component-id="PaginationControls"
    >
      {showSummary && (
        <TextParagraph typography="secondary">{summaryText}</TextParagraph>
      )}
      {showPerPage && (
        <DropdownButton
          label={perPageLabel}
          variant="outline"
          color="neutral"
          size={size}
          rightIcon="ChevronDown"
        >
          <DropdownItem label="Per page: 10" />
          <DropdownItem label="Per page: 20" />
          <DropdownItem label="Per page: 30" />
          <DropdownItem label="Per page: 50" />
        </DropdownButton>
      )}
      <div className="inline-flex items-center">
        <Button
          variant="solid"
          color="neutral"
          size={size}
          iconOnly
          leftIcon="ChevronLeft"
          disabled={prevDisabled}
          className="rounded-r-none"
        />
        <Button
          variant="solid"
          color="neutral"
          size={size}
          iconOnly
          leftIcon="ChevronRight"
          disabled={nextDisabled}
          className="rounded-l-none -ml-px"
        />
      </div>
    </div>
  );
}

export function PvDefaultContent() {
  return <></>;
}

export const pvConfig = {
  name: 'PaginationControls',
  componentId: 'PaginationControls',
  displayName: 'Pagination Controls',
  description: 'Pagination row with per-page selector, result summary, and prev/next controls.',
  importPath: '@/components/ui/pagination-controls',
  defaultProps:
    'showSummary={true} showPerPage={true} page="middle" perPageLabel="Per page: 30" summaryText="1 - 30 of 4359 itemsus" size="md"',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  props: {
    showSummary: { type: 'boolean' },
    showPerPage: { type: 'boolean' },
    page: { type: 'select', options: ['first', 'middle', 'last'] },
    perPageLabel: { type: 'string', exampleValue: 'Per page: 30' },
    summaryText: { type: 'string', exampleValue: '1 - 30 of 4359 items' },
    size: { type: 'select', options: ['sm', 'md', 'lg'] },
  },
  invalidCombinations: [
    (props: Record<string, any>) => !props.showSummary && !props.showPerPage,
    (props: Record<string, any>) => props.showSummary && !props.summaryText,
    (props: Record<string, any>) => props.size === 'lg',
  ],
};
