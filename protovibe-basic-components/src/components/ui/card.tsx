import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'bordered' | 'filled' | 'ghost';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  border?: 'none' | 'default' | 'primary';
}

export function Card({
  variant = 'bordered',
  shadow = 'none',
  border = 'default',
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      data-variant={variant}
      data-shadow={shadow}
      data-border={border}
      className={cn("transition-shadow p-5 rounded-md data-[variant=bordered]:bg-background-elevated data-[variant=filled]:bg-background-secondary data-[variant=ghost]:bg-transparent data-[shadow=none]:shadow-none data-[shadow=sm]:shadow-sm data-[shadow=md]:shadow-md data-[shadow=lg]:shadow-lg data-[border=none]:border-0 data-[border=default]:border data-[border=default]:border-border-default data-[border=primary]:border data-[border=primary]:border-primary flex flex-col items-start justify-start gap-2", className)}
      {...props}
      data-pv-component-id="Card"
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
  name: 'Card',
  componentId: 'Card',
  displayName: 'Card',
  description: 'A container card with border, fill, or ghost style and optional shadow.',
  importPath: '@/components/ui/card',
  defaultProps: 'variant="bordered" shadow="none" border="default"',
  defaultContent: <PvDefaultContent />,
  props: {
    variant: { type: 'select', options: ['bordered', 'filled', 'ghost'] },
    shadow: { type: 'select', options: ['none', 'sm', 'md', 'lg'] },
    border: { type: 'select', options: ['none', 'default', 'primary'] },
  },
  invalidCombinations: [
    // ghost has no visual container — shadow and border make no visual sense
    (props: Record<string, any>) => props.variant === 'ghost' && props.shadow !== 'none',
    (props: Record<string, any>) => props.variant === 'ghost' && props.border !== 'none',
  ],
};
