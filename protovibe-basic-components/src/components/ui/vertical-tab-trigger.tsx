import React from 'react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { useVerticalTabs } from '@/components/ui/vertical-tabs';

export type ExpandableState = 'not-expandable' | 'expandable' | 'expanded' | 'collapsed';

// Extends HTMLDivElement attrs so {...rest} lands on the wrapper div (root element).
// data-pv-loc-* injected by Protovibe's Babel plugin ends up on the outer div, not the inner button.
export interface VerticalTabTriggerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'> {
  label?: string;
  value?: string;
  active?: boolean;
  disabled?: boolean;
  prefixIcon?: string;
  suffixIcon?: string;
  /** Controls whether the chevron is shown. Default: 'not-expandable' (no chevron). */
  expandable?: ExpandableState;
  /** Overrides chevron direction when provided. Otherwise derived from expandable prop. */
  isExpanded?: boolean;
  /** Rendered inline inside the button, after the suffix icon. */
  children?: React.ReactNode;
  /** Passed to the inner trigger button, not the wrapper div */
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

export function VerticalTabTrigger({
  label,
  value,
  active,
  disabled,
  className,
  prefixIcon,
  suffixIcon,
  expandable = 'not-expandable',
  isExpanded,
  children,
  onClick,
  ...rest
}: VerticalTabTriggerProps) {
  const ctx = useVerticalTabs();

  // Derive active state from context when inside a VerticalTabs container, otherwise fall back to prop
  const isActive = ctx && value !== undefined ? ctx.activeValue === value : active;

  const canExpand = expandable !== 'not-expandable';
  // isExpanded prop takes precedence; otherwise fall back to the expandable initial value
  const showExpandedChevron = isExpanded !== undefined ? isExpanded : expandable === 'expanded';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (ctx && value !== undefined && !disabled) {
      ctx.onValueChange(value);
    }
    onClick?.(e);
  };

  return (
    <div
      {...rest}
      className="w-full"
      data-pv-component-id="VerticalTabTrigger"
    >
      <button
        data-state={isActive ? 'active' : 'inactive'}
        data-disabled={disabled}
        data-expandable={expandable}
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md',
          'text-foreground-secondary hover:text-foreground-default hover:bg-background-secondary',
          'data-[state=active]:bg-background-primary-subtle data-[state=active]:text-foreground-primary',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-colors',
          className
        )}
      >
        {prefixIcon && (
          <Icon name={prefixIcon} size="sm" className="shrink-0" />
        )}
        <span className="truncate">{label}</span>
        {canExpand && (
          <Icon
            name={showExpandedChevron ? 'ChevronUp' : 'ChevronDown'}
            size="sm"
            className="shrink-0 text-foreground-tertiary"
          />
        )}
        <span className="flex-1" />
        {suffixIcon && (
          <Icon name={suffixIcon} size="sm" className="shrink-0 text-foreground-tertiary" />
        )}
        {children}
      </button>
    </div>
  );
}

export const pvConfig = {
  name: 'VerticalTabTrigger',
  componentId: 'VerticalTabTrigger',
  displayName: 'Vertical Tab Trigger',
  description: 'A vertical tab item with optional icons, active state, and an expandable content zone.',
  importPath: '@/components/ui/vertical-tab-trigger',
  defaultProps: 'label="Tab 1" value="tab1"',
  defaultContent: '{/* pv-editable-zone-start */}\n{/* pv-editable-zone-end */}',
  props: {
    label: { type: 'string', exampleValue: 'Lorem ipsum' },
    value: { type: 'string', exampleValue: 'Lorem ipsum' },
    active: { type: 'boolean' },
    disabled: { type: 'boolean' },
    prefixIcon: { type: 'select', options: Object.keys(LucideIcons) },
    suffixIcon: { type: 'select', options: Object.keys(LucideIcons) },
    expandable: { type: 'select', options: ['not-expandable', 'expandable', 'expanded', 'collapsed'] },
  },
};
