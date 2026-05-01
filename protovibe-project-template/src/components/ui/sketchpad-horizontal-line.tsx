import React from 'react';
import { cn } from '@/lib/utils';

export interface HorizontalLineProps extends React.HTMLAttributes<HTMLDivElement> {}

export function HorizontalLine({ className, children, ...props }: HorizontalLineProps) {
  return (
    <div
      className={cn("border-t border-border-default relative min-w-[4px] min-h-[4px]", className)}
      {...props}
      data-pv-component-id="HorizontalLine"
      data-layout-mode="absolute"
      data-pv-resizable="horizontal"
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
  name: 'HorizontalLine',
  componentId: 'HorizontalLine',
  displayName: 'Horizontal line',
  description: 'A thin, resizable horizontal divider line.',
  importPath: '@/components/ui/sketchpad-horizontal-line',
  defaultProps: 'className="w-[200px] h-[4px]"',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  props: {},
};
