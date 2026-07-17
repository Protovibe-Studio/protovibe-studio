// plugins/protovibe/src/backend/comments-server.ts
// Backend endpoints for the Comments & Notes feature.
//
// Storage is designed around git sync's last-write-wins conflict handling
// (git-server.ts rebases with `-X theirs`): anything two people can do
// concurrently must land in *different files*, or one side's write is lost.
//
//   Split layout (everything new):
//     src/comments/{threadId}/thread.json      — metadata only, no messages
//     src/comments/{threadId}/{commentId}.json — one file per message
//   Two concurrent replies are two new files with random names — a git sync
//   merges them cleanly instead of a same-file conflict silently dropping one.
//
//   Legacy layout (read-compat): src/comments/comment-{threadId}.json — the
//   whole thread with an inline `comments` array. Still read and merged with
//   any split-layout files for the same id (a split message file shadows the
//   inline copy with the same id). Never rewritten, with one exception:
//   deleting an inline message, since a removal can't be expressed as a new
//   file. Edits and read receipts on legacy messages are written as split
//   overlay files instead, so the legacy file stays byte-stable across
//   machines and can't conflict.
//
// Undo/redo: thread data is intentionally excluded from the snapshot stack
// (see CommentsTab's mutateThreadFile) — the UI snapshots only the anchored
// source file, so stepping through code history never drops a reply.

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { Connect, ViteDevServer } from 'vite';
import type { CommentThread, CommentItem } from '../shared/comments';
import {
  normalizeStatus, threadFileName, commentFileName, THREAD_META_FILE,
  COMMENTS_DIR_REL, COMMENT_ATTACHMENTS_DIR_REL, commentIdAttr,
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

/** Thread metadata as persisted in thread.json — a thread minus its messages. */
type ThreadMeta = Omit<CommentThread, 'comments'>;

// Thread and comment ids come from the client and end up in filesystem paths.
// Generated ids are short lowercase alphanumerics (optionally `c-` prefixed);
// anything else — path separators, dots, the reserved thread.json/attachments
// names — is rejected rather than sanitized.
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
function safeId(raw: unknown): string | null {
  const id = String(raw ?? '');
  if (!SAFE_ID.test(id)) return null;
  if (id === 'thread' || id === 'attachments') return null;
  return id;
}

/** Legacy single-file thread: src/comments/comment-{id}.json (read-compat). */
function legacyThreadPath(id: string): string {
  return path.join(COMMENTS_DIR, threadFileName(id));
}

/** Split-layout thread directory: src/comments/{id}/ */
function threadDir(id: string): string {
  return path.join(COMMENTS_DIR, id);
}

function threadMetaPath(id: string): string {
  return path.join(threadDir(id), THREAD_META_FILE);
}

function commentPath(threadId: string, commentId: string): string {
  return path.join(threadDir(threadId), commentFileName(commentId));
}

function readJson<T>(p: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as T;
  } catch {
    return null;
  }
}

// Normalize a freshly-parsed thread so the rest of the app only ever sees
// current status ids (legacy label-based statuses are remapped in place).
function hydrateThread(thread: CommentThread): CommentThread {
  const status = normalizeStatus(thread.status);
  if (status) thread.status = status;
  else delete thread.status;
  return thread;
}

function metaOf(thread: CommentThread | ThreadMeta): ThreadMeta {
  const { comments: _drop, ...meta } = thread as CommentThread;
  return meta;
}

/**
 * Assemble a thread from every file that contributes to it: the legacy
 * single-file thread (if any), the split-layout thread.json (if any), and the
 * split-layout per-message files. Once thread.json exists it is authoritative
 * for metadata — falling back to the legacy file's status would resurrect a
 * status that was cleared after the split. Messages merge by id (a split file
 * shadows a legacy inline copy) and sort chronologically.
 */
function readThread(id: string): CommentThread | null {
  const legacy = readJson<CommentThread>(legacyThreadPath(id));
  const dir = threadDir(id);
  let dirEntries: string[] | null = null;
  try {
    dirEntries = fs.readdirSync(dir);
  } catch {
    // no split-layout directory
  }
  if (!legacy && dirEntries == null) return null;

  const meta: ThreadMeta | null =
    (dirEntries != null ? readJson<ThreadMeta>(threadMetaPath(id)) : null) ??
    (legacy ? metaOf(legacy) : null);

  const comments: CommentItem[] = Array.isArray(legacy?.comments) ? [...legacy!.comments] : [];
  for (const f of dirEntries ?? []) {
    if (f === THREAD_META_FILE || !f.endsWith('.json')) continue;
    const item = readJson<CommentItem>(path.join(dir, f));
    if (!item || !item.id) continue;
    const at = comments.findIndex((c) => c.id === item.id);
    if (at >= 0) comments[at] = item; // split overlay shadows the inline copy
    else comments.push(item);
  }
  // ISO timestamps sort lexicographically; the sort is stable so equal stamps
  // keep legacy array order.
  comments.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

  if (!meta) {
    // Split directory without thread.json (e.g. a half-finished sync) — keep
    // the messages readable rather than dropping the whole thread.
    if (!comments.length) return null;
    return hydrateThread({ id, context: { tab: 'app' }, comments, createdAt: comments[0].createdAt || '' });
  }
  // `id` last: the filesystem name wins over whatever the JSON claims, so
  // writes always land back in the same files reads came from.
  return hydrateThread({ ...meta, comments, id });
}

