import React from 'react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export interface StepCircleProps extends React.HTMLAttributes<HTMLDivElement> {
  state?: 'current' | 'upcoming' | 'done';
  number?: number;
  label?: string;
}

export function StepCircle({
  state = 'upcoming',
  number = 1,
  label,
  className,
  ...props
}: StepCircleProps) {
  return (
    <div
      {...props}
      data-state={state}
      className={cn("inline-flex flex-col items-center flex-none gap-1", className)}
      data-pv-component-id="StepCircle"
    >
      <div
        data-state={state}
        className="flex items-center justify-center rounded-full text-sm font-semibold border data-[state=current]:bg-background-primary data-[state=current]:text-foreground-on-primary data-[state=current]:border-background-primary data-[state=done]:bg-background-primary data-[state=done]:text-foreground-on-primary data-[state=done]:border-background-primary data-[state=upcoming]:bg-background-default data-[state=upcoming]:text-foreground-secondary data-[state=upcoming]:border-border-default w-6 h-6"
      >
        <span data-state={state} className="data-[state=done]:hidden">
          {number}
        </span>
        <span data-state={state} className="hidden data-[state=done]:inline-flex">
          <Icon iconSymbol="Check" size="sm" />
        </span>
      </div>
      {label && (
        <span
          data-state={state}
          className="text-foreground-secondary data-[state=current]:text-foreground-default data-[state=current]:font-semibold leading-tight text-xs"
        >
          {label}
        </span>
      )}
    </div>
  );
}

export function PvDefaultContent() {
  return <></>;
}

export const pvConfig = {
  name: 'StepCircle',
  componentId: 'StepCircle',
  displayName: 'Step Circle',
  description: 'A numbered circle representing a single step in a stepper, with optional label.',
  importPath: '@/components/ui/step-circle',
  defaultProps: 'state="upcoming" number={1}',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  props: {
    state: { type: 'select', options: ['current', 'upcoming', 'done'] },
    number: { type: 'string', exampleValue: '1' },
    label: { type: 'string', exampleValue: 'Details' },
  },
};
