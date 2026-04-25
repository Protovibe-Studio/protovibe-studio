import React from 'react';
import { cn } from '@/lib/utils';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Container({ className, children, ...props }: ContainerProps) {
  const hasChildren = React.Children.count(children) > 0;

  return (
    <div
      className={cn("flex flex-col justify-start items-start min-h-2", className)}
      {...props}
      data-pv-component-id="Container"
    >
      {hasChildren ? (
        children
      ) : (
        <div className="flex w-full min-h-14 min-w-48 items-center justify-center rounded-md border border-dashed border-border-strong bg-background-secondary px-4 py-3 text-xs text-foreground-secondary">
          Empty container - add elements inside.
        </div>
      )}
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
