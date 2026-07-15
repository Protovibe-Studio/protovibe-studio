// Standalone, self-contained "wording suggestion" live-preview service.
//
// A UX writer proposes replacement copy for a string; this module makes that
// change visible on the canvas WITHOUT touching source code, by find/replacing
// text nodes in the canvas iframe documents and highlighting what it swapped. A
// registry of scoped entries drives it; a MutationObserver re-applies the
// registry after React re-renders/HMR so the preview sticks until it's
// explicitly removed.
//
// Scope. Each entry is anchored: by default a suggestion only rewrites text
// INSIDE the element its comment hangs off (`[data-pv-comment-{threadId}]`, or
// the still-unsaved composer's selected element). `replaceAll: true` widens it
// to every matching string in the document. A scoped entry always wins over a
// document-wide one on the same string.
//
// Persistence. Entries that belong to a saved thread are mirrored into
// localStorage, so previews the user switched on survive a page refresh and
// re-apply as soon as the canvas iframes come back. Composer drafts (no thread
// id yet) are deliberately NOT persisted — they die with the page.
//
// Deliberately isolated: it depends only on the DOM (enumerating same-origin
// canvas iframes the same way the rest of the codebase does) plus the shared
// comment-attribute helper. It knows nothing about the Comments UI,
// ProtovibeContext, or the bridge — callers just set()/remove() entries.
import { commentIdSelector } from '../../shared/comments';

/** Where a suggestion's replacement is allowed to happen. */
export interface SuggestionAnchor {
  /** Saved thread the suggestion hangs off — bounds it to that thread's element. */
  threadId?: string;
  /** Selected element, for a composer draft whose thread doesn't exist yet. */
  element?: HTMLElement | null;
}

export interface SuggestionScope extends SuggestionAnchor {
  /** Rewrite the string everywhere in the document, not just inside the anchor. */
  replaceAll?: boolean;
}

/** An entry currently on the canvas, as reported back to the UI. */
export interface ActiveSuggestion {
  suggested: string;
  replaceAll: boolean;
}

/** A saved suggestion, used to prune previews whose comment is gone or edited. */
export interface SavedSuggestionRef {
  threadId: string;
  original: string;
  suggested: string;
  replaceAll?: boolean;
}

/** Same-origin canvas iframe documents (app / components / sketchpad). */
function canvasDocs(): Document[] {
  const docs: Document[] = [];
  const iframes = Array.from(document.querySelectorAll('iframe')) as HTMLIFrameElement[];
  for (const f of iframes) {
    try {
      if (f.contentDocument?.body) docs.push(f.contentDocument);
    } catch { /* cross-origin guard — canvas iframes are same-origin */ }
  }
  return docs;
}

/** The canvas element a saved thread is anchored to, if it's on screen right now. */
export function findAnchorElement(threadId: string): HTMLElement | null {
  for (const doc of canvasDocs()) {
    const el = doc.querySelector<HTMLElement>(commentIdSelector(threadId));
    if (el) return el;
  }
  return null;
}

export interface CopySuggestionPreview {
  /**
   * Upsert one original→suggested mapping for an anchor and (re)apply it to the
   * canvas. Re-setting the same original on the same anchor overwrites its
   * suggestion. Entries from different anchors coexist — that's the whole point
   * of scoping — so two comments can propose different copy for the same string.
   */
  set(original: string, suggested: string, scope?: SuggestionScope): void;
  /**
   * Remove one anchored mapping and restore that string in the canvas. When
   * `onlyIfSuggested` is given, the mapping is only removed if it still carries
   * that exact suggestion — so a caller cleaning up its own preview never kills
   * a different suggestion that has since superseded it.
   */
  remove(original: string, scope?: SuggestionAnchor, onlyIfSuggested?: string): void;
  /** What's currently previewed for an original on a given anchor, if anything. */
  get(original: string, scope?: SuggestionAnchor): ActiveSuggestion | undefined;
  /** Drop every composer-draft preview (entries with no thread id). */
  clearDrafts(): void;
  /**
   * Drop persisted previews that no longer match a saved suggestion (its comment
   * was deleted, or its wording was edited). Call once threads are loaded.
   */
  reconcile(saved: SavedSuggestionRef[]): void;
  /** Subscribe to registry changes; returns an unsubscribe fn. */
  subscribe(fn: () => void): () => void;
}

