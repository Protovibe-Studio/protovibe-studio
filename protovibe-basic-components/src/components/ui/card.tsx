import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'bordered' | 'filled' | 'ghost';
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export function Card({
  variant = 'bordered',
  shadow = 'none',
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      data-variant={variant}
      data-shadow={shadow}
      className={cn(
        "rounded-xl transition-shadow",
        "data-[variant=bordered]:bg-background-elevated data-[variant=bordered]:border data-[variant=bordered]:border-border-default data-[variant=bordered]:p-6",
        "data-[variant=filled]:bg-background-secondary data-[variant=filled]:p-6",
        "data-[variant=ghost]:bg-transparent data-[variant=ghost]:border-0 data-[variant=ghost]:p-0",
        "data-[shadow=none]:shadow-none data-[shadow=sm]:shadow-sm data-[shadow=md]:shadow-md data-[shadow=lg]:shadow-lg data-[shadow=xl]:shadow-xl",
        className
      )}
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
  defaultProps: 'variant="bordered" shadow="none"',
  defaultContent: <PvDefaultContent />,
  props: {
    variant: { type: 'select', options: ['bordered', 'filled', 'ghost'] },
    shadow: { type: 'select', options: ['none', 'sm', 'md', 'lg', 'xl'] },
  },
  invalidCombinations: [
    // ghost has no visual container — shadow makes no visual sense
    (props: Record<string, any>) => props.variant === 'ghost' && props.shadow !== 'none',
  ],
};
