// plugins/protovibe/src/shared/comments.ts
// Shared type definitions for the Comments & Notes feature.
// Imported by both the Vite backend (comments-server.ts) and the inspector UI.

/**
 * Collaborative triage state for a whole thread, stored as a stable id.
 *
 * These ids are what get persisted in thread files, so they must NEVER be
 * renamed — to change how a status reads or looks, edit STATUS_CONFIG (label +
 * colour) in the UI, not the id here. Statuses written by older versions (which
 * stored the human label, e.g. "To review") are remapped on read by
 * normalizeStatus(), so old comment files keep working.
 */
export type CommentStatus = 'minor' | 'todo' | 'review' | 'closed';

/** Display order of the statuses (also the order they appear in pickers). */
export const COMMENT_STATUSES: CommentStatus[] = [
  'minor',
  'todo',
  'review',
  'closed',
];

/** Legacy persisted values (label-based, pre status-id refactor) → current ids. */
const LEGACY_STATUS_MAP: Record<string, CommentStatus> = {
  'Minor': 'minor',
  'To do': 'todo',
  'To review': 'review',
  'Closed': 'closed',
};

/**
 * Coerce a raw persisted status — a current id or a legacy label — into a known
 * CommentStatus, or undefined if it is empty / unrecognised (untriaged).
 */
export function normalizeStatus(raw: unknown): CommentStatus | undefined {
  if (typeof raw !== 'string') return undefined;
  if ((COMMENT_STATUSES as string[]).includes(raw)) return raw as CommentStatus;
  return LEGACY_STATUS_MAP[raw];
}

/** Which Protovibe surface the comment was authored against. */
export type CommentContextTab = 'app' | 'components' | 'sketchpad';

/** Lightweight Git-style attribution captured from the local profile. */
export interface CommentAuthor {
  name: string;
  email: string;
}

/**
 * Snapshot of "what the user was looking at" when the thread was created.
 * Only the fields relevant to `tab` are populated; the rest stay undefined.
 */
export interface CommentContext {
  tab: CommentContextTab;
  /** Project-relative source file the anchored element lives in. */
  file?: string;
  // App context
  url?: string;
  pathname?: string;
  // Components context
  componentName?: string;
  // Sketchpad context
  sketchpadId?: string;
  sketchpadName?: string;
  frameId?: string;
  frameName?: string;
  /** On-canvas coordinates of the anchored element, when resolvable. */
  position?: { x: number; y: number };
}

/**
 * A UX-writing suggestion: swap an exact `original` string for `suggested`.
 * Purely advisory data attached to a comment — previewed live by find/replacing
 * the string in the canvas DOM, never a source-code edit on its own.
 *
 * The swap is scoped to the element the comment is anchored to (its subtree)
 * unless `replaceAll` is set, which widens it to every occurrence of the string
 * on the page.
 */
export interface WordingSuggestion {
  original: string;
  suggested: string;
  /** Replace the string everywhere on the page, not just inside the anchor. */
  replaceAll?: boolean;
}

/** A single message inside a thread. */
export interface CommentItem {
  id: string;
  author: CommentAuthor;
  content: string;
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string, set when edited
  /**
   * Wording-change suggestions attached to this comment (original → suggested
   * pairs). Rendered as a diff with a "Preview suggestion" toggle that swaps the
   * string in the live canvas. Absent/empty when the comment has no suggestions.
   */
  suggestions?: WordingSuggestion[];
  /**
   * Filenames of image attachments stored in `src/comments/attachments/`. Each is
   * a compressed image (≤70kb) uploaded when the comment was submitted; referenced
   * by name and served at `/src/comments/attachments/{name}`.
   */
  attachments?: string[];
  /**
   * Names of the people who have seen this message (read receipts). Just the
   * display name is stored — enough to tell "have I read it?" without a real
   * account system. Absent/empty means nobody has marked it read yet. A reader
   * is added on thread open and can be removed again via "Mark as unread".
   */
  seenBy?: string[];
}

