// plugins/protovibe/src/ui/components/specs/SpecDocView.tsx
// Level 2 of the Specs panel: one spec's headings and annotations in order,
// with search + status filters, hover "+" insert lines between rows, drag
// reorder, in-place heading editing and a per-row ⋯ menu.
import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Plus, MoreHorizontal, Trash2, Search, GripVertical, Copy, Download, Heading1, Heading2, StickyNote, RefreshCw,
} from 'lucide-react';
import { theme } from '../../theme';
import type { SpecAnnotation, SpecBundle, SpecHeading, SpecItem, SpecStatus, SpecHeadingLevel } from '../../../shared/specs';
import { SPEC_STATUSES, annotationTitle, isAnnotation } from '../../../shared/specs';
import type { SpecItemPatch } from '../../api/specs';
import { Menu, InlineEditable, StatusBadge, SPEC_STATUS_CONFIG, iconBtn, iconBtnSm, primaryBtn, hoverBg, type MenuItem } from './specsUi';
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
  /** Most recently opened annotation, faintly highlighted. */
  highlightId: string | null;
  onBack: () => void;
  onRename: (title: string) => void;
  onOpenAnnotation: (itemId: string) => void;
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
  const menuRef = useRef<HTMLButtonElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const [thumbReload, setThumbReload] = useState(0);

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
          <InlineEditable value={bundle.spec.title} placeholder="Untitled spec" onSave={(t) => p.onRename(t.trim() || 'Untitled spec')} style={{ fontSize: 13, fontWeight: 600 }} />
        </div>
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
        style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingBottom: 24 }}
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
                  highlighted={p.highlightId === it.id}
                  dragging={dragId === it.id}
                  scrollRoot={scrollEl}
                  thumbReload={thumbReload}
                  onOpen={() => p.onOpenAnnotation(it.id)}
                  onDelete={() => p.onDeleteItem(it.id)}
                  rowProps={rowProps}
                />
              ) : (
                <HeadingRow
                  item={it}
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

const AddButton: React.FC<{ busy: boolean; onInsert: (kind: InsertKind) => void }> = ({ busy, onInsert }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  return (
    <div style={{ display: 'flex', padding: '8px 12px' }}>
      <button ref={btnRef} data-testid="specs-add" style={{ ...primaryBtn, width: '100%', justifyContent: 'center', opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={() => setOpen(true)}>
        <Plus size={13} /> Add
      </button>
      <Menu open={open} anchorRef={btnRef} onClose={() => setOpen(false)} items={insertMenuItems(onInsert)} align="left" width={170} />
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
  highlighted: boolean;
  dragging: boolean;
  scrollRoot: HTMLElement | null;
  thumbReload: number;
  onOpen: () => void;
  onDelete: () => void;
  rowProps: React.HTMLAttributes<HTMLDivElement> & { draggable: boolean };
}> = ({ item, highlighted, dragging, scrollRoot, thumbReload, onOpen, onDelete, rowProps }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement | null>(null);
  const baseBg = highlighted ? `${theme.accent_default}14` : 'transparent';
  // Untitled annotations show the whole note as body text (no derived title).
  const body = item.text.trim();
  return (
    <div
      {...rowProps}
      data-testid="spec-annotation-row"
      onClick={onOpen}
      style={{
        display: 'flex', gap: 6, padding: '8px 8px 10px 12px', background: baseBg, cursor: 'pointer', fontFamily: theme.font_ui,
        opacity: dragging ? 0.4 : 1, alignItems: 'flex-start',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = theme.bg_low)}
      onMouseLeave={(e) => (e.currentTarget.style.background = baseBg)}
    >
      <GripVertical size={13} style={{ color: theme.text_low, flexShrink: 0, marginTop: 4, cursor: 'grab' }} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <SpecThumbnail src={item.state.path} fullWidth scrollRoot={scrollRoot} reloadKey={thumbReload} />
        {item.title && (
          <span style={{ fontSize: 12, fontWeight: 600, color: theme.text_default, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {item.title}
          </span>
        )}
        {body && (
          <span style={{ fontSize: 11, color: theme.text_secondary, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {body}
          </span>
        )}
        {item.status && <div style={{ display: 'flex' }}><StatusBadge status={item.status} /></div>}
      </div>
      <button ref={menuRef} style={iconBtnSm} data-tooltip="More" onClick={(e) => { e.stopPropagation(); setMenuOpen(true); }}>
        <MoreHorizontal size={14} />
      </button>
      <Menu
        open={menuOpen}
        anchorRef={menuRef}
        onClose={() => setMenuOpen(false)}
        items={[{ label: 'Delete annotation', icon: <Trash2 size={13} />, danger: true, onSelect: onDelete }]}
      />
    </div>
  );
};

const HeadingRow: React.FC<{
  item: SpecHeading;
  editing: boolean;
  onEditingDone: () => void;
  dragging: boolean;
  onSave: (title: string) => void;
  onLevel: (level: SpecHeadingLevel) => void;
  onDelete: () => void;
  rowProps: React.HTMLAttributes<HTMLDivElement> & { draggable: boolean };
}> = ({ item, editing, onEditingDone, dragging, onSave, onLevel, onDelete, rowProps }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [localEditing, setLocalEditing] = useState(false);
  const menuRef = useRef<HTMLButtonElement | null>(null);
  const big = item.level === 'big';
  return (
    <div
      {...rowProps}
      data-testid="spec-heading-row"
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: big ? '14px 8px 4px 12px' : '8px 8px 2px 12px',
        opacity: dragging ? 0.4 : 1, fontFamily: theme.font_ui,
      }}
      {...hoverBg}
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
  const hay = [annotationTitle(a), a.text, a.state.path, a.status ? SPEC_STATUS_CONFIG[a.status].label : ''].join('\n').toLowerCase();
  return hay.includes(q);
}