// Highlight painted on every element whose copy a preview replaced: a fat,
// translucent pale-green underline pulled up under the text so it reads as a
// soft highlighter band rather than a rule. Browsers paint underlines beneath
// the glyphs, so the text stays legible on top.
const HIGHLIGHT_STYLE: Record<string, string> = {
  'text-decoration-line': 'underline',
  'text-decoration-color': 'rgb(76 255 147 / 26%)',
  'text-decoration-thickness': '8px',
  'text-underline-offset': '-5px',
  'text-decoration-skip-ink': 'none',
};
const HIGHLIGHT_PROPS = Object.keys(HIGHLIGHT_STYLE);

const STORAGE_KEY = 'pv-wording-previews';

interface Entry {
  /** Trimmed original — the string matched against canvas text nodes. */
  original: string;
  suggested: string;
  replaceAll: boolean;
  threadId?: string;
  /** Draft anchor (composer). Never persisted; dies with the page. */
  element?: HTMLElement;
}

// Field separator for the composite keys below. A control character, so it can
// never appear inside the copy being matched: joining fields with a space would
// let "a b" + "c" and "a" + "b c" collide onto one key.
const SEP = '\u0001';

// Stable per-element ids so a draft anchor can be part of a registry key.
let uidSeq = 0;
const elementUids = new WeakMap<HTMLElement, string>();
function elementUid(el: HTMLElement): string {
  let id = elementUids.get(el);
  if (!id) { id = `e${++uidSeq}`; elementUids.set(el, id); }
  return id;
}

// One key per (anchor, original). `replaceAll` is NOT part of the key — it only
// widens where the entry applies — so flipping it re-scopes in place.
function keyOf(original: string, scope?: SuggestionAnchor): string {
  const owner = scope?.threadId ? `t:${scope.threadId}`
    : scope?.element ? `x:${elementUid(scope.element)}`
      : 'd:';
  return `${owner}${SEP}${original}`;
}

/**
 * What we did to one text node: the copy it held before we touched it, and the
 * exact string we last wrote into it.
 *
 * `applied` is what makes the snapshot verifiable. React reuses text nodes across
 * renders, so a node we rewrote can come back holding entirely different copy (a
 * dialog reopened on another record, a list row recycled). If the node's current
 * value is no longer the string we wrote, the app — not us — put it there, and
 * `pristine` is stale: keeping it would let us stamp the old suggestion back over
 * the app's fresh text, or "restore" text that was never on this node.
 */
interface Applied {
  pristine: string;
  applied: string;
}

