// plugins/protovibe/src/ui/bridge.ts
// Runs inside app.html (the iframe). Intercepts canvas interactions and
// communicates them to the parent Protovibe shell via postMessage.

import { isElementAllowed } from './utils/traversal';
import { isTypingInput } from './utils/elementType';
import { installCanvasLinkInterceptor } from './utils/canvasLinks';
import { SPEC_ATTR_PREFIX } from '../shared/specs';
import { COMMENT_ATTR_PREFIX } from '../shared/comments';

// Apply saved Protovibe theme preference immediately — before React mounts —
// to avoid a flash of the wrong theme.
(function () {
  try {
    const saved = localStorage.getItem('pv-iframe-theme');
    if (saved === 'light' || saved === 'dark') {
      document.documentElement.dataset.theme = saved;
    }
  } catch {}
})();

const SELECTION_OUTLINE = '2px solid #18a0fb';
const PARENT_PREVIEW_OUTLINE = '1px dashed rgba(24, 160, 251, 0.7)';
const HOVER_OUTLINE = '1px solid rgba(24, 160, 251, 0.6)';

let isLocked = false;
let isInspectorActive = false;

// ─── Editing-mode stylesheet ──────────────────────────────────────────────────
// Injected once. Styles activate/deactivate via the [pv-editor-mode]
// attribute on <html>, toggled whenever preview mode changes.
(function injectEditingStyles() {
  const style = document.createElement('style');
  style.id = 'pv-editing-style';
  style.textContent = `
    [pv-editor-mode="inspector"] [disabled],
    [pv-editor-mode="inspector"] [data-disabled],
    [pv-editor-mode="inspector"] [aria-disabled="true"] {
      pointer-events: auto !important;
      cursor: default !important;
    }
  `;
  document.head.appendChild(style);
})();

function setEditingStylesheet(enabled: boolean) {
  if (enabled) {
    document.documentElement.setAttribute('pv-editor-mode', 'inspector');
  } else {
    document.documentElement.removeAttribute('pv-editor-mode');
  }
}
let hoveredEl: HTMLElement | null = null;
let selectedEls: HTMLElement[] = [];
let selectedParentEl: HTMLElement | null = null;
// Set by handleDoubleClick when synthesizing a real click sequence, so our capture-phase
// pointerdown/click handlers let those events through to the app (and to library outside-
// click listeners that watch pointerdown).
let bypassNextClick = false;
let bypassNextPointerDown = false;

// ─── DOM helpers ──────────────────────────────────────────────────────────────

function findInspectableTarget(start: EventTarget | null): HTMLElement | null {
  const startEl = start as HTMLElement | null;
  if (!startEl) return null;

  // If the click originated inside Protovibe UI chrome (e.g. the Component
  // Playground overlay), only allow inspection within designated preview areas
  // (data-pv-preview-area). This means the catalog card list is never
  // intercepted — clicks reach React's onClick — while individual variant
  // preview cells remain fully inspectable.
  const pvUiAncestor = startEl.closest('[data-pv-ui]');
  if (pvUiAncestor) {
    const previewArea = startEl.closest('[data-pv-preview-area]') as HTMLElement | null;
    if (!previewArea) return null;

    // Walk up only to the preview-area boundary so we never escape into pv-ui chrome
    let t: HTMLElement | null = startEl;
    while (t && t !== previewArea) {
      if (isElementAllowed(t)) return t;
      t = t.parentElement as HTMLElement | null;
    }
    if (previewArea && isElementAllowed(previewArea)) return previewArea;
    return null;
  }

  // Normal case: not inside pv-ui overlay
  let t: HTMLElement | null = startEl;
  while (t && t !== document.documentElement) {
    if (t.dataset?.pvUi === 'true') return null;
    if (isElementAllowed(t)) return t;
    t = t.parentElement;
  }
  return null;
}

function collectPvLocs(el: HTMLElement): { name: string; value: string }[] {
  const locs: { name: string; value: string }[] = [];
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    if (attr.name.startsWith('data-pv-loc-')) {
      locs.push({ name: attr.name, value: attr.value });
    }
  }
  return locs;
}

