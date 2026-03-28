import React from 'react';
import { icons } from 'lucide-react';
import { Icon } from '@/components/ui/icon';

export interface SelectDropdownButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Placeholder text shown when no value is selected */
  placeholder?: string;
  /** Currently selected value label to display */
  value?: string;
  /** Controls open/closed visual state (chevron rotation + focus ring) */
  open?: boolean;
  /** Lucide icon name shown before the value */
  prefixIcon?: string;
  /** Shows a destructive/error border */
  error?: boolean;
}

export function SelectDropdownButton({
  placeholder = 'Select an option',
  value,
  open = false,
  prefixIcon,
  disabled,
  error = false,
  ...props
}: SelectDropdownButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      data-open={open}
      data-error={error}
      className="flex h-10 w-full items-center gap-2 rounded-md border border-border-default bg-background-default px-3 py-2 text-sm text-left text-foreground-default focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent data-[open=true]:ring-2 data-[open=true]:ring-primary data-[open=true]:border-transparent data-[error=true]:border-destructive disabled:cursor-not-allowed disabled:opacity-50"
      {...props}
      data-pv-component-id="SelectDropdownButton"
    >
      {prefixIcon && (
        <Icon name={prefixIcon} size="sm" className="shrink-0 text-foreground-tertiary" />
      )}
      <span
        data-empty={!value}
        className="flex-1 truncate text-foreground-default data-[empty=true]:text-foreground-tertiary"
      >
        {value || placeholder}
      </span>
      <span
        data-open={open}
        className="shrink-0 opacity-50 text-foreground-default transition-transform duration-150 data-[open=true]:rotate-180"
      >
        <Icon name="ChevronDown" size="sm" />
      </span>
    </button>
  );
}

export const pvConfig = {
  name: 'SelectDropdownButton',
  componentId: 'SelectDropdownButton',
  displayName: 'Select Dropdown Button',
  description: 'A select trigger button with open, error, disabled and icon states.',
  importPath: '@/components/ui/select',
  defaultProps: 'placeholder="Select an option"',
  defaultContent: '',
  props: {
    placeholder: { type: 'string', exampleValue: 'Lorem ipsum' },
    value: { type: 'string', exampleValue: 'Lorem ipsum' },
    open: { type: 'boolean' },
    prefixIcon: { type: 'select', options: Object.keys(icons) },
    disabled: { type: 'boolean' },
    error: { type: 'boolean' },
  },
};