function writeThreadMeta(meta: ThreadMeta): void {
  fs.mkdirSync(threadDir(meta.id), { recursive: true });
  fs.writeFileSync(threadMetaPath(meta.id), JSON.stringify(metaOf(meta), null, 2), 'utf-8');
}

function writeCommentFile(threadId: string, item: CommentItem): void {
  fs.mkdirSync(threadDir(threadId), { recursive: true });
  fs.writeFileSync(commentPath(threadId, item.id), JSON.stringify(item, null, 2), 'utf-8');
}

function listThreads(): CommentThread[] {
  if (!fs.existsSync(COMMENTS_DIR)) return [];
  // Union of both layouts' thread ids: split directories + legacy files.
  const ids = new Set<string>();
  for (const entry of fs.readdirSync(COMMENTS_DIR, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name !== 'attachments') ids.add(entry.name);
    } else if (entry.name.startsWith('comment-') && entry.name.endsWith('.json')) {
      ids.add(entry.name.slice('comment-'.length, -'.json'.length));
    }
  }
  const threads: CommentThread[] = [];
  for (const id of ids) {
    const t = readThread(id);
    if (t) threads.push(t);
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

// Coerce a client-supplied suggestions payload into clean {original, suggested}
// string pairs, dropping malformed entries and empty originals. `replaceAll` is
// only written when true, so scoped suggestions (the default) stay terse on disk.
function sanitizeSuggestions(raw: unknown): { original: string; suggested: string; replaceAll?: boolean }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s: unknown): s is Record<string, unknown> => !!s && typeof s === 'object')
    .map((s) => ({
      original: String(s.original ?? ''),
      suggested: String(s.suggested ?? ''),
      ...(s.replaceAll ? { replaceAll: true } : {}),
    }))
    .filter((s) => s.original.trim().length > 0);
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
    const threadId = safeId(thread?.id);
    if (!thread || !threadId) return sendError(res, 'Missing thread data');
    if (!Array.isArray(nameEnd) || nameEnd.length !== 2) {
      return sendError(res, 'Missing element location (nameEnd)');
    }

    const absolutePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(absolutePath)) return sendError(res, `File not found: ${file}`, 404);

    const original = fs.readFileSync(absolutePath, 'utf-8');

    // Each thread is its own valueless attribute, so there is no list to merge
    // into: either this id is already present (idempotent), or we inject a fresh
    // `data-pv-comment-{id}` at nameEnd — even when the element anchors others.
    const alreadyInjected = idAttrRegex(threadId).test(original);
    const newSource = alreadyInjected
      ? original
      : injectAttribute(original, nameEnd as [number, number], threadId);

    // Message ids become filenames — regenerate any that aren't filename-safe.
    const comments: CommentItem[] = (Array.isArray(thread.comments) ? thread.comments : [])
      .map((c: CommentItem) => ({ ...c, id: safeId(c?.id) || `c-${Math.random().toString(36).substring(2, 10)}` }));

    const fullThread: CommentThread = {
      id: threadId,
      // Threads start untriaged; a status is only set once a reviewer picks one.
      ...(normalizeStatus(thread.status) ? { status: normalizeStatus(thread.status) } : {}),
      context: { tab: 'app', ...(thread.context || {}), file },
      comments,
      createdAt: thread.createdAt || new Date().toISOString(),
      anchorFile: file,
    };
    enrichSketchpadContext(fullThread);

    // Write JSON first (split layout: metadata + one file per message), then
    // source — a JSON write failure never leaves an orphaned attribute.
    writeThreadMeta(metaOf(fullThread));
    for (const c of fullThread.comments) writeCommentFile(threadId, c);
    fs.writeFileSync(absolutePath, newSource, 'utf-8');

    sendJson(res, { success: true, thread: fullThread });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

// POST { threadId, comment: CommentItem }  → append a reply.
// The reply is written as its OWN file ({threadId}/{commentId}.json) and no
// existing file is touched — this is what makes two people replying to the
// same thread on different machines merge cleanly through git sync.
export const handleCommentReply: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { threadId: rawThreadId, comment } = await parseBody(req);
    const threadId = safeId(rawThreadId);
    const attachments = Array.isArray(comment?.attachments) ? comment.attachments.filter((a: unknown) => typeof a === 'string') : [];
    const suggestions = sanitizeSuggestions(comment?.suggestions);
    const hasBody = (comment?.content && String(comment.content).trim()) || attachments.length > 0 || suggestions.length > 0;
    if (!threadId || !hasBody) return sendError(res, 'threadId and comment content, attachment, or suggestion required');

    const thread = readThread(threadId);
    if (!thread) return sendError(res, 'Thread not found', 404);

    const item: CommentItem = {
      id: safeId(comment.id) || `c-${Math.random().toString(36).substring(2, 10)}`,
      author: { name: comment.author?.name || 'Anonymous', email: comment.author?.email || '' },
      content: String(comment.content || ''),
      createdAt: comment.createdAt || new Date().toISOString(),
      ...(attachments.length ? { attachments } : {}),
      ...(suggestions.length ? { suggestions } : {}),
    };
    writeCommentFile(threadId, item);
    thread.comments.push(item);

    sendJson(res, { success: true, thread });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

