// plugins/protovibe/src/ui/components/CommentsTab.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  MessageSquarePlus, MessageSquare, ArrowLeft, Trash2, Pencil,
  CornerDownRight, MapPin, Copy, Check, Search, X, ChevronDown, Filter,
} from 'lucide-react';
import { useProtovibe } from '../context/ProtovibeContext';
import { theme } from '../theme';
import { takeSnapshot } from '../api/client';
import {
  fetchCommentThreads, createCommentThread, replyToThread, editComment,
  deleteComment, updateThreadStatus, deleteThread as deleteThreadApi,
} from '../api/comments';
import { useCommentUser, authorIsMe } from '../hooks/useCommentUser';
import { UserProfileDialog } from './comments/UserProfileDialog';
import { CommentAvatar } from './comments/CommentAvatar';
import {
  COMMENT_ATTR, COMMENT_STATUSES, threadFileName, makeCommentId, parseThreadIds,
} from '../../shared/comments';
import type {
  CommentThread, CommentItem, CommentAuthor, CommentContext, CommentStatus,
} from '../../shared/comments';
import type { IframeTab } from './ShellNavBar';

/** One comment matched by the search box, with its parent thread for navigation. */
interface CommentSearchHit {
  thread: CommentThread;
  comment: CommentItem;
}

