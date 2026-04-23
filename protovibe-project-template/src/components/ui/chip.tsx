import React from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  label: string;
  color?: 'default' | 'primary' | 'neutral' | 'neutral-outline' | 'success' | 'warning' | 'destructive' | 'info';
  removable?: boolean;
  onRemove?: (e: React.MouseEvent) => void;
}

export function Chip({
  label,
  color = 'default',
  removable = false,
  onRemove,
  className,
  ...props
}: ChipProps) {
  return (
    <span
      data-color={color}
      className={cn("inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors max-w-full data-[color=default]:text-foreground-secondary data-[color=primary]:bg-background-primary-subtle data-[color=primary]:text-foreground-primary data-[color=neutral]:bg-background-secondary data-[color=neutral]:text-foreground-secondary data-[color=neutral-outline]:bg-transparent data-[color=neutral-outline]:text-foreground-secondary data-[color=neutral-outline]:border data-[color=neutral-outline]:border-border-default data-[color=success]:bg-background-success-subtle data-[color=success]:text-foreground-success data-[color=warning]:bg-background-warning-subtle data-[color=warning]:text-foreground-warning data-[color=destructive]:bg-background-destructive-subtle data-[color=destructive]:text-foreground-destructive data-[color=info]:bg-background-info-subtle data-[color=info]:text-foreground-info data-[color=default]:bg-background-primary-subtle/65", className)}
      {...props}
      data-pv-component-id="Chip"
    >
      <span className="truncate">{label}</span>
      {removable && (
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onRemove?.(e);
          }}
          className="shrink-0 rounded-full hover:bg-black/10 dark:hover:bg-white/20 transition-colors p-0.5 -mr-1 flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-background-primary"
        >
          <Icon iconSymbol="close" size="xs" />
        </button>
      )}
    </span>
  );
}

export function PvDefaultContent() {
  return <></>;
}

export const pvConfig = {
  name: 'Chip',
  componentId: 'Chip',
  displayName: 'Chip Pill',
  description: 'A rounded tag/pill used for filtering or multi-selection.',
  importPath: '@/components/ui/chip',
  defaultProps: 'label="Tag"',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  props: {
    label: { type: 'string', exampleValue: 'Design' },
    color: { type: 'select', options: ['default', 'primary', 'neutral', 'neutral-outline', 'success', 'warning', 'destructive', 'info'] },
    removable: { type: 'boolean' },
  },
  invalidCombinations: [
    (props: Record<string, unknown>) => !props.label,
  ],
};
