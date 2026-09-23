// plugins/protovibe/src/ui/components/specs/specsUi.tsx
// Small presentational building blocks shared by the Specs panel: status
// config + badge + picker, a portal dropdown menu, in-place editable text, and the
// common button styles. Nothing here talks to the backend.
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { theme } from '../../theme';
import type { SpecStatus } from '../../../shared/specs';
import { SPEC_STATUSES, SPEC_STATUS_CONFIG } from '../../../shared/specs';

export { SPEC_STATUS_CONFIG };

/**
 * Background of a row that is part of a multi-selection. Deliberately dimmer
 * than SPEC_ACTIVE_BG so the one *active* annotation — the state the canvas is
 * showing — still stands out inside a selected block.
 */
export const SPEC_SELECTED_BG = 'rgb(0 141 253 / 12%)';

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
  /** Small secondary line under the label (e.g. the path an item acts on). */
  hint?: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  danger?: boolean;
  selected?: boolean;
  disabled?: boolean;
  /** Renders a divider above this item. */
  separator?: boolean;
  /** Read-only line (e.g. the author): rendered as muted text, not a button. */
  info?: boolean;
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
  /** Pixel width, or 'anchor' to match the trigger's width. */
  width?: number | 'anchor';
}> = ({ open, anchorRef, onClose, items, align = 'right', width: widthProp = 180 }) => {
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    const r = anchorRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = widthProp === 'anchor' ? Math.round(r.width) : widthProp;
    const menuH = menuRef.current?.offsetHeight ?? items.length * 30 + 8;
    let top = r.bottom + 4;
    if (top + menuH > window.innerHeight - 8) top = Math.max(8, r.top - 4 - menuH);
    let left = align === 'right' ? r.right - width : r.left;
    left = Math.min(Math.max(8, left), window.innerWidth - width - 8);
    setPos({ top, left, width });
  }, [open, anchorRef, align, widthProp, items.length]);

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
        // The menu is portaled but stays a React child of its trigger's row, so
        // clicks on its padding, separators or info lines would bubble (in the
        // React tree) to a row-level onClick and activate that row.
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: pos?.width ?? (widthProp === 'anchor' ? 180 : widthProp), zIndex: 2147483647,
          background: theme.bg_secondary, border: `1px solid ${theme.border_default}`, borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.28)', padding: 4,
          display: 'flex', flexDirection: 'column', gap: 2, fontFamily: theme.font_ui,
          visibility: pos ? 'visible' : 'hidden',
        }}
      >
        {items.map((it, i) => (
          <React.Fragment key={i}>
            {it.separator && <div style={{ height: 1, background: theme.border_default, margin: '3px 4px' }} />}
            {it.info ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', fontSize: 11, color: theme.text_tertiary, fontFamily: theme.font_ui }}>
                {it.icon && <span style={{ display: 'flex', alignItems: 'center', width: 14, flexShrink: 0, opacity: 0.8 }}>{it.icon}</span>}
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}{it.hint ? ` · ${it.hint}` : ''}</span>
              </div>
            ) : (
            <button
              disabled={it.disabled}
              onClick={(e) => { e.stopPropagation(); onClose(); it.onSelect(); }}
              style={{
                display: 'flex', alignItems: it.hint ? 'flex-start' : 'center', gap: 8, padding: '6px 8px', borderRadius: 5, border: 'none',
                background: it.selected ? theme.bg_tertiary : 'transparent',
                color: it.danger ? theme.destructive_default : theme.text_default,
                fontSize: 12, fontWeight: 500, cursor: it.disabled ? 'default' : 'pointer', fontFamily: theme.font_ui, textAlign: 'left',
                opacity: it.disabled ? 0.5 : 1,
              }}
              onMouseEnter={(e) => { if (!it.selected && !it.disabled) e.currentTarget.style.background = theme.bg_low; }}
              onMouseLeave={(e) => { if (!it.selected) e.currentTarget.style.background = 'transparent'; }}
            >
              {it.icon && <span style={{ display: 'flex', alignItems: 'center', width: 14, flexShrink: 0, opacity: 0.8, marginTop: it.hint ? 2 : 0 }}>{it.icon}</span>}
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span>{it.label}</span>
                {it.hint && <span title={it.hint} style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden', fontSize: 10, fontWeight: 400, color: theme.text_tertiary, wordBreak: 'break-all', lineHeight: 1.35 }}>{it.hint}</span>}
              </span>
              {it.selected && <Check size={13} style={{ color: theme.accent_default }} />}
            </button>
            )}
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
 * Class carried by every inline field, so the native placeholder can be
 * coloured — inline styles cannot target `::placeholder`.
 */
export const INLINE_EDITABLE_CLASS = 'pv-spec-inline';

/** Mounted once by the Specs panel; see INLINE_EDITABLE_CLASS. */
/** Class for elements that fade in on mount (e.g. a row's warning icon). */
export const SPECS_FADE_IN_CLASS = 'pv-specs-fade-in';

export const SpecsInlineStyles: React.FC = () => (
  <style dangerouslySetInnerHTML={{ __html: `.${INLINE_EDITABLE_CLASS}::placeholder { color: ${theme.text_tertiary}; opacity: 1; }
@keyframes pv-specs-fade-in { from { opacity: 0; } to { opacity: 1; } }
.${SPECS_FADE_IN_CLASS} { animation: pv-specs-fade-in 0.3s ease-out; }` }} />
);

/**
 * Text that edits in place. The real input is **always** rendered rather than
 * swapped in on click, so a click lands the caret where the pointer is and the
 * list reads like a document. No border or background in any state — hover and
 * focus included. Blur commits when the value changed, Escape reverts,
 * Enter (Cmd/Ctrl+Enter when multiline) commits.
 *
 * `editing` is a request to focus — a parent sets it for a just-created item —
 * and `onEditingChange` reports focus back so the parent can clear it.
 */
export const InlineEditable: React.FC<{
  value: string;
  onSave: (next: string) => void;
  placeholder?: string;
  multiline?: boolean;
  style?: React.CSSProperties;
  /** Focus the field (a just-created item). */
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  disabled?: boolean;
  /** Select the whole value when focus is requested (typing replaces it). */
  selectAllOnEdit?: boolean;
}> = ({ value, onSave, placeholder, multiline, style, editing, onEditingChange, disabled, selectAllOnEdit }) => {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  // Escape blurs synchronously, before React flushes setDraft, so the blur
  // handler cannot trust the rendered draft — it reads this instead.
  const draftRef = useRef(value);

  const setBoth = (next: string) => { draftRef.current = next; setDraft(next); };

  // Outside edits (undo, redo, git sync) land while the field is idle.
  useEffect(() => { if (!focused) setBoth(value); }, [value, focused]);

  // The field is always visible, so it must grow instead of scrolling. A
  // hidden panel (Specs stays mounted under display:none, e.g. straight after
  // a reload) has nothing to measure, so skip it there and re-measure whenever
  // the field's width changes — which includes being shown, and panel resizes.
  const fitHeight = useCallback(() => {
    const el = ref.current as HTMLTextAreaElement | null;
    if (!multiline || !el || el.clientWidth === 0) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [multiline]);
  useLayoutEffect(() => { fitHeight(); }, [draft, fitHeight]);
  useEffect(() => {
    const el = ref.current;
    if (!multiline || !el || typeof ResizeObserver === 'undefined') return;
    // Only width matters: reacting to height would re-fire on our own resize.
    let lastWidth = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === lastWidth) return;
      lastWidth = el.clientWidth;
      fitHeight();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [multiline, fitHeight]);

  useEffect(() => {
    if (!editing) return;
    const el = ref.current;
    if (!el) return;
    el.focus();
    try {
      if (selectAllOnEdit) el.select(); else el.setSelectionRange(el.value.length, el.value.length);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const baseStyle: React.CSSProperties = {
    fontFamily: theme.font_ui, fontSize: 12, lineHeight: 1.45, color: theme.text_default, width: '100%',
    boxSizing: 'border-box', padding: '4px 6px', margin: '-4px -6px', borderRadius: 4,
    ...style,
  };

  const shared = {
    className: INLINE_EDITABLE_CLASS,
    value: draft,
    placeholder,
    readOnly: disabled,
    onFocus: () => { setFocused(true); onEditingChange?.(true); },
    onBlur: () => {
      setFocused(false);
      onEditingChange?.(false);
      if (draftRef.current !== value) onSave(draftRef.current);
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      // The shell listens on window for single-key shortcuts; typing is not one.
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); setBoth(value); ref.current?.blur(); }
      else if (e.key === 'Enter' && (!multiline || e.metaKey || e.ctrlKey)) { e.preventDefault(); ref.current?.blur(); }
    },
    style: {
      ...baseStyle,
      background: 'transparent',
      // Transparent rather than none: keeps the box metrics stable.
      border: '1px solid transparent',
      outline: 'none',
      resize: 'none' as const,
      overflow: 'hidden',
      display: 'block',
      cursor: disabled ? 'default' : 'text',
    },
  };

  return multiline ? (
    <textarea
      ref={ref as React.RefObject<HTMLTextAreaElement>}
      {...shared}
      rows={1}
      onChange={(e) => setBoth(e.target.value)}
    />
  ) : (
    <input ref={ref as React.RefObject<HTMLInputElement>} {...shared} onChange={(e) => setBoth(e.target.value)} />
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
