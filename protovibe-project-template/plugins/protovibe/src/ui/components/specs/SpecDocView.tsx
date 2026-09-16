// plugins/protovibe/src/ui/components/specs/SpecDocView.tsx
// The spec document: one spec's headings and annotations in order, edited in
// place like a doc — headings and annotation text are click-to-edit, the
// status is a picker on the row. One annotation is *active* (highlighted);
// clicking a row activates it and restores its state on the canvas, Prev /
// Next in the header step the active annotation. Also: search + status
// filters, hover "+" insert lines between rows, drag reorder, per-row ⋯ menu.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Plus, MoreHorizontal, Trash2, Search, GripVertical, Copy, Download, Heading1, Heading2, StickyNote, RefreshCw,
  ChevronLeft, ChevronRight, ChevronDown, Link2, PinOff, User,
} from 'lucide-react';
import { theme } from '../../theme';
import { useProtovibe } from '../../context/ProtovibeContext';
import type { SpecAnnotation, SpecBundle, SpecHeading, SpecItem, SpecStatus, SpecHeadingLevel } from '../../../shared/specs';
import { SPEC_STATUSES, SPEC_ACTIVE_BG, isAnnotation, specIdSelector } from '../../../shared/specs';
import type { SpecItemPatch } from '../../api/specs';
import { Menu, InlineEditable, StatusPicker, SPEC_STATUS_CONFIG, iconBtn, iconBtnSm, relativeTime, type MenuItem } from './specsUi';
import { SpecThumbnail } from './SpecThumbnail';
import type { SpecExportAction } from './SpecsDocList';

export type InsertKind = 'annotation' | 'big' | 'medium';

export interface SpecDocViewProps {
  bundle: SpecBundle;
  busy: boolean;
  query: string;
  setQuery: (q: string) => void;
  statusFilter: Set<SpecStatus>;
  setStatusFilter: (s: Set<SpecStatus>) => void;
  /** Heading whose title should open in edit mode (just created). */
  editingItemId: string | null;
  onEditingDone: () => void;
  /** Open the spec title in edit mode with its text selected (just created). */
  editingTitle: boolean;
  onTitleEditingDone: () => void;
  /** The active item (highlighted row): an annotation or a heading. */
  activeId: string | null;
  /** Whether the active annotation's pinned element is on the canvas right now. */
  activeAnchorFound: boolean | null;
  /** Annotation whose text editor should open focused (just created). */
  autoEditTextId: string | null;
  onAutoEditDone: () => void;
  onBack: () => void;
  onRename: (title: string) => void;
  /** Activate an annotation and restore its state on the canvas. `keepFocus` when the click opened its text editor. */
  onSelectAnnotation: (itemId: string, keepFocus: boolean) => void;
  /** Activate a heading (highlight only; nothing to show on the canvas). */
  onSelectHeading: (itemId: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
  onUpdateReference: (itemId: string) => void;
  onUnpin: (itemId: string) => void;
  /** Insert a new item before items[index] (index === items.length ⇒ append). */
  onInsert: (index: number, kind: InsertKind) => void;
  /** Move an item so it lands before items[toIndex] (in the unfiltered list). */
  onMove: (itemId: string, toIndex: number) => void;
  onUpdateItem: (itemId: string, patch: SpecItemPatch, note: string) => void;
  onDeleteItem: (itemId: string) => void;
  onExport: (action: SpecExportAction) => void;
  onDeleteSpec: () => void;
  initialScrollTop: number;
  onScrollChange: (top: number) => void;
}

export const SpecDocView: React.FC<SpecDocViewProps> = (p) => {
  const { bundle } = p;
  const items = bundle.items;
  const [menuOpen, setMenuOpen] = useState(false);
  const [titleEditing, setTitleEditing] = useState(false);
  const menuRef = useRef<HTMLButtonElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const [thumbReload, setThumbReload] = useState(0);
  // Thumbnails follow the editor's light/dark switch, exactly like the canvas.
  const { iframeTheme } = useProtovibe();

  // Drag reorder state: the dragged item and the insertion slot under the cursor.
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);

  const filtering = p.query.trim().length > 0 || p.statusFilter.size > 0;

  // Annotation numbers count annotations only, over the unfiltered list.
  const numbers = useMemo(() => {
    const m = new Map<string, number>();
    let n = 0;
    for (const it of items) if (isAnnotation(it)) m.set(it.id, ++n);
    return m;
  }, [items]);

