import React from 'react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { useMultiSelect } from '@/components/ui/multi-select-dropdown';
import { Badge } from '@/components/ui/badge';

export interface MultiSelectDropdownItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  label?: string;
  disabled?: boolean;
  selected?: boolean;
  /** Custom badge count/text to show on the right */
  badgeLabel?: string;
  /** Custom icon for the badge on the right */
  badgeIcon?: string;
  children?: React.ReactNode;
}

export function MultiSelectDropdownItem({
  value,
  label,
  disabled,
  selected,
  badgeLabel,
  badgeIcon,
  children,
  className,
  onClick,
  ...props
}: MultiSelectDropdownItemProps) {
  const ctx = useMultiSelect();

  const itemValue = value ?? label ?? '';
  const isSelected = ctx ? ctx.activeValues.includes(itemValue) : !!selected;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (ctx) ctx.toggleValue(itemValue);
    onClick?.(e);
  };

  return (
    <div
      role="menuitemcheckbox"
      aria-checked={isSelected}
      data-disabled={disabled}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer select-none transition-colors',
        'text-foreground-default hover:bg-background-transparent-hover active:bg-background-transparent-pressed',
        'data-[disabled=true]:opacity-50 data-[disabled=true]:pointer-events-none',
        className
      )}
      onClick={handleClick}
      {...props}
      data-pv-component-id="MultiSelectDropdownItem"
    >
      <Checkbox
        checked={isSelected}
        disabled={disabled}
        className="pointer-events-none shrink-0"
      />

      <div className="flex flex-1 items-center gap-2">
        <span className="font-medium">{label}</span>
        {children}
      </div>

      {(badgeLabel || badgeIcon) && (
        <Badge
          label={badgeLabel || ''}
          prefixIcon={badgeIcon}
          color="neutral"
          className="shrink-0"
        />
      )}
    </div>
  );
}

export function PvDefaultContent() {
  return <></>;
}

export const pvConfig = {
  name: 'MultiSelectDropdownItem',
  componentId: 'MultiSelectDropdownItem',
  displayName: 'Multi-Select Item',
  description: 'An item with a checkbox specifically for the MultiSelectDropdown.',
  importPath: '@/components/ui/multi-select-dropdown-item',
  defaultProps: 'label="Option"',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  props: {
    value: { type: 'string', exampleValue: 'opt1' },
    label: { type: 'string', exampleValue: 'Option' },
    disabled: { type: 'boolean' },
    selected: { type: 'boolean' },
    badgeLabel: { type: 'string', exampleValue: '21' },
    badgeIcon: { type: 'iconSearch', exampleValue: 'user' },
  },
  invalidCombinations: [
    (props: Record<string, unknown>) => !props.label,
  ],
};
