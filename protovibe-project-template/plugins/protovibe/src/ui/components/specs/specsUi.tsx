// plugins/protovibe/src/ui/components/specs/specsUi.tsx
// Small presentational building blocks shared by the Specs panel: status
// config + badge + picker, a portal dropdown menu, hover-to-edit text, and the
// common button styles. Nothing here talks to the backend.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { theme } from '../../theme';
import type { SpecStatus } from '../../../shared/specs';
import { SPEC_STATUSES } from '../../../shared/specs';

// Presentation for each stable status id. The persisted value is the id (see
// SpecStatus in shared/specs), so renaming a label never breaks saved files.
export const SPEC_STATUS_CONFIG: Record<SpecStatus, { label: string; color: string }> = {
  todo:     { label: 'Todo',       color: '#A78BFA' },
  discuss:  { label: 'To discuss', color: theme.warning_primary },
  verified: { label: 'Verified',   color: theme.success_default },
};

export const iconBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24,
  borderRadius: 4, border: 'none', background: 'transparent', color: theme.text_tertiary, cursor: 'pointer', padding: 0,
  flexShrink: 0,
};

export const iconBtnSm: React.CSSProperties = { ...iconBtn, width: 20, height: 20, borderRadius: 3 };

export const primaryBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 6, border: 'none',
  background: theme.primary_solid, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: theme.font_ui,
};

export const ghostBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 9px', borderRadius: 6,
  border: `1px solid ${theme.border_default}`, background: 'transparent', color: theme.text_secondary,
  fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: theme.font_ui,
};

export const hoverBg = {
  onMouseEnter: (e: { currentTarget: HTMLElement }) => { e.currentTarget.style.background = theme.bg_low; },
  onMouseLeave: (e: { currentTarget: HTMLElement }) => { e.currentTarget.style.background = 'transparent'; },
};

// ── dropdown menu ──────────────────────────────────────────────────────────────

export interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  danger?: boolean;
  selected?: boolean;
  disabled?: boolean;
  /** Renders a divider above this item. */
  separator?: boolean;
}

/**
 * Portal dropdown anchored below (or above, when there is no room) a trigger
 * element. Fixed positioning so it escapes the panel's overflow: hidden.
 */
export const Menu: React.FC<{
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  items: MenuItem[];
  align?: 'left' | 'right';
  width?: number;
}> = ({ open, anchorRef, onClose, items, align = 'right', width = 180 }) => {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    const r = anchorRef.current?.getBoundingClientRect();
    if (!r) return;
    const menuH = menuRef.current?.offsetHeight ?? items.length * 30 + 8;
    let top = r.bottom + 4;
    if (top + menuH > window.innerHeight - 8) top = Math.max(8, r.top - 4 - menuH);
    let left = align === 'right' ? r.right - width : r.left;
    left = Math.min(Math.max(8, left), window.innerWidth - width - 8);
    setPos({ top, left });
  }, [open, anchorRef, align, width, items.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onClose);
    return () => { window.removeEventListener('keydown', onKey, true); window.removeEventListener('resize', onClose); };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <>
      <div onClick={(e) => { e.stopPropagation(); onClose(); }} onContextMenu={(e) => e.preventDefault()} style={{ position: 'fixed', inset: 0, zIndex: 2147483646 }} />
      <div
        ref={menuRef}
        data-pv-ui="true"
        style={{
          position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, width, zIndex: 2147483647,
          background: theme.bg_secondary, border: `1px solid ${theme.border_default}`, borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.28)', padding: 4,
          display: 'flex', flexDirection: 'column', gap: 2, fontFamily: theme.font_ui,
          visibility: pos ? 'visible' : 'hidden',
        }}
      >
        {items.map((it, i) => (
          <React.Fragment key={i}>
            {it.separator && <div style={{ height: 1, background: theme.border_default, margin: '3px 4px' }} />}
            <button
              disabled={it.disabled}
              onClick={(e) => { e.stopPropagation(); onClose(); it.onSelect(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 5, border: 'none',
                background: it.selected ? theme.bg_tertiary : 'transparent',
                color: it.danger ? theme.destructive_default : theme.text_default,
                fontSize: 12, fontWeight: 500, cursor: it.disabled ? 'default' : 'pointer', fontFamily: theme.font_ui, textAlign: 'left',
                opacity: it.disabled ? 0.5 : 1,
              }}
              onMouseEnter={(e) => { if (!it.selected && !it.disabled) e.currentTarget.style.background = theme.bg_low; }}
              onMouseLeave={(e) => { if (!it.selected) e.currentTarget.style.background = 'transparent'; }}
            >
              {it.icon && <span style={{ display: 'flex', alignItems: 'center', width: 14, flexShrink: 0, opacity: 0.8 }}>{it.icon}</span>}
              <span style={{ flex: 1 }}>{it.label}</span>
              {it.selected && <Check size={13} style={{ color: theme.accent_default }} />}
            </button>
          </React.Fragment>
        ))}
      </div>
    </>,
    document.body,
  );
};

// ── status ─────────────────────────────────────────────────────────────────────

export const StatusBadge: React.FC<{ status?: SpecStatus }> = ({ status }) => {
  if (!status) return null;
  const { label, color } = SPEC_STATUS_CONFIG[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '1px 6px', borderRadius: 6, flexShrink: 0,
      background: `${color}22`, color, fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
    }}>
      {label}
    </span>
  );
};