// POST { threadId, commentId, content, suggestions? }  → edit a single message.
// When `suggestions` is present it replaces the comment's wording suggestions
// wholesale (empty array deletes them); when absent they are left untouched.
export const handleCommentEdit: Connect.NextHandleFunction = async (req, res) => {
  try {
    const body = await parseBody(req);
    const threadId = safeId(body.threadId);
    const commentId = safeId(body.commentId);
    const { content } = body;
    if (!threadId || !commentId || content == null) return sendError(res, 'threadId, commentId and content required');

    const thread = readThread(threadId);
    if (!thread) return sendError(res, 'Thread not found', 404);

    const item = thread.comments.find((c) => c.id === commentId);
    if (!item) return sendError(res, 'Comment not found', 404);
    item.content = String(content);
    if ('suggestions' in body) {
      const suggestions = sanitizeSuggestions(body.suggestions);
      if (suggestions.length) item.suggestions = suggestions;
      else delete item.suggestions;
    }
    if (!String(item.content).trim() && !(item.attachments?.length) && !(item.suggestions?.length)) {
      return sendError(res, 'A comment needs text, an attachment, or a wording suggestion');
    }
    item.updatedAt = new Date().toISOString();
    // Write only this message's file. For a legacy inline message this creates
    // a split overlay that shadows the inline copy on read — the legacy file
    // itself stays untouched.
    writeCommentFile(threadId, item);

    sendJson(res, { success: true, thread });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

// POST { threadId, commentId }  → delete one reply (never the last message)
export const handleCommentDelete: Connect.NextHandleFunction = async (req, res) => {
  try {
    const body = await parseBody(req);
    const threadId = safeId(body.threadId);
    const commentId = safeId(body.commentId);
    if (!threadId || !commentId) return sendError(res, 'threadId and commentId required');

    const thread = readThread(threadId);
    if (!thread) return sendError(res, 'Thread not found', 404);
    if (thread.comments.length <= 1) {
      return sendError(res, 'Cannot delete the only comment — delete the whole thread instead');
    }

    // Remove the split-layout file (the message itself, or an overlay of a
    // legacy inline message) if there is one.
    try { fs.unlinkSync(commentPath(threadId, commentId)); } catch {}
    // Deletion is the one mutation a new file can't express: if the message
    // (also) lives inline in a legacy file, that file must be rewritten —
    // otherwise the inline copy would resurface once the overlay is gone.
    const legacy = readJson<CommentThread>(legacyThreadPath(threadId));
    if (legacy && Array.isArray(legacy.comments) && legacy.comments.some((c) => c.id === commentId)) {
      legacy.comments = legacy.comments.filter((c) => c.id !== commentId);
      fs.writeFileSync(legacyThreadPath(threadId), JSON.stringify(legacy, null, 2), 'utf-8');
    }

    thread.comments = thread.comments.filter((c) => c.id !== commentId);
    sendJson(res, { success: true, thread });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

// POST { threadId, status }  → change collaborative status.
// A null/empty status clears the field, returning the thread to untriaged.
export const handleCommentUpdateStatus: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { threadId: rawThreadId, status } = await parseBody(req);
    const threadId = safeId(rawThreadId);
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
    // Metadata lands in thread.json; for a legacy-only thread this creates the
    // split directory and thread.json becomes authoritative from here on.
    writeThreadMeta(metaOf(thread));

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
    const { threadId: rawThreadId, commentId, name, seen } = await parseBody(req);
    const threadId = safeId(rawThreadId);
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
      // Only touch messages whose receipts actually changed — a no-op receipt
      // must not churn files (and git diffs) on every thread open.
      const changed = !!seen !== set.has(name);
      if (seen) set.add(name); else set.delete(name);
      c.seenBy = Array.from(set);
      if (changed && safeId(c.id)) writeCommentFile(threadId, c);
    }

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
      for (const c of t.comments) {
        const base = Array.isArray(c.seenBy) ? c.seenBy : (c.author?.name ? [c.author.name] : []);
        const set = new Set(base);
        const changed = !set.has(name);
        set.add(name);
        c.seenBy = Array.from(set);
        // Per-message writes (split layout / legacy overlay); untouched
        // messages keep their files byte-identical.
        if (changed && safeId(c.id)) writeCommentFile(t.id, c);
      }
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

// POST { threadId }  → remove the anchor attribute from source + delete the
// thread's files in both layouts (split directory and/or legacy file).
export const handleCommentDeleteThread: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { threadId: rawThreadId } = await parseBody(req);
    const threadId = safeId(rawThreadId);
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

    const legacy = legacyThreadPath(threadId);
    if (fs.existsSync(legacy)) fs.unlinkSync(legacy);
    fs.rmSync(threadDir(threadId), { recursive: true, force: true });

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