function findInspectableParent(el: HTMLElement): HTMLElement | null {
  const previewArea = el.closest('[data-pv-preview-area]') as HTMLElement | null;

  let current = el.parentElement;
  while (current && current !== document.documentElement) {
    if (current.dataset?.pvUi === 'true') return null;
    if (previewArea && current === previewArea) {
      return isElementAllowed(current) ? current : null;
    }
    if (isElementAllowed(current)) return current;
    current = current.parentElement;
  }

  return null;
}

// ─── Overlay layer (selection / hover / parent-preview rectangles) ────────────
// Selection visuals are rendered as positioned overlay rectangles in a dedicated
// fixed-position layer on document.body, instead of mutating each element's inline
// `outline` style. This avoids stash/restore fragility and escapes ancestor
// `overflow: hidden` clipping.

let overlayLayer: HTMLDivElement | null = null;
const selectionOverlays: Map<HTMLElement, HTMLDivElement> = new Map();
let hoverOverlay: HTMLDivElement | null = null;
let parentPreviewOverlay: HTMLDivElement | null = null;
let trackedElementObserver: ResizeObserver | null = null;
let trackedMutationObserver: MutationObserver | null = null;
const trackedElements: Set<HTMLElement> = new Set();
let overlaySyncRafId: number | null = null;
// Canvas badges: one circle per spec annotation / comment thread pinned to the
// single selected element, drawn at the selection box's bottom-right corner.
// Clicking one asks the owning panel to show that annotation / thread. Each
// panel sends its ids (PV_SET_CANVAS_BADGES) only while it is the visible
// sidebar tab; the bridge matches them against the element's own attributes on
// every sync, so a pin added by HMR shows up without a new message.
type BadgeKind = 'spec' | 'comment';
const BADGE_KINDS: BadgeKind[] = ['comment', 'spec'];
const badgeSets: Record<BadgeKind, { ids: string[]; activeId: string | null }> = {
  spec: { ids: [], activeId: null },
  comment: { ids: [], activeId: null },
};
let badgeBox: HTMLDivElement | null = null;
// Own tooltip, drawn in the overlay layer: a native `title` would be picked up
// by the app's own tooltip provider and rendered underneath the overlays.
let badgeTip: HTMLDivElement | null = null;
let badgeKey = '';

// Schedule a single rAF-coalesced re-sync. ResizeObserver and MutationObserver can
// both fire many times per frame; this collapses them into one syncOverlays() call.
function scheduleSync() {
  if (overlaySyncRafId !== null) return;
  overlaySyncRafId = requestAnimationFrame(() => {
    overlaySyncRafId = null;
    syncOverlays();
  });
}

function ensureOverlayLayer(): HTMLDivElement {
  if (overlayLayer && overlayLayer.isConnected) return overlayLayer;
  const d = document.createElement('div');
  d.setAttribute('data-pv-overlay-layer', '');
  d.setAttribute('data-pv-ui', 'true');
  // position:fixed (not absolute) so overlay boxes never contribute to body's scrollable
  // overflow rectangle — hovering a wide / tall element won't spawn page scrollbars.
  //
  // Tradeoff: child boxes use viewport-relative coords (rect.left/top from
  // getBoundingClientRect), so during native page scrolling there is a small JS-induced
  // "chase" lag — the scroll listener has to fire and re-sync. Tried position:absolute
  // with overflow:clip+overflow-clip-margin, but a large clip-margin re-enlarges the
  // layer's scrollable-overflow region (descendants stop being clipped away), which
  // brings the scrollbar artifact back. CSS scroll-driven animations would solve it
  // but lack stable Firefox support.
  d.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647;';
  document.body.appendChild(d);
  overlayLayer = d;
  return d;
}

function makeOverlayBox(): HTMLDivElement {
  const d = document.createElement('div');
  d.style.cssText = 'position:absolute;box-sizing:border-box;pointer-events:none;';
  return d;
}

// Returns the ancestor an overlay rectangle should be clipped to, or null for "don't
// clip." Deliberately narrow: only containers explicitly marked `data-pv-overlay-clip`
// opt in (currently the Components-tab variant-grid scroll container). Clipping by any
// generic overflow ancestor would reinstate exactly the `overflow:hidden` border-
// clipping problem we moved to overlays to escape.
function nearestClippingAncestor(el: HTMLElement): HTMLElement | null {
  return el.closest('[data-pv-overlay-clip]') as HTMLElement | null;
}

