// plugins/protovibe/src/backend/specs-store.ts
// File IO for the Specs feature. Pure functions over src/specs/, shared by the
// dev-server endpoints (specs-server.ts) and the build-time publish step
// (specs-publish.ts). No HTTP, no Vite.
//
//   src/specs/{specId}/spec.json     — document metadata only
//   src/specs/{specId}/{itemId}.json — one file per annotation / heading
//
// One file per mutation keeps git sync's last-write-wins rebase safe (see
// comments-server.ts for the same reasoning). Undo/redo is handled by the
// generic snapshot stack: the UI snapshots the exact item file (and anchor
// source file) it is about to touch, so every spec edit is undoable.

import fs from 'fs';
import path from 'path';
import type {
  SpecAnnotation, SpecBundle, SpecDoc, SpecHeading, SpecItem, SpecSummary, SpecsViewerData,
} from '../shared/specs';
import {
  SPECS_DIR_REL, SPEC_META_FILE, normalizeHeadingLevel, normalizeSpecStatus,
  sortSpecItems, isAnnotation,
} from '../shared/specs';

const SPECS_DIR = path.resolve(process.cwd(), SPECS_DIR_REL);

// Ids come from the client and end up in filesystem paths. Generated ids are
// short lowercase alphanumerics, optionally `a-` / `h-` prefixed; anything
// else — path separators, dots, the reserved spec.json name — is rejected.
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
export function safeSpecId(raw: unknown): string | null {
  const id = String(raw ?? '');
  if (!SAFE_ID.test(id)) return null;
  if (id === 'spec') return null;
  return id;
}

export function specDir(specId: string): string {
  return path.join(SPECS_DIR, specId);
}

export function specMetaPath(specId: string): string {
  return path.join(specDir(specId), SPEC_META_FILE);
}

export function itemPath(specId: string, itemId: string): string {
  return path.join(specDir(specId), `${itemId}.json`);
}

function readJson<T>(p: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as T;
  } catch {
    return null;
  }
}

// Coerce a parsed item file into a well-formed SpecItem, or null if it is not
// one (malformed JSON, unknown type). Unknown statuses / levels fall back
// rather than dropping the item, so a file written by a newer version still
// reads.
function hydrateItem(raw: any, id: string): SpecItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const base = {
    id,
    rank: typeof raw.rank === 'string' && raw.rank ? raw.rank : 'n',
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '',
    ...(typeof raw.updatedAt === 'string' ? { updatedAt: raw.updatedAt } : {}),
  };
  if (raw.type === 'heading') {
    const h: SpecHeading = { ...base, type: 'heading', title: String(raw.title ?? ''), level: normalizeHeadingLevel(raw.level) };
    return h;
  }
  if (raw.type === 'annotation') {
    const status = normalizeSpecStatus(raw.status);
    const a: SpecAnnotation = {
      ...base,
      type: 'annotation',
      ...(typeof raw.title === 'string' && raw.title.trim() ? { title: raw.title } : {}),
      text: String(raw.text ?? ''),
      ...(status ? { status } : {}),
      state: { tab: 'app', path: typeof raw.state?.path === 'string' ? raw.state.path : '/' },
      ...(raw.anchor && typeof raw.anchor.file === 'string' ? { anchor: { file: raw.anchor.file } } : {}),
      author: { name: String(raw.author?.name ?? 'Anonymous'), email: String(raw.author?.email ?? '') },
    };
    return a;
  }
  return null;
}

function hydrateSpec(raw: any, id: string): SpecDoc | null {
  if (!raw || typeof raw !== 'object') return null;
  return {
    id, // the directory name wins over whatever the JSON claims
    title: String(raw.title ?? 'Untitled spec'),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '',
    ...(typeof raw.updatedAt === 'string' ? { updatedAt: raw.updatedAt } : {}),
  };
}

export function readSpecMeta(specId: string): SpecDoc | null {
  return hydrateSpec(readJson(specMetaPath(specId)), specId);
}

export function readSpec(specId: string): SpecBundle | null {
  const spec = readSpecMeta(specId);
  // A directory without spec.json (e.g. the spec's creation was undone, or a
  // half-finished sync) is not a spec — its item files are left alone so a
  // redo can bring the document back intact.
  if (!spec) return null;
  const items: SpecItem[] = [];
  let entries: string[] = [];
  try { entries = fs.readdirSync(specDir(specId)); } catch { /* no dir */ }
  for (const f of entries) {
    if (f === SPEC_META_FILE || !f.endsWith('.json')) continue;
    const id = f.slice(0, -'.json'.length);
    if (!safeSpecId(id)) continue;
    const item = hydrateItem(readJson(path.join(specDir(specId), f)), id);
    if (item) items.push(item);
  }
  return { spec, items: sortSpecItems(items) };
}

export function readItem(specId: string, itemId: string): SpecItem | null {
  return hydrateItem(readJson(itemPath(specId, itemId)), itemId);
}

export function listSpecIds(): string[] {
  if (!fs.existsSync(SPECS_DIR)) return [];
  return fs.readdirSync(SPECS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && safeSpecId(e.name))
    .map((e) => e.name);
}

/** Every spec, oldest first (the docs list order). */
export function readAllSpecs(): SpecBundle[] {
  const bundles: SpecBundle[] = [];
  for (const id of listSpecIds()) {
    const b = readSpec(id);
    if (b) bundles.push(b);
  }
  bundles.sort((x, y) => (x.spec.createdAt || '').localeCompare(y.spec.createdAt || '') || x.spec.id.localeCompare(y.spec.id));
  return bundles;
}

export function listSpecSummaries(): SpecSummary[] {
  return readAllSpecs().map(({ spec, items }) => ({
    ...spec,
    annotationCount: items.filter(isAnnotation).length,
  }));
}

export function writeSpecMeta(spec: SpecDoc): void {
  fs.mkdirSync(specDir(spec.id), { recursive: true });
  fs.writeFileSync(specMetaPath(spec.id), JSON.stringify(spec, null, 2), 'utf-8');
}

export function writeItem(specId: string, item: SpecItem): void {
  fs.mkdirSync(specDir(specId), { recursive: true });
  fs.writeFileSync(itemPath(specId, item.id), JSON.stringify(item, null, 2), 'utf-8');
}

export function deleteItemFile(specId: string, itemId: string): void {
  try { fs.unlinkSync(itemPath(specId, itemId)); } catch { /* already gone */ }
}

export function deleteSpecDir(specId: string): void {
  fs.rmSync(specDir(specId), { recursive: true, force: true });
}

/** The JSON the published viewer loads (also served live in dev). */
export function buildViewerData(): SpecsViewerData {
  return { generatedAt: new Date().toISOString(), specs: readAllSpecs() };
}
