// plugins/protovibe/src/ui/bridge.ts
// Runs inside app.html (the iframe). Intercepts canvas interactions and
// communicates them to the parent Protovibe shell via postMessage.

import { isElementAllowed } from './utils/traversal';
import { isTypingInput } from './utils/elementType';

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
let suppressNextClickTarget: HTMLElement | null = null;

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
const trackedElements: Set<HTMLElement> = new Set();
let overlaySyncRafId: number | null = null;

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

  syncTrackedElements();
}

function syncTrackedElements() {
  if (!trackedElementObserver) {
    trackedElementObserver = new ResizeObserver(() => {
      if (overlaySyncRafId !== null) return;
      overlaySyncRafId = requestAnimationFrame(() => {
        overlaySyncRafId = null;
        syncOverlays();
      });
    });
  }
  const wanted = new Set<HTMLElement>();
  for (const el of selectedEls) wanted.add(el);
  if (selectedParentEl) wanted.add(selectedParentEl);
  if (hoveredEl) wanted.add(hoveredEl);

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
  if (isLocked) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  const target = findInspectableTarget(e.target);
  if (!target) return;

  const isMulti = e.shiftKey;
  if (target === selectedEls[0] && !isMulti && selectedEls.length === 1) {
    suppressNextClickTarget = null;
    clearHoverOutline();
    return;
  }

  e.preventDefault();
  e.stopPropagation();
  suppressNextClickTarget = target;
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
  if (isLocked) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  const target = findInspectableTarget(e.target);
  if (!target) return;

  if (suppressNextClickTarget && suppressNextClickTarget.contains(target)) {
    e.preventDefault();
    e.stopPropagation();
    suppressNextClickTarget = null;
    return;
  }

  if (selectedEls.includes(target) && !e.shiftKey && selectedEls.length === 1) {
    clearHoverOutline();
    return;
  }

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
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  // Skip entirely when the app is opened as a standalone page (not embedded in the
  // Protovibe shell iframe). In that case window.parent === window.
  if (window.parent === window) return;

  setEditingStylesheet(isInspectorActive);
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
  window.addEventListener('scroll', () => syncOverlays(), { capture: true, passive: true });

  // Check initial state in case the error is already there
  if (document.querySelector('vite-error-overlay')) {
    window.parent.postMessage({ type: 'PV_VITE_ERROR' }, '*');
  }

  // Observe DOM for added/removed error overlays
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeName && (node as HTMLElement).nodeName.toLowerCase() === 'vite-error-overlay') {
          window.parent.postMessage({ type: 'PV_VITE_ERROR' }, '*');
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
