// plugins/protovibe/src/ui/components/CommentsTab.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  MessageSquarePlus, MessageSquare, ArrowLeft, Trash2, Pencil,
  CornerDownRight, MapPin, Copy, Check, Search, X, ChevronDown, Filter,
  MoreHorizontal, CheckCheck, Eye, Smile, ImagePlus,
} from 'lucide-react';
import { useProtovibe } from '../context/ProtovibeContext';
import { theme, primarySolidHover } from '../theme';
import { takeSnapshot } from '../api/client';
import {
  fetchCommentThreads, createCommentThread, replyToThread, editComment,
  deleteComment, updateThreadStatus, deleteThread as deleteThreadApi,
  setCommentSeen, markAllCommentsRead, uploadCommentAttachment,
} from '../api/comments';
import { emitToast } from '../events/toast';
import { useCommentUser, authorIsMe, commentSeenByMe, threadHasUnread } from '../hooks/useCommentUser';
import { useViewportCommentIds } from '../hooks/useViewportCommentIds';
import { UserProfileDialog } from './comments/UserProfileDialog';
import { CommentAvatar } from './comments/CommentAvatar';
import {
  COMMENT_STATUSES, threadFileName, makeCommentId, readCommentIds, commentAttachmentUrl,
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

/**
 * An image staged in a composer but not yet uploaded. We hold the raw File and a
 * local object-URL for the preview, and only upload on submit (so abandoned drafts
 * never touch the backend). `id` is just a local React key.
 */
interface PendingAttachment {
  id: string;
  file: File;
  previewUrl: string;
}

/** Wrap picked/pasted/dropped Files as previewable pending attachments (images only). */
function toPendingAttachments(files: Iterable<File>): PendingAttachment[] {
  const out: PendingAttachment[] = [];
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    out.push({ id: `a-${makeCommentId()}`, file, previewUrl: URL.createObjectURL(file) });
  }
  return out;
}

