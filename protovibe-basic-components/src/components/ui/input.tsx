import React, { useRef, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';

// Extends HTMLDivElement attrs so {...rest} lands on the wrapper div (root element).
// All native <input> props are declared explicitly and forwarded to the inner element.
// This ensures Protovibe's data-pv-loc-* attribute (injected by the JSX locator Babel
// plugin) ends up on the root div, not on the hidden inner <input>.
export interface InputProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'onFocus' | 'onBlur' | 'onKeyDown' | 'onKeyUp'> {
  // Visual / state
  error?: boolean;
  disabled?: boolean;
  prefixIcon?: string;
  prefixText?: string;
  suffixText?: string;
  suffixIcon?: string;
  // Native <input> passthrough
  placeholder?: string;
  type?: string;
  value?: string | number | readonly string[];
  defaultValue?: string | number | readonly string[];
  name?: string;
  required?: boolean;
  readOnly?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  min?: number | string;
  max?: number | string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  step?: number | string;
  multiple?: boolean;
  // Input-scoped event handlers
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  onKeyUp?: React.KeyboardEventHandler<HTMLInputElement>;
}

export function Input({
  // Visual / state
  error,
  disabled,
  className,
  prefixIcon,
  prefixText,
  suffixText,
  suffixIcon,
  // Native input props – forwarded to the inner <input> only
  placeholder,
  type,
  value,
  defaultValue,
  name,
  required,
  readOnly,
  autoComplete,
  autoFocus,
  min,
  max,
  minLength,
  maxLength,
  pattern,
  step,
  multiple,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  onKeyUp,
  // Everything else (including data-pv-loc-* injected by Protovibe) → outer div
  ...rest
}: InputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      {...rest}
      data-focused={isFocused ? true : undefined}
      data-error={error ? true : undefined}
      data-disabled={disabled ? true : undefined}
      onClick={() => inputRef.current?.focus()}
      className={cn(
        "flex items-center h-10 w-full rounded-md border border-border-default bg-background-default px-3 text-sm cursor-text transition-colors",
        "data-[focused=true]:ring-2 data-[focused=true]:ring-border-focus data-[focused=true]:border-transparent",
        "data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed",
        "data-[error=true]:border-destructive data-[error=true]:data-[focused=true]:ring-destructive",
        className
      )}
      data-pv-component-id="Input"
    >
      {prefixIcon && (
        <Icon name={prefixIcon} size="sm" className="shrink-0 mr-2 text-foreground-tertiary pointer-events-none" />
      )}
      {prefixText && (
        <span className="shrink-0 mr-2 text-sm text-foreground-tertiary select-none whitespace-nowrap border-r border-border-default pr-2">{prefixText}</span>
      )}
      <input
        ref={inputRef}
        disabled={disabled}
        placeholder={placeholder}
        type={type}
        value={value}
        defaultValue={defaultValue}
        name={name}
        required={required}
        readOnly={readOnly}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        min={min}
        max={max}
        minLength={minLength}
        maxLength={maxLength}
        pattern={pattern}
        step={step}
        multiple={multiple}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onFocus={(e) => { setIsFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setIsFocused(false); onBlur?.(e); }}
        className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-foreground-default placeholder:text-foreground-tertiary disabled:cursor-not-allowed"
      />
      {suffixText && (
        <span className="shrink-0 ml-2 text-sm select-none whitespace-nowrap border-l border-border-default pl-2 text-foreground-secondary">{suffixText}</span>
      )}
      {suffixIcon && (
        <Icon name={suffixIcon} size="sm" className="shrink-0 ml-2 text-foreground-tertiary pointer-events-none" />
      )}
    </div>
  );
}

export const pvConfig = {
  name: 'Input',
  componentId: 'Input',
  displayName: 'Input',
  description: 'A text input field with optional prefix/suffix adornments',
  importPath: '@/components/ui/input',
  defaultProps: 'placeholder="Enter text..."',
  defaultContent: '',
  props: {
    placeholder: { type: 'string', exampleValue: 'Enter text...' },
    disabled: { type: 'boolean' },
    error: { type: 'boolean' },
    type: { type: 'string', exampleValue: 'text' },
    prefixIcon: { type: 'select', options: Object.keys(LucideIcons) },
    prefixText: { type: 'string', exampleValue: 'https://' },
    suffixText: { type: 'string', exampleValue: 'EUR' },
    suffixIcon: { type: 'select', options: Object.keys(LucideIcons) },
  },
  invalidCombinations: [
    // input with no placeholder looks broken in previews
    (props: Record<string, any>) => !props.placeholder,
    // prefix slot can hold either an icon or text, not both
    (props: Record<string, any>) => !!props.prefixIcon && !!props.prefixText,
    // suffix slot can hold either an icon or text, not both
    (props: Record<string, any>) => !!props.suffixIcon && !!props.suffixText,
    // having both a prefix icon and suffix icon at the same time is too busy
    (props: Record<string, any>) => !!props.prefixIcon && !!props.suffixIcon,
    // having both prefix text and suffix text at the same time is too busy
    (props: Record<string, any>) => !!props.prefixText && !!props.suffixText,
  ],
};
