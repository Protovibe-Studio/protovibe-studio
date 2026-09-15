// plugins/protovibe/src/backend/specs-server.ts
// Backend endpoints for the Specs feature (annotated prototype states).
// Every mutating endpoint returns the full, freshly-read SpecBundle so the UI
// never merges patches locally.
//
// Undo/redo: unlike comments, spec edits ARE undoable. The UI snapshots the
// item file (and, for anchored annotations, the source file) through the
// generic /__take-snapshot endpoint before calling any mutation here, so the
// undo stack can restore or delete the exact files each edit touched. This
// server never snapshots on its own.

import fs from 'fs';
import path from 'path';
import { Connect, ViteDevServer } from 'vite';
import type { SpecAnnotation, SpecBundle, SpecDoc, SpecHeading, SpecItem, SpecStatus } from '../shared/specs';
import {
  specIdAttr, normalizeSpecStatus, normalizeHeadingLevel, makeSpecId, makeAnnotationId, makeHeadingId,
  isAnnotation, INITIAL_RANK,
} from '../shared/specs';
import { renderSpecExport, type SpecExportFormat } from '../shared/specs-export';
import {
  safeSpecId, readSpec, readItem, listSpecSummaries, writeSpecMeta, writeItem,
  deleteItemFile, deleteSpecDir, buildViewerData,
} from './specs-store';
import { injectValuelessAttr, removeValuelessAttr, hasValuelessAttr } from './source-attr';

// ─── small http helpers (mirrors comments-server.ts) ─────────────────────────

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
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

function sendError(res: any, msg: string, status = 400): void {
  sendJson(res, { error: msg }, status);
}

// ─── source anchoring ────────────────────────────────────────────────────────

function resolveProjectFile(file: string): string | null {
  const root = process.cwd();
  const absolute = path.resolve(root, file);
  if (!absolute.startsWith(root)) return null;
  return absolute;
}

/** Inject `data-pv-spec-{id}` at nameEnd in `file` (idempotent). */
function injectAnchor(file: string, nameEnd: [number, number], itemId: string): void {
  const absolute = resolveProjectFile(file);
  if (!absolute || !fs.existsSync(absolute)) throw new Error(`File not found: ${file}`);
  const original = fs.readFileSync(absolute, 'utf-8');
  const attr = specIdAttr(itemId);
  if (hasValuelessAttr(original, attr)) return;
  fs.writeFileSync(absolute, injectValuelessAttr(original, nameEnd, attr), 'utf-8');
}

/** Best-effort removal of an annotation's anchor attribute from its file. */
function removeAnchor(item: SpecItem): void {
  if (!isAnnotation(item) || !item.anchor?.file) return;
  const absolute = resolveProjectFile(item.anchor.file);
  if (!absolute || !fs.existsSync(absolute)) return;
  const original = fs.readFileSync(absolute, 'utf-8');
  const stripped = removeValuelessAttr(original, specIdAttr(item.id));
  if (stripped !== original) fs.writeFileSync(absolute, stripped, 'utf-8');
}

function validNameEnd(raw: unknown): raw is [number, number] {
  return Array.isArray(raw) && raw.length === 2 && raw.every((n) => typeof n === 'number');
}

function bundleOr404(res: any, specId: string): SpecBundle | null {
  const bundle = readSpec(specId);
  if (!bundle) sendError(res, 'Spec not found', 404);
  return bundle;
}

// ─── endpoint handlers ───────────────────────────────────────────────────────

