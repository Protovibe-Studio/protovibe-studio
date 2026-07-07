// Standalone, self-contained "wording suggestion" live-preview service.
//
// A UX writer proposes replacement copy for a string; this module makes that
// change visible on the canvas WITHOUT touching source code, by find/replacing
// text nodes in the canvas iframe documents. A single string→string registry
// drives it (the "key/value registry" of originals → suggestions). A
// MutationObserver re-applies the registry after React re-renders/HMR so the
// preview sticks until it's explicitly removed.
//
// Deliberately isolated: it depends only on the DOM (enumerating same-origin
// canvas iframes the same way the rest of the codebase does). It knows nothing
// about Comments, ProtovibeContext, or the bridge — callers just set()/remove()
// mappings. Modeled on the create*LivePreview() handles in colorPreview.ts /
// classPreview.ts, but exposed as a process-wide singleton because a preview
// toggled on from a saved comment must persist across component mounts.

export interface CopySuggestionPreview {
  /**
   * Upsert one original→suggested mapping and (re)apply it to the canvas.
   * Re-setting an existing original overwrites its suggestion, transparently
   * superseding the previous one (no stale observers linger — a single shared
   * observer reads the current registry).
   */
  set(original: string, suggested: string): void;
  /** Remove one mapping and restore that string in the canvas. */
  remove(original: string): void;
  /** Originals currently being previewed (for button on/off state). */
  activeKeys(): Set<string>;
  /** Whether a given original is currently previewed. */
  isActive(original: string): boolean;
  /** Subscribe to registry changes; returns an unsubscribe fn. */
  subscribe(fn: () => void): () => void;
}

function createService(): CopySuggestionPreview {
  // original (trimmed) → suggested. The single source of truth.
  const registry = new Map<string, string>();
  // Every text node we've rewritten → its pristine value, so removing a mapping
  // (or dropping a node from the registry) restores the exact original text.
  const original = new WeakMap<Text, string>();
  const touched = new Set<Text>();
  // One observer per observed iframe document.
  const observers = new Map<Document, MutationObserver>();
  const subscribers = new Set<() => void>();

  let rafId = 0;
  let applying = false; // re-entrancy guard: our own writes must not re-trigger.

  const notify = () => { for (const fn of subscribers) fn(); };

  const canvasDocs = (): Document[] => {
    const docs: Document[] = [];
    const iframes = Array.from(document.querySelectorAll('iframe')) as HTMLIFrameElement[];
    for (const f of iframes) {
      try {
        if (f.contentDocument?.body) docs.push(f.contentDocument);
      } catch { /* cross-origin guard — canvas iframes are same-origin */ }
    }
    return docs;
  };

  // Rewrite/restore every text node in a document to match the current registry.
  const applyToDoc = (doc: Document) => {
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode() as Text | null;
    while (node) {
      const current = node.nodeValue ?? '';
      const trimmed = current.trim();
      const suggestion = trimmed ? registry.get(trimmed) : undefined;

      if (suggestion !== undefined) {
        // Snapshot the pristine text once, then swap in the suggestion while
        // preserving the node's surrounding whitespace.
        if (!original.has(node)) original.set(node, current);
        const pristine = original.get(node)!;
        const lead = pristine.match(/^\s*/)?.[0] ?? '';
        const trail = pristine.match(/\s*$/)?.[0] ?? '';
        const next = lead + suggestion + trail;
        if (node.nodeValue !== next) node.nodeValue = next;
        touched.add(node);
      } else if (original.has(node)) {
        // No longer previewed (mapping removed, or the suggestion equals the
        // original) → restore and forget.
        const pristine = original.get(node)!;
        if (node.nodeValue !== pristine) node.nodeValue = pristine;
        original.delete(node);
        touched.delete(node);
      }
      node = walker.nextNode() as Text | null;
    }
  };

  const applyAll = () => {
    applying = true;
    try {
      for (const doc of canvasDocs()) applyToDoc(doc);
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
  };

  const set = (originalStr: string, suggested: string) => {
    const key = originalStr.trim();
    if (!key) return;
    // A suggestion identical to the original is a no-op preview → drop the key.
    if (suggested === originalStr || suggested.trim() === key) {
      remove(originalStr);
      return;
    }
    registry.set(key, suggested);
    ensureObservers();
    applyAll();
    notify();
  };

  const remove = (originalStr: string) => {
    const key = originalStr.trim();
    if (!registry.has(key)) return;
    registry.delete(key);
    applyAll();
    if (registry.size === 0) teardownObservers();
    notify();
  };

  return {
    set,
    remove,
    activeKeys: () => new Set(registry.keys()),
    isActive: (originalStr: string) => registry.has(originalStr.trim()),
    subscribe: (fn: () => void) => { subscribers.add(fn); return () => { subscribers.delete(fn); }; },
  };
}

let instance: CopySuggestionPreview | null = null;

/** Process-wide singleton wording-preview service. */
export function getCopySuggestionPreview(): CopySuggestionPreview {
  if (!instance) instance = createService();
  return instance;
}
