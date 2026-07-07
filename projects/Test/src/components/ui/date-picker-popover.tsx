import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export interface DatePickerPopoverProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Currently selected date as ISO string (YYYY-MM-DD) */
  value?: string;
  /** Earliest selectable date as ISO string (YYYY-MM-DD). Days before this are disabled. */
  minDate?: string;
  /** Latest selectable date as ISO string (YYYY-MM-DD). Days after this are disabled. */
  maxDate?: string;
  /** Width preset for the calendar shell */
  width?: 'sm' | 'md' | 'lg';
  /** Fires with the new ISO date string when a day is picked */
  onValueChange?: (value: string) => void;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseISO(value: string | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatISO(d: Date): string {
  const y = d.getFullYear().toString().padStart(4, '0');
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

type ViewMode = 'days' | 'months' | 'years';

export function DatePickerPopover({
  value,
  minDate,
  maxDate,
  width = 'md',
  onValueChange,
  className,
  ...rest
}: DatePickerPopoverProps) {
  const selected = useMemo(() => parseISO(value), [value]);
  const min = useMemo(() => parseISO(minDate), [minDate]);
  const max = useMemo(() => parseISO(maxDate), [maxDate]);
  const today = useMemo(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  }, []);

  const initialAnchor = selected ?? today;
  const [viewYear, setViewYear] = useState(initialAnchor.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialAnchor.getMonth());
  const [mode, setMode] = useState<ViewMode>('days');

  useEffect(() => {
    if (selected) {
      setViewYear(selected.getFullYear());
      setViewMonth(selected.getMonth());
    }
  }, [selected]);

  const isDisabled = (d: Date): boolean => {
    if (min && d < min) return true;
    if (max && d > max) return true;
    return false;
  };

  // Build 6-week grid starting Monday
  const days: { date: Date; outside: boolean }[] = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const dow = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
    const gridStart = new Date(viewYear, viewMonth, 1 - dow);
    const result: { date: Date; outside: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
      result.push({ date: d, outside: d.getMonth() !== viewMonth });
    }
    return result;
  }, [viewYear, viewMonth]);

  const goPrevMonth = () => {
    const m = viewMonth - 1;
    if (m < 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(m);
  };
  const goNextMonth = () => {
    const m = viewMonth + 1;
    if (m > 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(m);
  };

  const handleDayClick = (d: Date) => {
    if (isDisabled(d)) return;
    onValueChange?.(formatISO(d));
  };

  const yearRangeStart = Math.floor(viewYear / 12) * 12;
  const years = Array.from({ length: 12 }, (_, i) => yearRangeStart + i);

  return (
    <div
      {...rest}
      data-width={width}
      className={cn("flex flex-col gap-3 shadow-lg ring-1 ring-border-default p-3 rounded bg-background-elevated data-[width=sm]:w-64 data-[width=md]:w-72 data-[width=lg]:w-80", className)}
      data-pv-component-id="DatePickerPopover"
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            if (mode === 'days') goPrevMonth();
            else if (mode === 'years') setViewYear(yearRangeStart - 12 + 11);
          }}
          className="inline-flex items-center justify-center w-7 h-7 rounded text-foreground-secondary hover:bg-background-tertiary hover:text-foreground-default transition-colors"
        >
          <Icon iconSymbol="ChevronLeft" size="sm" />
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode(mode === 'months' ? 'days' : 'months')}
            data-active={mode === 'months'}
            className="px-2 py-1 text-sm font-medium text-foreground-default rounded hover:bg-background-tertiary transition-colors data-[active=true]:bg-background-tertiary"
          >
            {MONTH_NAMES[viewMonth]}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === 'years' ? 'days' : 'years')}
            data-active={mode === 'years'}
            className="px-2 py-1 text-sm font-medium text-foreground-default rounded hover:bg-background-tertiary transition-colors data-[active=true]:bg-background-tertiary"
          >
            {viewYear}
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            if (mode === 'days') goNextMonth();
            else if (mode === 'years') setViewYear(yearRangeStart + 12);
          }}
          className="inline-flex items-center justify-center w-7 h-7 rounded text-foreground-secondary hover:bg-background-tertiary hover:text-foreground-default transition-colors"
        >
          <Icon iconSymbol="ChevronRight" size="sm" />
        </button>
      </div>

      {mode === 'days' && (
        <>
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="text-xs font-medium text-center text-foreground-tertiary py-1">{wd}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map(({ date, outside }) => {
              const disabled = isDisabled(date);
              const isToday = isSameDay(date, today);
              const isSelected = selected ? isSameDay(date, selected) : false;
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  disabled={disabled}
                  data-today={isToday}
                  data-selected={isSelected}
                  data-outside={outside}
                  data-disabled={disabled}
                  onClick={() => handleDayClick(date)}
                  className="inline-flex items-center justify-center h-9 w-9 text-sm rounded text-foreground-default hover:bg-background-tertiary transition-colors data-[outside=true]:text-foreground-tertiary data-[today=true]:ring-1 data-[today=true]:ring-border-focus data-[selected=true]:bg-background-primary data-[selected=true]:text-foreground-on-primary data-[selected=true]:hover:bg-background-primary data-[disabled=true]:opacity-30 data-[disabled=true]:cursor-not-allowed data-[disabled=true]:hover:bg-transparent"
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </>
      )}

      {mode === 'months' && (
        <div className="grid grid-cols-3 gap-1">
          {MONTH_NAMES.map((mn, idx) => {
            const isCurrent = idx === viewMonth;
            return (
              <button
                key={mn}
                type="button"
                data-selected={isCurrent}
                onClick={() => { setViewMonth(idx); setMode('days'); }}
                className="px-2 py-2 text-sm rounded text-foreground-default hover:bg-background-tertiary transition-colors data-[selected=true]:bg-background-primary data-[selected=true]:text-foreground-on-primary"
              >
                {mn.slice(0, 3)}
              </button>
            );
          })}
        </div>
      )}

      {mode === 'years' && (
        <div className="grid grid-cols-3 gap-1">
          {years.map((y) => {
            const isCurrent = y === viewYear;
            return (
              <button
                key={y}
                type="button"
                data-selected={isCurrent}
                onClick={() => { setViewYear(y); setMode('days'); }}
                className="px-2 py-2 text-sm rounded text-foreground-default hover:bg-background-tertiary transition-colors data-[selected=true]:bg-background-primary data-[selected=true]:text-foreground-on-primary"
              >
                {y}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PvDefaultContent() {
  return <></>;
}

export const pvConfig = {
  name: 'DatePickerPopover',
  componentId: 'DatePickerPopover',
  displayName: 'Date Picker (Mock)',
  description: 'A static calendar shell with month/year navigation. Used inside DateInput, perfect for designing calendars in Sketchpad.',
  importPath: '@/components/ui/date-picker-popover',
  defaultProps: 'value="2026-05-15" width="md"',
  defaultContent: <PvDefaultContent />,
  props: {
    value: { type: 'string', exampleValue: '2026-05-15' },
    minDate: { type: 'string', exampleValue: '2026-01-01' },
    maxDate: { type: 'string', exampleValue: '2026-12-31' },
    width: { type: 'select', options: ['sm', 'md', 'lg'] },
  },
};