  const visible = useMemo(() => {
    if (!filtering) return items;
    const q = p.query.trim().toLowerCase();
    const matches = (a: SpecAnnotation) => annotationMatches(a, q, p.statusFilter);
    // Keep a heading when any annotation under it (until the next heading of
    // the same or higher level) matches.
    const out: SpecItem[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (isAnnotation(it)) { if (matches(it)) out.push(it); continue; }
      const h = it as SpecHeading;
      let keep = !q && p.statusFilter.size === 0;
      for (let j = i + 1; j < items.length; j++) {
        const n = items[j];
        if (!isAnnotation(n)) { if (n.level === 'big' || h.level === 'medium') break; continue; }
        if (matches(n)) { keep = true; break; }
      }
      if (keep || (q && h.title.toLowerCase().includes(q))) out.push(h);
    }
    return out;
  }, [items, filtering, p.query, p.statusFilter]);

  const finishDrag = () => { setDragId(null); setDropAt(null); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragId && dropAt !== null) p.onMove(dragId, dropAt);
    finishDrag();
  };

  const setScroll = (el: HTMLDivElement | null) => {
    scrollRef.current = el;
    if (el && el !== scrollEl) {
      setScrollEl(el);
      if (p.initialScrollTop) el.scrollTop = p.initialScrollTop;
    }
  };

  // Keep the active row visible when the active item *changes* (Prev / Next,
  // a just-created annotation). Not on mount: the list restores its saved
  // scroll offset then, and thumbnails are still loading so row heights are
  // not settled — scrolling to the row would throw that offset away.
  const seenActiveRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const first = seenActiveRef.current === undefined;
    seenActiveRef.current = p.activeId;
    if (first || !p.activeId || !scrollEl) return;
    const row = scrollEl.querySelector<HTMLElement>(`[data-spec-item="${p.activeId}"]`);
    try { row?.scrollIntoView({ block: 'nearest' }); } catch { /* ignore */ }
  }, [p.activeId, scrollEl]);

  const toggleStatus = (s: SpecStatus) => {
    const next = new Set(p.statusFilter);
    if (next.has(s)) next.delete(s); else next.add(s);
    p.setStatusFilter(next);
  };

  return (
    <>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 8px 8px 8px', borderBottom: `1px solid ${theme.border_default}`, flexShrink: 0 }}>
        <button data-testid="specs-back" style={iconBtn} data-tooltip="Back to specs" onClick={p.onBack}><ArrowLeft size={15} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <InlineEditable
            value={bundle.spec.title}
            placeholder="Untitled spec"
            editing={p.editingTitle || titleEditing}
            onEditingChange={(v) => { setTitleEditing(v); if (!v) p.onTitleEditingDone(); }}
            selectAllOnEdit={p.editingTitle}
            onSave={(t) => p.onRename(t.trim() || 'Untitled spec')}
            style={{ fontSize: 13, fontWeight: 600 }}
          />
        </div>
        {numbers.size > 0 && (
          <>
            <button style={{ ...iconBtn, opacity: p.onPrev ? 1 : 0.35 }} disabled={!p.onPrev} data-testid="spec-annotation-prev" data-tooltip="Previous annotation (←)" onClick={p.onPrev}><ChevronLeft size={16} /></button>
            <button style={{ ...iconBtn, opacity: p.onNext ? 1 : 0.35 }} disabled={!p.onNext} data-testid="spec-annotation-next" data-tooltip="Next annotation (→)" onClick={p.onNext}><ChevronRight size={16} /></button>
          </>
        )}
        <button ref={menuRef} style={iconBtn} data-tooltip="More" onClick={() => setMenuOpen(true)}><MoreHorizontal size={15} /></button>
        <Menu
          open={menuOpen}
          anchorRef={menuRef}
          onClose={() => setMenuOpen(false)}
          width={220}
          items={[
            { label: 'Reload thumbnails', icon: <RefreshCw size={13} />, onSelect: () => setThumbReload((v) => v + 1) },
            { label: 'Copy for Notion / Google Docs', icon: <Copy size={13} />, onSelect: () => p.onExport('copy'), separator: true },
            { label: 'Download Markdown', icon: <Download size={13} />, onSelect: () => p.onExport('markdown') },
            { label: 'Download HTML', icon: <Download size={13} />, onSelect: () => p.onExport('html') },
            { label: 'Delete spec', icon: <Trash2 size={13} />, danger: true, separator: true, onSelect: p.onDeleteSpec },
          ]}
        />
      </div>

      {/* search + filters (only once there is something to search) */}
      {numbers.size > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px', borderBottom: `1px solid ${theme.border_default}`, flexShrink: 0 }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={13} style={{ position: 'absolute', left: 9, color: theme.text_tertiary, pointerEvents: 'none' }} />
          <input
            value={p.query}
            onChange={(e) => p.setQuery(e.target.value)}
            onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape' && p.query) { e.preventDefault(); p.setQuery(''); } }}
            placeholder="Search annotations…"
            style={{
              width: '100%', boxSizing: 'border-box', padding: '5px 10px 5px 28px',
              background: theme.bg_secondary, border: `1px solid ${theme.border_default}`, borderRadius: 6,
              color: theme.text_default, fontSize: 11, outline: 'none', fontFamily: theme.font_ui,
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SPEC_STATUSES.map((s) => {
            const active = p.statusFilter.has(s);
            const { label, color } = SPEC_STATUS_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 999,
                  border: `1px solid ${active ? color : theme.border_default}`, background: active ? `${color}22` : 'transparent',
                  color: active ? color : theme.text_secondary, fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: theme.font_ui,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: 2, background: color }} />
                {label}
              </button>
            );
          })}
        </div>
      </div>}

      {/* list */}
      <div
        ref={setScroll}
        onScroll={(e) => p.onScrollChange((e.target as HTMLDivElement).scrollTop)}
        onDragOver={(e) => { if (dragId) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } }}
        onDrop={handleDrop}
        style={{ flex: 1, overflowY: 'auto', scrollbarGutter: 'stable', display: 'flex', flexDirection: 'column', paddingBottom: 24 }}
      >
        {items.length === 0 && (
          <div style={{ padding: '32px 24px 8px', textAlign: 'center', color: theme.text_tertiary, fontSize: 12, lineHeight: 1.5 }}>
            Click through the prototype and add annotations for the states you want to describe. Select an element first to pin an annotation to it.
          </div>
        )}
        {filtering && visible.length === 0 && items.length > 0 && (
          <div style={{ padding: '32px 24px', textAlign: 'center', color: theme.text_tertiary, fontSize: 12 }}>No annotations match.</div>
        )}

        {!filtering && <InsertLine index={0} active={dropAt === 0} dragging={!!dragId} onInsert={p.onInsert} onDragOver={() => setDropAt(0)} />}

        {visible.map((it) => {
          const index = items.indexOf(it);
          const rowProps = {
            draggable: !filtering,
            onDragStart: (e: React.DragEvent) => {
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', it.id);
              setDragId(it.id);
            },
            onDragEnd: finishDrag,
            onDragOver: (e: React.DragEvent) => {
              if (!dragId || filtering) return;
              e.preventDefault();
              const r = e.currentTarget.getBoundingClientRect();
              setDropAt(e.clientY < r.top + r.height / 2 ? index : index + 1);
            },
          };
          return (
            <React.Fragment key={it.id}>
              {isAnnotation(it) ? (
                <AnnotationRow
                  item={it}
                  active={p.activeId === it.id}
                  anchorFound={p.activeId === it.id ? p.activeAnchorFound : null}
                  autoEditText={p.autoEditTextId === it.id}
                  onAutoEditDone={p.onAutoEditDone}
                  busy={p.busy}
                  dragging={dragId === it.id}
                  scrollRoot={scrollEl}
                  thumbReload={thumbReload}
                  thumbTheme={iframeTheme}
                  onSelect={(keepFocus) => p.onSelectAnnotation(it.id, keepFocus)}
                  onUpdate={(patch, note) => p.onUpdateItem(it.id, patch, note)}
                  onUpdateReference={() => p.onUpdateReference(it.id)}
                  onUnpin={() => p.onUnpin(it.id)}
                  onDelete={() => p.onDeleteItem(it.id)}
                  rowProps={rowProps}
                />
              ) : (
                <HeadingRow
                  item={it}
                  active={p.activeId === it.id}
                  onSelect={() => p.onSelectHeading(it.id)}
                  editing={p.editingItemId === it.id}
                  onEditingDone={p.onEditingDone}
                  dragging={dragId === it.id}
                  onSave={(title) => p.onUpdateItem(it.id, { title }, 'edit heading')}
                  onLevel={(level) => p.onUpdateItem(it.id, { level }, 'change heading size')}
                  onDelete={() => p.onDeleteItem(it.id)}
                  rowProps={rowProps}
                />
              )}
              {!filtering && (
                <InsertLine
                  index={index + 1}
                  active={dropAt === index + 1}
                  dragging={!!dragId}
                  onInsert={p.onInsert}
                  onDragOver={() => setDropAt(index + 1)}
                />
              )}
            </React.Fragment>
          );
        })}

        {!filtering && <AddButton busy={p.busy} onInsert={(kind) => p.onInsert(items.length, kind)} />}
      </div>
    </>
  );
};