// Presentation for each stable status id. Labels/colours are defined here only —
// the persisted value is the id (see CommentStatus in shared/comments), so
// renaming a label or tweaking a colour never breaks existing comment files.
const STATUS_CONFIG: Record<CommentStatus, { label: string; color: string }> = {
  minor:  { label: 'Minor',     color: theme.text_tertiary },
  todo:   { label: 'To do',     color: '#A78BFA' }, // purple — no theme token for it
  review: { label: 'To review', color: theme.warning_primary },
  closed: { label: 'Closed',    color: theme.success_default },
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '';
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** The newest message in a thread — shown in the list and used for sorting. */
function latestComment(thread: CommentThread) {
  return thread.comments[thread.comments.length - 1];
}

/** Epoch ms of a thread's most recent activity (newest comment, else createdAt). */
function lastActivity(thread: CommentThread): number {
  const last = latestComment(thread);
  const t = new Date(last?.createdAt || thread.createdAt).getTime();
  return isNaN(t) ? 0 : t;
}

function gatherSubtreeThreadIds(el: HTMLElement | null): string[] {
  if (!el) return [];
  const ids = new Set<string>();
  parseThreadIds(el.getAttribute(COMMENT_ATTR)).forEach((id) => ids.add(id));
  el.querySelectorAll(`[${COMMENT_ATTR}]`).forEach((n) => {
    parseThreadIds((n as HTMLElement).getAttribute(COMMENT_ATTR)).forEach((id) => ids.add(id));
  });
  return Array.from(ids);
}

// Ask the shell to bring the comment's context into view: switch to the right
// surface (App / Sketchpad / Components), navigate the app iframe to the saved
// URL or the sketchpad to the saved frame + coordinates, then select & scroll to
// the anchored element. The heavy lifting lives in ProtovibeApp, which owns the
// iframe refs and tab-switching.
function navigateToThread(thread: CommentThread) {
  window.dispatchEvent(new CustomEvent('pv-comment-navigate', {
    detail: { context: thread.context, threadId: thread.id },
  }));
}

function contextSummary(ctx: CommentContext | undefined): string {
  if (!ctx) return '';
  if (ctx.tab === 'components') return ctx.componentName ? `Components · ${ctx.componentName}` : 'Components';
  if (ctx.tab === 'sketchpad') return ctx.frameName ? `Sketchpad · ${ctx.frameName}` : 'Sketchpad';
  return ctx.pathname ? `App · ${ctx.pathname}` : 'App';
}

interface CommentsTabProps {
  activeIframeTab: IframeTab;
}

export const CommentsTab: React.FC<CommentsTabProps> = ({ activeIframeTab }) => {
  const {
    currentBaseTarget, activeData, activeSourceId, runLockedMutation,
  } = useProtovibe();
  const { user, saveUser } = useCommentUser();

  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [replyDraft, setReplyDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [filterToSelection, setFilterToSelection] = useState(true);
  const [statusFilter, setStatusFilter] = useState<CommentStatus | 'all'>('all');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile dialog + the action queued behind it.
  const [profileOpen, setProfileOpen] = useState(false);
  const pendingActionRef = React.useRef<((author: CommentAuthor) => void) | null>(null);

  const refresh = useCallback(async () => {
    try {
      setThreads(await fetchCommentThreads());
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh, activeIframeTab]);

  // Every time we land back on the threads list, re-fetch. This also re-runs the
  // subtreeIds memo (it reads the DOM attribute), so a comment just added to the
  // selected element shows up immediately under "Selection only" without the user
  // having to re-click the element on the canvas.
  useEffect(() => {
    if (activeThreadId === null) refresh();
  }, [activeThreadId, refresh]);

  // Keep in sync after undo/redo of comment files.
  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('pv-comments-refresh', handler);
    return () => window.removeEventListener('pv-comments-refresh', handler);
  }, [refresh]);

  const subtreeIds = useMemo(
    () => gatherSubtreeThreadIds(currentBaseTarget),
    [currentBaseTarget, threads],
  );

  // Raw `data-pv-comment-thread` value on the selected element (may list several
  // ids). Passed to the backend so a new comment appends to the existing list
  // instead of replacing it.
  const selectedAttr = currentBaseTarget?.getAttribute(COMMENT_ATTR) || null;

  const visibleThreads = useMemo(() => {
    let base = (filterToSelection && currentBaseTarget)
      ? threads.filter((t) => new Set(subtreeIds).has(t.id))
      : threads;
    if (statusFilter !== 'all') base = base.filter((t) => t.status === statusFilter);
    // Most recently active thread first.
    return [...base].sort((a, b) => lastActivity(b) - lastActivity(a));
  }, [threads, filterToSelection, currentBaseTarget, subtreeIds, statusFilter]);

  // Free-text search runs across every individual comment (not just threads),
  // newest first. Empty query ⇒ no results and we fall back to the thread list.
  const searchResults = useMemo<CommentSearchHit[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const hits: CommentSearchHit[] = [];
    for (const thread of threads) {
      for (const comment of thread.comments) {
        if (
          comment.content.toLowerCase().includes(q) ||
          comment.author.name.toLowerCase().includes(q)
        ) {
          hits.push({ thread, comment });
        }
      }
    }
    return hits.sort((a, b) =>
      new Date(b.comment.createdAt).getTime() - new Date(a.comment.createdAt).getTime());
  }, [threads, query]);

  const activeThread = activeThreadId ? threads.find((t) => t.id === activeThreadId) : undefined;

  // ── profile gate ───────────────────────────────────────────────────────────
  const withAuthor = useCallback((action: (author: CommentAuthor) => void) => {
    if (user) { action(user); return; }
    pendingActionRef.current = action;
    setProfileOpen(true);
  }, [user]);

  const handleProfileSave = (name: string, email: string) => {
    const saved = saveUser(name, email);
    setProfileOpen(false);
    const pending = pendingActionRef.current;
    pendingActionRef.current = null;
    if (pending) pending(saved);
  };

  const handleProfileCancel = () => {
    setProfileOpen(false);
    pendingActionRef.current = null;
  };

  // ── context capture ─────────────────────────────────────────────────────────
  const buildContext = useCallback((): CommentContext => {
    const file = activeData?.file;
    const ctx: CommentContext = { tab: activeIframeTab, file };
    const win = currentBaseTarget?.ownerDocument?.defaultView;
    if (activeIframeTab === 'app') {
      try {
        // Store only the part after the hostname (path + query + hash). The host
        // can differ between sessions/devices, but the relative target is stable
        // and is what we re-navigate the app iframe to when the comment is opened.
        const loc = win?.location;
        const rel = loc ? loc.pathname + loc.search + loc.hash : undefined;
        ctx.pathname = rel;
        ctx.url = rel;
      } catch { /* cross-origin guard */ }
    } else if (activeIframeTab === 'components') {
      const compEl = currentBaseTarget?.closest('[data-pv-component-id]') as HTMLElement | null;
      ctx.componentName = compEl?.getAttribute('data-pv-component-id') || activeData?.compName;
    } else if (activeIframeTab === 'sketchpad') {
      // Coordinates come from the element's absolute style; names are filled in
      // server-side from the sketchpad registry using the file path.
      const style = currentBaseTarget?.style;
      const left = style?.left ? parseFloat(style.left) : NaN;
      const top = style?.top ? parseFloat(style.top) : NaN;
      if (!isNaN(left) && !isNaN(top)) ctx.position = { x: left, y: top };
    }
    return ctx;
  }, [activeData, activeIframeTab, currentBaseTarget]);

  // ── mutations ────────────────────────────────────────────────────────────────
  const doCreateThread = useCallback((text: string, author: CommentAuthor) => {
    if (!activeData?.file || !activeData?.nameEnd) {
      setError('Select an element on the canvas before adding a comment.');
      return;
    }
    const id = makeCommentId();
    const nowIso = new Date().toISOString();
    // New threads start untriaged — status is only set when a reviewer picks one.
    const thread: CommentThread = {
      id,
      context: buildContext(),
      comments: [{ id: `c-${makeCommentId()}`, author, content: text.trim(), createdAt: nowIso }],
      createdAt: nowIso,
      anchorFile: activeData.file,
    };
    const commentFile = `src/comments/${threadFileName(id)}`;
    const existingAttr = selectedAttr || undefined;

    setBusy(true);
    setError(null);
    runLockedMutation(async () => {
      // Snapshot the source file AND the not-yet-created thread file (captured
      // as empty) so a single Cmd+Z removes both the attribute and the file.
      await takeSnapshot(activeData.file, activeSourceId || '', [commentFile], 'add comment');
      await createCommentThread({ file: activeData.file, nameEnd: activeData.nameEnd, thread, existingAttr });
    }).then(async () => {
      await refresh();
      setComposerOpen(false);
      setDraft('');
      setActiveThreadId(id);
    }).catch((e) => setError(String(e))).finally(() => setBusy(false));
  }, [activeData, activeSourceId, buildContext, runLockedMutation, refresh, selectedAttr]);

  // Comment-file-only mutation helper (reply / edit / delete reply / status).
  const mutateThreadFile = useCallback(async (
    threadId: string, note: string, fn: () => Promise<CommentThread | void>,
  ) => {
    setBusy(true);
    setError(null);
    try {
      await takeSnapshot(`src/comments/${threadFileName(threadId)}`, activeSourceId || '', undefined, note);
      await fn();
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }, [activeSourceId, refresh]);

  const doReply = (thread: CommentThread, text: string, author: CommentAuthor) =>
    mutateThreadFile(thread.id, 'reply to comment', () =>
      replyToThread(thread.id, {
        id: `c-${makeCommentId()}`, author, content: text.trim(), createdAt: new Date().toISOString(),
      }),
    ).then(() => setReplyDraft(''));

  const handleStatus = (thread: CommentThread, status: CommentStatus | null) =>
    mutateThreadFile(thread.id, status ? `comment status: ${status}` : 'clear comment status',
      () => updateThreadStatus(thread.id, status));

  const handleEditSave = (thread: CommentThread, commentId: string) =>
    mutateThreadFile(thread.id, 'edit comment', () => editComment(thread.id, commentId, editingText.trim()))
      .then(() => { setEditingId(null); setEditingText(''); });

  const handleDeleteReply = (thread: CommentThread, commentId: string) =>
    mutateThreadFile(thread.id, 'delete comment', () => deleteComment(thread.id, commentId));

  const handleDeleteThread = (thread: CommentThread) => {
    setBusy(true);
    setError(null);
    const anchor = thread.anchorFile || thread.context?.file;
    const commentFile = `src/comments/${threadFileName(thread.id)}`;
    runLockedMutation(async () => {
      // Snapshot the source (attribute removal) and the thread file (deletion)
      // together so one Cmd+Z restores both.
      await takeSnapshot(anchor || commentFile, activeSourceId || '', anchor ? [commentFile] : undefined, 'delete comment thread');
      await deleteThreadApi(thread.id);
    }).then(async () => {
      await refresh();
      setActiveThreadId(null);
    }).catch((e) => setError(String(e))).finally(() => setBusy(false));
  };

  // ── navigation ───────────────────────────────────────────────────────────────
  const openThread = (thread: CommentThread) => {
    setActiveThreadId(thread.id);
    setEditingId(null);
    setReplyDraft('');
    navigateToThread(thread);
  };

  const handleAddCommentClick = () => {
    // An element can carry several threads — always start a fresh comment; the
    // backend appends the new id to any existing data-pv-comment-thread list.
    setComposerOpen(true);
    setError(null);
  };

  const submitComposer = () => {
    const text = draft.trim();
    if (!text) return;
    withAuthor((author) => doCreateThread(text, author));
  };

  const canComment = !!activeData?.file && !!activeData?.nameEnd;

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', backgroundColor: theme.bg_strong, fontFamily: theme.font_ui }}>
      {/* In a thread the panel header is the thread's own header (with its
          "Back to all threads" link); the top bar only shows on the list. */}
      {!activeThread && (
        <Header user={user} onEditProfile={() => setProfileOpen(true)} />
      )}

      {error && (
        <div style={{ padding: '8px 16px', fontSize: 12, color: theme.destructive_default, background: theme.destructive_low }}>
          {error}
        </div>
      )}

      {activeThread ? (
        <ThreadView
          thread={activeThread}
          user={user}
          busy={busy}
          replyDraft={replyDraft}
          setReplyDraft={setReplyDraft}
          editingId={editingId}
          editingText={editingText}
          setEditingId={setEditingId}
          setEditingText={setEditingText}
          onReply={(text) => withAuthor((author) => doReply(activeThread, text, author))}
          onStatus={(s) => handleStatus(activeThread, s)}
          onEditSave={(cid) => handleEditSave(activeThread, cid)}
          onDeleteReply={(cid) => handleDeleteReply(activeThread, cid)}
          onDeleteThread={() => handleDeleteThread(activeThread)}
          onLocate={() => navigateToThread(activeThread)}
          onBack={() => setActiveThreadId(null)}
        />
      ) : (
        <ListView
          user={user}
          threads={visibleThreads}
          totalCount={threads.length}
          canComment={canComment}
          hasSelection={!!currentBaseTarget}
          composerOpen={composerOpen}
          draft={draft}
          setDraft={setDraft}
          busy={busy}
          query={query}
          setQuery={setQuery}
          searchResults={searchResults}
          filterToSelection={filterToSelection}
          setFilterToSelection={setFilterToSelection}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onAddClick={handleAddCommentClick}
          onSubmitComposer={submitComposer}
          onCancelComposer={() => { setComposerOpen(false); setDraft(''); }}
          onOpenThread={openThread}
        />
      )}

      <UserProfileDialog
        isOpen={profileOpen}
        currentUser={user}
        onSave={handleProfileSave}
        onCancel={handleProfileCancel}
      />
    </div>
  );
};

