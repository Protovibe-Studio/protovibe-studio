// plugins/protovibe/src/ui/components/specs/SpecDocView.tsx
// The spec document: one spec's headings and annotations in order, edited in
// place like a doc — headings and annotation text are click-to-edit, the
// status is a picker on the row. One annotation is *active* (highlighted);
// clicking a row activates it and restores its state on the canvas, Prev /
// Next in the header step the active annotation. Also: search, a collapsible
// scope (All / In view / In selection) + status filter, hover "+" insert lines
// between rows, drag reorder (one row, or a ⌘/Shift-click multi-selection
// moved as a block, with edge auto-scroll so a drag can cross the whole list),
// per-row ⋯ menu.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Plus, MoreHorizontal, Trash2, Search, GripVertical, Copy, Download, Heading1, Heading2, StickyNote, RefreshCw,
  ChevronLeft, ChevronRight, ChevronDown, Link2, PinOff, User, Filter, X, AlertTriangle,
} from 'lucide-react';
import { theme } from '../../theme';
import { useProtovibe } from '../../context/ProtovibeContext';
import type { SpecAnnotation, SpecBundle, SpecHeading, SpecItem, SpecStatus, SpecHeadingLevel } from '../../../shared/specs';
import { SPEC_STATUSES, SPEC_ACTIVE_BG, isAnnotation, specIdSelector } from '../../../shared/specs';
import type { SpecItemPatch } from '../../api/specs';
import { Menu, InlineEditable, StatusPicker, SPEC_STATUS_CONFIG, SPEC_SELECTED_BG, ghostBtn, iconBtn, iconBtnSm, relativeTime, type MenuItem } from './specsUi';
import { SpecThumbnail } from './SpecThumbnail';
import type { SpecExportAction } from './SpecsDocList';
import { isTypingInput } from '../../utils/elementType';
import { Segmented } from '../Segmented';
import { openPrompt } from '../../events/openPrompt';

export type InsertKind = 'annotation' | 'big' | 'medium';

/**
 * Which annotations the list is scoped to: all of them, those whose pinned
 * element is visible on the app canvas, or those pinned inside the selection.
 */
export type SpecScope = 'all' | 'viewport' | 'selection';

const FILTERS_OPEN_KEY = 'pv-specs-filter-open';

function loadFiltersOpen(): boolean {
  try { return localStorage.getItem(FILTERS_OPEN_KEY) === '1'; } catch { return false; }
}

/** How close to the top / bottom edge of the list a drag starts auto-scrolling. */
const AUTOSCROLL_EDGE = 56;
/** Scroll step (px per frame) right at the edge; it ramps up across the band. */
const AUTOSCROLL_MAX_SPEED = 16;
/**
 * How stale the last reported cursor position may be before auto-scroll pauses.
 * A held pointer still reports: the drag-and-drop event loop re-fires dragover
 * on the current target every 350ms whether or not the mouse moved. This only
 * catches the case where those reports dry up mid-drag, so a scroll cannot run
 * away from a position the cursor left long ago.
 */
const AUTOSCROLL_STALE_MS = 600;

export interface SpecDocViewProps {
  bundle: SpecBundle;
  busy: boolean;
  query: string;
  setQuery: (q: string) => void;
  statusFilter: Set<SpecStatus>;
  setStatusFilter: (s: Set<SpecStatus>) => void;
  scope: SpecScope;
  setScope: (s: SpecScope) => void;
  /** Annotation ids the scope allows; null when it doesn't restrict the list. */
  scopeIds: ReadonlySet<string> | null;
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
  /**
   * Move items so they land before items[toIndex] (in the unfiltered list),
   * keeping their relative order. One id for a plain drag, several when a
   * multi-selection was dragged.
   */
  onMove: (itemIds: string[], toIndex: number) => void;
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