export const StatusPicker: React.FC<{ status?: SpecStatus; onChange: (s: SpecStatus | null) => void; disabled?: boolean }> = ({ status, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const color = status ? SPEC_STATUS_CONFIG[status].color : theme.text_tertiary;
  const label = status ? SPEC_STATUS_CONFIG[status].label : 'No status';
  const items: MenuItem[] = [null, ...SPEC_STATUSES].map((s) => ({
    label: s ? SPEC_STATUS_CONFIG[s].label : 'No status',
    icon: <span style={{ width: 8, height: 8, borderRadius: 2, background: s ? SPEC_STATUS_CONFIG[s].color : 'transparent', border: s ? 'none' : `1px solid ${theme.text_tertiary}` }} />,
    selected: (status ?? null) === s,
    onSelect: () => onChange(s),
  }));
  return (
    <>
      <button
        ref={btnRef}
        disabled={disabled}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, alignSelf: 'flex-start', padding: '4px 6px', borderRadius: 8,
          border: '1px solid transparent', background: status ? `${color}22` : theme.bg_secondary,
          color: status ? color : theme.text_secondary, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
          textTransform: 'uppercase', cursor: disabled ? 'default' : 'pointer', fontFamily: theme.font_ui,
        }}
      >
        <span>{label}</span>
        <ChevronDown size={12} style={{ opacity: 0.7, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      <Menu open={open} anchorRef={btnRef} onClose={() => setOpen(false)} items={items} align="left" width={160} />
    </>
  );
};

// ── inline editing ─────────────────────────────────────────────────────────────

/**
 * Text that edits in place: hover shows a faint frame, click swaps in an input
 * (or auto-growing textarea), blur commits when the value changed, Escape
 * reverts. `editing` + `onEditingChange` let a parent open the editor for a
 * just-created item.
 */
export const InlineEditable: React.FC<{
  value: string;
  onSave: (next: string) => void;
  placeholder?: string;
  multiline?: boolean;
  style?: React.CSSProperties;
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  disabled?: boolean;
  /** Stop the click that opens the editor from reaching the row (e.g. a row that navigates). */
  stopClickPropagation?: boolean;
}> = ({ value, onSave, placeholder, multiline, style, editing: editingProp, onEditingChange, disabled, stopClickPropagation }) => {
  const [editingState, setEditingState] = useState(false);
  const editing = editingProp ?? editingState;
  const setEditing = (v: boolean) => { setEditingState(v); onEditingChange?.(v); };
  const [draft, setDraft] = useState(value);
  const [hover, setHover] = useState(false);
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const committedRef = useRef(false);

  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  useEffect(() => {
    if (!editing) return;
    committedRef.current = false;
    setDraft(value);
    const el = ref.current;
    if (!el) return;
    el.focus();
    try { el.setSelectionRange(el.value.length, el.value.length); } catch { /* ignore */ }
    if (multiline) autoGrow(el as HTMLTextAreaElement);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  };

  const commit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    setEditing(false);
    const next = draft;
    if (next !== value) onSave(next);
  };
  const cancel = () => {
    committedRef.current = true;
    setDraft(value);
    setEditing(false);
  };

  const baseStyle: React.CSSProperties = {
    fontFamily: theme.font_ui, fontSize: 12, lineHeight: 1.45, color: theme.text_default, width: '100%', boxSizing: 'border-box',
    padding: '4px 6px', margin: '-4px -6px', borderRadius: 4, ...style,
  };

  if (editing) {
    const shared = {
      value: draft,
      placeholder,
      onBlur: commit,
      onClick: (e: React.MouseEvent) => e.stopPropagation(),
      onKeyDown: (e: React.KeyboardEvent) => {
        e.stopPropagation();
        if (e.key === 'Escape') { e.preventDefault(); cancel(); }
        else if (e.key === 'Enter' && (!multiline || e.metaKey || e.ctrlKey)) { e.preventDefault(); commit(); }
      },
      style: {
        ...baseStyle, background: theme.bg_secondary, border: `1px solid ${theme.border_accent}`, outline: 'none',
        resize: 'none' as const, overflow: 'hidden', display: 'block',
      },
    };
    return multiline ? (
      <textarea
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        {...shared}
        rows={1}
        onChange={(e) => { setDraft(e.target.value); autoGrow(e.target); }}
      />
    ) : (
      <input ref={ref as React.RefObject<HTMLInputElement>} {...shared} onChange={(e) => setDraft(e.target.value)} />
    );
  }

  const empty = !value.trim();
  return (
    <div
      onClick={(e) => { if (disabled) return; if (stopClickPropagation) e.stopPropagation(); setEditing(true); }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={disabled ? undefined : 'Click to edit'}
      style={{
        ...baseStyle, whiteSpace: 'pre-wrap', wordBreak: 'break-word', cursor: disabled ? 'default' : 'text',
        border: `1px solid ${hover && !disabled ? theme.border_strong : 'transparent'}`,
        color: empty ? theme.text_tertiary : baseStyle.color, fontStyle: empty ? 'italic' : 'normal',
        transition: 'border-color 0.12s',
      }}
    >
      {empty ? (placeholder || '') : value}
    </div>
  );
};

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '';
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
