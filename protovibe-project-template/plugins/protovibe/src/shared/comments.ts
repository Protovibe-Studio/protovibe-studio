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

/** One thread === one `comment-{id}.json` file === one id in `data-pv-comment-thread`. */
export interface CommentThread {
  /** Appears in the element's `data-pv-comment-thread` attribute (which may list several ids). */
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
 * Attribute injected onto the anchored element in source + DOM. A single element
 * can carry several threads, stored as a space-separated list of ids.
 */
export const COMMENT_ATTR = 'data-pv-comment-thread';

/** Split a `data-pv-comment-thread` attribute value into its thread ids. */
export function parseThreadIds(attr: string | null | undefined): string[] {
  if (!attr) return [];
  return attr.trim().split(/\s+/).filter(Boolean);
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