// `inset=N` places the overlay's outer rect N px inside the element rect on every side.
// Negative values grow outward. With box-sizing:border-box and a Wpx border, inset=-W/2
// makes the border straddle the element edge (drawn flush, not inside it).
//
// Coordinates are viewport-relative (rect.left/top) because the overlay layer is
// position:fixed — see ensureOverlayLayer above for why we picked fixed over absolute.
function applyBoxStyle(
  box: HTMLDivElement,
  el: HTMLElement,
  inset: number,
  border: string,
) {
  const rect = el.getBoundingClientRect();
  const left = rect.left + inset;
  const top = rect.top + inset;
  const width = Math.max(0, rect.width - inset * 2);
  const height = Math.max(0, rect.height - inset * 2);
  box.style.left = `${left}px`;
  box.style.top = `${top}px`;
  box.style.width = `${width}px`;
  box.style.height = `${height}px`;
  box.style.border = border;

  // Clip to the nearest scrolling/overflow ancestor so borders don't escape it
  // (e.g. Components-tab preview cells inside a scroll container with a sticky header).
  const clipper = nearestClippingAncestor(el);
  if (clipper) {
    const c = clipper.getBoundingClientRect();
    const boxBottom = top + height;
    const boxRight = left + width;
    const clipTop = Math.max(0, c.top - top);
    const clipLeft = Math.max(0, c.left - left);
    const clipBottom = Math.max(0, boxBottom - c.bottom);
    const clipRight = Math.max(0, boxRight - c.right);
    box.style.clipPath =
      clipTop || clipRight || clipBottom || clipLeft
        ? `inset(${clipTop}px ${clipRight}px ${clipBottom}px ${clipLeft}px)`
        : '';
  } else {
    box.style.clipPath = '';
  }
}

function syncOverlays() {
  const layer = ensureOverlayLayer();

  // Selection rectangles
  for (const [el, box] of selectionOverlays) {
    if (!selectedEls.includes(el) || !el.isConnected) {
      box.remove();
      selectionOverlays.delete(el);
    }
  }
  for (const el of selectedEls) {
    if (!el.isConnected) continue;
    let box = selectionOverlays.get(el);
    if (!box) {
      box = makeOverlayBox();
      layer.appendChild(box);
      selectionOverlays.set(el, box);
    }
    applyBoxStyle(box, el, -1, SELECTION_OUTLINE);
  }

  // Parent preview (1px dashed sitting just outside the element)
  if (selectedParentEl && selectedParentEl.isConnected) {
    if (!parentPreviewOverlay) {
      parentPreviewOverlay = makeOverlayBox();
      layer.appendChild(parentPreviewOverlay);
    }
    applyBoxStyle(parentPreviewOverlay, selectedParentEl, -2, PARENT_PREVIEW_OUTLINE);
    parentPreviewOverlay.style.display = 'block';
  } else if (parentPreviewOverlay) {
    parentPreviewOverlay.style.display = 'none';
  }

  // Hover (suppress when target is already selected or is the parent preview)
  const showHover = hoveredEl
    && hoveredEl.isConnected
    && !selectedEls.includes(hoveredEl)
    && hoveredEl !== selectedParentEl;
  if (showHover) {
    if (!hoverOverlay) {
      hoverOverlay = makeOverlayBox();
      layer.appendChild(hoverOverlay);
    }
    applyBoxStyle(hoverOverlay, hoveredEl!, -1, HOVER_OUTLINE);
    hoverOverlay.style.display = 'block';
  } else if (hoverOverlay) {
    hoverOverlay.style.display = 'none';
  }

  syncBadges(layer);
  syncTrackedElements();
}

