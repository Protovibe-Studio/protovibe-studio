import React from 'react';
import { cn } from '@/lib/utils';

export interface RectangleProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Rectangle({ className, children, ...props }: RectangleProps) {
  return (
    <div
      className={cn("bg-background-default border border-border-default rounded-lg relative min-w-[4px] min-h-[4px]", className)}
      {...props}
      data-pv-component-id="Rectangle"
      data-layout-mode="absolute"
      data-pv-resizable="both"
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
  name: 'Rectangle',
  componentId: 'Rectangle',
  displayName: 'Sketchpad rectangle',
  description: 'A freely resizable container with absolute positioning for children.',
  importPath: '@/components/ui/sketchpad-rectangle',
  defaultProps: 'className="w-[200px] h-[200px]"',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  props: {},
};
