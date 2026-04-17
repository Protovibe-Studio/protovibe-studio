import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { SuperLabel } from '@/components/ui/super-label';

export interface ToggleSwitchProps extends Omit<React.LabelHTMLAttributes<HTMLLabelElement>, 'onChange'> {
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

export function ToggleSwitch({
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
}: ToggleSwitchProps) {
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
      data-pv-component-id="ToggleSwitch"
    >
      <div className="flex items-center gap-3">
        <div className="relative flex items-center w-11 h-6 shrink-0">
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
            className="w-11 h-6 border border-border-default rounded-full peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 data-[state=checked]:bg-primary data-[error=true]:border-border-destructive transition-colors bg-background-tertiary"
          >
            <div
              data-state={isChecked ? 'checked' : 'unchecked'}
              className="absolute top-[2px] left-[2px] w-5 h-5 bg-foreground-on-primary rounded-full transition-transform data-[state=checked]:translate-x-5 shadow-sm"
            />
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
        <span className="text-xs text-foreground-destructive pl-14">{errorLabel}</span>
      )}
    </label>
  );
}

export function PvDefaultContent() {
  return <></>;
}

export const pvConfig = {
  name: 'ToggleSwitch',
  componentId: 'ToggleSwitch',
  displayName: 'Toggle Switch',
  description: 'A toggle switch with optional heading, primary/secondary text, icons, and error state.',
  importPath: '@/components/ui/toggle-switch',
  defaultProps: 'primaryText="Enable feature"',
  defaultContent: <PvDefaultContent />,
  props: {
    checked: { type: 'boolean' },
    disabled: { type: 'boolean' },
    error: { type: 'boolean' },
    errorLabel: { type: 'string', exampleValue: 'Lorem ipsum' },
    heading: { type: 'string', exampleValue: 'Lorem ipsum' },
    primaryText: { type: 'string', exampleValue: 'Lorem ipsum' },
    secondaryText: { type: 'string', exampleValue: 'Lorem ipsum' },
    prefixIcon: { type: 'iconSearch' },
    suffixIcon: { type: 'iconSearch' },
  },
};