const BADGE_SIZE = 20;
const BADGE_GAP = 4;
const BADGE_MAX = 6;
const BADGE_ATTR_PREFIX: Record<BadgeKind, string> = { spec: SPEC_ATTR_PREFIX, comment: COMMENT_ATTR_PREFIX };
const BADGE_NOUN: Record<BadgeKind, { one: string; many: string; panel: string }> = {
  spec: { one: 'Annotation', many: 'annotations', panel: 'Specs' },
  comment: { one: 'Comment', many: 'comments', panel: 'Comments' },
};
// The panels' icons in the shell nav bar: Lucide `book-open` / `message-square`.
const svg = (paths: string) =>
  '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" style="display:block">' +
  paths + '</svg>';
const BADGE_ICON: Record<BadgeKind, string> = {
  spec: svg('<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>'),
  comment: svg('<path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/>'),
};

function makeBadgeBox(): HTMLDivElement {
  const d = document.createElement('div');
  d.setAttribute('data-pv-canvas-badges', '');
  d.style.cssText = 'position:absolute;display:flex;gap:3px;pointer-events:auto;font-family:system-ui,sans-serif;';
  // Keep the app's own outside-click listeners (dropdowns, popovers) out of it,
  // and keep focus where it was so the shell's keyboard shortcuts still work.
  const swallow = (e: Event) => { e.preventDefault(); e.stopPropagation(); };
  d.addEventListener('pointerdown', swallow);
  d.addEventListener('mousedown', swallow);
  d.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const badge = (e.target as HTMLElement | null)?.closest('[data-pv-badge-id]') as HTMLElement | null;
    const id = badge?.getAttribute('data-pv-badge-id');
    const kind = badge?.getAttribute('data-pv-badge-kind');
    if (id && kind) window.parent.postMessage({ type: 'PV_CANVAS_BADGE_CLICK', kind, id }, '*');
  });
  d.addEventListener('mouseover', (e) => {
    const badge = (e.target as HTMLElement | null)?.closest('[data-pv-badge-tip]') as HTMLElement | null;
    if (badge) showBadgeTip(badge); else hideBadgeTip();
  });
  d.addEventListener('mouseleave', hideBadgeTip);
  return d;
}

function showBadgeTip(badge: HTMLElement) {
  if (!badgeTip) {
    badgeTip = document.createElement('div');
    badgeTip.style.cssText =
      'position:absolute;pointer-events:none;white-space:nowrap;padding:4px 8px;border-radius:4px;' +
      'background:#1f1f1f;color:#fff;font:500 11px/1.3 system-ui,sans-serif;box-shadow:0 2px 6px rgba(0,0,0,0.3);';
    ensureOverlayLayer().appendChild(badgeTip);
  }
  badgeTip.textContent = badge.getAttribute('data-pv-badge-tip') || '';
  badgeTip.style.display = 'block';
  // Centered under the badge; above it when there is no room below.
  const r = badge.getBoundingClientRect();
  const w = badgeTip.offsetWidth;
  const h = badgeTip.offsetHeight;
  const left = Math.max(4, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 4));
  const top = r.bottom + 6 + h <= window.innerHeight ? r.bottom + 6 : Math.max(4, r.top - 6 - h);
  badgeTip.style.left = `${left}px`;
  badgeTip.style.top = `${top}px`;
}

function hideBadgeTip() {
  if (badgeTip) badgeTip.style.display = 'none';
}

function makeBadge(kind: BadgeKind, id: string, title: string, filled: boolean): HTMLDivElement {
  const b = document.createElement('div');
  b.setAttribute('data-pv-badge-kind', kind);
  b.setAttribute('data-pv-badge-id', id);
  b.setAttribute('data-pv-badge-tip', title);
  b.setAttribute('aria-label', title);
  b.setAttribute('role', 'button');
  b.style.cssText =
    `min-width:${BADGE_SIZE}px;height:${BADGE_SIZE}px;box-sizing:border-box;border-radius:${BADGE_SIZE / 2}px;` +
    'display:flex;align-items:center;justify-content:center;cursor:pointer;' +
    'font-size:10px;font-weight:600;line-height:1;' +
    'box-shadow:0 1px 3px rgba(0,0,0,0.25);border:1.5px solid #18a0fb;' +
    (filled ? 'background:#18a0fb;color:#fff;' : 'background:#fff;color:#18a0fb;');
  return b;
}