// ── insert menu ────────────────────────────────────────────────────────────────
// The same three choices back the "+" between rows and the Add button at the end.
function insertMenuItems(onInsert: (kind: InsertKind) => void): MenuItem[] {
  return [
    { label: 'Annotation', icon: <StickyNote size={13} />, onSelect: () => onInsert('annotation') },
    { label: 'Big heading', icon: <Heading1 size={13} />, onSelect: () => onInsert('big') },
    { label: 'Medium heading', icon: <Heading2 size={13} />, onSelect: () => onInsert('medium') },
  ];
}

// Styled to match the split button in the Prompts tab (step 3): a white
// primary action with black text, a full-width centred label, and a caret
// section divided by a hairline.
const AddButton: React.FC<{ busy: boolean; onInsert: (kind: InsertKind) => void }> = ({ busy, onInsert }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const face: React.CSSProperties = {
    background: busy ? theme.bg_tertiary : theme.text_default,
    color: busy ? theme.text_tertiary : theme.bg_strong,
    border: 'none',
    cursor: busy ? 'not-allowed' : 'pointer',
    fontFamily: theme.font_ui,
    transition: 'background 0.15s ease',
  };
  return (
    <div style={{ display: 'flex', padding: '8px 12px' }}>
      <div style={{ display: 'flex', width: '100%' }}>
        <button
          data-testid="specs-add"
          disabled={busy}
          onClick={() => onInsert('annotation')}
          style={{
            ...face,
            flex: 1, minWidth: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '10px 14px', fontSize: 12, fontWeight: 600,
            borderTopLeftRadius: 6, borderBottomLeftRadius: 6,
          }}
        >
          <Plus size={14} /> Add annotation
        </button>
        <button
          ref={btnRef}
          data-testid="specs-add-menu"
          disabled={busy}
          data-tooltip="Add heading…"
          onClick={() => setOpen(true)}
          style={{
            ...face,
            padding: '0 10px',
            borderLeft: `1px solid ${busy ? theme.border_default : theme.bg_strong}`,
            borderTopRightRadius: 6, borderBottomRightRadius: 6,
            display: 'flex', alignItems: 'center',
          }}
        >
          <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </button>
      </div>
      <Menu open={open} anchorRef={btnRef} onClose={() => setOpen(false)} items={insertMenuItems(onInsert)} width={170} />
    </div>
  );
};