// POST {} → { specs: SpecSummary[] }
export const handleSpecsList: Connect.NextHandleFunction = async (_req, res) => {
  try {
    sendJson(res, { specs: listSpecSummaries() });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

// POST { specId } → { spec, items }
export const handleSpecsGet: Connect.NextHandleFunction = async (req, res) => {
  try {
    const specId = safeSpecId((await parseBody(req)).specId);
    if (!specId) return sendError(res, 'specId required');
    const bundle = bundleOr404(res, specId);
    if (bundle) sendJson(res, bundle);
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

// POST { title, id? } → { spec, items: [] }
// The client may pre-generate the id so it can snapshot spec.json (as a
// not-yet-existing file) before the create — undo then deletes it.
export const handleSpecsCreate: Connect.NextHandleFunction = async (req, res) => {
  try {
    const body = await parseBody(req);
    const id = safeSpecId(body.id) || makeSpecId();
    if (readSpec(id)) return sendError(res, 'Spec already exists', 409);
    const spec: SpecDoc = {
      id,
      title: String(body.title || 'Untitled spec').trim() || 'Untitled spec',
      createdAt: new Date().toISOString(),
    };
    writeSpecMeta(spec);
    sendJson(res, { spec, items: [] });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

// POST { specId, title } → bundle
export const handleSpecsUpdate: Connect.NextHandleFunction = async (req, res) => {
  try {
    const body = await parseBody(req);
    const specId = safeSpecId(body.specId);
    if (!specId) return sendError(res, 'specId required');
    const bundle = bundleOr404(res, specId);
    if (!bundle) return;
    const title = String(body.title ?? '').trim();
    if (!title) return sendError(res, 'title required');
    writeSpecMeta({ ...bundle.spec, title, updatedAt: new Date().toISOString() });
    sendJson(res, readSpec(specId));
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

// POST { specId } → { success }
// Strips every annotation's anchor attribute, then removes the directory.
export const handleSpecsDelete: Connect.NextHandleFunction = async (req, res) => {
  try {
    const specId = safeSpecId((await parseBody(req)).specId);
    if (!specId) return sendError(res, 'specId required');
    const bundle = bundleOr404(res, specId);
    if (!bundle) return;
    for (const item of bundle.items) removeAnchor(item);
    deleteSpecDir(specId);
    sendJson(res, { success: true });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

// POST { specId, item, file?, nameEnd? } → bundle
// `item` is a partial SpecItem (type, rank, and the type's fields). When
// `file` + `nameEnd` are present the annotation is pinned: JSON is written
// first, then the attribute, so a source write failure never leaves an
// orphaned attribute.
export const handleSpecsItemCreate: Connect.NextHandleFunction = async (req, res) => {
  try {
    const body = await parseBody(req);
    const specId = safeSpecId(body.specId);
    if (!specId) return sendError(res, 'specId required');
    if (!bundleOr404(res, specId)) return;
    const raw = body.item;
    if (!raw || typeof raw !== 'object') return sendError(res, 'item required');

    const nowIso = new Date().toISOString();
    const rank = typeof raw.rank === 'string' && raw.rank ? raw.rank : INITIAL_RANK;
    let item: SpecItem;

    if (raw.type === 'heading') {
      const h: SpecHeading = {
        id: safeSpecId(raw.id) || makeHeadingId(),
        type: 'heading',
        rank,
        title: String(raw.title ?? ''),
        level: normalizeHeadingLevel(raw.level),
        createdAt: nowIso,
      };
      item = h;
    } else if (raw.type === 'annotation') {
      const pinned = !!body.file && validNameEnd(body.nameEnd);
      if (body.file && !pinned) return sendError(res, 'Missing element location (nameEnd)');
      const status = normalizeSpecStatus(raw.status);
      const a: SpecAnnotation = {
        id: safeSpecId(raw.id) || makeAnnotationId(),
        type: 'annotation',
        rank,
        ...(typeof raw.title === 'string' && raw.title.trim() ? { title: raw.title.trim() } : {}),
        text: String(raw.text ?? ''),
        ...(status ? { status } : {}),
        state: { tab: 'app', path: typeof raw.state?.path === 'string' && raw.state.path.startsWith('/') ? raw.state.path : '/' },
        ...(pinned ? { anchor: { file: String(body.file) } } : {}),
        author: { name: String(raw.author?.name || 'Anonymous'), email: String(raw.author?.email || '') },
        createdAt: nowIso,
      };
      item = a;
    } else {
      return sendError(res, 'item.type must be "annotation" or "heading"');
    }

    if (readItem(specId, item.id)) return sendError(res, 'Item already exists', 409);
    writeItem(specId, item);
    if (isAnnotation(item) && item.anchor) injectAnchor(item.anchor.file, body.nameEnd, item.id);
    writeSpecMeta({ ...readSpec(specId)!.spec, updatedAt: nowIso });

    sendJson(res, { ...readSpec(specId), createdId: item.id });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

// POST { specId, itemId, patch } → bundle
// patch: { title?, text?, status? (null clears), level?, rank?, state? }.
// Only the fields present are changed; the item's own file is the only write.
export const handleSpecsItemUpdate: Connect.NextHandleFunction = async (req, res) => {
  try {
    const body = await parseBody(req);
    const specId = safeSpecId(body.specId);
    const itemId = safeSpecId(body.itemId);
    if (!specId || !itemId) return sendError(res, 'specId and itemId required');
    if (!bundleOr404(res, specId)) return;
    const item = readItem(specId, itemId);
    if (!item) return sendError(res, 'Item not found', 404);
    const patch = body.patch && typeof body.patch === 'object' ? body.patch : {};

    if (typeof patch.rank === 'string' && patch.rank) item.rank = patch.rank;
    if (item.type === 'heading') {
      if ('title' in patch) item.title = String(patch.title ?? '');
      if ('level' in patch) item.level = normalizeHeadingLevel(patch.level);
    } else {
      if ('title' in patch) {
        const t = String(patch.title ?? '').trim();
        if (t) item.title = t; else delete item.title;
      }
      if ('text' in patch) item.text = String(patch.text ?? '');
      if ('status' in patch) {
        const s: SpecStatus | undefined = normalizeSpecStatus(patch.status);
        if (s) item.status = s; else delete item.status;
      }
      if (patch.state && typeof patch.state.path === 'string' && patch.state.path.startsWith('/')) {
        item.state = { tab: 'app', path: patch.state.path };
      }
    }
    item.updatedAt = new Date().toISOString();
    writeItem(specId, item);
    sendJson(res, readSpec(specId));
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

// POST { specId, itemId, file?, nameEnd? } → bundle
// Re-pin an annotation to a different element (or unpin it when no file is
// given): the old attribute is removed and the new one injected.
export const handleSpecsItemReanchor: Connect.NextHandleFunction = async (req, res) => {
  try {
    const body = await parseBody(req);
    const specId = safeSpecId(body.specId);
    const itemId = safeSpecId(body.itemId);
    if (!specId || !itemId) return sendError(res, 'specId and itemId required');
    if (!bundleOr404(res, specId)) return;
    const item = readItem(specId, itemId);
    if (!item || !isAnnotation(item)) return sendError(res, 'Annotation not found', 404);

    const pinned = !!body.file && validNameEnd(body.nameEnd);
    if (body.file && !pinned) return sendError(res, 'Missing element location (nameEnd)');

    removeAnchor(item);
    if (pinned) {
      item.anchor = { file: String(body.file) };
      injectAnchor(item.anchor.file, body.nameEnd, item.id);
    } else {
      delete item.anchor;
    }
    item.updatedAt = new Date().toISOString();
    writeItem(specId, item);
    sendJson(res, readSpec(specId));
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

// POST { specId, itemId } → bundle
export const handleSpecsItemDelete: Connect.NextHandleFunction = async (req, res) => {
  try {
    const body = await parseBody(req);
    const specId = safeSpecId(body.specId);
    const itemId = safeSpecId(body.itemId);
    if (!specId || !itemId) return sendError(res, 'specId and itemId required');
    if (!bundleOr404(res, specId)) return;
    const item = readItem(specId, itemId);
    if (!item) return sendError(res, 'Item not found', 404);
    removeAnchor(item);
    deleteItemFile(specId, itemId);
    sendJson(res, readSpec(specId));
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

// POST { specId, format: 'markdown' | 'html', publishedUrl? } → { content, filename }
export const handleSpecsExport: Connect.NextHandleFunction = async (req, res) => {
  try {
    const body = await parseBody(req);
    const specId = safeSpecId(body.specId);
    if (!specId) return sendError(res, 'specId required');
    const bundle = bundleOr404(res, specId);
    if (!bundle) return;
    const format: SpecExportFormat = body.format === 'html' ? 'html' : 'markdown';
    const publishedUrl = typeof body.publishedUrl === 'string' ? body.publishedUrl : '';
    const content = renderSpecExport(bundle, { format, publishedUrl });
    const slug = bundle.spec.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'spec';
    sendJson(res, { content, filename: `${slug}.${format === 'html' ? 'html' : 'md'}` });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

// GET → SpecsViewerData (same JSON the publish step writes to dist/specs-data.json)
export const handleSpecsViewerData: Connect.NextHandleFunction = (_req, res) => {
  try {
    sendJson(res, buildViewerData());
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

export function registerSpecsMiddleware(server: ViteDevServer): void {
  server.middlewares.use('/__specs-list', handleSpecsList);
  server.middlewares.use('/__specs-get', handleSpecsGet);
  server.middlewares.use('/__specs-create', handleSpecsCreate);
  server.middlewares.use('/__specs-update', handleSpecsUpdate);
  server.middlewares.use('/__specs-delete', handleSpecsDelete);
  server.middlewares.use('/__specs-item-create', handleSpecsItemCreate);
  server.middlewares.use('/__specs-item-update', handleSpecsItemUpdate);
  server.middlewares.use('/__specs-item-reanchor', handleSpecsItemReanchor);
  server.middlewares.use('/__specs-item-delete', handleSpecsItemDelete);
  server.middlewares.use('/__specs-export', handleSpecsExport);
  // Dev preview of the published viewer: /specs.html is served from the plugin
  // dir by protovibe-source.ts; its data + bundle come from here.
  server.middlewares.use('/specs-data.json', handleSpecsViewerData);
}