function renderBadges(box: HTMLDivElement, matched: Record<BadgeKind, string[]>) {
  box.textContent = '';
  for (const kind of BADGE_KINDS) {
    const ids = matched[kind];
    if (ids.length === 0) continue;
    const { activeId } = badgeSets[kind];
    const noun = BADGE_NOUN[kind];
    const shown = ids.length > BADGE_MAX ? ids.slice(0, BADGE_MAX - 1) : ids;
    shown.forEach((id, i) => {
      const title = ids.length > 1 ? `${noun.one} ${i + 1} of ${ids.length} — show in ${noun.panel}` : `Show ${noun.one.toLowerCase()} in ${noun.panel}`;
      const b = makeBadge(kind, id, title, id === activeId);
      b.innerHTML = BADGE_ICON[kind];
      box.appendChild(b);
    });
    if (shown.length < ids.length) {
      // Overflow: "+N" steps to the next one after the active one.
      const activeIdx = activeId ? ids.indexOf(activeId) : -1;
      const more = makeBadge(kind, ids[(activeIdx + 1) % ids.length], `${ids.length} ${noun.many} — show the next in ${noun.panel}`, false);
      more.style.padding = '0 5px';
      more.textContent = `+${ids.length - shown.length}`;
      box.appendChild(more);
    }
  }
}

function syncBadges(layer: HTMLDivElement) {
  const el = selectedEls.length === 1 && selectedEls[0].isConnected ? selectedEls[0] : null;
  const matched = { spec: [], comment: [] } as Record<BadgeKind, string[]>;
  let total = 0;
  if (el) {
    for (const kind of BADGE_KINDS) {
      matched[kind] = badgeSets[kind].ids.filter(id => el.hasAttribute(BADGE_ATTR_PREFIX[kind] + id));
      total += matched[kind].length;
    }
  }
  if (!el || total === 0) {
    if (badgeBox) badgeBox.style.display = 'none';
    hideBadgeTip();
    return;
  }
  if (!badgeBox) {
    badgeBox = makeBadgeBox();
    layer.appendChild(badgeBox);
  }
  const key = BADGE_KINDS.map(k => `${matched[k].join(' ')}|${badgeSets[k].activeId ?? ''}`).join('#');
  if (key !== badgeKey) {
    badgeKey = key;
    hideBadgeTip();
    renderBadges(badgeBox, matched);
  }
  badgeBox.style.display = 'flex';

  // Right-aligned just below the selection box; flipped inside its bottom edge
  // when that would leave the viewport.
  const rect = el.getBoundingClientRect();
  const width = badgeBox.offsetWidth;
  const below = rect.bottom + 1 + BADGE_GAP;
  const top = below + BADGE_SIZE <= window.innerHeight
    ? below
    : Math.max(0, rect.bottom - BADGE_SIZE - BADGE_GAP);
  const left = Math.max(0, Math.min(rect.right + 1 - width, window.innerWidth - width));
  badgeBox.style.left = `${left}px`;
  badgeBox.style.top = `${top}px`;
}

function syncTrackedElements() {
  if (!trackedElementObserver) {
    trackedElementObserver = new ResizeObserver(scheduleSync);
  }
  // The inspector's quick class-preview (e.g. hover over a padding/margin value) toggles
  // classes on the inspected element. With box-sizing:border-box, padding changes don't
  // alter the outer rect — so ResizeObserver never fires. Margin changes only shift
  // position, also invisible to ResizeObserver. We need attribute mutations too.
  if (!trackedMutationObserver) {
    trackedMutationObserver = new MutationObserver(scheduleSync);
  }
  const wanted = new Set<HTMLElement>();
  for (const el of selectedEls) wanted.add(el);
  if (selectedParentEl) wanted.add(selectedParentEl);
  if (hoveredEl) wanted.add(hoveredEl);
  // Also observe the parent of each tracked element: a margin/gap change on a sibling
  // (or layout class on the parent) shifts the tracked element without mutating it.
  const parents = new Set<HTMLElement>();
  for (const el of wanted) {
    if (el.parentElement) parents.add(el.parentElement);
  }

  for (const el of trackedElements) {
    if (!wanted.has(el)) {
      trackedElementObserver.unobserve(el);
      trackedElements.delete(el);
    }
  }
  for (const el of wanted) {
    if (!trackedElements.has(el)) {
      trackedElementObserver.observe(el);
      trackedElements.add(el);
    }
  }

  // Re-subscribe attribute observation each call. MutationObserver has no `unobserve`,
  // so we disconnect-and-reattach; the set of tracked elements is small (≤ a handful).
  trackedMutationObserver.disconnect();
  for (const el of wanted) {
    // Unfiltered on the selected element: a spec pin arrives as a new
    // `data-pv-spec-*` / `data-pv-comment-*` attribute (after HMR), which the
    // canvas badges must pick up.
    trackedMutationObserver.observe(el, selectedEls.includes(el)
      ? { attributes: true }
      : { attributes: true, attributeFilter: ['class', 'style'] });
  }
  for (const p of parents) {
    trackedMutationObserver.observe(p, {
      attributes: true,
      attributeFilter: ['class', 'style'],
      subtree: false,
      childList: true,
    });
  }
}

