// plugins/protovibe/src/ui/components/SpecsTab.tsx
// The Specs panel: spec documents made of annotated prototype states.
//
// Three levels — docs list → one spec's items → one annotation — all driven by
// `view`. Every mutation snapshots the exact files it is about to change
// (the item's JSON, the spec's spec.json, the anchored source file) through
// the generic undo stack before calling the backend, so spec edits undo and
// redo like any canvas edit. Comments deliberately do NOT do this; the two
// features share nothing but the shell.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useProtovibe } from '../context/ProtovibeContext';
import { takeSnapshot } from '../api/client';
import { theme } from '../theme';
import { emitToast } from '../events/toast';
import { isTypingInput } from '../utils/elementType';
import { getCurrentAppPath } from '../utils/appPath';
import { useCommentUser } from '../hooks/useCommentUser';
import { UserProfileDialog } from './comments/UserProfileDialog';
import { ConfirmDialog } from './ConfirmDialog';
import type { IframeTab } from './ShellNavBar';
import type { SpecAnnotation, SpecAuthor, SpecBundle, SpecItem, SpecStatus, SpecSummary } from '../../shared/specs';
import {
  makeSpecId, makeAnnotationId, makeHeadingId, specMetaFileRel, specItemFileRel, specIdSelector,
  rankBetween, INITIAL_RANK, isAnnotation, annotationsOf,
} from '../../shared/specs';
import {
  fetchSpecsList, fetchSpec, createSpec, renameSpec, deleteSpec, createSpecItem, updateSpecItem,
  reanchorSpecItem, deleteSpecItem, exportSpec, fetchPublishedUrl, type SpecItemPatch,
} from '../api/specs';
import { SpecsDocList, type SpecExportAction } from './specs/SpecsDocList';
import { SpecDocView, annotationMatches, type InsertKind } from './specs/SpecDocView';
import { SpecAnnotationView } from './specs/SpecAnnotationView';
import { copySpecForDocs, downloadText } from './specs/specsExport';

type SpecsView =
  | { level: 'docs' }
  | { level: 'doc'; specId: string }
  | { level: 'item'; specId: string; itemId: string };

const VIEW_STORAGE_KEY = 'pv-specs-view';

function loadView(): SpecsView {
  try {
    const raw = sessionStorage.getItem(VIEW_STORAGE_KEY);
    if (raw) {
      const v = JSON.parse(raw);
      if (v && (v.level === 'doc' || v.level === 'item') && typeof v.specId === 'string') return v;
    }
  } catch { /* ignore */ }
  return { level: 'docs' };
}

/** Event the shell handles: navigate the app canvas to `path`, then select `selector`. */
export const PV_CANVAS_NAVIGATE_EVENT = 'pv-canvas-navigate';
/** Dispatched by the shell after undo / redo / git sync so the panel re-reads disk. */
export const PV_SPECS_REFRESH_EVENT = 'pv-specs-refresh';

function navigateToAnnotation(a: SpecAnnotation) {
  window.dispatchEvent(new CustomEvent(PV_CANVAS_NAVIGATE_EVENT, {
    detail: { path: a.state.path, selector: a.anchor ? specIdSelector(a.id) : undefined },
  }));
}

/** The app iframe (never a thumbnail) — for checking whether a pinned element is on screen. */
function appIframeDocument(): Document | null {
  for (const f of Array.from(document.querySelectorAll<HTMLIFrameElement>('iframe:not([data-pv-thumbnail])')) as HTMLIFrameElement[]) {
    const src = f.src || '';
    if (src.includes('sketchpad') || src.includes('components')) continue;
    try { if (f.contentDocument) return f.contentDocument; } catch { /* cross-origin guard */ }
  }
  return null;
}

interface SpecsTabProps {
  activeIframeTab: IframeTab;
  /** Whether the Specs panel is the visible sidebar tab (it stays mounted when hidden). */
  isActive: boolean;
}

