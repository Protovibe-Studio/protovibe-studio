import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Current value (controlled). Stored as a number; accepts strings from the editor. */
  value?: number | string;
  /** Minimum allowed value */
  min?: number | string;
  /** Maximum allowed value */
  max?: number | string;
  /** Step increment for keyboard / drag snapping */
  step?: number | string;
  /** Display style for the numeric value to the right of the track */
  valueField?: 'none' | 'display' | 'editable';
  /** Suffix appended to the value (e.g. "%", "px") */
  valueSuffix?: string;
  /** Visual size variant */
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  error?: boolean;
  /** Fires with the new numeric value whenever the slider moves */
  onValueChange?: (value: number) => void;
}

function toNumber(v: number | string | undefined, fallback: number): number {
  if (v === undefined || v === '') return fallback;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function snap(n: number, step: number, min: number): number {
  if (step <= 0) return n;
  return min + Math.round((n - min) / step) * step;
}

function decimals(step: number): number {
  const s = step.toString();
  const i = s.indexOf('.');
  return i === -1 ? 0 : s.length - i - 1;
}

export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  valueField = 'display',
  valueSuffix,
  size = 'md',
  disabled = false,
  error = false,
  onValueChange,
  className,
  ...rest
}: SliderProps) {
  const minN = toNumber(min, 0);
  const maxN = toNumber(max, 100);
  const stepN = toNumber(step, 1);

  const [internalValue, setInternalValue] = useState<number>(
    clamp(toNumber(value, minN), minN, maxN),
  );
  const [draftText, setDraftText] = useState<string>(
    clamp(toNumber(value, minN), minN, maxN).toFixed(decimals(stepN)),
  );

  useEffect(() => {
    if (value !== undefined) {
      const next = clamp(toNumber(value, minN), minN, maxN);
      setInternalValue(next);
      setDraftText(next.toFixed(decimals(stepN)));
    }
  }, [value, minN, maxN, stepN]);

  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const commit = (next: number) => {
    const clamped = clamp(snap(next, stepN, minN), minN, maxN);
    setInternalValue(clamped);
    setDraftText(clamped.toFixed(decimals(stepN)));
    onValueChange?.(clamped);
  };

  const positionFromEvent = (clientX: number): number => {
    const track = trackRef.current;
    if (!track) return internalValue;
    const rect = track.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return minN + ratio * (maxN - minN);
  };

  const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (disabled) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    draggingRef.current = true;
    commit(positionFromEvent(e.clientX));
  };

  const handlePointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!draggingRef.current || disabled) return;
    commit(positionFromEvent(e.clientX));
  };

  const handlePointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
    draggingRef.current = false;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (disabled) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); commit(internalValue + stepN); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); commit(internalValue - stepN); }
    else if (e.key === 'Home') { e.preventDefault(); commit(minN); }
    else if (e.key === 'End') { e.preventDefault(); commit(maxN); }
  };

  const handleFieldChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setDraftText(e.target.value);
    const parsed = Number(e.target.value);
    if (Number.isFinite(parsed)) {
      const clamped = clamp(parsed, minN, maxN);
      setInternalValue(clamped);
      onValueChange?.(clamped);
    }
  };

  const handleFieldBlur: React.FocusEventHandler<HTMLInputElement> = () => {
    commit(toNumber(draftText, internalValue));
  };

  const percent = maxN > minN ? ((internalValue - minN) / (maxN - minN)) * 100 : 0;
  const displayText = internalValue.toFixed(decimals(stepN));

  return (
    <div
      {...rest}
      data-size={size}
      data-disabled={disabled}
      data-error={error}
      className={cn("flex items-center gap-3 w-full data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed", className)}
      data-pv-component-id="Slider"
    >
      <div
        ref={trackRef}
        role="slider"
        aria-valuemin={minN}
        aria-valuemax={maxN}
        aria-valuenow={internalValue}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        data-size={size}
        data-error={error}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
        className="relative flex-1 cursor-pointer touch-none select-none focus:outline-none group data-[size=sm]:h-4 data-[size=md]:h-5 data-[size=lg]:h-6"
      >
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 rounded-full bg-background-tertiary group-data-[size=sm]:h-1 group-data-[size=md]:h-1.5 group-data-[size=lg]:h-2 group-data-[error=true]:bg-background-destructive-subtle" />
        <div
          style={{ width: `${percent}%` }}
          className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-background-primary group-data-[size=sm]:h-1 group-data-[size=md]:h-1.5 group-data-[size=lg]:h-2 group-data-[error=true]:bg-background-destructive"
        />
        <div
          style={{ left: `${percent}%` }}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background-elevated border-2 border-background-primary shadow-sm transition-transform group-focus:ring-2 group-focus:ring-border-focus group-data-[size=sm]:w-3 group-data-[size=sm]:h-3 group-data-[size=md]:w-4 group-data-[size=md]:h-4 group-data-[size=lg]:w-5 group-data-[size=lg]:h-5 group-data-[error=true]:border-background-destructive"
        />
      </div>

      {valueField === 'display' && (
        <div
          data-size={size}
          className="shrink-0 inline-flex items-baseline gap-0.5 tabular-nums text-foreground-default data-[size=sm]:text-xs data-[size=md]:text-sm data-[size=lg]:text-base"
        >
          <span>{displayText}</span>
          {valueSuffix && <span className="text-foreground-tertiary">{valueSuffix}</span>}
        </div>
      )}

      {valueField === 'editable' && (
        <div
          data-disabled={disabled}
          data-error={error}
          className="shrink-0 inline-flex items-center border border-border-default px-2 rounded bg-background-sunken h-9 transition-colors focus-within:border-border-primary data-[error=true]:border-background-destructive data-[disabled=true]:opacity-50"
        >
          <input
            type="text"
            inputMode="decimal"
            value={draftText}
            disabled={disabled}
            onChange={handleFieldChange}
            onBlur={handleFieldBlur}
            className="w-12 min-w-0 bg-transparent border-none outline-none text-sm text-foreground-default text-right tabular-nums disabled:cursor-not-allowed"
          />
          {valueSuffix && (
            <span className="ml-1 text-sm text-foreground-tertiary select-none whitespace-nowrap">{valueSuffix}</span>
          )}
        </div>
      )}
    </div>
  );
}

export function PvDefaultContent() {
  return <></>;
}

export const pvConfig = {
  name: 'Slider',
  componentId: 'Slider',
  displayName: 'Slider',
  description: 'A draggable range slider with optional value display or editable numeric field.',
  importPath: '@/components/ui/slider',
  defaultProps: 'value="40" min="0" max="100" step="1" valueField="display"',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  props: {
    value: { type: 'string', exampleValue: '40' },
    min: { type: 'string', exampleValue: '0' },
    max: { type: 'string', exampleValue: '100' },
    step: { type: 'string', exampleValue: '1' },
    valueField: { type: 'select', options: ['none', 'display', 'editable'] },
    valueSuffix: { type: 'string', exampleValue: '%' },
    size: { type: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { type: 'boolean' },
    error: { type: 'boolean' },
  },
};