function setHoverOutline(el: HTMLElement) {
  if (hoveredEl === el) return;
  hoveredEl = el;
  syncOverlays();
}

function clearHoverOutline() {
  if (!hoveredEl) return;
  hoveredEl = null;
  syncOverlays();
}

function applySelectionOutline(el: HTMLElement, multi = false) {
  if (multi) {
    if (selectedEls.includes(el)) {
      selectedEls = selectedEls.filter(e => e !== el);
    } else {
      selectedEls.push(el);
    }
  } else {
    selectedEls = [el];
  }

  selectedParentEl = selectedEls.length === 1 ? findInspectableParent(selectedEls[0]) : null;
  syncOverlays();
}

function clearSelectionOutline() {
  if (selectedEls.length === 0) return;
  selectedEls = [];
  selectedParentEl = null;
  syncOverlays();
}

// ─── Event handlers ───────────────────────────────────────────────────────────

function handlePointerDown(e: PointerEvent) {
  window.parent.postMessage({ type: 'PV_IFRAME_POINTER_DOWN' }, '*');

  if (!isInspectorActive) return;
  if (bypassNextPointerDown) {
    bypassNextPointerDown = false;
    return;
  }
  if (isLocked) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  const target = findInspectableTarget(e.target);
  if (!target) return;

  const isMulti = e.shiftKey;
  e.preventDefault();
  e.stopPropagation();
  clearHoverOutline();

  applySelectionOutline(target, isMulti);

  const runtimeIds = selectedEls.map(element => {
    let rId = element.getAttribute('data-pv-runtime-id');
    if (!rId) {
      rId = 'pv-' + Math.random().toString(36).substring(2);
      element.setAttribute('data-pv-runtime-id', rId);
    }
    return rId;
  });

  const primaryLocs = collectPvLocs(target);
  const primaryComponentId = target.getAttribute('data-pv-component-id') ?? null;

  window.parent.postMessage(
    { type: 'PV_ELEMENT_CLICK', pvLocs: primaryLocs, componentId: primaryComponentId, runtimeIds },
    '*'
  );
}

function handleClick(e: MouseEvent) {
  if (!isInspectorActive) return;
  if (bypassNextClick) {
    // Synthetic click dispatched from handleDoubleClick — let it through.
    bypassNextClick = false;
    return;
  }
  if (isLocked) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  const target = findInspectableTarget(e.target);
  if (!target) return;

  e.preventDefault();
  e.stopPropagation();
}

function handleMouseMove(e: MouseEvent) {
  if (!isInspectorActive) return;
  if (isLocked) {
    clearHoverOutline();
    return;
  }

  const target = findInspectableTarget(e.target);
  if (!target || selectedEls.includes(target) || target === selectedParentEl) {
    clearHoverOutline();
    return;
  }

  setHoverOutline(target);
}

function handleMouseLeave() {
  if (!isInspectorActive) return;
  clearHoverOutline();
}

function handleKeyDown(e: KeyboardEvent) {
  if (!isInspectorActive) return;
  // Let the iframe handle key events that target real text-entry elements.
  // Allow shortcuts for non-text inputs like checkboxes, radios, sliders.
  if (isTypingInput(document.activeElement as HTMLElement | null)) {
    return;
  }

  e.preventDefault();

  window.parent.postMessage(
    {
      type: 'PV_KEYDOWN',
      key: e.key,
      code: e.code,
      metaKey: e.metaKey,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
    },
    '*'
  );
}

