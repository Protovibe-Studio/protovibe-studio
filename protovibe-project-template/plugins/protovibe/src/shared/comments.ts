// plugins/protovibe/src/shared/comments.ts
// Shared type definitions for the Comments & Notes feature.
// Imported by both the Vite backend (comments-server.ts) and the inspector UI.

/** Collaborative triage state for a whole thread. */
export type CommentStatus = 'No action required' | 'To revisit' | 'Done';

export const COMMENT_STATUSES: CommentStatus[] = [
  'No action required',
  'To revisit',
  'Done',
];

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

/** One thread === one `comment-{id}.json` file === one `data-pv-comment-thread`. */
export interface CommentThread {
  /** Matches the `data-pv-comment-thread` attribute value on the element. */
  id: string;
  status: CommentStatus;
  context: CommentContext;
  comments: CommentItem[];
  createdAt: string; // ISO string
  /** Project-relative path of the source file the attribute was injected into. */
  anchorFile?: string;
}

/** Attribute injected onto the anchored element in source + DOM. */
export const COMMENT_ATTR = 'data-pv-comment-thread';

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
