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
import sharp from 'sharp';
import { Connect, ViteDevServer } from 'vite';
import type { CommentThread, CommentItem } from '../shared/comments';
import {
  normalizeStatus, threadFileName, COMMENTS_DIR_REL,
  COMMENT_ATTACHMENTS_DIR_REL, commentIdAttr,
} from '../shared/comments';

const COMMENTS_DIR = path.resolve(process.cwd(), COMMENTS_DIR_REL);
const ATTACHMENTS_DIR = path.resolve(process.cwd(), COMMENT_ATTACHMENTS_DIR_REL);
const REGISTRY_PATH = path.resolve(process.cwd(), 'src/sketchpads/_registry.json');

// Comment image attachments are squeezed under this size so a thread file's
// neighbouring assets stay small and quick to load inline. Mirrors the
// background-image compression approach (sharp) but targets a hard byte budget.
const ATTACHMENT_MAX_BYTES = 70 * 1024;

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

// Normalize a freshly-parsed thread so the rest of the app only ever sees
// current status ids (legacy label-based statuses are remapped in place).
function hydrateThread(thread: CommentThread): CommentThread {
  const status = normalizeStatus(thread.status);
  if (status) thread.status = status;
  else delete thread.status;
  return thread;
}

function readThread(id: string): CommentThread | null {
  const p = threadPath(id);
  if (!fs.existsSync(p)) return null;
  try {
    return hydrateThread(JSON.parse(fs.readFileSync(p, 'utf-8')) as CommentThread);
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
      threads.push(hydrateThread(JSON.parse(fs.readFileSync(path.join(COMMENTS_DIR, f), 'utf-8'))));
    } catch {
      // skip malformed file
    }
  }
  // Newest first.
  threads.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return threads;
}

// ─── attachment compression / IO ─────────────────────────────────────────────

// Re-encode an image to WebP, stepping down resolution and quality until it fits
// under ATTACHMENT_MAX_BYTES. Larger dimensions are preferred over higher quality
// (the inline thumbnail opens fullscreen on click, so keeping pixels matters more
// than crispness). Returns the smallest attempt if nothing fits cleanly.
async function compressAttachment(input: Buffer): Promise<Buffer> {
  const dims = [2000, 1600, 1200, 900, 700, 500];
  const qualities = [80, 70, 60, 50, 40, 30];
  let smallest: Buffer | null = null;
  for (const width of dims) {
    for (const quality of qualities) {
      const buf = await sharp(input, { failOn: 'none' })
        .rotate()
        .resize({ width, height: width, fit: 'inside', withoutEnlargement: true })
        .webp({ quality })
        .toBuffer();
      if (buf.length <= ATTACHMENT_MAX_BYTES) return buf;
      if (!smallest || buf.length < smallest.length) smallest = buf;
    }
  }
  return smallest ?? input;
}

