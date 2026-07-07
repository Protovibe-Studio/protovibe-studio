// plugins/protovibe/src/ui/hooks/useViewportCommentIds.ts
import { useEffect, useMemo, useState } from 'react';
import { commentIdSelector } from '../../shared/comments';
import type { CommentThread } from '../../shared/comments';
import type { IframeTab } from '../components/ShellNavBar';

// Stable empty result so callers don't see a new Set identity each render while
// the filter is off.
const EMPTY: ReadonlySet<string> = new Set<string>();

// Inset (px) from the visible rect edges when sampling occlusion points, so we
// test just inside the element rather than exactly on its border.
const SAMPLE_INSET = 4;

function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

/**
 * Resolve the active surface's iframe document/window. The three surfaces are
 * separate same-origin iframes (app `/`, sketchpad `sketchpad.html`, components
 * `components.html`); we match by src so we don't depend on display state. The
 * app iframe navigates internally, so it's identified as "neither of the others".
 */
function findIframeForTab(tab: IframeTab): { doc: Document; win: Window & typeof globalThis } | null {
  const iframes = Array.from(document.querySelectorAll('iframe')) as HTMLIFrameElement[];
  for (const f of iframes) {
    const src = f.src || '';
    const isSketch = src.includes('sketchpad');
    const isComp = src.includes('components');
    const matches = tab === 'sketchpad' ? isSketch : tab === 'components' ? isComp : (!isSketch && !isComp);
    if (!matches) continue;
    try {
      if (f.contentDocument && f.contentWindow) {
        return { doc: f.contentDocument, win: f.contentWindow as Window & typeof globalThis };
      }
    } catch { /* cross-origin guard — shouldn't happen, all same-origin */ }
  }
  return null;
}

/**
 * Is `el` actually painted on screen (not scrolled out, not covered)? Caller has
 * already confirmed via IntersectionObserver that `el` intersects the viewport;
 * here we additionally rule out occlusion by overlays/dialogs.
 *
 * We sample a few points across the element's visible portion and, at each, walk
 * the hit-test stack (`elementsFromPoint`, topmost-first): the element is visible
 * at that point if the topmost node belongs to its own subtree. If some other
 * subtree (a dialog/backdrop with higher stacking) sits on top, that point is
 * covered. The element counts as visible if ANY sampled point is uncovered, so
 * partial visibility still shows. Both elementsFromPoint and elementFromPoint
 * respect `pointer-events:none`, so the plugin's overlay layer is excluded from
 * the stack and never reads as occlusion.
 */
function isVisibleNotOccluded(doc: Document, el: Element, vw: number, vh: number): boolean {
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return false;
  // Visible portion of the rect, clamped to the viewport.
  const left = Math.max(0, r.left);
  const top = Math.max(0, r.top);
  const right = Math.min(vw, r.right);
  const bottom = Math.min(vh, r.bottom);
  if (right <= left || bottom <= top) return false;

  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  const lx = Math.min(left + SAMPLE_INSET, cx);
  const rx = Math.max(right - SAMPLE_INSET, cx);
  const ty = Math.min(top + SAMPLE_INSET, cy);
  const by = Math.max(bottom - SAMPLE_INSET, cy);
  const points: Array<[number, number]> = [
    [cx, cy], [lx, ty], [rx, ty], [lx, by], [rx, by],
  ];

  for (const [x, y] of points) {
    const stack = doc.elementsFromPoint(x, y);
    const topmost = stack[0];
    if (!topmost) continue;
    // Topmost belongs to el's own subtree (el, a descendant, or an ancestor
    // wrapping it) → el is on top here. Anything else means something covers it.
    if (topmost === el || el.contains(topmost) || topmost.contains(el)) return true;
  }
  return false;
}

/**
 * Set of thread ids whose anchored element is currently visible (on screen and
 * not occluded) on the active surface. Fully inert unless `enabled`.
 *
 * Strategy: an iframe-rooted IntersectionObserver keeps the on-screen set live
 * with no scroll listeners; a throttled occlusion pass (elementsFromPoint) then
 * runs over only that small intersecting set. A MutationObserver on the iframe
 * body re-checks when dialogs mount/unmount (which doesn't change the underlying
 * element's intersection, so the observer alone wouldn't re-fire).
 */