function createService(): CopySuggestionPreview {
  const registry = new Map<string, Entry>();
  // Every text node we've rewritten → what it said before, and what we wrote.
  const pristineText = new WeakMap<Text, Applied>();
  // Every element we've highlighted → the inline values we overwrote.
  const pristineStyle = new WeakMap<HTMLElement, string[]>();
  const highlighted = new Set<HTMLElement>();
  // One observer per observed iframe document.
  const observers = new Map<Document, MutationObserver>();
  const subscribers = new Set<() => void>();

  let rafId = 0;
  let watchId = 0;
  let applying = false; // re-entrancy guard: our own writes must not re-trigger.

  const notify = () => { for (const fn of subscribers) fn(); };

  // ── persistence ────────────────────────────────────────────────────────────
  // Only thread-anchored entries are durable; drafts have no owner to restore to.
  const persist = () => {
    try {
      const saved = Array.from(registry.values())
        .filter((e) => !!e.threadId)
        .map((e) => ({ threadId: e.threadId, original: e.original, suggested: e.suggested, replaceAll: e.replaceAll }));
      if (saved.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      else localStorage.removeItem(STORAGE_KEY);
    } catch { /* private mode / quota — previews just won't survive the refresh */ }
  };

  const hydrate = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      for (const row of parsed) {
        if (!row || typeof row !== 'object') continue;
        const { threadId, original, suggested, replaceAll } = row as Record<string, unknown>;
        if (typeof threadId !== 'string' || typeof original !== 'string' || typeof suggested !== 'string') continue;
        const key = String(original).trim();
        if (!key || suggested === original) continue;
        registry.set(keyOf(key, { threadId }), { original: key, suggested, replaceAll: !!replaceAll, threadId });
      }
    } catch { /* corrupt payload — start clean */ }
  };

  // ── highlight ──────────────────────────────────────────────────────────────
  const highlight = (el: HTMLElement) => {
    if (!highlighted.has(el)) {
      pristineStyle.set(el, HIGHLIGHT_PROPS.map((p) => el.style.getPropertyValue(p)));
      highlighted.add(el);
    }
    // Re-asserted on every pass: a React re-render can drop the inline style.
    // (Unconditionally — the browser normalises the values it echoes back, so
    // comparing before writing would report a difference every time anyway.)
    for (const [prop, value] of Object.entries(HIGHLIGHT_STYLE)) el.style.setProperty(prop, value);
  };

  const unhighlight = (el: HTMLElement) => {
    const prev = pristineStyle.get(el);
    HIGHLIGHT_PROPS.forEach((prop, i) => {
      const value = prev?.[i];
      if (value) el.style.setProperty(prop, value);
      else el.style.removeProperty(prop);
    });
    pristineStyle.delete(el);
    highlighted.delete(el);
  };

  // ── apply ──────────────────────────────────────────────────────────────────
  // The elements an entry is allowed to rewrite inside, within one document.
  // Empty ⇒ the entry has no anchor here (e.g. the thread's element lives on
  // another page), so it rewrites nothing in this document.
  const rootsIn = (doc: Document, entry: Entry): Element[] => {
    if (entry.replaceAll) return doc.body ? [doc.body] : [];
    if (entry.element) {
      return entry.element.ownerDocument === doc && entry.element.isConnected ? [entry.element] : [];
    }
    if (entry.threadId) return Array.from(doc.querySelectorAll(commentIdSelector(entry.threadId)));
    return [];
  };

  // Rewrite/restore every text node in a document to match the current registry.
  const applyToDoc = (doc: Document) => {
    const scoped = Array.from(registry.values())
      .map((entry) => ({ entry, roots: rootsIn(doc, entry) }))
      .filter((a) => a.roots.length > 0);

    const wanted = new Set<HTMLElement>();
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode() as Text | null;
    while (node) {
      const current = node.nodeValue ?? '';
      const prev = pristineText.get(node);
      // Is this still OUR text? Only if the node reads back exactly what we last
      // wrote. If it doesn't, the app has re-rendered new copy through the same
      // node and the snapshot is stale — forget it and treat what's there now as
      // the pristine text (React recycles text nodes freely; anything else lets
      // us overwrite a reopened dialog's fresh copy with the previous one's).
      const ours = !!prev && prev.applied === current;
      // A node we rewrote holds the suggestion, not the original — the registry
      // lookup must go through its pristine snapshot, otherwise the next apply
      // misses the mapping and wrongly restores it.
      const pristine = ours ? prev!.pristine : current;
      const trimmed = pristine.trim();

      let match: Entry | undefined;
      if (trimmed) {
        for (const { entry, roots } of scoped) {
          if (entry.original !== trimmed) continue;
          if (!roots.some((root) => root.contains(node))) continue;
          // An anchored entry beats a document-wide one on the same string;
          // between two of equal reach, the most recently set one wins.
          if (!match || match.replaceAll || !entry.replaceAll) match = entry;
        }
      }

      if (match) {
        // Swap in the suggestion, preserving the node's surrounding whitespace,
        // and re-snapshot both halves of what we did.
        const lead = pristine.match(/^\s*/)?.[0] ?? '';
        const trail = pristine.match(/\s*$/)?.[0] ?? '';
        const next = lead + match.suggested + trail;
        if (node.nodeValue !== next) node.nodeValue = next;
        pristineText.set(node, { pristine, applied: next });
        if (node.parentElement) wanted.add(node.parentElement);
      } else if (prev) {
        // No longer previewed (entry removed, the suggestion now equals the
        // original, or the node was recycled) → restore only text we actually
        // put there, then forget the node either way.
        if (ours && node.nodeValue !== pristine) node.nodeValue = pristine;
        pristineText.delete(node);
      }
      node = walker.nextNode() as Text | null;
    }

    for (const el of Array.from(highlighted)) {
      if (el.ownerDocument === doc && !wanted.has(el)) unhighlight(el);
    }
    for (const el of wanted) highlight(el);
  };

  const applyAll = () => {
    applying = true;
    try {
      for (const doc of canvasDocs()) applyToDoc(doc);
      // An element torn out of the DOM keeps no highlight to restore.
      for (const el of Array.from(highlighted)) if (!el.isConnected) highlighted.delete(el);
    } finally {
      // Defer clearing the guard until after the observer's microtask so the
      // mutations we just made don't schedule a redundant re-apply.
      requestAnimationFrame(() => { applying = false; });
    }
  };

  const scheduleApply = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => { rafId = 0; applyAll(); });
  };

  const ensureObservers = () => {
    for (const doc of canvasDocs()) {
      if (observers.has(doc)) continue;
      const win = doc.defaultView || window;
      const MO = win.MutationObserver || window.MutationObserver;
      const mo = new MO(() => { if (!applying) scheduleApply(); });
      mo.observe(doc.body, { childList: true, subtree: true, characterData: true });
      observers.set(doc, mo);
    }
  };

  const teardownObservers = () => {
    for (const mo of observers.values()) mo.disconnect();
    observers.clear();
    if (watchId) { clearInterval(watchId); watchId = 0; }
  };

  // A per-document MutationObserver can't see a document that doesn't exist yet:
  // on a page refresh the registry is restored from localStorage long before the
  // canvas iframes have loaded, and navigating the app iframe swaps its document
  // wholesale. So while anything is previewed, poll for canvas documents we
  // aren't observing and (re)apply to them.
  const watchForCanvases = () => {
    if (watchId) return;
    watchId = window.setInterval(() => {
      if (canvasDocs().some((doc) => !observers.has(doc))) {
        ensureObservers();
        applyAll();
      }
    }, 500);
  };

  const refreshCanvas = () => {
    if (registry.size === 0) {
      applyAll();
      teardownObservers();
    } else {
      ensureObservers();
      watchForCanvases();
      applyAll();
    }
    persist();
    notify();
  };

  const set = (originalStr: string, suggested: string, scope?: SuggestionScope) => {
    const key = originalStr.trim();
    if (!key) return;
    // A suggestion identical to the original is a no-op preview → drop the entry.
    if (suggested === originalStr || suggested.trim() === key) {
      remove(originalStr, scope);
      return;
    }
    registry.set(keyOf(key, scope), {
      original: key,
      suggested,
      replaceAll: !!scope?.replaceAll,
      threadId: scope?.threadId,
      element: scope?.element ?? undefined,
    });
    refreshCanvas();
  };

  const remove = (originalStr: string, scope?: SuggestionAnchor, onlyIfSuggested?: string) => {
    const key = keyOf(originalStr.trim(), scope);
    const entry = registry.get(key);
    if (!entry) return;
    if (onlyIfSuggested !== undefined && entry.suggested !== onlyIfSuggested) return;
    registry.delete(key);
    refreshCanvas();
  };

  const clearDrafts = () => {
    let changed = false;
    for (const [key, entry] of Array.from(registry)) {
      if (!entry.threadId) { registry.delete(key); changed = true; }
    }
    if (changed) refreshCanvas();
  };

  const reconcile = (saved: SavedSuggestionRef[]) => {
    const valid = new Set(saved.map((s) =>
      [s.threadId, s.original.trim(), s.suggested, !!s.replaceAll].join(SEP)));
    let changed = false;
    for (const [key, entry] of Array.from(registry)) {
      if (!entry.threadId) continue;
      if (!valid.has([entry.threadId, entry.original, entry.suggested, entry.replaceAll].join(SEP))) {
        registry.delete(key);
        changed = true;
      }
    }
    if (changed) refreshCanvas();
  };

  hydrate();
  if (registry.size) {
    ensureObservers();
    watchForCanvases();
    scheduleApply();
  }

  return {
    set,
    remove,
    get: (originalStr: string, scope?: SuggestionAnchor) => {
      const entry = registry.get(keyOf(originalStr.trim(), scope));
      return entry ? { suggested: entry.suggested, replaceAll: entry.replaceAll } : undefined;
    },
    clearDrafts,
    reconcile,
    subscribe: (fn: () => void) => { subscribers.add(fn); return () => { subscribers.delete(fn); }; },
  };
}

let instance: CopySuggestionPreview | null = null;

/** Process-wide singleton wording-preview service. */
export function getCopySuggestionPreview(): CopySuggestionPreview {
  if (!instance) instance = createService();
  return instance;
}
