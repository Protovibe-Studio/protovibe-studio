import React from 'react';
import { cn } from '@/lib/utils';

export interface PreloaderSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  label?: string;
  labelPlacement?: 'bottom' | 'right';
}

export function PreloaderSpinner({
  size = 'md',
  label,
  labelPlacement = 'bottom',
  className,
  ...props
}: PreloaderSpinnerProps) {
  return (
    <div
      data-size={size}
      data-label-placement={labelPlacement}
      className={cn(
        "inline-flex items-center justify-center data-[label-placement=bottom]:flex-col data-[label-placement=right]:flex-row gap-2",
        className
      )}
      {...props}
      data-pv-component-id="PreloaderSpinner"
    >
      <svg
        className="animate-spin text-foreground-primary data-[size=xs]:w-3 data-[size=xs]:h-3 data-[size=sm]:w-4 data-[size=sm]:h-4 data-[size=md]:w-5 data-[size=md]:h-5 data-[size=lg]:w-7 data-[size=lg]:h-7 data-[size=xl]:w-9 data-[size=xl]:h-9 data-[size=2xl]:w-12 data-[size=2xl]:h-12"
        data-size={size}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="47 16"
          strokeLinecap="round"
        />
      </svg>

      {label && (
        <span
          className="text-foreground-secondary data-[size=xs]:text-xs data-[size=sm]:text-xs data-[size=md]:text-sm data-[size=lg]:text-sm data-[size=xl]:text-base data-[size=2xl]:text-lg"
          data-size={size}
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
  name: 'PreloaderSpinner',
  componentId: 'PreloaderSpinner',
  displayName: 'Preloader Spinner',
  description: 'An animated loading spinner with optional label.',
  importPath: '@/components/ui/preloader-spinner',
  defaultProps: 'size="md"',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  props: {
    size: { type: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    label: { type: 'string', exampleValue: 'Lorem ipsum' },
    labelPlacement: { type: 'select', options: ['bottom', 'right'] },
  },
};