// ── insert line ────────────────────────────────────────────────────────────────
// A thin hover zone between rows. Hover reveals a line with a "+" in the
// middle; clicking it asks whether to insert an annotation or a heading. The
// same slot doubles as the drop indicator while dragging.
const InsertLine: React.FC<{
  index: number;
  active: boolean;
  dragging: boolean;
  onInsert: (index: number, kind: InsertKind) => void;
  onDragOver: () => void;
}> = ({ index, active, dragging, onInsert, onDragOver }) => {
  const [hover, setHover] = useState(false);
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const show = hover || open || active;
  const color = active ? theme.accent_default : theme.border_strong;
  const items = insertMenuItems((kind) => onInsert(index, kind));
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onDragOver={(e) => { if (dragging) { e.preventDefault(); onDragOver(); } }}
      style={{ position: 'relative', height: active ? 10 : 8, margin: '-3px 0', zIndex: show ? 2 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default' }}
    >
      <div style={{ position: 'absolute', left: 12, right: 12, top: '50%', height: 2, marginTop: -1, background: color, opacity: show ? 1 : 0, transition: 'opacity 0.12s', borderRadius: 1 }} />
      {!dragging && (
        <button
          ref={btnRef}
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          data-tooltip="Insert here"
          style={{
            position: 'relative', width: 18, height: 18, borderRadius: 9, border: `1px solid ${color}`, background: theme.bg_strong,
            color, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
            opacity: show ? 1 : 0, transition: 'opacity 0.12s', pointerEvents: show ? 'auto' : 'none',
          }}
        >
          <Plus size={12} />
        </button>
      )}
      <Menu open={open} anchorRef={btnRef} onClose={() => { setOpen(false); setHover(false); }} items={items} align="left" width={170} />
    </div>
  );
};

// ── rows ───────────────────────────────────────────────────────────────────────

const AnnotationRow: React.FC<{
  item: SpecAnnotation;
  active: boolean;
  anchorFound: boolean | null;
  autoEditText: boolean;
  onAutoEditDone: () => void;
  busy: boolean;
  dragging: boolean;
  scrollRoot: HTMLElement | null;
  thumbReload: number;
  thumbTheme: 'light' | 'dark';
  onSelect: (keepFocus: boolean) => void;
  onUpdate: (patch: SpecItemPatch, note: string) => void;
  onUpdateReference: () => void;
  onUnpin: () => void;
  onDelete: () => void;
  rowProps: React.HTMLAttributes<HTMLDivElement> & { draggable: boolean };
}> = ({ item, active, anchorFound, autoEditText, onAutoEditDone, busy, dragging, scrollRoot, thumbReload, thumbTheme, onSelect, onUpdate, onUpdateReference, onUnpin, onDelete, rowProps }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [textEditing, setTextEditing] = useState(false);
  const menuRef = useRef<HTMLButtonElement | null>(null);
  const baseBg = active ? SPEC_ACTIVE_BG : 'transparent';
  const fileName = item.anchor?.file.split('/').pop();
  const statusDot = (color: string) => <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />;
  const menuItems: MenuItem[] = [
    { label: item.author.name, hint: item.updatedAt ? `edited ${relativeTime(item.updatedAt)}` : relativeTime(item.createdAt), icon: <User size={13} />, info: true, onSelect: () => {} },
    // Status: the row only shows its picker once a status is set, so this is
    // where a status is first chosen.
    ...SPEC_STATUSES.map((s, i): MenuItem => ({
      label: SPEC_STATUS_CONFIG[s].label, icon: statusDot(SPEC_STATUS_CONFIG[s].color), selected: item.status === s, separator: i === 0,
      disabled: busy, onSelect: () => onUpdate({ status: item.status === s ? null : s }, 'change annotation status'),
    })),
    { label: 'Show on canvas', hint: item.state.path, icon: <Link2 size={13} />, separator: true, onSelect: () => onSelect(false) },
    { label: 'Recapture link and element', icon: <RefreshCw size={13} />, onSelect: onUpdateReference, disabled: busy },
    { label: 'Unpin element', hint: item.anchor ? `Element in ${fileName}` : undefined, icon: <PinOff size={13} />, onSelect: onUnpin, disabled: !item.anchor || busy },
    { label: 'Delete annotation', icon: <Trash2 size={13} />, danger: true, separator: true, onSelect: onDelete },
  ];
  return (
    <div
      {...rowProps}
      draggable={rowProps.draggable && !textEditing}
      data-testid="spec-annotation-row"
      data-spec-item={item.id}
      data-active={active}
      onClick={() => onSelect(false)}
      style={{
        display: 'flex', gap: 6, padding: '8px 8px 10px 12px', background: baseBg, cursor: 'pointer', fontFamily: theme.font_ui,
        opacity: dragging ? 0.4 : 1, alignItems: 'flex-start',
        boxShadow: active ? `inset 3px 0 0 ${theme.accent_default}` : 'none',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = theme.bg_low; }}
      onMouseLeave={(e) => (e.currentTarget.style.background = baseBg)}
    >
      <GripVertical size={13} style={{ color: theme.text_low, flexShrink: 0, marginTop: 4, cursor: 'grab' }} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <SpecThumbnail
          src={item.state.path}
          fullWidth
          scrollRoot={scrollRoot}
          reloadKey={thumbReload}
          themeMode={thumbTheme}
          revealSelector={item.anchor ? specIdSelector(item.id) : undefined}
        />
        {/* Clicking the text opens its editor and activates the row without
            letting the canvas selection steal the editor's focus. */}
        <div onClick={(e) => { e.stopPropagation(); onSelect(true); }}>
          <InlineEditable
            value={item.text}
            placeholder="Write the annotation…"
            multiline
            editing={autoEditText || textEditing}
            onEditingChange={(v) => { setTextEditing(v); if (!v) onAutoEditDone(); }}
            onSave={(t) => onUpdate({ text: t }, 'edit annotation')}
            style={{ fontSize: 12 }}
          />
        </div>
        {item.status && (
          <div style={{ display: 'flex' }}>
            <StatusPicker status={item.status} disabled={busy} onChange={(s) => onUpdate({ status: s }, 'change annotation status')} />
          </div>
        )}
        {active && item.anchor && anchorFound === false && (
          <span style={{ fontSize: 10, color: theme.warning_primary }}>Pinned element in {fileName} not found on this screen</span>
        )}
      </div>
      <button ref={menuRef} style={iconBtnSm} data-tooltip="More" onClick={(e) => { e.stopPropagation(); setMenuOpen(true); }}>
        <MoreHorizontal size={14} />
      </button>
      <Menu open={menuOpen} anchorRef={menuRef} onClose={() => setMenuOpen(false)} items={menuItems} width={250} />
    </div>
  );
};

const HeadingRow: React.FC<{
  item: SpecHeading;
  active: boolean;
  onSelect: () => void;
  editing: boolean;
  onEditingDone: () => void;
  dragging: boolean;
  onSave: (title: string) => void;
  onLevel: (level: SpecHeadingLevel) => void;
  onDelete: () => void;
  rowProps: React.HTMLAttributes<HTMLDivElement> & { draggable: boolean };
}> = ({ item, active, onSelect, editing, onEditingDone, dragging, onSave, onLevel, onDelete, rowProps }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [localEditing, setLocalEditing] = useState(false);
  const menuRef = useRef<HTMLButtonElement | null>(null);
  const big = item.level === 'big';
  const baseBg = active ? SPEC_ACTIVE_BG : 'transparent';
  return (
    <div
      {...rowProps}
      draggable={rowProps.draggable && !localEditing}
      data-testid="spec-heading-row"
      data-spec-item={item.id}
      data-active={active}
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: big ? '14px 8px 4px 12px' : '8px 8px 2px 12px',
        opacity: dragging ? 0.4 : 1, fontFamily: theme.font_ui, background: baseBg,
        boxShadow: active ? `inset 3px 0 0 ${theme.accent_default}` : 'none',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = theme.bg_low; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = baseBg; }}
    >
      <GripVertical size={13} style={{ color: theme.text_low, flexShrink: 0, cursor: 'grab' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <InlineEditable
          value={item.title}
          placeholder={big ? 'Big heading' : 'Medium heading'}
          editing={editing || localEditing}
          onEditingChange={(v) => { setLocalEditing(v); if (!v) onEditingDone(); }}
          onSave={onSave}
          style={big
            ? { fontSize: 14, fontWeight: 700, color: theme.text_default }
            : { fontSize: 12, fontWeight: 600, color: theme.text_secondary, letterSpacing: '0.02em' }}
        />
      </div>
      <button ref={menuRef} style={iconBtnSm} data-tooltip="More" onClick={(e) => { e.stopPropagation(); setMenuOpen(true); }}>
        <MoreHorizontal size={14} />
      </button>
      <Menu
        open={menuOpen}
        anchorRef={menuRef}
        onClose={() => setMenuOpen(false)}
        items={[
          { label: 'Big heading', icon: <Heading1 size={13} />, selected: big, onSelect: () => onLevel('big') },
          { label: 'Medium heading', icon: <Heading2 size={13} />, selected: !big, onSelect: () => onLevel('medium') },
          { label: 'Delete heading', icon: <Trash2 size={13} />, danger: true, separator: true, onSelect: onDelete },
        ]}
      />
    </div>
  );
};

/** Shared filter predicate so Prev / Next in the annotation view walk the same list. */
export function annotationMatches(a: SpecAnnotation, query: string, statusFilter: Set<SpecStatus>): boolean {
  if (statusFilter.size > 0 && !(a.status && statusFilter.has(a.status))) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [a.text, a.state.path, a.status ? SPEC_STATUS_CONFIG[a.status].label : ''].join('\n').toLowerCase();
  return hay.includes(q);
}
