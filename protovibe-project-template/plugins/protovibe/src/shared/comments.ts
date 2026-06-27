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

/** A single message inside a thread. */
export interface CommentItem {
  id: string;
  author: CommentAuthor;
  content: string;
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string, set when edited
}

/** One thread === one `comment-{id}.json` file === one `data-pv-comment-{id}` attribute. */
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

/** Directory (relative to project root) where thread files are committed. */
export const COMMENTS_DIR_REL = 'src/comments';

/** Filename for a given thread id. */
export function threadFileName(id: string): string {
  return `comment-${id}.json`;
}

/** Generate a random thread / comment id. */
export function makeCommentId(): string {
  return Math.random().toString(36).substring(2, 12);
}
