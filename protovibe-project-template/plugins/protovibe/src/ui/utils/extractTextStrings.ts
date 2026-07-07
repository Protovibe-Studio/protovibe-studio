// Pure helper: pull the individual, human-readable text strings out of a canvas
// element's subtree. Each visible text node becomes one string (so text split
// across nested <span>s surfaces as separate, independently-editable strings —
// exactly what a UX writer wants to suggest changes against). No DOM mutation,
// no dependency on the Comments feature.

/**
 * Distinct, in-order, trimmed non-empty text-node strings within `root`
 * (inclusive of `root`'s own text nodes). Duplicates are collapsed so a string
 * that appears twice yields a single editable row.
 */
export function extractTextStrings(root: HTMLElement): string[] {
  const doc = root.ownerDocument;
  if (!doc) return [];
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const value = node.nodeValue ? node.nodeValue.trim() : '';
      // Skip whitespace-only nodes and text inside script/style, which is never
      // user-facing copy.
      if (!value) return NodeFilter.FILTER_REJECT;
      const parentTag = node.parentElement?.tagName;
      if (parentTag === 'SCRIPT' || parentTag === 'STYLE') return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const seen = new Set<string>();
  const out: string[] = [];
  let node = walker.nextNode();
  while (node) {
    const value = (node.nodeValue ?? '').trim();
    if (value && !seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
    node = walker.nextNode();
  }
  return out;
}
