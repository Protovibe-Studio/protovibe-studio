import React from 'react';
import { cn } from '@/lib/utils';

export interface VerticalLineProps extends React.HTMLAttributes<HTMLDivElement> {}

export function VerticalLine({ className, children, ...props }: VerticalLineProps) {
  return (
    <div
      className={cn("border-l border-border-default relative min-w-[4px] min-h-[4px]", className)}
      {...props}
      data-pv-component-id="VerticalLine"
      data-layout-mode="absolute"
      data-pv-resizable="vertical"
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
  name: 'VerticalLine',
  componentId: 'VerticalLine',
  displayName: 'Vertical line',
  description: 'A thin, resizable vertical divider line.',
  importPath: '@/components/ui/sketchpad-vertical-line',
  defaultProps: 'className="w-[4px] h-[200px]"',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  props: {},
};
