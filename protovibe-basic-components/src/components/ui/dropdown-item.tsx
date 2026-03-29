import React from 'react';
import * as LucideIcons from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export interface DropdownItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Identifier used by SelectDropdown for selection tracking */
  value?: string;
  label?: string;
  prefixIcon?: string;
  suffixIcon?: string;
  destructive?: boolean;
  disabled?: boolean;
  /** true = show check icon, false = show invisible placeholder, undefined = render nothing */
  selected?: boolean;
  /** Smaller muted text rendered below the main label row */
  secondaryText?: string;
}

export function DropdownItem({
  value,
  label,
  prefixIcon,
  suffixIcon,
  destructive,
  disabled,
  selected,
  secondaryText,
  className,
  ...props
}: DropdownItemProps) {
  return (
    <div
      role="menuitem"
      data-value={value}
      data-destructive={destructive}
      data-disabled={disabled}
      className={cn(
        'flex flex-col px-3 py-2 text-sm cursor-pointer select-none transition-colors',
        'text-foreground-default hover:bg-background-secondary',
        'data-[destructive=true]:text-destructive hover:data-[destructive=true]:bg-background-destructive-subtle',
        'data-[disabled=true]:opacity-50 data-[disabled=true]:pointer-events-none',
        className
      )}
      {...props}
      data-pv-component-id="DropdownItem"
    >
      <div className="flex items-center gap-2">
        {selected !== undefined && (
          <Icon
            name="Check"
            size="sm"
            className={selected ? 'text-foreground-default' : 'opacity-0 text-foreground-default'}
          />
        )}
        {prefixIcon && <Icon name={prefixIcon} size="sm" className="text-foreground-secondary" />}
        {label && <span className="flex-1 text-foreground-default">{label}</span>}
        {suffixIcon && <Icon name={suffixIcon} size="sm" className="text-foreground-tertiary" />}
      </div>
      {secondaryText && (
        <span className="text-xs text-foreground-tertiary pl-6">{secondaryText}</span>
      )}
    </div>
  );
}

export const pvConfig = {
  name: 'DropdownItem',
  componentId: 'DropdownItem',
  displayName: 'Dropdown Item',
  description: 'A single item in a dropdown list, with optional prefix/suffix icons.',
  importPath: '@/components/ui/dropdown-item',
  defaultProps: 'label="Menu Item"',
  defaultContent: '',
  props: {
    value: { type: 'string', exampleValue: 'opt1' },
    label: { type: 'string', exampleValue: 'Lorem ipsum' },
    prefixIcon: { type: 'select', options: Object.keys(LucideIcons) },
    suffixIcon: { type: 'select', options: Object.keys(LucideIcons) },
    secondaryText: { type: 'string', exampleValue: 'Lorem ipsum' },
    selected: { type: 'boolean' },
    destructive: { type: 'boolean' },
    disabled: { type: 'boolean' },
  },
};
