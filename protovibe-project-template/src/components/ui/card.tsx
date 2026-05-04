import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn("bg-background-elevated border border-border-default p-5 flex flex-col items-start justify-start gap-2 min-h-12 rounded shadow-sm", className)}
      {...props}
      data-pv-component-id="Card"
    >
      {children}
    </div>
  );
}

export function PvDefaultContent() {
  return (
    <>
      {/* pv-editable-zone-start */}
      {/* pv-editable-zone-end */}
    </>
  );
}

export const pvConfig = {
  name: 'Card',
  componentId: 'Card',
  displayName: 'Card',
  description: 'A container card with a bordered elevated background style.',
  importPath: '@/components/ui/card',
  defaultProps: '',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  props: {},
};
