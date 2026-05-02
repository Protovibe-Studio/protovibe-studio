import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useFloatingPosition } from '@/lib/useFloatingPosition';
import { DatePickerPopover } from '@/components/ui/date-picker-popover';

export interface DateInputProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Selected date as ISO string (YYYY-MM-DD) */
  value?: string;
  /** Earliest selectable date as ISO string (YYYY-MM-DD) */
  minDate?: string;
  /** Latest selectable date as ISO string (YYYY-MM-DD) */
  maxDate?: string;
  /** Placeholder shown when the field is empty */
  placeholder?: string;
  /** Preferred placement of the picker panel */
  placement?: 'bottom' | 'top';
  /** Horizontal alignment of the picker relative to the trigger */
  align?: 'left' | 'center' | 'right';
  /** Width preset for the picker panel */
  pickerWidth?: 'sm' | 'md' | 'lg';
  error?: boolean;
  disabled?: boolean;
  /** Show an 'X' button to clear the value */
  showClearButton?: boolean;
  /** Controls the visual open state for canvas editing */
  pickerOpen?: 'Auto (Default)' | 'Open temporarily for visual editing';
  /** z-index for the floating panel */
  zIndex?: number;
  /** Fires with the new ISO date string when a date is picked or typed */
  onValueChange?: (value: string) => void;
}

function isoToDisplay(iso: string | undefined): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return '';
  return `${m[2]}/${m[3]}/${m[1]}`;
}

function displayToIso(text: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function applyMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function DateInput({
  value,
  minDate,
  maxDate,
  placeholder = 'MM/DD/YYYY',
  placement = 'bottom',
  align = 'left',
  pickerWidth = 'md',
  error = false,
  disabled = false,
  showClearButton = true,
  pickerOpen = 'Auto (Default)',
  zIndex = 9999,
  onValueChange,
  className,
  ...rest
}: DateInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [text, setText] = useState<string>(isoToDisplay(value));

  const isForcedOpen = pickerOpen === 'Open temporarily for visual editing';

  useEffect(() => {
    setText(isoToDisplay(value));
  }, [value]);

  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || isForcedOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Element;
      if (anchorRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isOpen, isForcedOpen]);

  useEffect(() => {
    if (!isOpen || isForcedOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isForcedOpen]);

  const { style: floatingStyle } = useFloatingPosition({
    isOpen: isOpen && !isForcedOpen,
    anchorRef,
    dropdownRef: panelRef,
    preferredPlacement: placement,
    align,
    minVisibleHeight: 340,
  });

  const { maxHeight: _omitMaxHeight, minWidth: _omitMinWidth, ...panelStyle } = floatingStyle;

  const handlePick = (iso: string) => {
    setText(isoToDisplay(iso));
    onValueChange?.(iso);
    setIsOpen(false);
  };

  const handleClear = () => {
    setText('');
    onValueChange?.('');
  };

  const handleInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const masked = applyMask(e.target.value);
    setText(masked);
    const iso = displayToIso(masked);
    if (iso) onValueChange?.(iso);
  };

  const portalTarget =
    typeof document !== 'undefined'
      ? (document.getElementById('root') ?? document.body)
      : null;

  return (
    <>
      <div
        {...rest}
        ref={anchorRef}
        data-focused={isFocused}
        data-open={isOpen || isForcedOpen}
        data-error={error}
        data-disabled={disabled}
        onClick={() => { if (!disabled) inputRef.current?.focus(); }}
        className={cn("relative flex items-center border border-border-default px-3 cursor-text transition-colors data-[focused=true]:ring-2 data-[focused=true]:ring-border-focus data-[focused=true]:border-transparent data-[open=true]:ring-2 data-[open=true]:ring-border-focus data-[open=true]:border-transparent data-[error=true]:border-background-destructive data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed text-base h-9 rounded grow bg-background-sunken", className)}
        data-pv-component-id="DateInput"
      >
        <Icon iconSymbol="Calendar" size="sm" className="shrink-0 mr-2 text-foreground-tertiary pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={text}
          placeholder={placeholder}
          disabled={disabled}
          onChange={handleInputChange}
          onFocus={() => { setIsFocused(true); if (!disabled) setIsOpen(true); }}
          onBlur={() => setIsFocused(false)}
          className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-foreground-default placeholder:text-foreground-tertiary disabled:cursor-not-allowed"
        />
        {text && showClearButton && !disabled && (
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleClear();
            }}
            className="shrink-0 ml-2 flex items-center justify-center text-foreground-tertiary hover:text-foreground-default transition-colors p-0.5 rounded"
          >
            <Icon iconSymbol="close" size="sm" />
          </button>
        )}
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!disabled) setIsOpen((p) => !p);
          }}
          className="shrink-0 ml-1 inline-flex items-center justify-center text-foreground-tertiary hover:text-foreground-default transition-colors p-0.5 rounded"
        >
          <Icon iconSymbol="ChevronDown" size="sm" />
        </button>

        {isForcedOpen && (
          <div
            className="absolute top-[calc(100%+4px)] left-0 z-50 cursor-default"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <DatePickerPopover
              value={displayToIso(text) ?? undefined}
              minDate={minDate}
              maxDate={maxDate}
              width={pickerWidth}
              onValueChange={handlePick}
            />
          </div>
        )}
      </div>

      {!isForcedOpen && isOpen && portalTarget
        ? createPortal(
            <div ref={panelRef} style={{ ...panelStyle, zIndex }}>
              <DatePickerPopover
                value={displayToIso(text) ?? undefined}
                minDate={minDate}
                maxDate={maxDate}
                width={pickerWidth}
                onValueChange={handlePick}
              />
            </div>,
            portalTarget,
          )
        : null}
    </>
  );
}

export function PvDefaultContent() {
  return <></>;
}

export const pvConfig = {
  name: 'DateInput',
  componentId: 'DateInput',
  displayName: 'Date Input',
  description: 'A date input field with masked entry (MM/DD/YYYY) and a calendar picker popover. Supports min/max constraints.',
  importPath: '@/components/ui/date-input',
  defaultProps: 'placeholder="MM/DD/YYYY" pickerOpen="Auto (Default)"',
  defaultContent: <PvDefaultContent />,
  additionalImportsForDefaultContent: [
    { name: 'DatePickerPopover', path: '@/components/ui/date-picker-popover' },
  ],
  allowTextInChildren: false,
  props: {
    placeholder: { type: 'string', exampleValue: 'MM/DD/YYYY' },
    value: { type: 'string', exampleValue: '2026-05-15' },
    minDate: { type: 'string', exampleValue: '2026-01-01' },
    maxDate: { type: 'string', exampleValue: '2026-12-31' },
    placement: { type: 'select', options: ['bottom', 'top'] },
    align: { type: 'select', options: ['left', 'center', 'right'] },
    pickerWidth: { type: 'select', options: ['sm', 'md', 'lg'] },
    error: { type: 'boolean' },
    disabled: { type: 'boolean' },
    showClearButton: { type: 'boolean' },
    pickerOpen: { type: 'select', options: ['Auto (Default)', 'Open temporarily for visual editing'] },
  },
  invalidCombinations: [
    (props: Record<string, unknown>) => !props.placeholder,
    (props: Record<string, unknown>) => props.pickerOpen && props.pickerOpen !== 'Auto (Default)',
    (props: Record<string, unknown>) => props.placement && props.placement !== 'bottom',
  ],
};
