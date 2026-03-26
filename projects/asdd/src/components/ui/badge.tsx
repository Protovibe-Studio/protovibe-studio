import React from 'react';
import * as LucideIcons from 'lucide-react';
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
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider data-[color=primary]:bg-background-primary-subtle data-[color=primary]:text-foreground-primary data-[color=destructive]:bg-background-destructive-subtle data-[color=destructive]:text-foreground-destructive data-[color=success]:bg-background-success-subtle data-[color=success]:text-foreground-success data-[color=warning]:bg-background-warning-subtle data-[color=warning]:text-foreground-warning data-[color=info]:bg-background-info-subtle data-[color=info]:text-foreground-info data-[color=neutral]:bg-background-secondary data-[color=neutral]:text-foreground-secondary",
        className
      )}
      {...props}
      data-pv-component-id="Badge"
    >
      {prefixIcon && <Icon name={prefixIcon} size="xs" />}
      <span>{label}</span>
      {suffixIcon && <Icon name={suffixIcon} size="xs" />}
    </span>
  );
}

export const pvConfig = {
  name: 'Badge',
  componentId: 'Badge',
  displayName: 'Badge',
  description: 'A small badge with color variants and optional icons.',
  importPath: '@/components/ui/badge',
  snippet: 'label="Badge" color="primary"',
  defaultContent: '',
  props: {
    label: { type: 'string', exampleValue: 'Lorem ipsum' },
    color: { type: 'select', options: ['primary', 'destructive', 'success', 'warning', 'info', 'neutral'] },
    prefixIcon: { type: 'select', options: Object.keys(LucideIcons) },
    suffixIcon: { type: 'select', options: Object.keys(LucideIcons) },
  },
};
