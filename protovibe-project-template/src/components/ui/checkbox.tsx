import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/icon';
import { SuperLabel } from '@/components/ui/super-label';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<React.LabelHTMLAttributes<HTMLLabelElement>, 'onChange'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  error?: boolean;
  errorLabel?: string;
  heading?: string;
  primaryText?: string;
  secondaryText?: string;
  prefixIcon?: string;
  suffixIcon?: string;
}

export function Checkbox({
  checked,
  onCheckedChange,
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
}: CheckboxProps) {
  const [internalChecked, setInternalChecked] = useState<boolean>(checked ?? false);

  useEffect(() => {
    if (checked !== undefined) {
      setInternalChecked(checked);
    }
  }, [checked]);

  const isChecked = internalChecked;

  const handleClick = (e: React.MouseEvent<HTMLLabelElement>) => {
    if (disabled) return;
    const next = !internalChecked;
    setInternalChecked(next);
    onCheckedChange?.(next);
    onClick?.(e);
  };

  return (
    <label
      data-state={isChecked ? 'checked' : 'unchecked'}
      data-disabled={disabled}
      data-error={error}
      className={cn(
        'inline-flex flex-col gap-1 cursor-pointer rounded-md',
        'data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50',
        'data-[error=true]:bg-background-destructive-subtle',
        className
      )}
      onClick={handleClick}
      {...props}
      data-pv-component-id="Checkbox"
    >
      <div className="flex items-center gap-2">
        <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
          <input
            type="checkbox"
            checked={isChecked}
            disabled={disabled}
            className="peer sr-only"
            readOnly
            tabIndex={-1}
          />
          <div
            data-state={isChecked ? 'checked' : 'unchecked'}
            data-error={error}
            className="w-5 h-5 border border-border-default rounded peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[error=true]:border-destructive flex items-center justify-center bg-background-secondary transition-colors"
          >
            {isChecked && <Icon name="Check" size="sm"  className="text-foreground-on-primary" />}
          </div>
        </div>
        <SuperLabel
          heading={heading}
          primaryText={primaryText}
          secondaryText={secondaryText}
          prefixIcon={prefixIcon}
          suffixIcon={suffixIcon}
        />
      </div>
      {error && errorLabel && (
        <span className="text-xs text-foreground-destructive pl-7">{errorLabel}</span>
      )}
    </label>
  );
}

export function PvDefaultContent() {
  return <></>;
}

export const pvConfig = {
  name: 'Checkbox',
  componentId: 'Checkbox',
  displayName: 'Checkbox',
  description: 'A checkbox with optional heading, primary/secondary text, icons, and error state.',
  importPath: '@/components/ui/checkbox',
  defaultProps: 'primaryText="Accept terms"',
  defaultContent: <PvDefaultContent />,
  props: {
    checked: { type: 'boolean' },
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
