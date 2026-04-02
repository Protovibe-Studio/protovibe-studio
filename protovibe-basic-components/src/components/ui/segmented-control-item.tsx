import React from 'react';
import { cn } from '@/lib/utils';
import { useSegmentedControl } from '@/components/ui/segmented-control';

export interface SegmentedControlItemProps extends React.HTMLAttributes<HTMLButtonElement> {
  label?: string;
  value?: string;
  active?: boolean;
  disabled?: boolean;
}

export function SegmentedControlItem({
  label,
  value,
  active,
  disabled,
  className,
  onClick,
  ...props
}: SegmentedControlItemProps) {
  const ctx = useSegmentedControl();

  // Derive active state from context when inside a SegmentedControl, otherwise fall back to explicit prop
  const isActive = ctx && value !== undefined ? ctx.activeValue === value : active;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (ctx && value !== undefined && !disabled) {
      ctx.onValueChange(value);
    }
    onClick?.(e);
  };

  return (
    <button
      data-state={isActive ? 'active' : 'inactive'}
      data-disabled={disabled}
      disabled={disabled}
      className={cn(
        'px-4 py-1.5 text-sm font-medium rounded-md',
        'text-foreground-secondary hover:text-foreground-strong cursor-pointer',
        'data-[state=active]:bg-background-default data-[state=active]:text-foreground-strong data-[state=active]:shadow-sm',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'transition-all',
        className
      )}
      onClick={handleClick}
      {...props}
      data-pv-component-id="SegmentedControlItem"
    >
      {label}
    </button>
  );
}

export const pvConfig = {
  name: 'SegmentedControlItem',
  componentId: 'SegmentedControlItem',
  displayName: 'Segmented Control Item',
  description: 'An item inside a SegmentedControl. Active state is derived from the parent context automatically.',
  importPath: '@/components/ui/segmented-control-item',
  defaultProps: 'label="Option 1" value="opt1"',
  defaultContent: '',
  props: {
    label: { type: 'string', exampleValue: 'Lorem ipsum' },
    value: { type: 'string', exampleValue: 'Lorem ipsum' },
    disabled: { type: 'boolean' },
  },
};