export const SpecsTab: React.FC<SpecsTabProps> = ({ activeIframeTab, isActive }) => {
  const { currentBaseTarget, activeData, activeSourceId, runLockedMutation } = useProtovibe();
  const { user, saveUser } = useCommentUser();

  const [view, setViewState] = useState<SpecsView>(loadView);
  const [specs, setSpecs] = useState<SpecSummary[]>([]);
  const [bundle, setBundle] = useState<SpecBundle | null>(null);
  const [publishedUrl, setPublishedUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Set<SpecStatus>>(new Set());
  const [editingSpecId, setEditingSpecId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [autoEditTextId, setAutoEditTextId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [anchorFound, setAnchorFound] = useState<boolean | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'spec'; specId: string } | null>(null);
  const listScrollTop = useRef(0);

  // Profile dialog + the action queued behind it (same gate as comments).
  const [profileOpen, setProfileOpen] = useState(false);
  const pendingActionRef = useRef<((author: SpecAuthor) => void) | null>(null);
  const withAuthor = useCallback((action: (author: SpecAuthor) => void) => {
    if (user) { action(user); return; }
    pendingActionRef.current = action;
    setProfileOpen(true);
  }, [user]);

  const setView = useCallback((v: SpecsView) => {
    setViewState(v);
    try { sessionStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(v)); } catch { /* ignore */ }
  }, []);

  // ── loading ──────────────────────────────────────────────────────────────────
  const currentSpecId = view.level === 'docs' ? null : view.specId;

  const refreshList = useCallback(async () => {
    try { setSpecs(await fetchSpecsList()); } catch (e) { setError((e as Error).message); }
  }, []);

  const refreshBundle = useCallback(async (specId: string | null) => {
    if (!specId) { setBundle(null); return; }
    try {
      setBundle(await fetchSpec(specId));
    } catch {
      // The spec is gone (deleted, or its creation was undone) — back to the list.
      setBundle(null);
      setView({ level: 'docs' });
    }
  }, [setView]);

  useEffect(() => { void refreshList(); fetchPublishedUrl().then(setPublishedUrl); }, [refreshList]);
  useEffect(() => { void refreshBundle(currentSpecId); }, [currentSpecId, refreshBundle]);
  useEffect(() => {
    const handler = () => { void refreshList(); void refreshBundle(currentSpecId); };
    window.addEventListener(PV_SPECS_REFRESH_EVENT, handler);
    return () => window.removeEventListener(PV_SPECS_REFRESH_EVENT, handler);
  }, [refreshList, refreshBundle, currentSpecId]);
  useEffect(() => { if (isActive) { void refreshList(); fetchPublishedUrl().then(setPublishedUrl); } }, [isActive, refreshList]);

  // An open annotation whose file disappeared (undo, delete) drops back to the list.
  useEffect(() => {
    if (view.level !== 'item' || !bundle || bundle.spec.id !== view.specId) return;
    if (!bundle.items.some((it) => it.id === view.itemId)) setView({ level: 'doc', specId: view.specId });
  }, [bundle, view, setView]);

  // ── undo-aware mutation helpers ───────────────────────────────────────────────
  const snapshot = useCallback((files: string[], note: string) => {
    const unique = Array.from(new Set(files.filter(Boolean)));
    return takeSnapshot(unique[0], activeSourceId || '', unique.slice(1), note);
  }, [activeSourceId]);

  // `lock` when the mutation rewrites a source file (anchor attribute).
  const run = useCallback(async (fn: () => Promise<void>, lock = false) => {
    setBusy(true);
    setError(null);
    try {
      if (lock) await runLockedMutation(fn); else await fn();
    } catch (e) {
      setError((e as Error).message || String(e));
    } finally {
      setBusy(false);
    }
  }, [runLockedMutation]);

  const anchorFileOf = (it: SpecItem | undefined) => (it && isAnnotation(it) && it.anchor ? it.anchor.file : '');

  // Rank strictly between two neighbours; when saved ranks collide (files
  // written without ranks) renormalise the whole list first.
  const rankFor = async (specId: string, items: SpecItem[], index: number): Promise<{ rank: string; items: SpecItem[] }> => {
    const before = items[index - 1]?.rank ?? null;
    const after = items[index]?.rank ?? null;
    try {
      return { rank: rankBetween(before, after), items };
    } catch {
      await snapshot(items.map((it) => specItemFileRel(specId, it.id)), 'reorder');
      let prev: string | null = null;
      let next: SpecBundle | null = null;
      const renumbered: SpecItem[] = [];
      for (const it of items) {
        const r = rankBetween(prev, null);
        next = await updateSpecItem(specId, it.id, { rank: r });
        renumbered.push({ ...it, rank: r });
        prev = r;
      }
      if (next) setBundle(next);
      return { rank: rankBetween(renumbered[index - 1]?.rank ?? null, renumbered[index]?.rank ?? null), items: renumbered };
    }
  };

  // ── spec mutations ────────────────────────────────────────────────────────────
  const handleCreateSpec = () => run(async () => {
    const id = makeSpecId();
    await snapshot([specMetaFileRel(id)], 'create spec');
    const b = await createSpec(id, 'Untitled spec');
    await refreshList();
    setBundle(b);
    setView({ level: 'doc', specId: id });
  });

  const handleRenameSpec = (specId: string, title: string) => run(async () => {
    await snapshot([specMetaFileRel(specId)], 'rename spec');
    const b = await renameSpec(specId, title);
    if (currentSpecId === specId) setBundle(b);
    await refreshList();
  });

  const handleDeleteSpec = (specId: string) => run(async () => {
    const b = await fetchSpec(specId);
    const files = [
      specMetaFileRel(specId),
      ...b.items.map((it) => specItemFileRel(specId, it.id)),
      ...b.items.map(anchorFileOf),
    ];
    await snapshot(files, 'delete spec');
    await deleteSpec(specId);
    if (currentSpecId === specId) { setBundle(null); setView({ level: 'docs' }); }
    await refreshList();
  }, true);

  // ── item mutations ────────────────────────────────────────────────────────────
  const handleInsert = (index: number, kind: InsertKind) => {
    if (!bundle) return;
    const specId = bundle.spec.id;
    if (kind === 'annotation') {
      withAuthor((author) => {
        const pinned = activeIframeTab === 'app' && !!activeData?.file && !!activeData?.nameEnd;
        void run(async () => {
          const { rank } = await rankFor(specId, bundle.items, index);
          const id = makeAnnotationId();
          await snapshot([specItemFileRel(specId, id), pinned ? activeData!.file : ''], 'add annotation');
          const b = await createSpecItem({
            specId,
            item: { type: 'annotation', id, rank, text: '', state: { tab: 'app', path: getCurrentAppPath() }, author },
            ...(pinned ? { file: activeData!.file, nameEnd: activeData!.nameEnd } : {}),
          });
          await refreshList();
          setBundle(b);
          setAutoEditTextId(id);
          setHighlightId(id);
          setView({ level: 'item', specId, itemId: id });
        }, pinned);
      });
      return;
    }
    void run(async () => {
      const { rank } = await rankFor(specId, bundle.items, index);
      const id = makeHeadingId();
      await snapshot([specItemFileRel(specId, id)], 'add heading');
      const b = await createSpecItem({ specId, item: { type: 'heading', id, rank, title: '', level: kind } });
      setBundle(b);
      setEditingItemId(id);
    });
  };

  const handleUpdateItem = (itemId: string, patch: SpecItemPatch, note: string) => {
    if (!bundle) return;
    const specId = bundle.spec.id;
    void run(async () => {
      await snapshot([specItemFileRel(specId, itemId)], note);
      setBundle(await updateSpecItem(specId, itemId, patch));
      if (patch.rank === undefined) void refreshList();
    });
  };

  const handleMove = (itemId: string, toIndex: number) => {
    if (!bundle) return;
    const items = bundle.items;
    const from = items.findIndex((it) => it.id === itemId);
    if (from < 0) return;
    // Index in the list without the dragged item.
    const idx = toIndex - (from < toIndex ? 1 : 0);
    if (idx === from) return;
    const without = items.filter((it) => it.id !== itemId);
    const specId = bundle.spec.id;
    void run(async () => {
      const { rank } = await rankFor(specId, without, idx);
      await snapshot([specItemFileRel(specId, itemId)], 'reorder');
      setBundle(await updateSpecItem(specId, itemId, { rank }));
    });
  };

  const handleDeleteItem = (itemId: string) => {
    if (!bundle) return;
    const specId = bundle.spec.id;
    const item = bundle.items.find((it) => it.id === itemId);
    const anchorFile = anchorFileOf(item);
    void run(async () => {
      await snapshot([specItemFileRel(specId, itemId), anchorFile], isAnnotation(item!) ? 'delete annotation' : 'delete heading');
      const b = await deleteSpecItem(specId, itemId);
      setBundle(b);
      if (view.level === 'item' && view.itemId === itemId) setView({ level: 'doc', specId });
      void refreshList();
    }, !!anchorFile);
  };

  const handleReanchor = (itemId: string, pin: boolean) => {
    if (!bundle) return;
    const specId = bundle.spec.id;
    const item = bundle.items.find((it) => it.id === itemId);
    const oldFile = anchorFileOf(item);
    const newFile = pin && activeIframeTab === 'app' && activeData?.file && activeData?.nameEnd ? activeData.file : '';
    if (pin && !newFile) { setError('Select an element on the App canvas first.'); return; }
    void run(async () => {
      await snapshot([specItemFileRel(specId, itemId), oldFile, newFile], pin ? 'pin annotation' : 'unpin annotation');
      setBundle(await reanchorSpecItem(specId, itemId, newFile || undefined, newFile ? activeData!.nameEnd : undefined));
    }, true);
  };

  // ── export ────────────────────────────────────────────────────────────────────
  const handleExport = (specId: string, action: SpecExportAction) => run(async () => {
    if (action === 'copy') {
      const b = bundle && bundle.spec.id === specId ? bundle : await fetchSpec(specId);
      await copySpecForDocs(b, publishedUrl);
      emitToast({ message: 'Copied — paste into Notion or Google Docs', variant: 'success', durationMs: 2000 });
      return;
    }
    const { content, filename } = await exportSpec(specId, action, publishedUrl);
    downloadText(content, filename, action === 'html' ? 'text/html' : 'text/markdown');
  });

  // ── navigation ────────────────────────────────────────────────────────────────
  const openAnnotation = useCallback((a: SpecAnnotation) => {
    if (!bundle) return;
    setHighlightId(a.id);
    setView({ level: 'item', specId: bundle.spec.id, itemId: a.id });
    navigateToAnnotation(a);
  }, [bundle, setView]);

  const activeItem = view.level === 'item' && bundle ? bundle.items.find((it) => it.id === view.itemId) : undefined;
  const activeAnnotation = activeItem && isAnnotation(activeItem) ? activeItem : undefined;

  // Prev / Next walk the annotations that pass the current search + filters.
  const navList = useMemo(
    () => (bundle ? annotationsOf(bundle.items).filter((a) => annotationMatches(a, query, statusFilter)) : []),
    [bundle, query, statusFilter],
  );
  const navIndex = activeAnnotation ? navList.findIndex((a) => a.id === activeAnnotation.id) : -1;
  const step = useCallback((delta: number) => {
    const next = navIndex >= 0 ? navList[navIndex + delta] : undefined;
    if (next) openAnnotation(next);
  }, [navIndex, navList, openAnnotation]);

  useEffect(() => {
    if (!isActive || view.level !== 'item') return;
    const onKey = (e: KeyboardEvent) => {
      if (isTypingInput(e.target as HTMLElement | null)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isActive, view.level, step]);

  // Is the pinned element on the canvas right now? Polled briefly after opening
  // so the check survives the iframe navigation the open triggers.
  useEffect(() => {
    if (!activeAnnotation?.anchor) { setAnchorFound(null); return; }
    const sel = specIdSelector(activeAnnotation.id);
    let attempts = 0;
    let timer = 0;
    const check = () => {
      const doc = appIframeDocument();
      if (doc?.querySelector(sel)) { setAnchorFound(true); return; }
      if (++attempts < 20) timer = window.setTimeout(check, 200);
      else setAnchorFound(false);
    };
    setAnchorFound(null);
    timer = window.setTimeout(check, 150);
    return () => clearTimeout(timer);
  }, [activeAnnotation?.id, activeAnnotation?.anchor]);

  // ── profile gate ──────────────────────────────────────────────────────────────
  const handleProfileSave = (name: string, email: string) => {
    const saved = saveUser(name, email);
    setProfileOpen(false);
    const pending = pendingActionRef.current;
    pendingActionRef.current = null;
    if (pending) pending(saved);
  };

  // ── render ────────────────────────────────────────────────────────────────────
  const canRepin = activeIframeTab === 'app' && !!currentBaseTarget && !!activeData?.file && !!activeData?.nameEnd;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', backgroundColor: theme.bg_strong, fontFamily: theme.font_ui }}>
      {error && (
        <div style={{ padding: '8px 16px', fontSize: 12, color: theme.destructive_default, background: theme.destructive_low, flexShrink: 0 }}>
          {error}
        </div>
      )}

      {view.level === 'docs' && (
        <SpecsDocList
          specs={specs}
          publishedUrl={publishedUrl}
          busy={busy}
          editingId={editingSpecId}
          onEditingDone={() => setEditingSpecId(null)}
          onOpen={(id) => { setQuery(''); setStatusFilter(new Set()); setView({ level: 'doc', specId: id }); }}
          onCreate={handleCreateSpec}
          onRename={handleRenameSpec}
          onDelete={(id) => setConfirm({ kind: 'spec', specId: id })}
          onExport={handleExport}
        />
      )}

      {view.level === 'doc' && bundle && bundle.spec.id === view.specId && (
        <SpecDocView
          bundle={bundle}
          busy={busy}
          query={query}
          setQuery={setQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          editingItemId={editingItemId}
          onEditingDone={() => setEditingItemId(null)}
          highlightId={highlightId}
          onBack={() => setView({ level: 'docs' })}
          onRename={(t) => handleRenameSpec(bundle.spec.id, t)}
          onOpenAnnotation={(id) => { const a = bundle.items.find((it) => it.id === id); if (a && isAnnotation(a)) openAnnotation(a); }}
          onInsert={handleInsert}
          onMove={handleMove}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          onExport={(a) => handleExport(bundle.spec.id, a)}
          onDeleteSpec={() => setConfirm({ kind: 'spec', specId: bundle.spec.id })}
          initialScrollTop={listScrollTop.current}
          onScrollChange={(v) => { listScrollTop.current = v; }}
        />
      )}

      {view.level === 'item' && bundle && activeAnnotation && (
        <SpecAnnotationView
          bundle={bundle}
          item={activeAnnotation}
          position={navIndex >= 0 ? { index: navIndex + 1, total: navList.length } : null}
          busy={busy}
          autoEditText={autoEditTextId === activeAnnotation.id}
          onAutoEditDone={() => setAutoEditTextId(null)}
          canRepin={canRepin}
          anchorFound={anchorFound}
          onBack={() => setView({ level: 'doc', specId: bundle.spec.id })}
          onPrev={navIndex > 0 ? () => step(-1) : undefined}
          onNext={navIndex >= 0 && navIndex < navList.length - 1 ? () => step(1) : undefined}
          onUpdate={(patch, note) => handleUpdateItem(activeAnnotation.id, patch, note)}
          onLocate={() => navigateToAnnotation(activeAnnotation)}
          onUpdateState={() => handleUpdateItem(activeAnnotation.id, { state: { tab: 'app', path: getCurrentAppPath() } }, 'update annotation state')}
          onRepin={() => handleReanchor(activeAnnotation.id, true)}
          onUnpin={() => handleReanchor(activeAnnotation.id, false)}
          onDelete={() => handleDeleteItem(activeAnnotation.id)}
        />
      )}

      {(view.level !== 'docs' && (!bundle || bundle.spec.id !== view.specId)) && (
        <div style={{ padding: 24, fontSize: 12, color: theme.text_tertiary }}>Loading…</div>
      )}

      <ConfirmDialog
        isOpen={!!confirm}
        title="Delete spec?"
        message={confirm ? `“${specs.find((s) => s.id === confirm.specId)?.title ?? 'This spec'}” and all its annotations will be deleted. You can undo this.` : ''}
        confirmLabel="Delete"
        onConfirm={() => { const c = confirm; setConfirm(null); if (c) void handleDeleteSpec(c.specId); }}
        onCancel={() => setConfirm(null)}
      />

      <UserProfileDialog
        isOpen={profileOpen}
        currentUser={user}
        onSave={handleProfileSave}
        onCancel={() => { setProfileOpen(false); pendingActionRef.current = null; }}
      />
    </div>
  );
};
