import React from 'react';
import { cn } from '@/lib/utils';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Container({ className, children, ...props }: ContainerProps) {
  return (
    <div
      className={cn("flex flex-col justify-start items-start min-h-2", className)}
      {...props}
      data-pv-component-id="Container"
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
  name: 'Container',
  componentId: 'Container',
  displayName: 'Container',
  description: 'A flex column container for laying out child elements.',
  importPath: '@/components/ui/container',
  defaultProps: '',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  props: {},
};