/** Upload each staged attachment and return the stored filenames, in order. */
function uploadPendingAttachments(pending: PendingAttachment[]): Promise<string[]> {
  return Promise.all(pending.map((a) => uploadCommentAttachment(a.file)));
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
  // Each thread is its own `data-pv-comment-{id}` attribute, so there is no single
  // selector for "any comment" — read ids straight off the element and every
  // descendant. This is the only O(subtree) op; callers gate it (see subtreeIds).
  const collect = (node: Element) => {
    for (const id of readCommentIds(node.getAttributeNames())) ids.add(id);
  };
  collect(el);
  el.querySelectorAll('*').forEach(collect);
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

// A filter pill is either a status ('minor'…'closed'), 'none' (untriaged), or one
// of the cross-cutting toggles. The active pills live in a Set; an empty Set means
// "All". Status pills OR within their group; the toggles AND on top.
type FilterToken = CommentStatus | 'none' | 'unread' | 'mine';
const VALID_TOKENS = new Set<string>([...COMMENT_STATUSES, 'none', 'unread', 'mine']);

// Which elements the thread list is scoped to: every element ('all'), only those
// visible in the active surface's viewport ('viewport'), or only the current
// selection's subtree ('selection').
type FilterScope = 'all' | 'viewport' | 'selection';

// Persisted filter preferences (remembered across sessions). Scope defaults to
// "Any element"; the pill set defaults to empty ("All").
const FILTER_SCOPE_KEY = 'pv-comments-filter-scope';
const FILTER_SELECTION_KEY = 'pv-comments-filter-selection'; // legacy boolean scope key (migrated)
const FILTER_STATUS_KEY = 'pv-comments-filter-status'; // legacy single-status key (migrated)
const FILTER_TOKENS_KEY = 'pv-comments-filter-tokens';

function loadFilterScope(): FilterScope {
  try {
    const raw = localStorage.getItem(FILTER_SCOPE_KEY);
    if (raw === 'all' || raw === 'viewport' || raw === 'selection') return raw;
    // Migrate the old boolean "selection only" preference.
    if (localStorage.getItem(FILTER_SELECTION_KEY) === '1') return 'selection';
  } catch { /* ignore */ }
  return 'all';
}
function loadFilterTokens(): Set<FilterToken> {
  try {
    const raw = localStorage.getItem(FILTER_TOKENS_KEY);
    if (raw !== null) {
      return new Set(raw.split(',').filter((t) => VALID_TOKENS.has(t)) as FilterToken[]);
    }
    // Migrate the old single-status preference into the new pill set.
    const old = localStorage.getItem(FILTER_STATUS_KEY);
    if (old && (COMMENT_STATUSES as string[]).includes(old)) return new Set([old as FilterToken]);
  } catch { /* ignore */ }
  return new Set();
}

// "My threads" = threads where I authored a comment or my name appears anywhere
// in the conversation (author names + content), i.e. searching all comments for me.
function threadMentionsMe(user: CommentAuthor | null, thread: CommentThread): boolean {
  if (!user) return false;
  const needle = user.name.trim().toLowerCase();
  if (!needle) return false;
  return thread.comments.some((c) =>
    authorIsMe(user, c.author) ||
    c.author.name.toLowerCase().includes(needle) ||
    c.content.toLowerCase().includes(needle));
}

interface CommentsTabProps {
  activeIframeTab: IframeTab;
  /** Whether the Comments panel is the visible sidebar tab (it stays mounted when hidden). */
  isActive: boolean;
}

export const CommentsTab: React.FC<CommentsTabProps> = ({ activeIframeTab, isActive }) => {
  const {
    currentBaseTarget, activeData, activeSourceId, runLockedMutation,
  } = useProtovibe();
  const { user, saveUser } = useCommentUser();

  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftAttachments, setDraftAttachments] = useState<PendingAttachment[]>([]);
  const [replyDraft, setReplyDraft] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<PendingAttachment[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [filterScope, setFilterScope] = useState<FilterScope>(loadFilterScope);
  const [filterTokens, setFilterTokens] = useState<Set<FilterToken>>(loadFilterTokens);
  // Comment ids that were unread when the open thread was entered. Opening a
  // thread marks them all read immediately, so this is captured beforehand only
  // to drive the "scroll to the oldest unread" jump. Cleared when leaving.
  const [viewedUnread, setViewedUnread] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The most recently opened (or just-added) thread, faintly highlighted in the
  // list so you can tell where you left off while reading threads one by one.
  const [highlightId, setHighlightId] = useState<string | null>(null);
  // Threads-list scroll offset, preserved across open → back so browsing stays put.
  const listScrollTop = useRef(0);

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

  // Remember filter preferences across sessions.
  useEffect(() => {
    try { localStorage.setItem(FILTER_SCOPE_KEY, filterScope); } catch { /* ignore */ }
  }, [filterScope]);
  useEffect(() => {
    try { localStorage.setItem(FILTER_TOKENS_KEY, Array.from(filterTokens).join(',')); } catch { /* ignore */ }
  }, [filterTokens]);

  // Keep in sync after undo/redo of comment files.
  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('pv-comments-refresh', handler);
    return () => window.removeEventListener('pv-comments-refresh', handler);
  }, [refresh]);

  // Broadcast the unread-thread count so the nav bar can show a dot on the
  // Comments tab even while this panel is hidden (it stays mounted, so this
  // recomputes as threads / identity change).
  useEffect(() => {
    const count = user ? threads.filter((t) => threadHasUnread(user, t)).length : 0;
    window.dispatchEvent(new CustomEvent('pv-comments-unread', { detail: { count } }));
  }, [threads, user]);

  // The subtree walk (querySelectorAll('*') + getAttributeNames) is the one
  // potentially heavy op for large selections, so only run it when its result is
  // actually needed: the panel is visible AND scope is "Selected". Otherwise
  // there is nothing to compute — visibleThreads ignores subtreeIds anyway.
  const subtreeIds = useMemo(
    () => (isActive && filterScope === 'selection' ? gatherSubtreeThreadIds(currentBaseTarget) : []),
    [isActive, filterScope, currentBaseTarget, threads],
  );

  // Thread ids whose anchored element is currently on screen (and not occluded)
  // on the active surface. Only computes while the "In view" scope is active.
  const viewportIds = useViewportCommentIds(isActive && filterScope === 'viewport', activeIframeTab, threads);

  const visibleThreads = useMemo(() => {
    const subtreeSet = new Set(subtreeIds);
    let base = threads;
    if (filterScope === 'selection') {
      base = currentBaseTarget ? threads.filter((t) => subtreeSet.has(t.id)) : threads;
    } else if (filterScope === 'viewport') {
      base = threads.filter((t) => viewportIds.has(t.id));
    }
    // Status pills (incl. 'none' for untriaged) OR within their own group.
    const statusSet = new Set([...filterTokens].filter((t) => t === 'none' || (COMMENT_STATUSES as string[]).includes(t)));
    if (statusSet.size) base = base.filter((t) => statusSet.has(t.status ?? 'none'));
    if (filterTokens.has('unread')) base = base.filter((t) => threadHasUnread(user, t));
    if (filterTokens.has('mine')) base = base.filter((t) => threadMentionsMe(user, t));
    // Most recently active thread first.
    return [...base].sort((a, b) => lastActivity(b) - lastActivity(a));
  }, [threads, filterScope, currentBaseTarget, subtreeIds, viewportIds, filterTokens, user]);

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

  // Release the object-URLs behind a set of staged attachments once they've been
  // uploaded (or discarded), so previews don't leak blobs as the user works.
  const revokeAttachments = (list: PendingAttachment[]) =>
    list.forEach((a) => URL.revokeObjectURL(a.previewUrl));

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
  const doCreateThread = useCallback((text: string, author: CommentAuthor, pending: PendingAttachment[]) => {
    if (!activeData?.file || !activeData?.nameEnd) {
      setError('Select an element on the canvas before adding a comment.');
      return;
    }
    const id = makeCommentId();
    const nowIso = new Date().toISOString();
    // New threads start untriaged — status is only set when a reviewer picks one.
    const comment: CommentItem = { id: `c-${makeCommentId()}`, author, content: text.trim(), createdAt: nowIso, seenBy: [author.name] };
    const thread: CommentThread = {
      id,
      context: buildContext(),
      comments: [comment],
      createdAt: nowIso,
      anchorFile: activeData.file,
    };
    const commentFile = `src/comments/${threadFileName(id)}`;

    setBusy(true);
    setError(null);
    runLockedMutation(async () => {
      // Snapshot the source file AND the not-yet-created thread file (captured
      // as empty) so a single Cmd+Z removes both the attribute and the file.
      await takeSnapshot(activeData.file, activeSourceId || '', [commentFile], 'add comment');
      // Upload staged images now (on submit), folding their stored names onto the
      // comment before it's written to disk.
      if (pending.length) comment.attachments = await uploadPendingAttachments(pending);
      await createCommentThread({ file: activeData.file, nameEnd: activeData.nameEnd, thread });
    }).then(async () => {
      await refresh();
      setComposerOpen(false);
      setDraft('');
      revokeAttachments(pending);
      setDraftAttachments([]);
      // Stay on the list (don't open the new thread) so the user sees it land in
      // context, faintly highlighted, and confirm with the global toast.
      setHighlightId(id);
      setActiveThreadId(null);
      emitToast({ message: 'Comment added', variant: 'success' });
    }).catch((e) => setError(String(e))).finally(() => setBusy(false));
  }, [activeData, activeSourceId, buildContext, runLockedMutation, refresh]);

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

  const doReply = (thread: CommentThread, text: string, author: CommentAuthor, pending: PendingAttachment[]) =>
    mutateThreadFile(thread.id, 'reply to comment', async () => {
      const attachments = pending.length ? await uploadPendingAttachments(pending) : undefined;
      return replyToThread(thread.id, {
        id: `c-${makeCommentId()}`, author, content: text.trim(), createdAt: new Date().toISOString(), seenBy: [author.name],
        ...(attachments ? { attachments } : {}),
      });
    }).then(() => { revokeAttachments(pending); setReplyDraft(''); setReplyAttachments([]); });

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

  // ── read receipts ──────────────────────────────────────────────────────────
  // Set/clear a read receipt locally (optimistic) and persist it. commentId=null
  // covers every comment in the thread. Read-state writes are deliberately not
  // snapshotted, so they never pollute undo. On failure we resync from disk.
  const persistSeen = useCallback((threadId: string, commentId: string | null, seen: boolean) => {
    if (!user) return;
    const name = user.name;
    setThreads((prev) => prev.map((t) => {
      if (t.id !== threadId) return t;
      return {
        ...t,
        comments: t.comments.map((c) => {
          if (commentId && c.id !== commentId) return c;
          const set = new Set(Array.isArray(c.seenBy) ? c.seenBy : [c.author.name]);
          if (seen) set.add(name); else set.delete(name);
          return { ...c, seenBy: Array.from(set) };
        }),
      };
    }));
    setCommentSeen(threadId, commentId, name, seen).catch(() => refresh());
  }, [user, refresh]);

  // Toggle a single comment's read state from the thread view's hover control.
  const handleToggleRead = useCallback((commentId: string, makeRead: boolean) => {
    if (!activeThreadId) return;
    if (!user) { setProfileOpen(true); return; }
    persistSeen(activeThreadId, commentId, makeRead);
  }, [activeThreadId, user, persistSeen]);

  const handleMarkAllRead = useCallback(() => {
    withAuthor((author) => {
      const name = author.name;
      setThreads((prev) => prev.map((t) => ({
        ...t,
        comments: t.comments.map((c) => {
          const set = new Set(Array.isArray(c.seenBy) ? c.seenBy : [c.author.name]); set.add(name);
          return { ...c, seenBy: Array.from(set) };
        }),
      })));
      setViewedUnread(new Set());
      markAllCommentsRead(name).catch(() => refresh());
      emitToast({ message: 'All comments marked as read', variant: 'success' });
    });
  }, [withAuthor, refresh]);

  // ── navigation ───────────────────────────────────────────────────────────────
  const openThread = (thread: CommentThread) => {
    // Capture what's unread now (before we mark it read) for the dots + scroll.
    const unread = thread.comments.filter((c) => !commentSeenByMe(user, c)).map((c) => c.id);
    setViewedUnread(new Set(unread));
    setHighlightId(thread.id);
    setActiveThreadId(thread.id);
    setEditingId(null);
    setReplyDraft('');
    revokeAttachments(replyAttachments);
    setReplyAttachments([]);
    navigateToThread(thread);
    if (unread.length && user) persistSeen(thread.id, null, true);
  };

  const handleAddCommentClick = () => {
    // An element can carry several threads — always start a fresh comment; the
    // backend injects another valueless data-pv-comment-{id} attribute for it.
    setComposerOpen(true);
    setError(null);
  };

  const submitComposer = () => {
    const text = draft.trim();
    if (!text && draftAttachments.length === 0) return;
    withAuthor((author) => doCreateThread(text, author, draftAttachments));
  };

  const canComment = !!activeData?.file && !!activeData?.nameEnd;
  const hasUnread = useMemo(
    () => !!user && threads.some((t) => threadHasUnread(user, t)),
    [user, threads],
  );

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', backgroundColor: theme.bg_strong, fontFamily: theme.font_ui }}>
      {/* In a thread the panel header is the thread's own header (with its
          "Back to all threads" link); the top bar only shows on the list. */}
      {!activeThread && (
        <Header
          user={user}
          onEditProfile={() => setProfileOpen(true)}
          hasUnread={hasUnread}
          onMarkAllRead={handleMarkAllRead}
        />
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
          viewedUnread={viewedUnread}
          onToggleRead={handleToggleRead}
          replyDraft={replyDraft}
          setReplyDraft={setReplyDraft}
          replyAttachments={replyAttachments}
          setReplyAttachments={setReplyAttachments}
          editingId={editingId}
          editingText={editingText}
          setEditingId={setEditingId}
          setEditingText={setEditingText}
          onReply={(text, atts) => withAuthor((author) => doReply(activeThread, text, author, atts))}
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
          attachments={draftAttachments}
          setAttachments={setDraftAttachments}
          busy={busy}
          query={query}
          setQuery={setQuery}
          searchResults={searchResults}
          filterScope={filterScope}
          setFilterScope={setFilterScope}
          filterTokens={filterTokens}
          setFilterTokens={setFilterTokens}
          highlightId={highlightId}
          initialScrollTop={listScrollTop.current}
          onScrollChange={(v) => { listScrollTop.current = v; }}
          onAddClick={handleAddCommentClick}
          onSubmitComposer={submitComposer}
          onCancelComposer={() => { setComposerOpen(false); setDraft(''); revokeAttachments(draftAttachments); setDraftAttachments([]); }}
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
  hasUnread: boolean;
  onMarkAllRead: () => void;
}> = ({ user, onEditProfile, hasUnread, onMarkAllRead }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', borderBottom: `1px solid ${theme.border_default}`, flexShrink: 0,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: theme.text_default }}>
        Comments & Notes
      </span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <ThreadsMenu hasUnread={hasUnread} onMarkAllRead={onMarkAllRead} />
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
  </div>
);

// "More" (kebab) menu sitting before the avatar on the threads list. Portaled so
// the inspector's overflow:hidden doesn't clip it; currently just "Mark all as
// read" (disabled when there's nothing unread).
const ThreadsMenu: React.FC<{ hasUnread: boolean; onMarkAllRead: () => void }> = ({ hasUnread, onMarkAllRead }) => {
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
      <button
        ref={btnRef}
        onClick={toggle}
        data-tooltip="More"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26,
          borderRadius: 6, border: 'none', cursor: 'pointer',
          background: open ? theme.bg_tertiary : 'transparent', color: theme.text_secondary,
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = theme.bg_low; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'transparent'; }}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && pos && createPortal(
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 2147483646 }} />
          <div style={{
            position: 'fixed', top: pos.top, right: pos.right, zIndex: 2147483647, minWidth: 180,
            background: theme.bg_secondary, border: `1px solid ${theme.border_default}`, borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.28)', padding: 4, fontFamily: theme.font_ui,
          }}>
            <button
              onClick={() => { setOpen(false); if (hasUnread) onMarkAllRead(); }}
              disabled={!hasUnread}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 8px', borderRadius: 5,
                border: 'none', background: 'transparent', textAlign: 'left',
                color: hasUnread ? theme.text_default : theme.text_tertiary,
                fontSize: 12, fontWeight: 500, cursor: hasUnread ? 'pointer' : 'not-allowed', fontFamily: theme.font_ui,
              }}
              onMouseEnter={(e) => { if (hasUnread) e.currentTarget.style.background = theme.bg_low; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <CheckCheck size={14} />
              Mark all as read
            </button>
          </div>
        </>,
        document.body,
      )}
    </>
  );
};

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
  attachments: PendingAttachment[];
  setAttachments: (a: PendingAttachment[]) => void;
  busy: boolean;
  query: string;
  setQuery: (s: string) => void;
  searchResults: CommentSearchHit[];
  filterScope: FilterScope;
  setFilterScope: (v: FilterScope) => void;
  filterTokens: Set<FilterToken>;
  setFilterTokens: (s: Set<FilterToken>) => void;
  highlightId: string | null;
  initialScrollTop: number;
  onScrollChange: (top: number) => void;
  onAddClick: () => void;
  onSubmitComposer: () => void;
  onCancelComposer: () => void;
  onOpenThread: (t: CommentThread) => void;
}> = (p) => {
  const searching = p.query.trim().length > 0;
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Non-default filters worth surfacing on the collapsed "Filters" header.
  const activeFilters = (searching ? 1 : 0) + p.filterTokens.size + (p.filterScope !== 'all' ? 1 : 0);
  // Restore the threads-list scroll position when coming back from a thread.
  const listRef = useRef<HTMLDivElement>(null);
  const { onScrollChange } = p;
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = p.initialScrollTop;
    // Run once on mount — restoring later would fight the user's scrolling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border_default}`, flexShrink: 0 }}>
        {p.composerOpen ? (
          <Composer
            value={p.draft}
            onChange={p.setDraft}
            attachments={p.attachments}
            onAttachmentsChange={p.setAttachments}
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
            {...primarySolidHover(p.canComment)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '9px 12px', borderRadius: 6, border: 'none',
              background: p.canComment ? theme.primary_solid : theme.bg_tertiary,
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
            display: 'flex', alignItems: 'center', gap: 8, width: '100%', minHeight: 36, boxSizing: 'border-box',
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
              onClick={(e) => { e.stopPropagation(); p.setFilterTokens(new Set()); p.setFilterScope('all'); p.setQuery(''); }}
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
          <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SearchField value={p.query} onChange={p.setQuery} />
            {!searching && (
              <>
                <Segmented
                  value={p.filterScope}
                  onChange={(v) => p.setFilterScope(v as FilterScope)}
                  options={[
                    { val: 'all', label: 'All' },
                    { val: 'viewport', label: 'In view' },
                    { val: 'selection', label: 'In selection' },
                  ]}
                />
                <FilterPills tokens={p.filterTokens} onChange={p.setFilterTokens} />
              </>
            )}
          </div>
        )}
      </div>

      <div
        ref={listRef}
        onScroll={(e) => onScrollChange(e.currentTarget.scrollTop)}
        style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}
      >
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
            p.filterTokens.size > 0
              ? 'No comments match the active filters.'
              : p.filterScope === 'selection'
                ? (p.hasSelection ? 'No comments on this element yet.' : 'Select an element to see its comments, or switch to Any.')
                : p.filterScope === 'viewport'
                  ? 'No comments are visible in the current view. Scroll the canvas or switch to Any.'
                  : 'No comments yet. Select an element and add the first one.'
          } />
        ) : (
          p.threads.map((t) => (
            <ThreadListItem
              key={t.id}
              thread={t}
              user={p.user}
              highlighted={t.id === p.highlightId}
              onClick={() => p.onOpenThread(t)}
            />
          ))
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
        width: '100%', boxSizing: 'border-box', padding: '5px 28px',
        background: theme.bg_secondary, border: `1px solid ${theme.border_default}`, borderRadius: 6,
        color: theme.text_default, fontSize: 11, outline: 'none', fontFamily: theme.font_ui,
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

// One toggle pill in the filter bar.
const FilterPill: React.FC<{
  active: boolean;
  color: string;
  dot?: boolean;
  round?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, color, dot, round, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999,
      border: `1px solid ${active ? color : 'transparent'}`,
      background: active ? `${color}22` : theme.bg_secondary,
      color: active ? theme.text_default : theme.text_tertiary,
      fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: theme.font_ui,
    }}
  >
    {dot && <span style={{ width: round ? 6 : 8, height: round ? 6 : 8, borderRadius: round ? '50%' : 2, background: color }} />}
    {children}
  </button>
);