function handleDoubleClick(e: MouseEvent) {
  if (!isInspectorActive) return;
  if (isLocked) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  const target = findInspectableTarget(e.target);
  if (!target || selectedEls.length !== 1) return;
  if (target !== selectedEls[0]) return;

  e.preventDefault();
  e.stopPropagation();

  // Pass a real click through to the app, and also signal text-edit-on-double-click.
  // Most editable-text elements are not interactive, so the two co-exist cleanly.
  // Replay the full pointer/mouse sequence so the app sees what looks like a real click.
  // Library outside-click detectors (Radix, Floating UI) listen on pointerdown/mousedown,
  // not click — synthesizing only `click` would leave open dropdowns stuck open.
  const clickTarget = (e.target as HTMLElement | null) ?? target;
  const coords = { clientX: e.clientX, clientY: e.clientY, bubbles: true, cancelable: true, view: window };

  bypassNextPointerDown = true;
  clickTarget.dispatchEvent(new PointerEvent('pointerdown', { ...coords, pointerType: 'mouse', isPrimary: true }));
  clickTarget.dispatchEvent(new MouseEvent('mousedown', coords));
  clickTarget.dispatchEvent(new PointerEvent('pointerup', { ...coords, pointerType: 'mouse', isPrimary: true }));
  clickTarget.dispatchEvent(new MouseEvent('mouseup', coords));
  bypassNextClick = true;
  clickTarget.dispatchEvent(new MouseEvent('click', coords));

  window.parent.postMessage({ type: 'PV_DOUBLE_CLICK' }, '*');
}

// ─── Messages from parent ─────────────────────────────────────────────────────

function handleParentMessage(e: MessageEvent) {
  if (!e.data || typeof e.data !== 'object') return;

  switch (e.data.type) {
    case 'PV_SET_SELECTION': {
      const { runtimeIds } = e.data;
      if (!runtimeIds || !Array.isArray(runtimeIds) || runtimeIds.length === 0) {
        clearSelectionOutline();
        break;
      }
      selectedEls = [];
      runtimeIds.forEach((id: string) => {
        const el = document.querySelector(`[data-pv-runtime-id="${id}"]`) as HTMLElement | null;
        if (el) selectedEls.push(el);
      });
      selectedParentEl = selectedEls.length === 1 ? findInspectableParent(selectedEls[0]) : null;
      syncOverlays();
      break;
    }
    case 'PV_CLEAR_SELECTION':
      clearSelectionOutline();
      break;
    case 'PV_SET_CANVAS_BADGES': {
      const kind = e.data.kind as BadgeKind;
      if (!BADGE_KINDS.includes(kind)) break;
      badgeSets[kind] = {
        ids: Array.isArray(e.data.ids) ? e.data.ids : [],
        activeId: typeof e.data.activeId === 'string' ? e.data.activeId : null,
      };
      syncOverlays();
      break;
    }
    case 'PV_TREE_HOVER': {
      // Hover highlight driven by the shell's elements tree panel. Reuses the
      // same hover overlay as canvas mousemove — the pointer is over the panel
      // while these arrive, so the two sources never fight.
      const { runtimeId } = e.data;
      if (!runtimeId) {
        clearHoverOutline();
        break;
      }
      const el = document.querySelector(`[data-pv-runtime-id="${runtimeId}"]`) as HTMLElement | null;
      if (el) setHoverOutline(el);
      else clearHoverOutline();
      break;
    }
    case 'PV_SET_INSPECTOR_ACTIVE': {
      const active = !!e.data.active;
      isInspectorActive = active;
      setEditingStylesheet(active);
      if (!active) {
        clearHoverOutline();
        clearSelectionOutline();
        document.body.style.cursor = '';
      }
      break;
    }
    case 'PV_SET_LOCKED':
      isLocked = !!e.data.locked;
      document.body.style.cursor = isLocked ? 'progress' : '';
      break;
    case 'PV_SET_THEME':
      document.documentElement.dataset.theme = e.data.theme;
      break;
    case 'PV_CLEAR_STORAGE': {
      // The app iframe is same-origin with the shell, so they share one
      // localStorage. Drop only what the app wrote — `pv-` keys are the shell's
      // own state (theme, comment identity, panel prefs) and must survive.
      try {
        Object.keys(localStorage)
          .filter(key => !key.startsWith('pv-'))
          .forEach(key => localStorage.removeItem(key));
      } catch {
        // storage disabled — nothing to clear
      }
      window.location.reload();
      break;
    }
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

// A document that loads while the server has a compile error gets no
// vite-error-overlay (the overlay only accompanies HMR-pushed errors) — the
// entry module request just 500s and the page stays blank. Catch failing
// same-origin script loads so a refresh mid-crash is still reported as one.
// Registered at module scope: the entry module's error event fires before
// DOMContentLoaded, so waiting for init() would miss it.
// `moduleLoadError: true` tells the shell the canvas is blank (no overlay to
// see through to), so it must render the error itself once the grace elapses.
let sawModuleLoadError = false;
window.addEventListener('error', (e) => {
  const target = e.target as HTMLElement | null;
  if (target?.tagName !== 'SCRIPT') return;
  const src = (target as HTMLScriptElement).src || '';
  if (!src.startsWith(window.location.origin)) return;
  sawModuleLoadError = true;
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'PV_VITE_ERROR', moduleLoadError: true }, '*');
  }
}, true);