/** One thread === one `src/comments/{id}/` directory === one `data-pv-comment-{id}` attribute. */
export interface CommentThread {
  /** Anchored on its element as a valueless `data-pv-comment-{id}` attribute. */
  id: string;
  /** Stable status id; undefined until a reviewer triages the thread. */
  status?: CommentStatus;
  context: CommentContext;
  comments: CommentItem[];
  createdAt: string; // ISO string
  /** Project-relative path of the source file the attribute was injected into. */
  anchorFile?: string;
}

/**
 * Anchoring scheme. Each thread is injected onto its element's opening tag as its
 * OWN valueless attribute, `data-pv-comment-{id}` — never a shared value-bearing
 * attribute. Because every attribute NAME is unique, an element can anchor any
 * number of threads without ever producing a duplicate-attribute clash (the bug
 * the old space-separated `data-pv-comment-thread="id1 id2"` scheme caused when a
 * second thread failed to merge into the existing list).
 *
 * Match one thread's element with `commentIdSelector(id)`; collect every id on an
 * element with `readCommentIds(el.getAttributeNames())`.
 */
export const COMMENT_ATTR_PREFIX = 'data-pv-comment-';

/** The valueless attribute name that anchors a single thread id. */
export function commentIdAttr(id: string): string {
  return COMMENT_ATTR_PREFIX + id;
}

/** CSS selector matching the element that anchors a given thread id. */
export function commentIdSelector(id: string): string {
  return `[${COMMENT_ATTR_PREFIX}${id}]`;
}

/**
 * Legacy (pre-refactor) attribute: a single value-bearing `data-pv-comment-thread`
 * holding a space-separated id list. No longer written anywhere; named here only
 * so `readCommentIds` can defensively skip it (it shares the `data-pv-comment-`
 * prefix, so a stray one would otherwise read as an id of `"thread"`).
 */
export const LEGACY_COMMENT_ATTR = 'data-pv-comment-thread';

/** Pull thread ids out of an element's attribute-name list (getAttributeNames()). */
export function readCommentIds(attrNames: readonly string[]): string[] {
  const ids: string[] = [];
  for (const name of attrNames) {
    if (name === LEGACY_COMMENT_ATTR) continue;
    if (name.startsWith(COMMENT_ATTR_PREFIX)) ids.push(name.slice(COMMENT_ATTR_PREFIX.length));
  }
  return ids;
}

/**
 * Storage layout. Each thread is a directory, `src/comments/{threadId}/`,
 * holding `thread.json` (metadata only — id, status, context, createdAt,
 * anchorFile; no messages) plus one `{commentId}.json` file per message.
 * Messages are split into their own files so that two people replying to the
 * same thread on different machines produce two *new* files — git sync then
 * merges them cleanly instead of a same-file conflict dropping one reply.
 *
 * Legacy layout (still read, never written): a single `comment-{threadId}.json`
 * file holding the whole thread with an inline `comments` array.
 */
export const COMMENTS_DIR_REL = 'src/comments';

/** Subdirectory (relative to project root) where comment image attachments live. */
export const COMMENT_ATTACHMENTS_DIR_REL = 'src/comments/attachments';

/** Metadata filename inside a thread's directory (split layout). */
export const THREAD_META_FILE = 'thread.json';

/** Filename for a single message inside a thread's directory (split layout). */
export function commentFileName(commentId: string): string {
  return `${commentId}.json`;
}

/** Filename of a legacy single-file thread (read-compat only). */
export function threadFileName(id: string): string {
  return `comment-${id}.json`;
}

/** Public dev-server URL for a stored attachment filename. */
export function commentAttachmentUrl(name: string): string {
  return `/${COMMENT_ATTACHMENTS_DIR_REL}/${name}`;
}

/** Generate a random thread / comment id. */
export function makeCommentId(): string {
  return Math.random().toString(36).substring(2, 12);
}