// Multi-select filter bar: "All" (clears everything), the four statuses + "No
// status", then the cross-cutting "Unread" / "My threads only" toggles. Pills are
// independently togglable; an empty set is "All".
const FilterPills: React.FC<{
  tokens: Set<FilterToken>;
  onChange: (next: Set<FilterToken>) => void;
}> = ({ tokens, onChange }) => {
  const toggle = (t: FilterToken) => {
    const next = new Set(tokens);
    if (next.has(t)) next.delete(t); else next.add(t);
    onChange(next);
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      <FilterPill active={tokens.size === 0} color={theme.text_secondary} onClick={() => onChange(new Set())}>All</FilterPill>
      {COMMENT_STATUSES.map((s) => (
        <FilterPill key={s} active={tokens.has(s)} color={STATUS_CONFIG[s].color} dot onClick={() => toggle(s)}>
          {STATUS_CONFIG[s].label}
        </FilterPill>
      ))}
      <FilterPill active={tokens.has('none')} color={theme.text_tertiary} onClick={() => toggle('none')}>No status</FilterPill>
      <FilterPill active={tokens.has('unread')} color={theme.accent_default} dot round onClick={() => toggle('unread')}>Unread</FilterPill>
      <FilterPill active={tokens.has('mine')} color={theme.accent_default} onClick={() => toggle('mine')}>My threads only</FilterPill>
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

const ThreadListItem: React.FC<{ thread: CommentThread; user: CommentAuthor | null; highlighted?: boolean; onClick: () => void }> = ({ thread, user, highlighted, onClick }) => {
  // Surface the most recent message so the list reflects fresh activity.
  const latest = latestComment(thread);
  const replies = thread.comments.length - 1;
  const dimmed = thread.status === 'closed';
  const unread = threadHasUnread(user, thread);
  // The just-viewed / just-added thread keeps a faint blue wash so the reader can
  // see where they left off; hover still lifts it to the standard row highlight.
  const baseBg = highlighted ? `${theme.accent_default}14` : 'transparent';
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', gap: 8, width: '100%', textAlign: 'left',
        padding: '10px 16px', background: baseBg, border: 'none', borderBottom: `1px solid ${theme.border_default}`,
        cursor: 'pointer', fontFamily: theme.font_ui, opacity: dimmed ? 0.55 : 1,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = theme.bg_low)}
      onMouseLeave={(e) => (e.currentTarget.style.background = baseBg)}
    >
      {latest && <CommentAvatar name={latest.author.name} email={latest.author.email} size={22} mine={authorIsMe(user, latest.author)} />}
      {/* Content column is indented past the avatar, mirroring the thread view. */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: unread ? 700 : 600, color: theme.text_default, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {latest?.author.name || 'Unknown'}
          </span>
          <span style={{ fontSize: 10, color: theme.text_tertiary, flexShrink: 0 }}>{latest ? relativeTime(latest.createdAt) : ''}</span>
          <div style={{ flex: 1 }} />
          <StatusBadge status={thread.status} />
          {/* Unread dot, top-right after the status badge. */}
          {unread && <span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.accent_default, flexShrink: 0 }} />}
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
  viewedUnread: Set<string>;
  onToggleRead: (commentId: string, makeRead: boolean) => void;
  replyDraft: string;
  setReplyDraft: (s: string) => void;
  replyAttachments: PendingAttachment[];
  setReplyAttachments: (a: PendingAttachment[]) => void;
  editingId: string | null;
  editingText: string;
  setEditingId: (id: string | null) => void;
  setEditingText: (s: string) => void;
  onReply: (text: string, attachments: PendingAttachment[]) => void;
  onStatus: (s: CommentStatus | null) => void;
  onEditSave: (commentId: string) => void;
  onDeleteReply: (commentId: string) => void;
  onDeleteThread: () => void;
  onLocate: () => void;
  onBack: () => void;
}> = (p) => {
  const { thread } = p;
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastThreadId = useRef<string | null>(null);
  const lastLen = useRef(0);

  // On open: jump to the OLDEST unread message (so the reader starts where they
  // left off); if everything is read, fall back to the newest like before.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || lastThreadId.current === thread.id) return;
    lastThreadId.current = thread.id;
    lastLen.current = thread.comments.length;
    const firstUnread = thread.comments.find((c) => p.viewedUnread.has(c.id));
    const node = firstUnread && el.querySelector<HTMLElement>(`[data-pv-comment-row="${firstUnread.id}"]`);
    if (node) {
      el.scrollTop = node.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 8;
    } else {
      el.scrollTop = el.scrollHeight;
    }
    // viewedUnread is captured at open alongside thread.id; re-running on its
    // later changes (toggles) would yank the scroll, so key only on thread.id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.id]);

  // A newly added message (reply) always scrolls to the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (thread.comments.length > lastLen.current) {
      lastLen.current = thread.comments.length;
      el.scrollTop = el.scrollHeight;
    }
  }, [thread.comments.length]);
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
        {/* Header = thread id (copyable for AI); locate/delete share the title line
            so they align with the copy icon. */}
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
        <StatusDropdown status={thread.status} busy={p.busy} onChange={p.onStatus} />
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {thread.comments.map((c, idx) => (
          <CommentRow
            key={c.id}
            comment={c}
            index={idx}
            user={p.user}
            busy={p.busy}
            unread={!commentSeenByMe(p.user, c)}
            isEditing={p.editingId === c.id}
            editingText={p.editingText}
            onStartEdit={() => { p.setEditingId(c.id); p.setEditingText(c.content); }}
            onEditChange={p.setEditingText}
            onEditSave={() => p.onEditSave(c.id)}
            onEditCancel={() => { p.setEditingId(null); p.setEditingText(''); }}
            onDelete={() => p.onDeleteReply(c.id)}
            onToggleRead={(makeRead) => p.onToggleRead(c.id, makeRead)}
          />
        ))}
      </div>

      <SeenSummary thread={thread} />

      <div style={{ padding: '12px 16px', borderTop: `1px solid ${theme.border_default}`, flexShrink: 0 }}>
        <Composer
          value={p.replyDraft}
          onChange={p.setReplyDraft}
          attachments={p.replyAttachments}
          onAttachmentsChange={p.setReplyAttachments}
          onSubmit={() => { if (p.replyDraft.trim() || p.replyAttachments.length) p.onReply(p.replyDraft, p.replyAttachments); }}
          busy={p.busy}
          placeholder="Reply…"
          submitLabel="Reply"
          submitIcon={<CornerDownRight size={13} />}
        />
      </div>
    </>
  );
};