function init() {
  // Skip entirely when the app is opened as a standalone page (not embedded in the
  // Protovibe shell iframe). In that case window.parent === window.
  if (window.parent === window) return;
  // Also skip inside the Specs feature's frames: list thumbnails and the
  // read-only viewer embed the app but are not the editing canvas.
  if (window.name.startsWith('pv-spec-')) return;

  setEditingStylesheet(isInspectorActive);
  // Keep `target="_blank"` links and `window.open()` from popping a second
  // Electron window — a prototype page belongs on the app canvas. This bundle
  // also runs in components.html, which only hosts component previews, so from
  // there the shell opens the page in the app canvas instead.
  installCanvasLinkInterceptor({
    destination: window.location.pathname.endsWith('/components.html') ? 'shell' : 'self',
  });
  document.addEventListener('pointerdown', handlePointerDown, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('mouseleave', handleMouseLeave, true);
  document.addEventListener('dblclick', handleDoubleClick, true);
  window.addEventListener('keydown', handleKeyDown, true);
  window.addEventListener('message', handleParentMessage);
  // Overlay rectangles use viewport-relative coords (getBoundingClientRect on a
  // fixed-position layer). Reposition them on any scroll in the iframe — capture
  // covers nested scroll containers as well as the root document.
  window.addEventListener('scroll', () => { hideBadgeTip(); syncOverlays(); }, { capture: true, passive: true });

  // Report the initial error state either way. A document that unloads mid-error
  // (full reload, manual refresh) can never post ERROR_CLEARED for the overlay it
  // took with it, so a fresh healthy load must explicitly clear the shell's state.
  // Note for the shell: no CLEARED is definitive — vite removes and re-adds the
  // overlay on every update cycle when a broken JS update rides along with a
  // successful CSS one — so recovery must always be confirmed with a delay.
  const hasOverlay = !!document.querySelector('vite-error-overlay');
  const hasError = sawModuleLoadError || hasOverlay;
  window.parent.postMessage(
    hasError
      ? { type: 'PV_VITE_ERROR', moduleLoadError: sawModuleLoadError && !hasOverlay }
      : { type: 'PV_VITE_ERROR_CLEARED' },
    '*'
  );

  // Observe DOM for added/removed error overlays
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeName && (node as HTMLElement).nodeName.toLowerCase() === 'vite-error-overlay') {
          window.parent.postMessage({ type: 'PV_VITE_ERROR', moduleLoadError: false }, '*');
        }
      }
      for (const node of mutation.removedNodes) {
        if (node.nodeName && (node as HTMLElement).nodeName.toLowerCase() === 'vite-error-overlay') {
          window.parent.postMessage({ type: 'PV_VITE_ERROR_CLEARED' }, '*');
        }
      }
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export {};
