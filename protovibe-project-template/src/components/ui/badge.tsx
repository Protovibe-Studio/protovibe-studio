import React from 'react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  label: string;
  color?: 'primary' | 'destructive' | 'success' | 'warning' | 'info' | 'neutral';
  prefixIcon?: string;
  suffixIcon?: string;
}

export function Badge({
  label,
  color = 'neutral',
  prefixIcon,
  suffixIcon,
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      data-color={color}
      className={cn("inline-flex items-center gap-1 uppercase tracking-wider data-[color=primary]:bg-background-primary-subtle data-[color=primary]:text-foreground-primary data-[color=destructive]:bg-background-destructive-subtle data-[color=destructive]:text-foreground-destructive data-[color=success]:bg-background-success-subtle data-[color=success]:text-foreground-success data-[color=warning]:bg-background-warning-subtle data-[color=warning]:text-foreground-warning data-[color=info]:bg-background-info-subtle data-[color=info]:text-foreground-info data-[color=neutral]:bg-background-secondary data-[color=neutral]:text-foreground-secondary font-semibold text-tiny py-0.5 px-1.5 rounded-sm", className)}
      {...props}
      data-pv-component-id="Badge"
    >
      {prefixIcon && <Icon iconSymbol={prefixIcon} size="xs" />}
      <span>{label}</span>
      {suffixIcon && <Icon iconSymbol={suffixIcon} size="xs" />}
    </span>
  );
}

export function PvDefaultContent() {
  return <></>;
}

export const pvConfig = {
  name: 'Badge',
  componentId: 'Badge',
  displayName: 'Badge',
  description: 'A small badge with color variants and optional icons.',
  importPath: '@/components/ui/badge',
  defaultProps: 'label="Badge" color="primary"',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  props: {
    label: { type: 'string', exampleValue: 'Lorem ipsum' },
    color: { type: 'select', options: ['primary', 'destructive', 'success', 'warning', 'info', 'neutral'] },
    prefixIcon: { type: 'iconSearch', exampleValue: 'cog' },
    suffixIcon: { type: 'iconSearch', exampleValue: 'arrow-right' },
  },
};
