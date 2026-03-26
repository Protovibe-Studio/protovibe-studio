import React from 'react';
import { cn } from '@/lib/utils';
import { useTabs } from '@/components/ui/tabs';

export interface TabTriggerProps extends React.HTMLAttributes<HTMLButtonElement> {
  label?: string;
  value?: string;
  active?: boolean;
  disabled?: boolean;
}

export function TabTrigger({
  label,
  value,
  active,
  disabled,
  className,
  onClick,
  ...props
}: TabTriggerProps) {
  const ctx = useTabs();

  // Derive active state from context when inside a Tabs container, otherwise fall back to explicit prop
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
        'px-4 py-2 text-sm font-medium border-b-2 border-transparent',
        'text-foreground-secondary hover:text-foreground-default hover:border-border-strong',
        'data-[state=active]:border-primary data-[state=active]:text-primary',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'transition-colors',
        className
      )}
      onClick={handleClick}
      {...props}
      data-pv-component-id="TabTrigger"
    >
      {label}
    </button>
  );
}

export const pvConfig = {
  name: 'TabTrigger',
  componentId: 'TabTrigger',
  displayName: 'Tab Trigger',
  description: 'A single tab trigger. Active state is derived from the parent Tabs context automatically.',
  importPath: '@/components/ui/tab-trigger',
  snippet: 'label="Tab 1" value="tab1"',
  defaultContent: '',
  props: {
    label: { type: 'string', exampleValue: 'Lorem ipsum' },
    value: { type: 'string', exampleValue: 'Lorem ipsum' },
    disabled: { type: 'boolean' },
  },
};
