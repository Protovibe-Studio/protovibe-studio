import React from 'react';
import { StepCircle } from '@/components/ui/step-circle';
import { StepperConnector } from '@/components/ui/stepper-connector';
import { cn } from '@/lib/utils';

export interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  fullWidth?: boolean;
  children?: React.ReactNode;
}

export function Stepper({ fullWidth = false, children, className, ...props }: StepperProps) {
  return (
    <div
      {...props}
      data-full-width={fullWidth}
      className={cn('group/stepper max-w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden', className)}
      data-pv-component-id="Stepper"
    >
      <div
        data-full-width={fullWidth}
        className="flex items-start data-[full-width=true]:w-full data-[full-width=false]:w-max"
      >
        {children}
      </div>
    </div>
  );
}

export function PvDefaultContent() {
  return (
    <>
      {/* pv-editable-zone-start */}
        {/* pv-block-start */}
        <StepCircle data-pv-block="" state="done" number={1} label="Details" />
        {/* pv-block-end */}
        {/* pv-block-start */}
        <StepperConnector data-pv-block="" state="done" />
        {/* pv-block-end */}
        {/* pv-block-start */}
        <StepCircle data-pv-block="" state="current" number={2} label="Review" />
        {/* pv-block-end */}
        {/* pv-block-start */}
        <StepperConnector data-pv-block="" state="upcoming" />
        {/* pv-block-end */}
        {/* pv-block-start */}
        <StepCircle data-pv-block="" state="upcoming" number={3} label="Confirm" />
        {/* pv-block-end */}
      {/* pv-editable-zone-end */}
    </>
  );
}

export const pvConfig = {
  name: 'Stepper',
  componentId: 'Stepper',
  displayName: 'Stepper',
  description: 'A horizontal stepper composed of StepCircle and StepperConnector children.',
  importPath: '@/components/ui/stepper',
  defaultProps: 'fullWidth={false}',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  additionalImportsForDefaultContent: [
    { name: 'StepCircle', path: '@/components/ui/step-circle' },
    { name: 'StepperConnector', path: '@/components/ui/stepper-connector' },
  ],
  props: {
    fullWidth: { type: 'boolean' },
  },
};
