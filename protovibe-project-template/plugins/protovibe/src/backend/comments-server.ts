// plugins/protovibe/src/backend/comments-server.ts
// Backend endpoints for the Comments & Notes feature.
//
// Each thread is a standalone JSON file at src/comments/comment-{id}.json so
// that threads never collide on merge and are trivially committable to Git.
// Undo/redo is handled the same way the inspector handles prop edits: the UI
// calls /__take-snapshot (capturing the source file and — for creation — the
// not-yet-existing thread file as empty) BEFORE invoking these mutators, so
// the standard undo stack restores both the attribute and the file together.

import fs from 'fs';
import path from 'path';
import { Connect, ViteDevServer } from 'vite';
import type { CommentThread, CommentItem, CommentStatus } from '../shared/comments';
import { COMMENT_STATUSES, DEFAULT_COMMENT_STATUS, threadFileName, COMMENTS_DIR_REL } from '../shared/comments';

const COMMENTS_DIR = path.resolve(process.cwd(), COMMENTS_DIR_REL);
const REGISTRY_PATH = path.resolve(process.cwd(), 'src/sketchpads/_registry.json');

// ─── small http helpers (mirrors sketchpad-server.ts) ────────────────────────

function parseBody(req: Connect.IncomingMessage): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: string) => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch (e) { reject(e); }
    });
  });
}

function sendJson(res: any, data: unknown, status = 200): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function sendError(res: any, msg: string, status = 400): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: msg }));
}

// ─── thread file IO ──────────────────────────────────────────────────────────

function threadPath(id: string): string {
  return path.join(COMMENTS_DIR, threadFileName(id));
}

function readThread(id: string): CommentThread | null {
  const p = threadPath(id);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as CommentThread;
  } catch {
    return null;
  }
}

function writeThread(thread: CommentThread): void {
  fs.mkdirSync(COMMENTS_DIR, { recursive: true });
  fs.writeFileSync(threadPath(thread.id), JSON.stringify(thread, null, 2), 'utf-8');
}

function listThreads(): CommentThread[] {
  if (!fs.existsSync(COMMENTS_DIR)) return [];
  const threads: CommentThread[] = [];
  for (const f of fs.readdirSync(COMMENTS_DIR)) {
    if (!f.startsWith('comment-') || !f.endsWith('.json')) continue;
    try {
      threads.push(JSON.parse(fs.readFileSync(path.join(COMMENTS_DIR, f), 'utf-8')));
    } catch {
      // skip malformed file
    }
  }
  // Newest first.
  threads.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return threads;
}

function isValidStatus(s: unknown): s is CommentStatus {
  return typeof s === 'string' && (COMMENT_STATUSES as string[]).includes(s);
}

// ─── context enrichment ──────────────────────────────────────────────────────

// Fill in human-readable sketchpad/frame names from the registry when the
// anchored element lives inside a sketchpad frame file. Best-effort: failures
// leave whatever the client already supplied untouched.
function enrichSketchpadContext(thread: CommentThread): void {
  const file = thread.context?.file || thread.anchorFile;
  if (!file) return;
  const m = file.replace(/\\/g, '/').match(/src\/sketchpads\/([^/]+)\/([^/]+)\.(?:tsx|jsx)$/);
  if (!m) return;
  const [, sketchpadId, frameId] = m;
  thread.context.tab = 'sketchpad';
  thread.context.sketchpadId = thread.context.sketchpadId || sketchpadId;
  thread.context.frameId = thread.context.frameId || frameId;
  try {
    if (!fs.existsSync(REGISTRY_PATH)) return;
    const reg = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
    const sp = (reg.sketchpads || []).find((s: any) => s.id === sketchpadId);
    if (sp) {
      thread.context.sketchpadName = sp.name;
      const frame = (sp.frames || []).find((f: any) => f.id === frameId);
      if (frame) thread.context.frameName = frame.name;
    }
  } catch {
    // ignore registry read errors
  }
}

// ─── source attribute injection / removal ────────────────────────────────────

// Insert ` data-pv-comment-thread="<id>"` right after the element's tag name,
// mirroring handleUpdateProp's 'add' branch (insert at nameEnd column).
function injectAttribute(source: string, nameEnd: [number, number], id: string): string {
  const lines = source.split('\n');
  const lineIdx = nameEnd[0] - 1;
  const colIdx = nameEnd[1];
  if (lineIdx < 0 || lineIdx >= lines.length) {
    throw new Error('nameEnd is out of range for the current file');
  }
  const line = lines[lineIdx];
  lines[lineIdx] = line.substring(0, colIdx) + ` data-pv-comment-thread="${id}"` + line.substring(colIdx);
  return lines.join('\n');
}

// Strip the attribute (and one leading space) for a given thread id.
function removeAttribute(source: string, id: string): string {
  return source.replace(new RegExp(`\\s*data-pv-comment-thread="${id}"`), '');
}

// ─── endpoint handlers ───────────────────────────────────────────────────────

// POST { ids?: string[] }  →  { threads }
// When `ids` is supplied (e.g. the UI passing the comment ids found in the
// selected element's DOM subtree), only those threads are returned.
export const handleCommentsList: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { ids } = await parseBody(req);
    let threads = listThreads();
    if (Array.isArray(ids)) {
      const want = new Set(ids);
      threads = threads.filter((t) => want.has(t.id));
    }
    sendJson(res, { threads });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