// Footer strip summarising read receipts for the whole thread. "Seen by N people"
// when everyone who's looked has read every message; otherwise it calls out how
// many people are still behind. Names live in the hover tooltip.
const SeenSummary: React.FC<{ thread: CommentThread }> = ({ thread }) => {
  // Effective seers: an untracked comment counts as seen by its own author, the
  // same fallback commentSeenByMe uses, so authors always count for their messages.
  const seers = (c: CommentItem): string[] =>
    Array.isArray(c.seenBy) ? c.seenBy : (c.author?.name ? [c.author.name] : []);
  const everyone = new Set<string>();
  thread.comments.forEach((c) => seers(c).forEach((n) => everyone.add(n)));
  const all = Array.from(everyone);
  const seenAll = all.filter((name) => thread.comments.every((c) => seers(c).includes(name)));
  const pending = all.filter((name) => !seenAll.includes(name));
  const total = all.length;
  const people = (n: number) => (n === 1 ? 'person' : 'people');

  const row: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
    borderTop: `1px solid ${theme.border_default}`, flexShrink: 0,
    fontSize: 11, color: theme.text_tertiary, fontFamily: theme.font_ui, cursor: 'default',
  };

  if (total === 0) {
    return <div style={row}><Eye size={13} /><span>Not seen by anyone yet</span></div>;
  }
  if (pending.length === 0) {
    return (
      <div style={row} data-tooltip={`Seen by ${all.join(', ')}`}>
        <Eye size={13} />
        <span>Seen by {total} {people(total)}</span>
      </div>
    );
  }
  const tip = `Not caught up: ${pending.join(', ')}${seenAll.length ? `  ·  Seen everything: ${seenAll.join(', ')}` : ''}`;
  return (
    <div style={row} data-tooltip={tip}>
      <Eye size={13} />
      <span>{total} {people(total)} saw this thread, but {pending.length} {pending.length === 1 ? 'has' : 'have'} not yet seen all the comments</span>
    </div>
  );
};