export function useViewportCommentIds(
  enabled: boolean,
  activeIframeTab: IframeTab,
  threads: CommentThread[],
): ReadonlySet<string> {
  const [visibleIds, setVisibleIds] = useState<ReadonlySet<string>>(EMPTY);

  // Only threads anchored on the active surface can be visible. Reduce to a
  // stable primitive key so the effect re-runs when the candidate set changes.
  const candidateIds = useMemo(
    () => threads.filter((t) => t.context?.tab === activeIframeTab).map((t) => t.id),
    [threads, activeIframeTab],
  );
  const candidateKey = candidateIds.join(',');

  useEffect(() => {
    if (!enabled) { setVisibleIds((prev) => (prev.size ? EMPTY : prev)); return; }
    const found = findIframeForTab(activeIframeTab);
    if (!found) { setVisibleIds((prev) => (prev.size ? EMPTY : prev)); return; }
    const { doc, win } = found;

    const IO = win.IntersectionObserver || window.IntersectionObserver;
    const MO = win.MutationObserver || window.MutationObserver;
    if (!IO) { setVisibleIds((prev) => (prev.size ? EMPTY : prev)); return; }

    // Live id↔element maps and the set IO currently reports as intersecting.
    const elToId = new Map<Element, string>();
    let intersecting = new Set<string>();
    let occRaf = 0;
    let syncRaf = 0;

    const publish = (next: Set<string>) =>
      setVisibleIds((prev) => (sameSet(prev, next) ? prev : next));

    const runOcclusion = () => {
      occRaf = 0;
      const vw = win.innerWidth;
      const vh = win.innerHeight;
      const next = new Set<string>();
      for (const [el, id] of elToId) {
        if (!intersecting.has(id)) continue;
        if (isVisibleNotOccluded(doc, el, vw, vh)) next.add(id);
      }
      publish(next);
    };
    const scheduleOcclusion = () => { if (!occRaf) occRaf = win.requestAnimationFrame(runOcclusion); };

    const io = new IO((entries) => {
      for (const e of entries) {
        const id = elToId.get(e.target);
        if (!id) continue;
        if (e.isIntersecting) intersecting.add(id); else intersecting.delete(id);
      }
      scheduleOcclusion();
    }, { threshold: 0 });

    // Resolve current candidate elements and reconcile what IO observes. Element
    // node identity can change across React re-renders/HMR, so we re-resolve.
    const sync = () => {
      const nextEls = new Map<Element, string>();
      for (const id of candidateIds) {
        const el = doc.querySelector(commentIdSelector(id));
        if (el) nextEls.set(el, id);
      }
      for (const el of elToId.keys()) if (!nextEls.has(el)) io.unobserve(el);
      for (const el of nextEls.keys()) if (!elToId.has(el)) io.observe(el);
      const validIds = new Set(nextEls.values());
      intersecting = new Set([...intersecting].filter((id) => validIds.has(id)));
      elToId.clear();
      for (const [el, id] of nextEls) elToId.set(el, id);
      scheduleOcclusion();
    };
    const scheduleSync = () => { if (!syncRaf) syncRaf = win.requestAnimationFrame(() => { syncRaf = 0; sync(); }); };

    sync();

    // Dialogs/overlays mount & unmount in the body — re-resolve and re-check.
    const mo = MO && doc.body ? new MO(scheduleSync) : null;
    mo?.observe(doc.body, { childList: true, subtree: true });

    // Sketchpad zoom/pan moves elements without scrolling — re-check occlusion.
    const onTransform = () => scheduleOcclusion();
    win.addEventListener('pv-canvas-transform', onTransform);
    window.addEventListener('pv-canvas-transform', onTransform);

    return () => {
      if (occRaf) win.cancelAnimationFrame(occRaf);
      if (syncRaf) win.cancelAnimationFrame(syncRaf);
      io.disconnect();
      mo?.disconnect();
      win.removeEventListener('pv-canvas-transform', onTransform);
      window.removeEventListener('pv-canvas-transform', onTransform);
    };
    // candidateIds is captured via the stable candidateKey dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, activeIframeTab, candidateKey]);

  return enabled ? visibleIds : EMPTY;
}