// ── header ─────────────────────────────────────────────────────────────────────
const Header: React.FC<{
  user: CommentAuthor | null;
  onEditProfile: () => void;
}> = ({ user, onEditProfile }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', borderBottom: `1px solid ${theme.border_default}`, flexShrink: 0,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: theme.text_default }}>
        Comments & Notes
      </span>
    </div>
    {user ? (
      <button onClick={onEditProfile} data-tooltip={`${user.name} — edit profile`} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>
        <CommentAvatar name={user.name} email={user.email} size={24} mine />
      </button>
    ) : (
      <button onClick={onEditProfile} style={{ background: 'transparent', border: 'none', color: theme.accent_default, fontSize: 12, cursor: 'pointer', fontFamily: theme.font_ui }}>
        Set profile
      </button>
    )}
  </div>
);

// ── list view ──────────────────────────────────────────────────────────────────
const ListView: React.FC<{
  user: CommentAuthor | null;
  threads: CommentThread[];
  totalCount: number;
  canComment: boolean;
  hasSelection: boolean;
  composerOpen: boolean;
  draft: string;
  setDraft: (s: string) => void;
  busy: boolean;
  query: string;
  setQuery: (s: string) => void;
  searchResults: CommentSearchHit[];
  filterToSelection: boolean;
  setFilterToSelection: (v: boolean) => void;
  statusFilter: CommentStatus | 'all';
  setStatusFilter: (s: CommentStatus | 'all') => void;
  onAddClick: () => void;
  onSubmitComposer: () => void;
  onCancelComposer: () => void;
  onOpenThread: (t: CommentThread) => void;
}> = (p) => {
  const searching = p.query.trim().length > 0;
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Non-default filters worth surfacing on the collapsed "Filters" header.
  const activeFilters = (searching ? 1 : 0) + (p.statusFilter !== 'all' ? 1 : 0) + (p.filterToSelection ? 1 : 0);
  return (
    <>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border_default}`, flexShrink: 0 }}>
        {p.composerOpen ? (
          <Composer
            value={p.draft}
            onChange={p.setDraft}
            onSubmit={p.onSubmitComposer}
            onCancel={p.onCancelComposer}
            busy={p.busy}
            placeholder="Write a comment for the selected element…"
            submitLabel="Comment"
          />
        ) : (
          <button
            onClick={p.onAddClick}
            disabled={!p.canComment}
            data-tooltip={p.canComment ? undefined : 'Select an element on the canvas first'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '9px 12px', borderRadius: 6, border: 'none',
              background: p.canComment ? theme.accent_default : theme.bg_tertiary,
              color: p.canComment ? '#fff' : theme.text_tertiary,
              fontSize: 13, fontWeight: 600, cursor: p.canComment ? 'pointer' : 'not-allowed',
              fontFamily: theme.font_ui,
            }}
          >
            <MessageSquarePlus size={15} />
            Add comment
          </button>
        )}
      </div>

      {/* Search + filters live in a collapsible panel below the Add-comment
          divider. The status/selection filters are hidden while searching, since
          search spans every comment regardless of selection or status. */}
      <div style={{ borderBottom: `1px solid ${theme.border_default}`, flexShrink: 0 }}>
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '9px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
            color: theme.text_secondary, fontSize: 12, fontWeight: 600, fontFamily: theme.font_ui,
          }}
        >
          <Filter size={14} />
          <span>Filter comments</span>
          {activeFilters > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999,
              background: theme.accent_default, color: '#fff', fontSize: 9, fontWeight: 700,
            }}>
              {activeFilters}
            </span>
          )}
          <div style={{ flex: 1 }} />
          <ChevronDown size={15} style={{ transform: filtersOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', color: theme.text_tertiary }} />
        </button>
        {filtersOpen && (
          <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SearchField value={p.query} onChange={p.setQuery} />
            {!searching && (
              <>
                <Segmented
                  value={p.filterToSelection ? 'selection' : 'all'}
                  onChange={(v) => p.setFilterToSelection(v === 'selection')}
                  options={[
                    { val: 'all', label: 'All comments' },
                    { val: 'selection', label: 'Selection only' },
                  ]}
                />
                <StatusFilter value={p.statusFilter} onChange={p.setStatusFilter} />
              </>
            )}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {searching ? (
          p.searchResults.length === 0 ? (
            <EmptyState text={`No comments match “${p.query.trim()}”.`} />
          ) : (
            p.searchResults.map((hit) => (
              <SearchResultItem
                key={`${hit.thread.id}-${hit.comment.id}`}
                hit={hit}
                user={p.user}
                query={p.query.trim()}
                onClick={() => p.onOpenThread(hit.thread)}
              />
            ))
          )
        ) : p.threads.length === 0 ? (
          <EmptyState text={
            p.statusFilter !== 'all'
              ? `No ${STATUS_CONFIG[p.statusFilter].label} comments.`
              : p.filterToSelection
                ? (p.hasSelection ? 'No comments on this element yet.' : 'Select an element to see its comments, or switch to All comments.')
                : 'No comments yet. Select an element and add the first one.'
          } />
        ) : (
          p.threads.map((t) => <ThreadListItem key={t.id} thread={t} user={p.user} onClick={() => p.onOpenThread(t)} />)
        )}
      </div>
    </>
  );
};

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ padding: '40px 24px', textAlign: 'center', color: theme.text_tertiary, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
    <MessageSquare size={40} strokeWidth={1.5} style={{ opacity: 0.5 }} />
    <span style={{ fontSize: 13 }}>{text}</span>
  </div>
);

const SearchField: React.FC<{ value: string; onChange: (s: string) => void }> = ({ value, onChange }) => (
  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
    <Search size={13} style={{ position: 'absolute', left: 9, color: theme.text_tertiary, pointerEvents: 'none' }} />
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Escape' && value) { e.preventDefault(); onChange(''); } }}
      placeholder="Search all comments…"
      style={{
        width: '100%', boxSizing: 'border-box', padding: '7px 28px 7px 28px',
        background: theme.bg_secondary, border: `1px solid ${theme.border_default}`, borderRadius: 6,
        color: theme.text_default, fontSize: 12, outline: 'none', fontFamily: theme.font_ui,
      }}
    />
    {value && (
      <button onClick={() => onChange('')} data-tooltip="Clear search" style={{ position: 'absolute', right: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 4, border: 'none', background: 'transparent', color: theme.text_tertiary, cursor: 'pointer', padding: 0 }}>
        <X size={13} />
      </button>
    )}
  </div>
);

// Inspector-style segmented control (self-contained; no source mutation).
const Segmented: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { val: string; label: string }[];
}> = ({ value, onChange, options }) => (
  <div style={{ display: 'flex', background: theme.bg_secondary, borderRadius: 4, border: `1px solid ${theme.border_default}`, overflow: 'hidden' }}>
    {options.map((o, idx) => {
      const active = value === o.val;
      return (
        <React.Fragment key={o.val}>
          {idx > 0 && <div style={{ width: 1, background: theme.border_default }} />}
          <button
            onClick={() => onChange(o.val)}
            style={{
              flex: 1, padding: '5px 8px', border: 'none', cursor: 'pointer',
              background: active ? theme.bg_tertiary : 'transparent',
              color: active ? theme.accent_default : theme.text_tertiary,
              fontSize: 11, fontWeight: 600, fontFamily: theme.font_ui,
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {o.label}
          </button>
        </React.Fragment>
      );
    })}
  </div>
);

// Single-select status filter rendered as small toggle pills.
const StatusFilter: React.FC<{
  value: CommentStatus | 'all';
  onChange: (s: CommentStatus | 'all') => void;
}> = ({ value, onChange }) => {
  const options: (CommentStatus | 'all')[] = ['all', ...COMMENT_STATUSES];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map((s) => {
        const active = value === s;
        const color = s === 'all' ? theme.text_secondary : STATUS_CONFIG[s].color;
        return (
          <button
            key={s}
            onClick={() => onChange(s)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999,
              border: `1px solid ${active ? color : theme.border_default}`,
              background: active ? `${color}22` : 'transparent',
              color: active ? theme.text_default : theme.text_tertiary,
              fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: theme.font_ui,
            }}
          >
            {s !== 'all' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />}
            {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
          </button>
        );
      })}
    </div>
  );
};

const SearchResultItem: React.FC<{
  hit: CommentSearchHit;
  user: CommentAuthor | null;
  query: string;
  onClick: () => void;
}> = ({ hit, user, query, onClick }) => {
  const { thread, comment } = hit;
  const dimmed = thread.status === 'closed';
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', gap: 6, width: '100%', textAlign: 'left',
        padding: '10px 16px', background: 'transparent', border: 'none', borderBottom: `1px solid ${theme.border_default}`,
        cursor: 'pointer', fontFamily: theme.font_ui, opacity: dimmed ? 0.55 : 1,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = theme.bg_low)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <CommentAvatar name={comment.author.name} email={comment.author.email} size={22} mine={authorIsMe(user, comment.author)} />
        <span style={{ fontSize: 12, fontWeight: 600, color: theme.text_default, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {comment.author.name}
        </span>
        <StatusBadge status={thread.status} />
      </div>
      <span style={{ fontSize: 12, color: theme.text_default, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        <Highlight text={comment.content} query={query} />
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: theme.text_tertiary }}>
        <span>{contextSummary(thread.context)}</span>
        <span>·</span>
        <span>{relativeTime(comment.createdAt)}</span>
      </div>
    </button>
  );
};

// Highlights the matched substring within a comment snippet.
const Highlight: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0 || !query) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span style={{ background: `${theme.warning_primary}44`, color: theme.text_default, borderRadius: 2 }}>
        {text.slice(i, i + query.length)}
      </span>
      {text.slice(i + query.length)}
    </>
  );
};

const ThreadListItem: React.FC<{ thread: CommentThread; user: CommentAuthor | null; onClick: () => void }> = ({ thread, user, onClick }) => {
  // Surface the most recent message so the list reflects fresh activity.
  const latest = latestComment(thread);
  const replies = thread.comments.length - 1;
  const dimmed = thread.status === 'closed';
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', gap: 8, width: '100%', textAlign: 'left',
        padding: '10px 16px', background: 'transparent', border: 'none', borderBottom: `1px solid ${theme.border_default}`,
        cursor: 'pointer', fontFamily: theme.font_ui, opacity: dimmed ? 0.55 : 1,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = theme.bg_low)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {latest && <CommentAvatar name={latest.author.name} email={latest.author.email} size={22} mine={authorIsMe(user, latest.author)} />}
      {/* Content column is indented past the avatar, mirroring the thread view. */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: theme.text_default, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {latest?.author.name || 'Unknown'}
          </span>
          <span style={{ fontSize: 10, color: theme.text_tertiary, flexShrink: 0 }}>{latest ? relativeTime(latest.createdAt) : ''}</span>
          <div style={{ flex: 1 }} />
          <StatusBadge status={thread.status} />
        </div>
        <span style={{ fontSize: 12, color: theme.text_default, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {latest?.content}
        </span>
        {replies > 0 && (
          <span style={{ fontSize: 10, color: theme.text_tertiary }}>{replies} {replies === 1 ? 'reply' : 'replies'}</span>
        )}
      </div>
    </button>
  );
};

// ── thread detail ───────────────────────────────────────────────────────────────
const ThreadView: React.FC<{
  thread: CommentThread;
  user: CommentAuthor | null;
  busy: boolean;
  replyDraft: string;
  setReplyDraft: (s: string) => void;
  editingId: string | null;
  editingText: string;
  setEditingId: (id: string | null) => void;
  setEditingText: (s: string) => void;
  onReply: (text: string) => void;
  onStatus: (s: CommentStatus | null) => void;
  onEditSave: (commentId: string) => void;
  onDeleteReply: (commentId: string) => void;
  onDeleteThread: () => void;
  onLocate: () => void;
  onBack: () => void;
}> = (p) => {
  const { thread } = p;
  const scrollRef = useRef<HTMLDivElement>(null);
  // Jump to the newest comment whenever the thread opens or a message is added.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread.id, thread.comments.length]);
  return (
    <>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border_default}`, display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
        <button
          onClick={p.onBack}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
            padding: '3px 6px', marginLeft: -6, borderRadius: 5, border: 'none', background: 'transparent',
            color: theme.text_tertiary, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: theme.font_ui,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = theme.bg_low; e.currentTarget.style.color = theme.text_secondary; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.text_tertiary; }}
        >
          <ArrowLeft size={13} />
          Back to all threads
        </button>
        <div style={{ height: 1, background: theme.border_default }} />
        {/* Primary header = thread id (copyable for AI), secondary = its context.
            Locate/delete share the title line so they align with the copy icon. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: theme.text_default }}>
              Thread {thread.id}
            </span>
            <CopyIdButton id={thread.id} />
            <div style={{ flex: 1 }} />
            <button onClick={p.onLocate} data-tooltip="Select element on canvas" style={iconBtnSm}><MapPin size={13} /></button>
            <ConfirmDeleteButton
              tooltip="Delete thread"
              message="Delete this whole thread? This removes the comment marker from the element."
              confirmLabel="Delete thread"
              iconSize={13}
              style={iconBtnSm}
              onConfirm={p.onDeleteThread}
            />
          </div>
          <span style={{ fontSize: 11, color: theme.text_tertiary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {contextSummary(thread.context)}
          </span>
        </div>
        <StatusDropdown status={thread.status} busy={p.busy} onChange={p.onStatus} />
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {thread.comments.map((c, idx) => {
          const isEditing = p.editingId === c.id;
          const mine = authorIsMe(p.user, c.author);
          return (
            <div key={c.id} style={{ display: 'flex', gap: 8 }}>
              <CommentAvatar name={c.author.name} email={c.author.email} size={26} mine={mine} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: theme.text_default }}>{c.author.name}</span>
                  <span style={{ fontSize: 10, color: theme.text_tertiary }}>{relativeTime(c.createdAt)}{c.updatedAt ? ' · edited' : ''}</span>
                  <div style={{ flex: 1 }} />
                  {mine && !isEditing && (
                    <>
                      <button onClick={() => { p.setEditingId(c.id); p.setEditingText(c.content); }} data-tooltip="Edit" style={iconBtnSm}><Pencil size={12} /></button>
                      {idx > 0 && (
                        <ConfirmDeleteButton
                          tooltip="Delete"
                          message="Delete this comment?"
                          confirmLabel="Delete"
                          iconSize={12}
                          style={iconBtnSm}
                          onConfirm={() => p.onDeleteReply(c.id)}
                        />
                      )}
                    </>
                  )}
                </div>
                {isEditing ? (
                  <div style={{ marginTop: 6 }}>
                    <Composer
                      value={p.editingText}
                      onChange={p.setEditingText}
                      onSubmit={() => p.onEditSave(c.id)}
                      onCancel={() => { p.setEditingId(null); p.setEditingText(''); }}
                      busy={p.busy}
                      placeholder="Edit comment…"
                      submitLabel="Save"
                    />
                  </div>
                ) : (
                  <div style={{ marginTop: 3, fontSize: 13, color: theme.text_default, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {c.content}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '12px 16px', borderTop: `1px solid ${theme.border_default}`, flexShrink: 0 }}>
        <Composer
          value={p.replyDraft}
          onChange={p.setReplyDraft}
          onSubmit={() => { if (p.replyDraft.trim()) p.onReply(p.replyDraft); }}
          busy={p.busy}
          placeholder="Reply…"
          submitLabel="Reply"
          submitIcon={<CornerDownRight size={13} />}
        />
      </div>
    </>
  );
};

// ── shared composer ─────────────────────────────────────────────────────────────
const Composer: React.FC<{
  value: string;
  onChange: (s: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  busy: boolean;
  placeholder: string;
  submitLabel: string;
  submitIcon?: React.ReactNode;
}> = ({ value, onChange, onSubmit, onCancel, busy, placeholder, submitLabel, submitIcon }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <textarea
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); onSubmit(); }
        if (e.key === 'Escape' && onCancel) { e.preventDefault(); onCancel(); }
      }}
      placeholder={placeholder}
      rows={3}
      style={{
        width: '100%', resize: 'vertical', minHeight: 56, boxSizing: 'border-box',
        background: theme.bg_secondary, border: `1px solid ${theme.border_default}`, borderRadius: 6,
        padding: '8px 10px', color: theme.text_default, fontSize: 13, outline: 'none',
        fontFamily: theme.font_ui, lineHeight: 1.4,
      }}
    />
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
      {onCancel && (
        <button onClick={onCancel} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${theme.border_default}`, background: 'transparent', color: theme.text_secondary, fontSize: 12, cursor: 'pointer', fontFamily: theme.font_ui }}>
          Cancel
        </button>
      )}
      <button
        onClick={onSubmit}
        disabled={busy || !value.trim()}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: 'none',
          background: value.trim() && !busy ? theme.accent_default : theme.bg_tertiary,
          color: value.trim() && !busy ? '#fff' : theme.text_tertiary,
          fontSize: 12, fontWeight: 600, cursor: value.trim() && !busy ? 'pointer' : 'not-allowed', fontFamily: theme.font_ui,
        }}
      >
        {submitIcon}
        {submitLabel}
      </button>
    </div>
  </div>
);

const StatusBadge: React.FC<{ status?: CommentStatus }> = ({ status }) => {
  if (!status) return null; // untriaged threads show no badge
  const { label, color } = STATUS_CONFIG[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
      padding: '2px 7px', borderRadius: 999, background: `${color}22`,
      color, fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      {label}
    </span>
  );
};

// Custom status picker (portaled menu so the inspector's overflow:hidden doesn't
// clip it). Collapsed trigger shows the current status — or "No status" — and
// takes on the status colour, mirroring the list badge. The menu lists "No
// status" plus each colour-coded status; picking "No status" clears the field.
const STATUS_MENU: (CommentStatus | null)[] = [null, ...COMMENT_STATUSES];

const StatusDropdown: React.FC<{
  status?: CommentStatus;
  busy: boolean;
  onChange: (s: CommentStatus | null) => void;
}> = ({ status, busy, onChange }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const toggle = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  const color = status ? STATUS_CONFIG[status].color : theme.text_tertiary;
  const label = status ? STATUS_CONFIG[status].label : 'No status';
  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        disabled={busy}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
          padding: '5px 10px', borderRadius: 6,
          border: `1px solid ${status ? color : theme.border_default}`,
          background: status ? `${color}1f` : theme.bg_secondary,
          color: status ? theme.text_default : theme.text_secondary,
          fontSize: 11, fontWeight: 600, cursor: busy ? 'default' : 'pointer', fontFamily: theme.font_ui,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span>{label}</span>
        <ChevronDown size={13} style={{ opacity: 0.6, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      {open && pos && createPortal(
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 2147483646 }} />
          <div style={{
            position: 'fixed', top: pos.top, left: pos.left, width: Math.max(pos.width, 160), zIndex: 2147483647,
            background: theme.bg_secondary, border: `1px solid ${theme.border_default}`, borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.28)', padding: 4,
            display: 'flex', flexDirection: 'column', gap: 2, fontFamily: theme.font_ui,
          }}>
            {STATUS_MENU.map((s) => {
              const c = s ? STATUS_CONFIG[s].color : theme.text_tertiary;
              const itemLabel = s ? STATUS_CONFIG[s].label : 'No status';
              const selected = (status ?? null) === s;
              return (
                <button
                  key={s ?? 'none'}
                  onClick={() => { setOpen(false); onChange(s); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 5,
                    border: 'none', background: selected ? theme.bg_tertiary : 'transparent',
                    color: theme.text_default, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    fontFamily: theme.font_ui, textAlign: 'left',
                  }}
                  onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = theme.bg_low; }}
                  onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{itemLabel}</span>
                  {selected && <Check size={13} style={{ color: theme.accent_default }} />}
                </button>
              );
            })}
          </div>
        </>,
        document.body,
      )}
    </>
  );
};

// Copy-to-clipboard button for a thread id, with a transient check confirmation.
const CopyIdButton: React.FC<{ id: string }> = ({ id }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    try { navigator.clipboard?.writeText(id); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} data-tooltip="Copy comment ID" style={iconBtnSm}>
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
};

// A trash button that opens a small floating confirmation card (portaled to body
// so the inspector's overflow:hidden doesn't clip it) instead of a native prompt.
const ConfirmDeleteButton: React.FC<{
  tooltip: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  iconSize?: number;
  style?: React.CSSProperties;
}> = ({ tooltip, message, confirmLabel, onConfirm, iconSize = 14, style }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const toggle = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  return (
    <>
      <button ref={btnRef} onClick={toggle} data-tooltip={tooltip} style={style || iconBtn}>
        <Trash2 size={iconSize} />
      </button>
      {open && pos && createPortal(
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 2147483646 }} />
          <div style={{
            position: 'fixed', top: pos.top, right: pos.right, zIndex: 2147483647, width: 224,
            background: theme.bg_secondary, border: `1px solid ${theme.border_default}`, borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.28)', padding: 12,
            display: 'flex', flexDirection: 'column', gap: 10, fontFamily: theme.font_ui,
          }}>
            <span style={{ fontSize: 12, color: theme.text_secondary, lineHeight: 1.4 }}>{message}</span>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setOpen(false)} style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${theme.border_default}`, background: 'transparent', color: theme.text_secondary, fontSize: 12, cursor: 'pointer', fontFamily: theme.font_ui }}>
                Cancel
              </button>
              <button onClick={() => { setOpen(false); onConfirm(); }} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: theme.destructive_default, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: theme.font_ui }}>
                {confirmLabel}
              </button>
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  );
};

const iconBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26,
  borderRadius: 4, border: 'none', background: 'transparent', color: theme.text_tertiary, cursor: 'pointer',
};
const iconBtnSm: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20,
  borderRadius: 3, border: 'none', background: 'transparent', color: theme.text_tertiary, cursor: 'pointer', padding: 0,
};