// The unread indicator and its toggle, fused into one control at a comment's top
// right. Unread → a filled blue dot, always shown, "click to mark as read". Read
// → a hollow outline that only appears on hover, "mark as unread". The 20px box
// is always rendered so the header row height stays put whatever the state.
const UnreadToggle: React.FC<{ unread: boolean; hovered: boolean; onToggle: () => void }> = ({ unread, hovered, onToggle }) => (
  <button
    onClick={onToggle}
    data-tooltip={unread ? 'Click to mark as read' : 'Mark as unread'}
    style={{ ...iconBtnSm, cursor: 'pointer' }}
  >
    {unread ? (
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.accent_default }} />
    ) : hovered ? (
      <span style={{ width: 6, height: 6, borderRadius: '50%', border: `1.5px solid ${theme.text_tertiary}` }} />
    ) : null}
  </button>
);

// A single message row. Owns its hover state so the edit/delete actions only
// surface while the row is hovered. The unread control sits at the top right.
const CommentRow: React.FC<{
  comment: CommentItem;
  index: number;
  user: CommentAuthor | null;
  busy: boolean;
  unread: boolean;
  isEditing: boolean;
  editingText: string;
  onStartEdit: () => void;
  onEditChange: (s: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onDelete: () => void;
  onToggleRead: (makeRead: boolean) => void;
}> = (p) => {
  const c = p.comment;
  const [hovered, setHovered] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const mine = authorIsMe(p.user, c.author);
  const attachments = c.attachments ?? [];
  return (
    <div
      data-pv-comment-row={c.id}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', gap: 8 }}
    >
      <CommentAvatar name={c.author.name} email={c.author.email} size={26} mine={mine} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* minHeight matches the icon buttons so the row never grows on hover. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 20 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: theme.text_default, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.author.name}</span>
          <span style={{ fontSize: 10, color: theme.text_tertiary, flexShrink: 0 }}>{relativeTime(c.createdAt)}{c.updatedAt ? ' · edited' : ''}</span>
          <div style={{ flex: 1 }} />
          {mine && !p.isEditing && hovered && (
            <>
              <button onClick={p.onStartEdit} data-tooltip="Edit" style={iconBtnSm}><Pencil size={12} /></button>
              {p.index > 0 && (
                <ConfirmDeleteButton
                  tooltip="Delete"
                  message="Delete this comment?"
                  confirmLabel="Delete"
                  iconSize={12}
                  style={iconBtnSm}
                  onConfirm={p.onDelete}
                />
              )}
            </>
          )}
          {/* Single unread control, top-right: filled blue when unread (click to
              read), hollow circle on hover when read (click to mark unread). */}
          {p.user && !p.isEditing && (
            <UnreadToggle unread={p.unread} hovered={hovered} onToggle={() => p.onToggleRead(p.unread)} />
          )}
        </div>
        {p.isEditing ? (
          <div style={{ marginTop: 6 }}>
            <Composer
              value={p.editingText}
              onChange={p.onEditChange}
              onSubmit={p.onEditSave}
              onCancel={p.onEditCancel}
              busy={p.busy}
              placeholder="Edit comment…"
              submitLabel="Save"
            />
          </div>
        ) : (
          <>
            {c.content && (
              <div style={{ marginTop: 3, fontSize: 13, color: theme.text_default, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {c.content}
              </div>
            )}
            {attachments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: c.content ? 8 : 3 }}>
                {attachments.map((name) => (
                  <CommentImage key={name} name={name} onOpen={() => setLightbox(name)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {lightbox && <Lightbox name={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
};

// A full-width inline attachment image inside a comment. Clicking opens the
// fullscreen lightbox; a missing file (e.g. cleaned up) falls back to a label.
const CommentImage: React.FC<{ name: string; onOpen: () => void }> = ({ name, onOpen }) => {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', height: 64, borderRadius: 6,
        border: `1px solid ${theme.destructive_default}`, background: theme.destructive_low,
        color: theme.destructive_default, fontSize: 11, fontWeight: 600,
      }}>
        Missing image
      </div>
    );
  }
  return (
    <img
      src={commentAttachmentUrl(name)}
      alt="Attachment"
      onClick={onOpen}
      onError={() => setError(true)}
      style={{
        width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block',
        borderRadius: 6, border: `1px solid ${theme.border_default}`, cursor: 'pointer',
      }}
    />
  );
};

// Fullscreen image preview, portaled over everything. Click anywhere (or the X,
// or Escape) to dismiss.
const Lightbox: React.FC<{ name: string; onClose: () => void }> = ({ name, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2147483647, background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
    >
      <button
        onClick={onClose}
        data-tooltip="Close"
        style={{
          position: 'fixed', top: 16, right: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'rgba(255,255,255,0.12)', color: '#fff',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
      >
        <X size={18} />
      </button>
      <img
        src={commentAttachmentUrl(name)}
        alt="Attachment"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 12px 48px rgba(0,0,0,0.5)' }}
      />
    </div>,
    document.body,
  );
};

// ── shared composer ─────────────────────────────────────────────────────────────
// The field is a bordered wrapper (not the bare textarea) so staged image
// attachments can live INSIDE it: text on top, a thumbnail strip, then a bottom
// toolbar of the image + emoji buttons. Passing `attachments`/`onAttachmentsChange`
// turns on image support (image button, paste, drag-drop); the edit composer omits
// them and stays text-only.
const Composer: React.FC<{
  value: string;
  onChange: (s: string) => void;
  attachments?: PendingAttachment[];
  onAttachmentsChange?: (a: PendingAttachment[]) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  busy: boolean;
  placeholder: string;
  submitLabel: string;
  submitIcon?: React.ReactNode;
}> = ({ value, onChange, attachments, onAttachmentsChange, onSubmit, onCancel, busy, placeholder, submitLabel, submitIcon }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const imagesOn = !!onAttachmentsChange;
  const staged = attachments ?? [];
  const canSubmit = !busy && (value.trim().length > 0 || staged.length > 0);

  // Grow the field to fit its content instead of scrolling internally, so pasted
  // or long text never needs an inner scrollbar.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  // Insert an emoji at the caret (or replace the active selection), then drop the
  // caret right after it so typing can continue naturally.
  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) { onChange(value + emoji); return; }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + emoji + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + emoji.length;
      el.setSelectionRange(caret, caret);
    });
  };

  const addFiles = (files: Iterable<File>) => {
    if (!onAttachmentsChange) return;
    const next = toPendingAttachments(files);
    if (next.length) onAttachmentsChange([...staged, ...next]);
  };

  const removeAttachment = (id: string) => {
    if (!onAttachmentsChange) return;
    const gone = staged.find((a) => a.id === id);
    if (gone) URL.revokeObjectURL(gone.previewUrl);
    onAttachmentsChange(staged.filter((a) => a.id !== id));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (!imagesOn) return;
    const files = Array.from(e.clipboardData.items)
      .filter((i) => i.kind === 'file' && i.type.startsWith('image/'))
      .map((i) => i.getAsFile())
      .filter((f): f is File => !!f);
    if (files.length) {
      // Keep the paste local to the composer — the canvas registers its own
      // window-level paste/drop handlers that would otherwise ALSO insert the
      // image onto the canvas (pasting it in two places).
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      addFiles(files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!imagesOn) return;
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length) {
      // Same as paste: stop the drop from bubbling to the canvas drop handler.
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      addFiles(files);
    }
  };

  return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div
      onPaste={imagesOn ? handlePaste : undefined}
      onDragOver={imagesOn ? (e) => { e.preventDefault(); setDragOver(true); } : undefined}
      onDragLeave={imagesOn ? () => setDragOver(false) : undefined}
      onDrop={imagesOn ? handleDrop : undefined}
      style={{
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: theme.bg_secondary, borderRadius: 6,
        border: `1px solid ${dragOver ? theme.accent_default : theme.border_default}`,
      }}
    >
      <textarea
        ref={textareaRef}
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); if (canSubmit) onSubmit(); }
          if (e.key === 'Escape' && onCancel) { e.preventDefault(); onCancel(); }
        }}
        placeholder={placeholder}
        rows={3}
        style={{
          width: '100%', resize: 'none', minHeight: 48, overflow: 'hidden', boxSizing: 'border-box',
          background: 'transparent', border: 'none', borderRadius: 0,
          padding: '8px 10px 2px 10px', color: theme.text_default, fontSize: 13, outline: 'none',
          fontFamily: theme.font_ui, lineHeight: 1.4,
        }}
      />
      {staged.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 10px 0 10px' }}>
          {staged.map((a) => (
            <PendingThumb key={a.id} att={a} onRemove={() => removeAttachment(a.id)} />
          ))}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '4px 6px 5px 6px' }}>
        {imagesOn && <AttachButton onFiles={addFiles} />}
        <EmojiPicker onPick={insertEmoji} />
      </div>
    </div>
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
      {onCancel && (
        <button onClick={onCancel} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${theme.border_default}`, background: 'transparent', color: theme.text_secondary, fontSize: 12, cursor: 'pointer', fontFamily: theme.font_ui }}>
          Cancel
        </button>
      )}
      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        {...primarySolidHover(canSubmit)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: 'none',
          background: canSubmit ? theme.primary_solid : theme.bg_tertiary,
          color: canSubmit ? '#fff' : theme.text_tertiary,
          fontSize: 12, fontWeight: 600, cursor: canSubmit ? 'pointer' : 'not-allowed', fontFamily: theme.font_ui,
        }}
      >
        {submitIcon}
        {submitLabel}
      </button>
    </div>
  </div>
  );
};

// Image-attach icon button (leftmost in the composer toolbar, before the emoji
// button). Opens the native multi-file picker; selection is staged locally and
// only uploaded on submit.
const AttachButton: React.FC<{ onFiles: (files: File[]) => void }> = ({ onFiles }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) onFiles(Array.from(e.target.files));
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        data-tooltip="Attach image"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 24, height: 24, borderRadius: 6, border: 'none', background: 'transparent',
          color: theme.text_tertiary, cursor: 'pointer', padding: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = theme.text_secondary; e.currentTarget.style.background = theme.bg_tertiary; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = theme.text_tertiary; e.currentTarget.style.background = 'transparent'; }}
      >
        <ImagePlus size={16} />
      </button>
    </>
  );
};

// A staged (not-yet-uploaded) attachment preview with a remove-X in its top-right.
const PendingThumb: React.FC<{ att: PendingAttachment; onRemove: () => void }> = ({ att, onRemove }) => (
  <div style={{
    position: 'relative', width: 56, height: 56, borderRadius: 6, overflow: 'hidden',
    border: `1px solid ${theme.border_default}`, background: theme.bg_strong, flexShrink: 0,
  }}>
    <img src={att.previewUrl} alt={att.file.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    <button
      type="button"
      onClick={onRemove}
      data-tooltip="Remove"
      style={{
        position: 'absolute', top: 2, right: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 16, height: 16, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0,
        background: 'rgba(0,0,0,0.6)', color: '#fff',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.8)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.6)'; }}
    >
      <X size={11} />
    </button>
  </div>
);

// Quick-reaction emojis offered by the in-composer picker, in display order.
const QUICK_EMOJIS = ['👍', '🙏', '👌', '➕', '😁', '🤩'];

// Icon button in the composer's bottom toolbar. Opens a small portaled row of
// quick emojis (portaled so the inspector's overflow:hidden can't clip it); the
// menu floats above the button since composers sit low in the panel.
const EmojiPicker: React.FC<{ onPick: (emoji: string) => void }> = ({ onPick }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const toggle = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.top - 6, left: r.left });
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
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        data-tooltip="Add emoji"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 24, height: 24, borderRadius: 6, border: 'none',
          background: open ? theme.bg_tertiary : 'transparent',
          color: open ? theme.text_secondary : theme.text_tertiary,
          cursor: 'pointer', padding: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = theme.text_secondary; e.currentTarget.style.background = theme.bg_tertiary; }}
        onMouseLeave={(e) => { if (!open) { e.currentTarget.style.color = theme.text_tertiary; e.currentTarget.style.background = 'transparent'; } }}
      >
        <Smile size={16} />
      </button>
      {open && pos && createPortal(
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 2147483646 }} />
          <div style={{
            position: 'fixed', top: pos.top, left: pos.left, transform: 'translateY(-100%)', zIndex: 2147483647,
            background: theme.bg_secondary, border: `1px solid ${theme.border_default}`, borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.28)', padding: 4,
            display: 'flex', gap: 2, fontFamily: theme.font_ui,
          }}>
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => { setOpen(false); onPick(emoji); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 30, height: 30, borderRadius: 6, border: 'none', background: 'transparent',
                  fontSize: 18, cursor: 'pointer', padding: 0, lineHeight: 1,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = theme.bg_low; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </>,
        document.body,
      )}
    </>
  );
};

const StatusBadge: React.FC<{ status?: CommentStatus }> = ({ status }) => {
  if (!status) return null; // untriaged threads show no badge
  const { label, color } = STATUS_CONFIG[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', flexShrink: 0,
      padding: '2px 5px', borderRadius: 4, background: `${color}22`,
      color, fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>
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
          display: 'inline-flex', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
          padding: '4px 6px', borderRadius: 8,
          // Transparent 1px border in both states: no visible border on either,
          // and "No status" stays exactly the same size as the coloured statuses.
          border: '1px solid transparent',
          background: status ? `${color}22` : theme.bg_secondary,
          color: status ? color : theme.text_secondary,
          fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
          cursor: busy ? 'default' : 'pointer', fontFamily: theme.font_ui,
        }}
      >
        <span>{label}</span>
        <ChevronDown size={12} style={{ opacity: 0.7, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
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
                  <span style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, background: s ? c : 'transparent', border: s ? 'none' : `1px solid ${theme.text_tertiary}` }} />
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
