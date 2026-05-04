import React from 'react';
import { cn } from '@/lib/utils';
import { useTabs } from '@/components/ui/tabs';

export interface TabItemProps extends React.HTMLAttributes<HTMLButtonElement> {
  label?: string;
  value?: string;
  active?: boolean;
  disabled?: boolean;
}

export function TabItem({
  label,
  value,
  active,
  disabled,
  className,
  onClick,
  ...props
}: TabItemProps) {
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
      className={cn("relative text-foreground-secondary hover:text-foreground-default cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-background-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors h-12 data-[state=active]:text-foreground-default font-semibold text-base py-1 px-0", className)}
      onClick={handleClick}
      {...props}
      data-pv-component-id="TabItem"
    >
      {label}
      <div className="absolute left-0 right-0 bg-transparent data-[state=active]:bg-background-primary bottom-[-1px] h-[3px]" data-state={isActive ? 'active' : 'inactive'} />
    </button>
  );
}

export function PvDefaultContent() {
  return <></>;
}

export const pvConfig = {
  name: 'TabItem',
  componentId: 'TabItem',
  displayName: 'Tab Item',
  description: 'A single tab item. Active state is derived from the parent Tabs context automatically.',
  importPath: '@/components/ui/tab-item',
  defaultProps: 'label="Tab 1" value="tab1"',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  props: {
    label: { type: 'string', exampleValue: 'Lorem ipsum' },
    value: { type: 'string', exampleValue: 'Lorem ipsum' },
    active: { type: 'boolean' },
    disabled: { type: 'boolean' },
  },
  invalidCombinations: [
    (props: Record<string, unknown>) => !props.label,
  ],
};