function randomAttachmentId(): string {
  return `att-${Math.random().toString(36).substring(2, 12)}`;
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

// Insert a valueless ` data-pv-comment-<id>` attribute right after the element's
// tag name, mirroring handleUpdateProp's 'add' branch (insert at nameEnd column).
// Every thread gets its OWN uniquely-named attribute, so a second thread on the
// same element can never collide into a duplicate attribute.
function injectAttribute(source: string, nameEnd: [number, number], id: string): string {
  const lines = source.split('\n');
  const lineIdx = nameEnd[0] - 1;
  const colIdx = nameEnd[1];
  if (lineIdx < 0 || lineIdx >= lines.length) {
    throw new Error('nameEnd is out of range for the current file');
  }
  const line = lines[lineIdx];
  lines[lineIdx] = line.substring(0, colIdx) + ` ${commentIdAttr(id)}` + line.substring(colIdx);
  return lines.join('\n');
}

// Build a boundary-safe matcher for a single ` data-pv-comment-<id>` attribute,
// optionally with an empty value (`=""` / `={...}`). Thread ids are [a-z0-9], so
// the lookahead stops a short id from matching inside a longer one.
function idAttrRegex(id: string): RegExp {
  return new RegExp(`\\s*${commentIdAttr(id)}(?:=(?:""|'')|=\\{[^}]*\\})?(?![\\w-])`, 'g');
}

// Remove a thread's `data-pv-comment-<id>` attribute (with its leading space).
// Other elements' attributes — and other ids on the same element — are untouched.
function removeAttribute(source: string, id: string): string {
  return source.replace(idAttrRegex(id), '');
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

    // Each thread is its own valueless attribute, so there is no list to merge
    // into: either this id is already present (idempotent), or we inject a fresh
    // `data-pv-comment-{id}` at nameEnd — even when the element anchors others.
    const alreadyInjected = idAttrRegex(thread.id).test(original);
    const newSource = alreadyInjected
      ? original
      : injectAttribute(original, nameEnd as [number, number], thread.id);

    const fullThread: CommentThread = {
      id: thread.id,
      // Threads start untriaged; a status is only set once a reviewer picks one.
      ...(normalizeStatus(thread.status) ? { status: normalizeStatus(thread.status) } : {}),
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
    const attachments = Array.isArray(comment?.attachments) ? comment.attachments.filter((a: unknown) => typeof a === 'string') : [];
    const hasBody = (comment?.content && String(comment.content).trim()) || attachments.length > 0;
    if (!threadId || !hasBody) return sendError(res, 'threadId and comment content or attachment required');

    const thread = readThread(threadId);
    if (!thread) return sendError(res, 'Thread not found', 404);

    const item: CommentItem = {
      id: comment.id || `c-${Math.random().toString(36).substring(2, 10)}`,
      author: { name: comment.author?.name || 'Anonymous', email: comment.author?.email || '' },
      content: String(comment.content || ''),
      createdAt: comment.createdAt || new Date().toISOString(),
      ...(attachments.length ? { attachments } : {}),
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

// POST { threadId, status }  → change collaborative status.
// A null/empty status clears the field, returning the thread to untriaged.
export const handleCommentUpdateStatus: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { threadId, status } = await parseBody(req);
    if (!threadId) return sendError(res, 'threadId required');

    const thread = readThread(threadId);
    if (!thread) return sendError(res, 'Thread not found', 404);

    if (status == null || status === '') {
      delete thread.status; // back to "No status"
    } else {
      const normalized = normalizeStatus(status);
      if (!normalized) return sendError(res, 'valid status required');
      thread.status = normalized;
    }
    writeThread(thread);

    sendJson(res, { success: true, thread });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

// POST { threadId, commentId?, name, seen }  → set/clear a read receipt.
// Adds (seen=true) or removes (seen=false) `name` from a comment's seenBy list.
// With no commentId every comment in the thread is updated (used on thread open
// and "mark thread read"). Read receipts are intentionally NOT snapshotted, so
// opening a thread never lands an entry on the undo stack.
export const handleCommentSetSeen: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { threadId, commentId, name, seen } = await parseBody(req);
    if (!threadId || !name) return sendError(res, 'threadId and name required');

    const thread = readThread(threadId);
    if (!thread) return sendError(res, 'Thread not found', 404);

    for (const c of thread.comments) {
      if (commentId && c.id !== commentId) continue;
      // Untracked (no seenBy yet) → seed with the author so flipping one reader's
      // receipt never silently marks the author's own message unread. An explicit
      // empty array is respected as-is (e.g. the author marked their own unread).
      const base = Array.isArray(c.seenBy) ? c.seenBy : (c.author?.name ? [c.author.name] : []);
      const set = new Set(base);
      if (seen) set.add(name); else set.delete(name);
      c.seenBy = Array.from(set);
    }
    writeThread(thread);

    sendJson(res, { success: true, thread });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

// POST { name }  → mark every comment in every thread as seen by `name`.
export const handleCommentMarkAllRead: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { name } = await parseBody(req);
    if (!name) return sendError(res, 'name required');

    const threads = listThreads();
    for (const t of threads) {
      let changed = false;
      for (const c of t.comments) {
        const base = Array.isArray(c.seenBy) ? c.seenBy : (c.author?.name ? [c.author.name] : []);
        const set = new Set(base);
        if (!set.has(name)) { set.add(name); changed = true; }
        c.seenBy = Array.from(set);
      }
      if (changed) writeThread(t);
    }

    sendJson(res, { success: true, threads });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

// POST { filename, base64Data }  → { attachment }
// Compresses an image to ≤70kb (WebP) and stores it under
// src/comments/attachments/ with a fresh unique id. SVGs are passed through
// untouched (sharp would rasterise them). The returned filename is what the UI
// persists in the comment's `attachments` array. Uploads happen on submit, so an
// upload that the user then abandons is just a harmless orphan file.
export const handleCommentUploadAttachment: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { filename, base64Data } = await parseBody(req);
    if (!base64Data) return sendError(res, 'base64Data required');

    const ext = path.extname(String(filename || '')).toLowerCase();
    const raw = String(base64Data).replace(/^data:[^;]+;base64,/, '');
    const input = Buffer.from(raw, 'base64');

    let buffer = input;
    let outExt = '.webp';
    if (ext === '.svg') {
      outExt = '.svg';
    } else {
      buffer = await compressAttachment(input);
    }

    fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
    let name = `${randomAttachmentId()}${outExt}`;
    while (fs.existsSync(path.join(ATTACHMENTS_DIR, name))) {
      name = `${randomAttachmentId()}${outExt}`;
    }
    fs.writeFileSync(path.join(ATTACHMENTS_DIR, name), buffer);

    sendJson(res, { success: true, attachment: name });
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
  server.middlewares.use('/__comments-set-seen', handleCommentSetSeen);
  server.middlewares.use('/__comments-mark-all-read', handleCommentMarkAllRead);
  server.middlewares.use('/__comments-upload-attachment', handleCommentUploadAttachment);
  server.middlewares.use('/__comments-delete-thread', handleCommentDeleteThread);
}
