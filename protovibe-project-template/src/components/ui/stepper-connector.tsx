import React from 'react';
import { cn } from '@/lib/utils';

export interface StepperConnectorProps extends React.HTMLAttributes<HTMLDivElement> {
  state?: 'upcoming' | 'done';
}

export function StepperConnector({
  state = 'upcoming',
  className,
  ...props
}: StepperConnectorProps) {
  return (
    <div
      {...props}
      data-state={state}
      className={cn('w-16 h-8 flex items-center flex-none group-data-[full-width=true]/stepper:flex-1 group-data-[full-width=true]/stepper:w-auto group-data-[full-width=true]/stepper:min-w-8', className)}
      data-pv-component-id="StepperConnector"
    >
      <div
        data-state={state}
        className="w-full h-px data-[state=done]:bg-background-primary data-[state=upcoming]:bg-border-default"
      />
    </div>
  );
}

export function PvDefaultContent() {
  return <></>;
}

export const pvConfig = {
  name: 'StepperConnector',
  componentId: 'StepperConnector',
  displayName: 'Stepper Connector',
  description: 'A horizontal line connecting two step circles in a stepper.',
  importPath: '@/components/ui/stepper-connector',
  defaultProps: 'state="upcoming"',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  props: {
    state: { type: 'select', options: ['upcoming', 'done'] },
  },
};
