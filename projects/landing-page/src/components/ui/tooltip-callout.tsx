import React from 'react';
import { cn } from '@/lib/utils';

export interface TooltipCalloutProps extends React.HTMLAttributes<HTMLDivElement> {
  text?: string;
  direction?: 'top' | 'bottom' | 'left' | 'right';
}

export function TooltipCallout({ text = 'Tooltip', direction = 'top', className, style, ...props }: TooltipCalloutProps) {
  return (
    <div
      data-direction={direction}
      style={style}
      className={cn("relative px-2.5 py-1.5 rounded shadow-md bg-background-strong text-foreground-inverse max-w-xs text-left text-base", className)}
      {...props}
      data-pv-component-id="TooltipCallout"
    >
      {text}

      <div
        data-direction={direction}
        className="absolute w-2 h-2 bg-background-strong rotate-45
        data-[direction=top]:-bottom-1 data-[direction=top]:left-1/2 data-[direction=top]:-translate-x-1/2
        data-[direction=bottom]:-top-1 data-[direction=bottom]:left-1/2 data-[direction=bottom]:-translate-x-1/2
        data-[direction=left]:-right-1 data-[direction=left]:top-1/2 data-[direction=left]:-translate-y-1/2
        data-[direction=right]:-left-1 data-[direction=right]:top-1/2 data-[direction=right]:-translate-y-1/2"
      />
    </div>
  );
}

export function PvDefaultContent() {
  return <></>;
}

export const pvConfig = {
  name: 'TooltipCallout',
  componentId: 'TooltipCallout',
  displayName: 'Tooltip Callout',
  description: 'The global tooltip design. Edit classes here to style all tooltips.',
  importPath: '@/components/ui/tooltip-callout',
  defaultProps: '',
  defaultContent: <PvDefaultContent />,
  props: {
    direction: { type: 'select', options: ['top', 'bottom', 'left', 'right'] },
  },
};
