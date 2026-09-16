// plugins/protovibe/src/shared/specs.ts
// Shared type definitions for the Specs feature (annotated prototype states).
// Imported by the Vite backend (specs-server.ts, specs-publish.ts), the
// inspector UI (SpecsTab) and the published read-only viewer (specs-viewer).
//
// This module is intentionally independent of shared/comments.ts: specs and
// comments are separate features with separate storage, endpoints and UI.

/**
 * Per-annotation status, stored as a stable id. Ids are persisted in item
 * files and must never be renamed — labels and colours live in the UI's
 * SPEC_STATUS_CONFIG.
 */
export type SpecStatus = 'todo' | 'discuss' | 'verified';

/** Display order of the statuses (also the order they appear in pickers). */
export const SPEC_STATUSES: SpecStatus[] = ['todo', 'discuss', 'verified'];

/**
 * Presentation for each stable status id, shared by the editor, the published
 * viewer and the exports. The persisted value is the id, so a label can change
 * without touching saved files. Colors are literal hex so this file stays free
 * of UI imports (the backend uses it too).
 */
export const SPEC_STATUS_CONFIG: Record<SpecStatus, { label: string; color: string }> = {
  todo:     { label: 'Todo',       color: '#A78BFA' },
  discuss:  { label: 'To discuss', color: '#F2C94C' },
  verified: { label: 'Verified',   color: '#1ABC9C' },
};

/**
 * Background of the active annotation / heading row, shared by the editor
 * panel and the published viewer so both highlight the same way. Literal
 * colour for the same reason as SPEC_STATUS_CONFIG: this file stays free of
 * UI imports.
 */
export const SPEC_ACTIVE_BG = 'rgb(0 141 253 / 25%)';

export function normalizeSpecStatus(raw: unknown): SpecStatus | undefined {
  if (typeof raw !== 'string') return undefined;
  return (SPEC_STATUSES as string[]).includes(raw) ? (raw as SpecStatus) : undefined;
}

/** Heading sizes. `big` is a top-level section, `medium` a sub-section. */
export type SpecHeadingLevel = 'big' | 'medium';

export function normalizeHeadingLevel(raw: unknown): SpecHeadingLevel {
  return raw === 'medium' ? 'medium' : 'big';
}

/** Lightweight Git-style attribution captured from the local profile. */
export interface SpecAuthor {
  name: string;
  email: string;
}

/** One spec document: a titled, ordered list of items. */
export interface SpecDoc {
  id: string;
  title: string;
  createdAt: string; // ISO
  updatedAt?: string; // ISO
}

/**
 * The deep link that reproduces what the canvas showed when the annotation was
 * captured: pathname + search + hash, relative to the app origin. Only the App
 * surface is supported for now; `tab` leaves room for the others.
 */
export interface SpecState {
  tab: 'app';
  path: string;
}

/** The element an annotation is pinned to (carries a `data-pv-spec-{id}` attribute). */
export interface SpecAnchor {
  /** Project-relative source file the attribute was injected into. */
  file: string;
}

interface SpecItemBase {
  id: string;
  /** Fractional-index sort key — see rankBetween(). */
  rank: string;
  createdAt: string; // ISO
  updatedAt?: string; // ISO
}

export interface SpecHeading extends SpecItemBase {
  type: 'heading';
  title: string;
  level: SpecHeadingLevel;
}

export interface SpecAnnotation extends SpecItemBase {
  type: 'annotation';
  text: string;
  status?: SpecStatus;
  state: SpecState;
  anchor?: SpecAnchor;
  author: SpecAuthor;
}

export type SpecItem = SpecHeading | SpecAnnotation;

/** A spec with its items resolved and sorted — what every endpoint returns. */
export interface SpecBundle {
  spec: SpecDoc;
  items: SpecItem[];
}

/** A spec row in the docs list: metadata plus how many annotations it holds. */
export interface SpecSummary extends SpecDoc {
  annotationCount: number;
}

/** Payload consumed by the published viewer (dist/specs-data.json). */
export interface SpecsViewerData {
  generatedAt: string;
  specs: SpecBundle[];
}

// ─── storage layout ──────────────────────────────────────────────────────────
//
//   src/specs/{specId}/spec.json     — document metadata only (never lists items)
//   src/specs/{specId}/{itemId}.json — one file per annotation / heading
//
// Every mutation lands in exactly one file so git sync's last-write-wins rebase
// can never drop a concurrent change: adding items on two machines produces two
// new files, and reordering rewrites only the moved item's `rank`.