// POST { file, nameEnd: [line,col], thread: CommentThread }
// Atomically injects the anchor attribute into the source file and writes the
// thread JSON. The JSON is written first so a write failure never leaves an
// orphaned attribute pointing at a missing file.
export const handleCommentCreateThread: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { file, nameEnd, thread } = await parseBody(req);
    if (!file) return sendError(res, 'No file provided');
    if (!thread || !thread.id) return sendError(res, 'Missing thread data');
    if (!Array.isArray(nameEnd) || nameEnd.length !== 2) {
      return sendError(res, 'Missing element location (nameEnd)');
    }

    const absolutePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(absolutePath)) return sendError(res, `File not found: ${file}`, 404);

    const original = fs.readFileSync(absolutePath, 'utf-8');

    // Don't double-inject if this element already carries the attribute.
    const newSource = original.includes(`data-pv-comment-thread="${thread.id}"`)
      ? original
      : injectAttribute(original, nameEnd as [number, number], thread.id);

    const fullThread: CommentThread = {
      id: thread.id,
      status: isValidStatus(thread.status) ? thread.status : DEFAULT_COMMENT_STATUS,
      context: { tab: 'app', ...(thread.context || {}), file },
      comments: Array.isArray(thread.comments) ? thread.comments : [],
      createdAt: thread.createdAt || new Date().toISOString(),
      anchorFile: file,
    };
    enrichSketchpadContext(fullThread);

    // Write JSON first, then source (see header note).
    writeThread(fullThread);
    fs.writeFileSync(absolutePath, newSource, 'utf-8');

    sendJson(res, { success: true, thread: fullThread });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

// POST { threadId, comment: CommentItem }  → append a reply
export const handleCommentReply: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { threadId, comment } = await parseBody(req);
    if (!threadId || !comment?.content) return sendError(res, 'threadId and comment content required');

    const thread = readThread(threadId);
    if (!thread) return sendError(res, 'Thread not found', 404);

    const item: CommentItem = {
      id: comment.id || `c-${Math.random().toString(36).substring(2, 10)}`,
      author: { name: comment.author?.name || 'Anonymous', email: comment.author?.email || '' },
      content: String(comment.content),
      createdAt: comment.createdAt || new Date().toISOString(),
    };
    thread.comments.push(item);
    writeThread(thread);

    sendJson(res, { success: true, thread });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

// POST { threadId, commentId, content }  → edit a single message
export const handleCommentEdit: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { threadId, commentId, content } = await parseBody(req);
    if (!threadId || !commentId || content == null) return sendError(res, 'threadId, commentId and content required');

    const thread = readThread(threadId);
    if (!thread) return sendError(res, 'Thread not found', 404);

    const item = thread.comments.find((c) => c.id === commentId);
    if (!item) return sendError(res, 'Comment not found', 404);
    item.content = String(content);
    item.updatedAt = new Date().toISOString();
    writeThread(thread);

    sendJson(res, { success: true, thread });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

// POST { threadId, commentId }  → delete one reply (never the last message)
export const handleCommentDelete: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { threadId, commentId } = await parseBody(req);
    if (!threadId || !commentId) return sendError(res, 'threadId and commentId required');

    const thread = readThread(threadId);
    if (!thread) return sendError(res, 'Thread not found', 404);
    if (thread.comments.length <= 1) {
      return sendError(res, 'Cannot delete the only comment — delete the whole thread instead');
    }

    thread.comments = thread.comments.filter((c) => c.id !== commentId);
    writeThread(thread);
    sendJson(res, { success: true, thread });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

// POST { threadId, status }  → change collaborative status
export const handleCommentUpdateStatus: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { threadId, status } = await parseBody(req);
    if (!threadId || !isValidStatus(status)) return sendError(res, 'threadId and valid status required');

    const thread = readThread(threadId);
    if (!thread) return sendError(res, 'Thread not found', 404);
    thread.status = status;
    writeThread(thread);

    sendJson(res, { success: true, thread });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

// POST { threadId }  → remove the anchor attribute from source + delete the file
export const handleCommentDeleteThread: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { threadId } = await parseBody(req);
    if (!threadId) return sendError(res, 'threadId required');

    const thread = readThread(threadId);
    if (!thread) return sendError(res, 'Thread not found', 404);

    // Best-effort: strip the attribute from the anchored source file.
    const anchorFile = thread.anchorFile || thread.context?.file;
    if (anchorFile) {
      const absolutePath = path.resolve(process.cwd(), anchorFile);
      if (fs.existsSync(absolutePath)) {
        const original = fs.readFileSync(absolutePath, 'utf-8');
        const stripped = removeAttribute(original, threadId);
        if (stripped !== original) fs.writeFileSync(absolutePath, stripped, 'utf-8');
      }
    }

    const p = threadPath(threadId);
    if (fs.existsSync(p)) fs.unlinkSync(p);

    sendJson(res, { success: true });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

export function registerCommentsMiddleware(server: ViteDevServer): void {
  server.middlewares.use('/__comments-list', handleCommentsList);
  server.middlewares.use('/__comments-create-thread', handleCommentCreateThread);
  server.middlewares.use('/__comments-reply', handleCommentReply);
  server.middlewares.use('/__comments-edit', handleCommentEdit);
  server.middlewares.use('/__comments-delete', handleCommentDelete);
  server.middlewares.use('/__comments-update-status', handleCommentUpdateStatus);
  server.middlewares.use('/__comments-delete-thread', handleCommentDeleteThread);
}
