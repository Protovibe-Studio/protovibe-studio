// plugins/protovibe/src/ui/components/FilterChip.tsx
// Small single-choice filter dropdown, rendered as a chip under a search field
// (Comments + Specs panels). The first option is the "no filter" default; any
// other pick highlights the chip and shows an × that resets it to the default.
import React, { useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { theme } from '../theme';
import { Menu, type MenuItem } from './specs/specsUi';

export interface FilterChipOption<T extends string> {
  value: T;
  label: string;
  /** Plain-language explanation shown under the label in the dropdown. */
  hint?: string;
  /** Leading marker (e.g. a status colour dot), shown in the menu and on the active chip. */
  icon?: React.ReactNode;
  /** Renders a divider above this option. */
  separator?: boolean;
}

export function FilterChip<T extends string>({ value, defaultValue, options, onChange, menuWidth = 220, testId }: {
  value: T;
  /** The "no filter" option: the chip is neutral while it is picked. */
  defaultValue: T;
  options: FilterChipOption<T>[];
  onChange: (v: T) => void;
  menuWidth?: number;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const active = value !== defaultValue;
  const current = options.find((o) => o.value === value) ?? options[0];

  const items: MenuItem[] = options.map((o) => ({
    label: o.label,
    hint: o.hint,
    hintProse: true,
    icon: o.icon,
    separator: o.separator,
    selected: o.value === value,
    onSelect: () => onChange(o.value),
  }));

  const color = active ? theme.accent_default : theme.text_secondary;
  return (
    <div
      ref={wrapRef}
      data-testid={testId}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', minWidth: 0, maxWidth: '100%', height: 24, boxSizing: 'border-box',
        borderRadius: 999, border: `1px solid ${active ? theme.border_accent : theme.border_default}`,
        background: active ? theme.accent_low : hover || open ? theme.bg_low : 'transparent',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, minWidth: 0, height: '100%',
          padding: active ? '0 2px 0 9px' : '0 7px 0 9px', border: 'none', background: 'transparent', cursor: 'pointer',
          color, fontSize: 11, fontWeight: 600, fontFamily: theme.font_ui,
        }}
      >
        {active && current.icon && <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{current.icon}</span>}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{current.label}</span>
        {!active && (
          <ChevronDown size={12} style={{ flexShrink: 0, opacity: 0.7, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        )}
      </button>
      {active && (
        <button
          data-tooltip="Clear filter"
          aria-label="Clear filter"
          onClick={() => { setOpen(false); onChange(defaultValue); }}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, marginRight: 2,
            borderRadius: 999, border: 'none', background: 'transparent', color, cursor: 'pointer', padding: 0, flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = theme.accent_low; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <X size={12} />
        </button>
      )}
      <Menu open={open} anchorRef={wrapRef} onClose={() => setOpen(false)} items={items} align="left" width={menuWidth} />
    </div>
  );
}

/** Square status swatch used as a FilterChip option icon. */
export const StatusDot: React.FC<{ color: string; round?: boolean; hollow?: boolean }> = ({ color, round, hollow }) => (
  <span style={{
    width: 8, height: 8, borderRadius: round ? 999 : 2, flexShrink: 0, boxSizing: 'border-box',
    background: hollow ? 'transparent' : color, border: hollow ? `1px solid ${color}` : 'none',
  }} />
);