export const SPECS_DIR_REL = 'src/specs';
export const SPEC_META_FILE = 'spec.json';

export function specDirRel(specId: string): string {
  return `${SPECS_DIR_REL}/${specId}`;
}

export function specMetaFileRel(specId: string): string {
  return `${specDirRel(specId)}/${SPEC_META_FILE}`;
}

export function specItemFileRel(specId: string, itemId: string): string {
  return `${specDirRel(specId)}/${itemId}.json`;
}

// ─── anchoring ───────────────────────────────────────────────────────────────
//
// Same scheme as comments, different prefix: each annotation is injected onto
// its element's opening tag as its OWN valueless attribute, `data-pv-spec-{id}`,
// so any number of spec and comment attributes coexist without collisions.
// Because it is a plain JSX attribute it survives `vite build`, which is what
// lets the published viewer highlight the element.

export const SPEC_ATTR_PREFIX = 'data-pv-spec-';

export function specIdAttr(id: string): string {
  return SPEC_ATTR_PREFIX + id;
}

export function specIdSelector(id: string): string {
  return `[${SPEC_ATTR_PREFIX}${id}]`;
}

export function readSpecIds(attrNames: readonly string[]): string[] {
  const ids: string[] = [];
  for (const name of attrNames) {
    if (name.startsWith(SPEC_ATTR_PREFIX)) ids.push(name.slice(SPEC_ATTR_PREFIX.length));
  }
  return ids;
}

// ─── ids ─────────────────────────────────────────────────────────────────────

function randomId(len: number): string {
  let out = '';
  while (out.length < len) out += Math.random().toString(36).substring(2);
  return out.substring(0, len);
}

export function makeSpecId(): string {
  return randomId(10);
}

export function makeAnnotationId(): string {
  return `a-${randomId(8)}`;
}

export function makeHeadingId(): string {
  return `h-${randomId(8)}`;
}

// ─── ordering ────────────────────────────────────────────────────────────────

const RANK_DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';
const RANK_BASE = RANK_DIGITS.length;

/**
 * Fractional indexing over base-36 strings: returns a key that sorts strictly
 * between `before` and `after` (either may be null for "start" / "end"). Keys
 * compare with plain string comparison. Ranks only grow in length when items are
 * repeatedly inserted at the same spot; the store renormalises when they get
 * unwieldy.
 */
export function rankBetween(before: string | null, after: string | null): string {
  const a = before ?? '';
  const b = after ?? '';
  if (b && a >= b) throw new Error(`rankBetween: "${a}" must be < "${b}"`);

  let out = '';
  let i = 0;
  // While `bounded`, the key built so far equals b's prefix, so b's next digit
  // is an exclusive upper limit. Once we emit a digit below b's, only `a`
  // constrains us from below and the upper limit is the base itself.
  let bounded = b.length > 0;
  for (;;) {
    const da = i < a.length ? RANK_DIGITS.indexOf(a[i]) : 0;
    // `b` can only run out while bounded if it was a prefix of `a`, which the
    // ordering check above rules out; the guard just guarantees termination.
    if (bounded && i >= b.length) bounded = false;
    const db = bounded ? RANK_DIGITS.indexOf(b[i]) : RANK_BASE;
    if (db - da > 1) {
      out += RANK_DIGITS[Math.floor((da + db) / 2)];
      return out;
    }
    // Digits adjacent or equal: keep a's digit and descend one position.
    out += RANK_DIGITS[da];
    i++;
    if (db - da === 1) bounded = false;
  }
}

/** Initial rank for the first item of an empty list. */
export const INITIAL_RANK = 'n';

/** Sort key: rank, then createdAt, then id — stable across machines. */
export function compareSpecItems(x: SpecItem, y: SpecItem): number {
  if (x.rank !== y.rank) return x.rank < y.rank ? -1 : 1;
  const c = (x.createdAt || '').localeCompare(y.createdAt || '');
  if (c !== 0) return c;
  return x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
}

export function sortSpecItems<T extends SpecItem>(items: T[]): T[] {
  return [...items].sort(compareSpecItems);
}

export function isAnnotation(item: SpecItem): item is SpecAnnotation {
  return item.type === 'annotation';
}

export function isHeading(item: SpecItem): item is SpecHeading {
  return item.type === 'heading';
}

/** Only annotations, in document order — what Next / Prev and numbering walk. */
export function annotationsOf(items: SpecItem[]): SpecAnnotation[] {
  return items.filter(isAnnotation);
}
