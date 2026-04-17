import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';

export type TextareaResize = 'none' | 'horizontal' | 'vertical' | 'both';

// Extends HTMLDivElement attrs so {...rest} lands on the wrapper div (root element).
// All native <textarea> props are declared explicitly and forwarded to the inner element.
export interface TextareaProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'onFocus' | 'onBlur' | 'onKeyDown' | 'onKeyUp'> {
  // Visual / state
  error?: boolean;
  disabled?: boolean;
  prefixIcon?: string;
  prefixText?: string;
  suffixText?: string;
  suffixIcon?: string;
  /** Number of visible text rows; also acts as minimum height when autoHeight is enabled */
  rows?: number;
  /** Controls resize handle. Ignored when autoHeight is true. Default: 'vertical' */
  resize?: TextareaResize;
  /** Automatically grows/shrinks the textarea to fit content. Default: true */
  autoHeight?: boolean;
  // Native <textarea> passthrough
  placeholder?: string;
  value?: string | number | readonly string[];
  defaultValue?: string | number | readonly string[];
  name?: string;
  required?: boolean;
  readOnly?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  minLength?: number;
  maxLength?: number;
  wrap?: string;
  // Textarea-scoped event handlers
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
  onFocus?: React.FocusEventHandler<HTMLTextAreaElement>;
  onBlur?: React.FocusEventHandler<HTMLTextAreaElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
  onKeyUp?: React.KeyboardEventHandler<HTMLTextAreaElement>;
}

export function Textarea({
  // Visual / state
  error,
  disabled,
  className,
  prefixIcon,
  prefixText,
  suffixText,
  suffixIcon,
  rows,
  resize = 'vertical',
  autoHeight = true,
  // Native textarea props – forwarded to the inner <textarea> only
  placeholder,
  value,
  defaultValue,
  name,
  required,
  readOnly,
  autoComplete,
  autoFocus,
  minLength,
  maxLength,
  wrap,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  onKeyUp,
  // Everything else (including data-pv-loc-* injected by Protovibe) → outer div
  ...rest
}: TextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el || !autoHeight) return;
    // Skip when the element has no layout (e.g. inside a display:none container such as
    // an inactive Protovibe tab). The ResizeObserver below will re-trigger once visible.
    if (el.offsetWidth === 0) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [autoHeight]);

  // Adjust on mount and when controlled value changes
  useEffect(() => {
    adjustHeight();
  }, [adjustHeight, value]);

  // Re-adjust when the element gains layout dimensions (e.g. hidden tab becomes visible)
  useEffect(() => {
    if (!autoHeight) return;
    const el = textareaRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => adjustHeight());
    observer.observe(el);
    return () => observer.disconnect();
  }, [adjustHeight, autoHeight]);

  const minHeightStyle: React.CSSProperties =
    rows !== undefined || autoHeight ? {} : { minHeight: 80 };

  return (
    <div
      {...rest}
      data-focused={isFocused ? true : undefined}
      data-error={error ? true : undefined}
      data-disabled={disabled ? true : undefined}
      onClick={() => textareaRef.current?.focus()}
      className={cn("w-full border border-border-default bg-background-default text-sm cursor-text transition-colors data-[focused=true]:ring-2 data-[focused=true]:ring-border-focus data-[focused=true]:border-transparent data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed data-[error=true]:border-destructive data-[error=true]:data-[focused=true]:ring-destructive flex items-start gap-2 px-3 py-2 rounded", className)}
      data-pv-component-id="Textarea"
    >
      {prefixIcon && (
        <Icon name={prefixIcon} size="sm" className="shrink-0 mt-1 text-foreground-tertiary pointer-events-none" />
      )}
      {prefixText && (
        <span className="shrink-0 text-sm text-foreground-tertiary select-none whitespace-nowrap border-r border-border-default pr-2 mt-1">{prefixText}</span>
      )}
      <textarea
        ref={textareaRef}
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        name={name}
        required={required}
        readOnly={readOnly}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        minLength={minLength}
        maxLength={maxLength}
        wrap={wrap}
        rows={rows}
        style={minHeightStyle}
        data-auto-height={autoHeight ? true : undefined}
        data-resize={autoHeight ? 'none' : resize}
        onFocus={(e) => { setIsFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setIsFocused(false); onBlur?.(e); }}
        onChange={(e) => { adjustHeight(); onChange?.(e); }}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        className={cn("block w-full flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-foreground-default placeholder:text-foreground-tertiary disabled:cursor-not-allowed data-[auto-height=true]:resize-none data-[auto-height=true]:overflow-hidden data-[resize=none]:resize-none data-[resize=horizontal]:resize-x data-[resize=vertical]:resize-y data-[resize=both]:resize pt-1 pb-0 px-0")}
      />
      {suffixText && (
        <span className="shrink-0 mt-1.5 text-sm text-foreground-tertiary select-none whitespace-nowrap border-l border-border-default pl-2">{suffixText}</span>
      )}
      {suffixIcon && (
        <Icon name={suffixIcon} size="sm" className="shrink-0 mt-1 text-foreground-tertiary pointer-events-none" />
      )}
    </div>
  );
}

export function PvDefaultContent() {
  return <></>;
}

export const pvConfig = {
  name: 'Textarea',
  componentId: 'Textarea',
  displayName: 'Textarea',
  description: 'A multiline text input with auto-grow and adornment support',
  importPath: '@/components/ui/textarea',
  defaultProps: 'placeholder="Enter text..."',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  props: {
    placeholder: { type: 'string', exampleValue: 'Enter text...' },
    disabled: { type: 'boolean' },
    error: { type: 'boolean' },
    prefixIcon: { type: 'iconSearch', exampleValue: 'cog' },
    prefixText: { type: 'string', exampleValue: 'Note' },
    suffixText: { type: 'string', exampleValue: 'EUR' },
    suffixIcon: { type: 'iconSearch', exampleValue: 'arrow-right' },
    rows: { type: 'string', exampleValue: '4' },
    resize: { type: 'select', options: ['none', 'horizontal', 'vertical', 'both'] },
    autoHeight: { type: 'boolean' },
  },
  invalidCombinations: [
    // a textarea with no placeholder looks broken in previews
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
