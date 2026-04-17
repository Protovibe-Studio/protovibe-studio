import React from 'react';
import { cn } from '@/lib/utils';
import { RadioIcon } from '@/components/ui/radio-icon';
import { SuperLabel } from '@/components/ui/super-label';
import { useRadioGroup } from '@/components/ui/radio-group';

export interface RadioItemProps extends React.HTMLAttributes<HTMLLabelElement> {
  value?: string;
  selected?: boolean;
  disabled?: boolean;
  error?: boolean;
  errorLabel?: string;
  heading?: string;
  primaryText?: string;
  secondaryText?: string;
  prefixIcon?: string;
  suffixIcon?: string;
}

export function RadioItem({
  value,
  selected,
  disabled,
  error,
  errorLabel,
  heading,
  primaryText,
  secondaryText,
  prefixIcon,
  suffixIcon,
  className,
  onClick,
  ...props
}: RadioItemProps) {
  const ctx = useRadioGroup();

  // When inside a RadioGroup, derive selection from context; otherwise fall back to explicit prop
  const isSelected = ctx && value !== undefined ? ctx.activeValue === value : selected;
  // Priority: disabled > error > selected > unselected
  const iconState = disabled ? 'disabled' : error ? 'error' : isSelected ? 'selected' : 'unselected';

  const handleClick = (e: React.MouseEvent<HTMLLabelElement>) => {
    if (ctx && value !== undefined && !disabled) {
      ctx.onValueChange(value);
    }
    onClick?.(e);
  };

  return (
    <label
      data-state={isSelected ? 'selected' : 'unselected'}
      data-disabled={disabled}
      data-error={error}
      data-value={value}
      className={cn(
        'flex flex-col gap-1 cursor-pointer rounded-md',
        'data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50',
        'data-[error=true]:bg-background-destructive-subtle',
        className
      )}
      onClick={handleClick}
      {...props}
      data-pv-component-id="RadioItem"
    >
      <div className="flex items-center gap-3">
        <RadioIcon state={iconState} />
        <SuperLabel
          heading={heading}
          primaryText={primaryText}
          secondaryText={secondaryText}
          prefixIcon={prefixIcon}
          suffixIcon={suffixIcon}
        />
      </div>
      {error && errorLabel && (
        <span className="text-xs text-foreground-destructive pl-8">{errorLabel}</span>
      )}
    </label>
  );
}

export function PvDefaultContent() {
  return <></>;
}

export const pvConfig = {
  name: 'RadioItem',
  componentId: 'RadioItem',
  displayName: 'Radio Item',
  description: 'A radio button composed of a radio icon and a super label.',
  importPath: '@/components/ui/radio-item',
  defaultProps: 'primaryText="Option 1" value="opt1"',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  props: {
    value: { type: 'string', exampleValue: 'Lorem ipsum' },
    selected: { type: 'boolean' },
    disabled: { type: 'boolean' },
    error: { type: 'boolean' },
    errorLabel: { type: 'string', exampleValue: 'Lorem ipsum' },
    heading: { type: 'string', exampleValue: 'Lorem ipsum' },
    primaryText: { type: 'string', exampleValue: 'Lorem ipsum' },
    secondaryText: { type: 'string', exampleValue: 'Lorem ipsum' },
    prefixIcon: { type: 'iconSearch', exampleValue: 'cog' },
    suffixIcon: { type: 'iconSearch', exampleValue: 'arrow-right' },
  },
};
