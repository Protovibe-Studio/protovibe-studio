import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as LucideIcons from 'lucide-react';
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
  /** Default height in pixels applied as min-height to the textarea */
  defaultHeight?: number;
  /** Number of visible text rows (overrides defaultHeight when set) */
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

const resizeClass: Record<TextareaResize, string> = {
  none: 'resize-none',
  horizontal: 'resize-x',
  vertical: 'resize-y',
  both: 'resize',
};

export function Textarea({
  // Visual / state
  error,
  disabled,
  className,
  prefixIcon,
  prefixText,
  suffixText,
  suffixIcon,
  defaultHeight,
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
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [autoHeight]);

  // Adjust on mount and when controlled value changes
  useEffect(() => {
    adjustHeight();
  }, [adjustHeight, value]);

  const hasAdornments = prefixIcon || prefixText || suffixText || suffixIcon;

  const minHeightStyle: React.CSSProperties =
    rows !== undefined
      ? {} // rows attr controls height
      : defaultHeight !== undefined
      ? { minHeight: defaultHeight }
      : autoHeight
      ? {} // starts at content size; no forced min
      : { minHeight: 80 };

  return (
    <div
      {...rest}
      data-focused={isFocused ? true : undefined}
      data-error={error ? true : undefined}
      data-disabled={disabled ? true : undefined}
      onClick={() => textareaRef.current?.focus()}
      className={cn(
        "w-full rounded-md border border-border-default bg-background-default text-sm cursor-text transition-colors",
        "data-[focused=true]:ring-2 data-[focused=true]:ring-border-focus data-[focused=true]:border-transparent",
        "data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed",
        "data-[error=true]:border-destructive data-[error=true]:data-[focused=true]:ring-destructive",
        hasAdornments ? "flex items-start gap-2 px-3 pt-2 pb-1" : "",
        className
      )}
      data-pv-component-id="Textarea"
    >
      {prefixIcon && (
        <Icon name={prefixIcon} size="sm" className="shrink-0 mt-1 text-foreground-tertiary pointer-events-none" />
      )}
      {prefixText && (
        <span className="shrink-0 mt-1.5 text-sm text-foreground-tertiary select-none whitespace-nowrap border-r border-border-default pr-2">{prefixText}</span>
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
        onFocus={(e) => { setIsFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setIsFocused(false); onBlur?.(e); }}
        onChange={(e) => { adjustHeight(); onChange?.(e); }}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        className={cn(
          "block w-full bg-transparent border-none outline-none text-sm text-foreground-default placeholder:text-foreground-tertiary disabled:cursor-not-allowed",
          hasAdornments ? "flex-1 min-w-0 pb-1" : "px-3 py-2",
          autoHeight ? 'resize-none overflow-hidden' : resizeClass[resize],
        )}
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

export const pvConfig = {
  name: 'Textarea',
  componentId: 'Textarea',
  displayName: 'Textarea',
  description: 'A multiline text input with auto-grow and adornment support',
  importPath: '@/components/ui/textarea',
  snippet: 'placeholder="Enter text..."',
  defaultContent: '',
  props: {
    placeholder: { type: 'string', exampleValue: 'Lorem ipsum' },
    disabled: { type: 'boolean' },
    error: { type: 'boolean' },
    prefixIcon: { type: 'select', options: Object.keys(LucideIcons) },
    prefixText: { type: 'string', exampleValue: 'Lorem ipsum' },
    suffixText: { type: 'string', exampleValue: 'Lorem ipsum' },
    suffixIcon: { type: 'select', options: Object.keys(LucideIcons) },
    defaultHeight: { type: 'string', exampleValue: 'Lorem ipsum' },
    rows: { type: 'string', exampleValue: 'Lorem ipsum' },
    resize: { type: 'select', options: ['none', 'horizontal', 'vertical', 'both'] },
    autoHeight: { type: 'boolean' },
  },
};