  // Drag reorder state: the dragged items (one row, or the whole
  // multi-selection) and the insertion slot under the cursor.
  const [dragIds, setDragIds] = useState<string[]>([]);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const dragging = dragIds.length > 0;
  // Multi-selection: ⌘/Ctrl-click toggles a row, Shift-click extends a range,
  // and dragging any row inside it moves the whole block.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Anchor for Shift-click ranges: the last row picked without Shift.
  const selectionAnchor = useRef<string | null>(null);
  // Last cursor position seen during a drag, and when it was seen. The
  // auto-scroll loop keeps reading them, so holding the pointer still at an
  // edge keeps scrolling.
  const dragPointerY = useRef<number | null>(null);
  const dragPointerAt = useRef(0);

  const filtering = p.query.trim().length > 0 || p.statusFilter.size > 0 || p.scopeIds !== null;
  const [filtersOpen, setFiltersOpen] = useState(loadFiltersOpen);
  useEffect(() => {
    try { localStorage.setItem(FILTERS_OPEN_KEY, filtersOpen ? '1' : '0'); } catch { /* ignore */ }
  }, [filtersOpen]);
  // Non-default filters, counted on the collapsed "Filter annotations" header.
  const activeFilters = p.statusFilter.size + (p.scope !== 'all' ? 1 : 0);

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
    const matches = (a: SpecAnnotation) => annotationMatches(a, q, p.statusFilter, p.scopeIds);
    // Keep a heading when any annotation under it (until the next heading of
    // the same or higher level) matches.
    const out: SpecItem[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (isAnnotation(it)) { if (matches(it)) out.push(it); continue; }
      const h = it as SpecHeading;
      let keep = !q && p.statusFilter.size === 0 && !p.scopeIds;
      for (let j = i + 1; j < items.length; j++) {
        const n = items[j];
        if (!isAnnotation(n)) { if (n.level === 'big' || h.level === 'medium') break; continue; }
        if (matches(n)) { keep = true; break; }
      }
      if (keep || (q && h.title.toLowerCase().includes(q))) out.push(h);
    }
    return out;
  }, [items, filtering, p.query, p.statusFilter, p.scopeIds]);

  // ── selection ────────────────────────────────────────────────────────────────
  // Rows that went away (deleted, undone, changed by a git sync) drop out of the
  // selection, so a later drag can never try to move a ghost.
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const live = new Set(items.map((it) => it.id));
      const next = new Set(Array.from(prev).filter((id) => live.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [items]);

  const selectOnly = (id: string) => { selectionAnchor.current = id; setSelected(new Set([id])); };

  const toggleSelected = (id: string) => {
    selectionAnchor.current = id;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Shift-click takes everything between the anchor and `id` in list order. The
  // anchor stays put, so repeated Shift-clicks grow and shrink the same range.
  const selectRangeTo = (id: string) => {
    const ids = visible.map((it) => it.id);
    const to = ids.indexOf(id);
    if (to < 0) return;
    const from = selectionAnchor.current ? ids.indexOf(selectionAnchor.current) : -1;
    if (from < 0) { selectOnly(id); return; }
    const [lo, hi] = from <= to ? [from, to] : [to, from];
    setSelected(new Set(ids.slice(lo, hi + 1)));
  };

  const clearSelection = () => { setSelected(new Set()); selectionAnchor.current = null; };

  // Escape drops a multi-selection. Captured before the shell's own Escape
  // handling so it does not also clear the canvas selection.
  useEffect(() => {
    if (selected.size < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || isTypingInput(e.target as HTMLElement | null)) return;
      e.stopImmediatePropagation();
      setSelected(new Set());
      selectionAnchor.current = null;
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [selected.size]);

  // A plain click activates the row and collapses the selection onto it; a
  // modifier click only edits the selection, leaving the canvas where it is.
  const rowClick = (it: SpecItem) => (e: React.MouseEvent) => {
    if (e.shiftKey) { e.preventDefault(); selectRangeTo(it.id); return; }
    if (e.metaKey || e.ctrlKey) { e.preventDefault(); toggleSelected(it.id); return; }
    selectOnly(it.id);
    if (isAnnotation(it)) p.onSelectAnnotation(it.id, false); else p.onSelectHeading(it.id);
  };

  // ── drag reorder ─────────────────────────────────────────────────────────────
  const finishDrag = () => { setDragIds([]); setDropAt(null); dragPointerY.current = null; };

  const trackPointer = (clientY: number) => { dragPointerY.current = clientY; dragPointerAt.current = Date.now(); };

  // The slot the cursor points at, as an index into the unfiltered list: the
  // first row whose midpoint sits below the cursor, else the end of the list.
  // Hit-testing the rendered rows — rather than trusting the row the dragover
  // came from — is what keeps the indicator honest while the auto-scroll loop
  // moves the content under a pointer that is not moving.
  const dropIndexFor = useCallback((clientY: number): number => {
    const el = scrollRef.current;
    if (!el) return 0;
    for (const row of Array.from(el.querySelectorAll<HTMLElement>('[data-spec-item]'))) {
      const r = row.getBoundingClientRect();
      if (clientY >= r.top + r.height / 2) continue;
      const i = items.findIndex((it) => it.id === row.dataset.specItem);
      return i < 0 ? 0 : i;
    }
    return items.length;
  }, [items]);

  // One handler on the scroll container: dragover bubbles from every row and
  // insert line, so the whole list reads from the same hit test.
  const handleDragOver = (e: React.DragEvent) => {
    if (!dragging) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    trackPointer(e.clientY);
    setDropAt(dropIndexFor(e.clientY));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const at = dropAt ?? (dragPointerY.current === null ? null : dropIndexFor(dragPointerY.current));
    const ids = dragIds;
    finishDrag();
    if (ids.length > 0 && at !== null) p.onMove(ids, at);
  };

  // Holding the cursor near the top or bottom edge scrolls the list, so items
  // can be dragged far past the visible window. Driven by requestAnimationFrame
  // rather than the dragover event: while the list scrolls under it the pointer
  // is usually still, and a still pointer stops firing dragover.
  useEffect(() => {
    if (!dragging || !scrollEl) return;
    let raf = 0;
    const step = () => {
      raf = requestAnimationFrame(step);
      const y = dragPointerY.current;
      if (y === null || Date.now() - dragPointerAt.current > AUTOSCROLL_STALE_MS) return;
      const r = scrollEl.getBoundingClientRect();
      // Negative above the top band, positive below the bottom one, 0 between.
      const past = y < r.top + AUTOSCROLL_EDGE ? y - (r.top + AUTOSCROLL_EDGE) : Math.max(0, y - (r.bottom - AUTOSCROLL_EDGE));
      if (past === 0) return;
      const ratio = Math.min(1, Math.abs(past) / AUTOSCROLL_EDGE);
      const before = scrollEl.scrollTop;
      scrollEl.scrollTop = before + Math.sign(past) * Math.max(1, Math.round(ratio * AUTOSCROLL_MAX_SPEED));
      // The rows moved: re-read the slot under the (unmoved) cursor.
      if (scrollEl.scrollTop !== before) setDropAt(dropIndexFor(y));
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [dragging, scrollEl, dropIndexFor]);

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
    // A single-row selection follows the active row (Prev / Next, a canvas
    // selection) instead of lingering on the old one; a multi-selection stays.
    const activeId = p.activeId;
    setSelected((prev) => (prev.size === 1 && !prev.has(activeId) ? new Set([activeId]) : prev));
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

      {/* search, then the collapsible filters (only once there is something to search) */}
      {numbers.size > 0 && <div style={{ padding: '10px 12px', borderBottom: `1px solid ${theme.border_default}`, flexShrink: 0 }}>
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
      </div>}
      {numbers.size > 0 && <div style={{ borderBottom: `1px solid ${theme.border_default}`, flexShrink: 0 }}>
        <button
          data-testid="specs-filters-toggle"
          onClick={() => setFiltersOpen((o) => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%', minHeight: 34, boxSizing: 'border-box',
            padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer',
            color: theme.text_secondary, fontSize: 12, fontWeight: 600, fontFamily: theme.font_ui,
          }}
        >
          <Filter size={14} />
          <span>Filter annotations</span>
          {activeFilters > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999,
              background: theme.primary_solid, color: '#fff', fontSize: 9, fontWeight: 700,
            }}>
              {activeFilters}
            </span>
          )}
          <div style={{ flex: 1 }} />
          {activeFilters > 0 && (
            <span
              role="button"
              data-tooltip="Clear filters"
              onClick={(e) => { e.stopPropagation(); p.setStatusFilter(new Set()); p.setScope('all'); }}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 4, color: theme.text_tertiary, cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = theme.bg_low; e.currentTarget.style.color = theme.text_secondary; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.text_tertiary; }}
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown size={15} style={{ transform: filtersOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', color: theme.text_tertiary }} />
        </button>
        {filtersOpen && (
          <div style={{ padding: '0 12px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Segmented
              value={p.scope}
              onChange={(v) => p.setScope(v as SpecScope)}
              options={[
                { val: 'all', label: 'All' },
                { val: 'viewport', label: 'In view' },
                { val: 'selection', label: 'In selection' },
              ]}
            />
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
          </div>
        )}
      </div>}

      {/* multi-selection bar */}
      {selected.size > 1 && (
        <div
          data-testid="specs-selection-bar"
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px 6px 12px', flexShrink: 0,
            borderBottom: `1px solid ${theme.border_default}`, background: SPEC_SELECTED_BG,
            fontSize: 11, color: theme.text_secondary, fontFamily: theme.font_ui,
          }}
        >
          <span style={{ fontWeight: 600, color: theme.text_default, flexShrink: 0 }}>{selected.size} selected</span>
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Drag to move together
          </span>
          <button data-testid="specs-selection-clear" onClick={clearSelection} style={{ ...ghostBtn, padding: '2px 8px', fontSize: 11, flexShrink: 0 }}>Clear</button>
        </div>
      )}

      {/* list */}
      <div
        ref={setScroll}
        onScroll={(e) => p.onScrollChange((e.target as HTMLDivElement).scrollTop)}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{ flex: 1, overflowY: 'auto', scrollbarGutter: 'stable', display: 'flex', flexDirection: 'column', paddingBottom: 24 }}
      >
        {items.length === 0 && (
          <div style={{ padding: '32px 24px 8px', textAlign: 'center', color: theme.text_tertiary, fontSize: 12, lineHeight: 1.5 }}>
            Click through the prototype and add annotations for the states you want to describe. Select an element first to pin an annotation to it.
          </div>
        )}
        {filtering && visible.length === 0 && items.length > 0 && (
          <div style={{ padding: '32px 24px', textAlign: 'center', color: theme.text_tertiary, fontSize: 12, lineHeight: 1.5 }}>
            {p.query.trim() || p.statusFilter.size > 0
              ? 'No annotations match.'
              : p.scope === 'selection'
                ? 'No annotations are pinned to the selected element.'
                : 'No pinned annotations are visible on the canvas. Scroll the canvas or switch to All.'}
          </div>
        )}

        {!filtering && <InsertLine index={0} active={dropAt === 0} dragging={dragging} dragCount={dragIds.length} onInsert={p.onInsert} />}

        {visible.map((it) => {
          const index = items.indexOf(it);
          const rowProps = {
            draggable: !filtering,
            onClick: rowClick(it),
            onDragStart: (e: React.DragEvent) => {
              // Grabbing a row inside the selection drags the whole selection,
              // in list order; grabbing anything else collapses onto that row.
              const ids = selected.size > 1 && selected.has(it.id)
                ? items.filter((x) => selected.has(x.id)).map((x) => x.id)
                : [it.id];
              if (ids.length === 1) selectOnly(it.id);
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', ids.join(','));
              trackPointer(e.clientY);
              setDragIds(ids);
              setDropAt(null);
            },
            onDragEnd: finishDrag,
          };
          return (
            <React.Fragment key={it.id}>
              {isAnnotation(it) ? (
                <AnnotationRow
                  item={it}
                  active={p.activeId === it.id}
                  selected={selected.has(it.id)}
                  anchorFound={p.activeId === it.id ? p.activeAnchorFound : null}
                  autoEditText={p.autoEditTextId === it.id}
                  onAutoEditDone={p.onAutoEditDone}
                  busy={p.busy}
                  dragging={dragIds.includes(it.id)}
                  scrollRoot={scrollEl}
                  thumbReload={thumbReload}
                  thumbTheme={iframeTheme}
                  onSelect={(keepFocus) => { selectOnly(it.id); p.onSelectAnnotation(it.id, keepFocus); }}
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
                  selected={selected.has(it.id)}
                  editing={p.editingItemId === it.id}
                  onEditingDone={p.onEditingDone}
                  dragging={dragIds.includes(it.id)}
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
                  dragging={dragging}
                  dragCount={dragIds.length}
                  onInsert={p.onInsert}
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
// same slot doubles as the drop indicator while dragging — which slot is active
// is decided by the list's own hit test, so there is no dragover handler here.
const InsertLine: React.FC<{
  index: number;
  active: boolean;
  dragging: boolean;
  /** Rows the current drag carries; shown on the active slot when more than one. */
  dragCount: number;
  onInsert: (index: number, kind: InsertKind) => void;
}> = ({ index, active, dragging, dragCount, onInsert }) => {
  const [hover, setHover] = useState(false);
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const show = hover || open || active;
  // The "+" stays mounted while dragging, only invisible: unmounting it would
  // let each line collapse to its set height (an 18px button in a flex column
  // holds the line open through min-height: auto), shifting every row up the
  // moment a drag starts.
  const showButton = show && !dragging;
  const color = active ? theme.accent_default : theme.border_strong;
  const items = insertMenuItems((kind) => onInsert(index, kind));
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: 'relative', height: active ? 10 : 8, margin: '-3px 0', zIndex: show ? 2 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default' }}
    >
      <div style={{ position: 'absolute', left: 12, right: 12, top: '50%', height: 2, marginTop: -1, background: color, opacity: show ? 1 : 0, transition: 'opacity 0.12s', borderRadius: 1 }} />
      {active && dragCount > 1 && (
        <span data-testid="spec-drop-count" style={{
          position: 'absolute', padding: '1px 6px', borderRadius: 999, background: theme.accent_default,
          color: theme.bg_strong, fontSize: 9, fontWeight: 700, fontFamily: theme.font_ui, pointerEvents: 'none',
        }}>
          {dragCount}
        </span>
      )}
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        data-tooltip="Insert here"
        style={{
          position: 'relative', width: 18, height: 18, borderRadius: 9, border: `1px solid ${color}`, background: theme.bg_strong,
          color, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
          opacity: showButton ? 1 : 0, transition: 'opacity 0.12s', pointerEvents: showButton ? 'auto' : 'none',
        }}
      >
        <Plus size={12} />
      </button>
      <Menu open={open} anchorRef={btnRef} onClose={() => { setOpen(false); setHover(false); }} items={items} align="left" width={170} />
    </div>
  );
};

// ── rows ───────────────────────────────────────────────────────────────────────

// The whole row is draggable; the grip is where that is advertised, together
// with the modifier clicks that build a multi-selection.
const GRIP_TOOLTIP = 'Drag to reorder · ⌘/Ctrl-click or Shift-click to select several';

// The captured URL opens a state without the pinned element — typically the
// element only appears after an interaction (a dialog, tab, dropdown…) the URL
// doesn't record, so the link can't reproduce what was annotated.
const PinMissingWarning: React.FC<{ fileName?: string }> = ({ fileName }) => (
  <div
    data-testid="spec-pin-missing-warning"
    style={{
      display: 'flex', gap: 6, padding: '6px 8px', borderRadius: 4, background: theme.warning_low,
      fontSize: 10, lineHeight: 1.45, color: theme.text_secondary, cursor: 'default',
    }}
    onClick={(e) => e.stopPropagation()}
  >
    <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1, color: theme.warning_primary }} />
    <span>
      The pinned element{fileName ? ` in ${fileName}` : ''} isn’t visible in this captured state — its URL doesn’t reproduce the
      screen you annotated. Ask your coding agent to make this state deep-linkable, then recapture the link.{' '}
      <button
        data-testid="spec-open-deep-link-prompt"
        onClick={() => openPrompt('deep-link-states')}
        style={{
          padding: 0, border: 'none', background: 'none', cursor: 'pointer', font: 'inherit',
          color: theme.accent_default, textDecoration: 'underline', textUnderlineOffset: 2,
        }}
      >
        Prompts › Make states deep-linkable
      </button>
    </span>
  </div>
);

const AnnotationRow: React.FC<{
  item: SpecAnnotation;
  active: boolean;
  /** Part of the current multi-selection. */
  selected: boolean;
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
}> = ({ item, active, selected, anchorFound, autoEditText, onAutoEditDone, busy, dragging, scrollRoot, thumbReload, thumbTheme, onSelect, onUpdate, onUpdateReference, onUnpin, onDelete, rowProps }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [textEditing, setTextEditing] = useState(false);
  // Whether the pinned element showed up in the thumbnail's captured state
  // (null until the thumbnail has loaded and looked).
  const [thumbPinFound, setThumbPinFound] = useState<boolean | null>(null);
  useEffect(() => { setThumbPinFound(null); }, [item.state.path, item.anchor?.file]);
  const pinMissingInState = !!item.anchor && thumbPinFound === false;
  const menuRef = useRef<HTMLButtonElement | null>(null);
  const baseBg = active ? SPEC_ACTIVE_BG : selected ? SPEC_SELECTED_BG : 'transparent';
  // The "More" button is a hover affordance; an open menu keeps it lit while the
  // pointer sits in the popup instead of on the row.
  const showMenuBtn = hover || menuOpen;
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
      data-selected={selected}
      style={{
        display: 'flex', gap: 4, padding: '10px 4px 10px 0', background: baseBg, cursor: 'pointer', fontFamily: theme.font_ui,
        opacity: dragging ? 0.4 : 1, alignItems: 'flex-start',
        boxShadow: active ? `inset 3px 0 0 ${theme.accent_default}` : 'none',
      }}
      onMouseEnter={(e) => { setHover(true); if (!active && !selected) e.currentTarget.style.background = theme.bg_low; }}
      onMouseLeave={(e) => { setHover(false); e.currentTarget.style.background = baseBg; }}
    >
      <span data-tooltip={GRIP_TOOLTIP} style={{ display: 'flex', flexShrink: 0, marginTop: 4, padding: '4px 4px 4px 12px', cursor: 'grab', color: selected ? theme.accent_default : theme.text_low }}>
        <GripVertical size={13} />
      </span>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <SpecThumbnail
          src={item.state.path}
          fullWidth
          scrollRoot={scrollRoot}
          reloadKey={thumbReload}
          themeMode={thumbTheme}
          revealSelector={item.anchor ? specIdSelector(item.id) : undefined}
          onRevealResult={setThumbPinFound}
        />
        {/* Clicking the text opens its editor and activates the row without
            letting the canvas selection steal the editor's focus. A modifier
            click is a selection gesture instead: it must reach the row, and
            must not pull focus into the editor (which would block the drag). */}
        <div
          onMouseDown={(e) => { if (e.shiftKey || e.metaKey || e.ctrlKey) e.preventDefault(); }}
          onClick={(e) => { if (e.shiftKey || e.metaKey || e.ctrlKey) return; e.stopPropagation(); onSelect(true); }}
        >
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
        {active && item.anchor && anchorFound === false && !pinMissingInState && (
          <span style={{ fontSize: 10, color: theme.warning_primary }}>Pinned element in {fileName} not found on this screen</span>
        )}
        {pinMissingInState && <PinMissingWarning fileName={fileName} />}
      </div>
      {/* Kept mounted while hidden: unmounting it would reflow the row on every
          pointer enter and leave. */}
      <button
        ref={menuRef}
        style={{ ...iconBtnSm, opacity: showMenuBtn ? 1 : 0, transition: 'opacity 0.12s', pointerEvents: showMenuBtn ? 'auto' : 'none' }}
        data-tooltip="More"
        onClick={(e) => { e.stopPropagation(); setMenuOpen(true); }}
      >
        <MoreHorizontal size={14} />
      </button>
      <Menu open={menuOpen} anchorRef={menuRef} onClose={() => setMenuOpen(false)} items={menuItems} width={250} />
    </div>
  );
};

const HeadingRow: React.FC<{
  item: SpecHeading;
  active: boolean;
  /** Part of the current multi-selection. */
  selected: boolean;
  editing: boolean;
  onEditingDone: () => void;
  dragging: boolean;
  onSave: (title: string) => void;
  onLevel: (level: SpecHeadingLevel) => void;
  onDelete: () => void;
  rowProps: React.HTMLAttributes<HTMLDivElement> & { draggable: boolean };
}> = ({ item, active, selected, editing, onEditingDone, dragging, onSave, onLevel, onDelete, rowProps }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [localEditing, setLocalEditing] = useState(false);
  const menuRef = useRef<HTMLButtonElement | null>(null);
  const big = item.level === 'big';
  const baseBg = active ? SPEC_ACTIVE_BG : selected ? SPEC_SELECTED_BG : 'transparent';
  const showMenuBtn = hover || menuOpen;
  return (
    <div
      {...rowProps}
      draggable={rowProps.draggable && !localEditing}
      data-testid="spec-heading-row"
      data-spec-item={item.id}
      data-active={active}
      data-selected={selected}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: big ? '14px 8px 4px 12px' : '8px 8px 2px 12px',
        opacity: dragging ? 0.4 : 1, fontFamily: theme.font_ui, background: baseBg,
        boxShadow: active ? `inset 3px 0 0 ${theme.accent_default}` : 'none',
      }}
      onMouseEnter={(e) => { setHover(true); if (!active && !selected) e.currentTarget.style.background = theme.bg_low; }}
      onMouseLeave={(e) => { setHover(false); e.currentTarget.style.background = baseBg; }}
    >
      <span data-tooltip={GRIP_TOOLTIP} style={{ display: 'flex', flexShrink: 0, cursor: 'grab', color: selected ? theme.accent_default : theme.text_low }}>
        <GripVertical size={13} />
      </span>
      {/* Same as the annotation text: a modifier click selects the row instead
          of putting the caret in the title. */}
      <div
        onMouseDown={(e) => { if (e.shiftKey || e.metaKey || e.ctrlKey) e.preventDefault(); }}
        style={{ flex: 1, minWidth: 0 }}
      >
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
      <button
        ref={menuRef}
        style={{ ...iconBtnSm, opacity: showMenuBtn ? 1 : 0, transition: 'opacity 0.12s', pointerEvents: showMenuBtn ? 'auto' : 'none' }}
        data-tooltip="More"
        onClick={(e) => { e.stopPropagation(); setMenuOpen(true); }}
      >
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
export function annotationMatches(
  a: SpecAnnotation, query: string, statusFilter: Set<SpecStatus>, scopeIds: ReadonlySet<string> | null = null,
): boolean {
  if (scopeIds && !scopeIds.has(a.id)) return false;
  if (statusFilter.size > 0 && !(a.status && statusFilter.has(a.status))) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [a.text, a.state.path, a.status ? SPEC_STATUS_CONFIG[a.status].label : ''].join('\n').toLowerCase();
  return hay.includes(q);
}
