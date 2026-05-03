// plugins/protovibe/src/ui/sketchpad-bridge.ts
// Runs inside sketchpad.html (the sketchpad iframe). Targets only elements
// tagged with data-pv-sketchpad-el (absolutely-positioned sketchpad components).
// Supports selecting, dragging, and focusing them in the inspector.

import { isTypingInput } from './utils/elementType';

// ─── Theme ────────────────────────────────────────────────────────────────────
(function () {
  try {
    const saved = localStorage.getItem('pv-iframe-theme');
    if (saved === 'light' || saved === 'dark') {
      document.documentElement.dataset.theme = saved;
    }
  } catch {}
})();

// ─── Constants ────────────────────────────────────────────────────────────────

const SELECTION_OUTLINE = '2px solid #18a0fb';
const PARENT_PREVIEW_OUTLINE = '1px dashed rgba(24, 160, 251, 0.7)';
const HOVER_OUTLINE = '1px solid rgba(24, 160, 251, 0.6)';
const DROP_TARGET_OUTLINE = '2px solid #1ABC9C';
const DROP_TARGET_OFFSET = '-1px';
const DRAG_THRESHOLD = 3;
const RESIZE_EDGE_PX = 8;
const SNAP_THRESHOLD_SCREEN_PX = 6;
const SNAP_GUIDE_COLOR = 'rgba(255, 59, 107, 0.65)';

// ─── State ────────────────────────────────────────────────────────────────────

let hoveredEl: HTMLElement | null = null;
let selectedEls: HTMLElement[] = [];
let selectedParentEl: HTMLElement | null = null;

interface SnapRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  hcenter: number;
  vcenter: number;
}

interface SnapGuide {
  axis: 'x' | 'y';
  coord: number;       // frame-relative logical
  perpStart: number;   // frame-relative logical
  perpEnd: number;     // frame-relative logical
}

interface SnapContext {
  frameEl: HTMLElement;
  targets: SnapRect[];
  startRects: SnapRect[]; // one per moving element (drag) or one (resize)
}

let dragState: {
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
  targets: {
    el: HTMLElement;
    origLeft: number;
    origTop: number;
    origOffsetLeft: number;
    origOffsetTop: number;
    origWidth: number;
    origHeight: number;
    origZIndex: string;
    isFlow: boolean;
    origTransform: string;
  }[];
  snap: SnapContext | null;
} | null = null;

type ResizeEdge = 'e' | 'w' | 'n' | 's' | 'ne' | 'nw' | 'se' | 'sw';

let resizeState: {
  target: HTMLElement;
  pointerId: number;
  startX: number;
  startY: number;
  origWidth: number;
  origHeight: number;
  origLeft: number;
  origTop: number;
  edge: ResizeEdge;
  snap: SnapContext | null;
} | null = null;

let nudgeState: {
  activeKeys: Set<string>;
  dx: number;
  dy: number;
  targets: {
    el: HTMLElement;
    origLeft: number;
    origTop: number;
    origTransform: string;
    frameId: string;
    blockId: string;
  }[];
} | null = null;

let currentDropTarget: HTMLElement | null = null;
let ghostEls: HTMLElement[] = [];
let currentActiveSourceId: string | null = null;
let spaceHeld = false;

window.addEventListener('blur', () => {
  spaceHeld = false;
});

let lastClickTime = 0;
let lastClickX = 0;
let lastClickY = 0;

function updateGhost(isAltHeld: boolean) {
  if (!dragState) return;

  if (isAltHeld && ghostEls.length === 0) {
    dragState.targets.forEach(t => {
      const ghost = t.el.cloneNode(true) as HTMLElement;
      ghost.style.opacity = '0.3';
      ghost.style.pointerEvents = 'none';
      ghost.style.transform = t.origTransform;
      ghost.style.transition = 'none';
      ghost.style.position = 'absolute';
      ghost.style.left = `${t.origOffsetLeft}px`;
      ghost.style.top = `${t.origOffsetTop}px`;
      ghost.style.width = `${t.origWidth}px`;
      ghost.style.height = `${t.origHeight}px`;
      ghost.style.margin = '0';
      
      const stripIdentifiers = (el: Element) => {
        el.removeAttribute('data-pv-sketchpad-el');
        el.removeAttribute('data-pv-block');
        el.removeAttribute('data-pv-runtime-id');
        Array.from(el.attributes).forEach(attr => {
          if (attr.name.startsWith('data-pv-loc-')) el.removeAttribute(attr.name);
        });
      };

      stripIdentifiers(ghost);
      ghost.querySelectorAll('*').forEach(stripIdentifiers);
      t.el.parentElement?.insertBefore(ghost, t.el);
      ghostEls.push(ghost);
    });
  } else if (!isAltHeld && ghostEls.length > 0) {
    ghostEls.forEach(g => g.remove());
    ghostEls = [];
  }
}

// ─── DOM helpers ──────────────────────────────────────────────────────────────

/**
 * Validates if an element's source is in the application code (app-level)
 * rather than being an internal detail of a UI component.
 */
function isAppLevel(el: HTMLElement): boolean {
  if (el.hasAttribute('data-pv-sketchpad-el')) return true;
  for (let i = 0; i < el.attributes.length; i++) {
    if (el.attributes[i].name.startsWith('data-pv-loc-app-')) return true;
  }
  return false;
}

/**
 * Identifies if the element is the root layout wrapper for a frame.
 */
function isFrameRoot(el: HTMLElement): boolean {
  return el.parentElement?.hasAttribute('data-sketchpad-frame') ?? false;
}

/**
 * Walk up from event target and build a top-down path of all inspectable elements 
 * (frame -> wrapper -> component -> ...) filtering out internal UI-level nodes and frame roots.
 */
function getInspectablePath(start: EventTarget | null): HTMLElement[] {
  const path: HTMLElement[] = [];
  let t = start as HTMLElement | null;
  while (t && t !== document.documentElement) {
    if (t.hasAttribute('data-pv-sketchpad-el') || t.hasAttribute('data-pv-component-id') || t.hasAttribute('data-pv-block')) {
      if (isAppLevel(t) && !isFrameRoot(t)) {
        path.unshift(t);
      }
    }
    t = t.parentElement;
  }
  return path;
}

/** Find the enclosing frame container (`data-sketchpad-frame`). */
function findFrameContainer(el: HTMLElement): HTMLElement | null {
  let t: HTMLElement | null = el;
  while (t && t !== document.documentElement) {
    if (t.hasAttribute('data-sketchpad-frame')) return t;
    t = t.parentElement;
  }
  return null;
}

/** Find the frame's root content div (the one with data-pv-loc-* attributes inside a frame container). */
function findFrameRoot(start: HTMLElement): HTMLElement | null {
  const frame = findFrameContainer(start);
  if (!frame) return null;
  // The frame root is the first child element with a data-pv-loc-* attribute
  for (let i = 0; i < frame.children.length; i++) {
    const child = frame.children[i] as HTMLElement;
    if (hasPvLoc(child)) return child;
  }
  return null;
}

function hasPvLoc(el: HTMLElement): boolean {
  for (let i = 0; i < el.attributes.length; i++) {
    if (el.attributes[i].name.startsWith('data-pv-loc-')) return true;
  }
  return false;
}

function getNearestPvLocId(start: HTMLElement): string | null {
  let t: HTMLElement | null = start;
  while (t && t !== document.documentElement) {
    let uiId: string | null = null;
    let appId: string | null = null;

    for (let i = 0; i < t.attributes.length; i++) {
      const a = t.attributes[i];
      if (a.name.startsWith('data-pv-loc-app-')) {
        appId = a.name.replace('data-pv-loc-app-', '');
      } else if (a.name.startsWith('data-pv-loc-ui-')) {
        uiId = a.name.replace('data-pv-loc-ui-', '');
      }
    }

    // Always prefer the app-level locator (usage site) over the ui-level locator (component definition site)
    if (appId) return appId;
    if (uiId) return uiId;

    t = t.parentElement;
  }
  return null;
}

function findInspectableParent(el: HTMLElement): HTMLElement | null {
  let current = el.parentElement;
  while (current && current !== document.documentElement) {
    if (current.hasAttribute('data-pv-sketchpad-el') || current.hasAttribute('data-pv-component-id') || current.hasAttribute('data-pv-block')) {
      if (isAppLevel(current) && !isFrameRoot(current)) {
        return current;
      }
    }
    current = current.parentElement;
  }
  return null;
}

function findDropContainerAtPoint(clientX: number, clientY: number, dragTargets: HTMLElement[]): HTMLElement | null {
  dragTargets.forEach(el => { el.style.pointerEvents = 'none'; });
  const raw = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
  dragTargets.forEach(el => { el.style.pointerEvents = ''; });
  if (!raw) return null;

  const container = raw.closest('[data-pv-block], [data-sketchpad-frame]') as HTMLElement | null;
  if (!container) return null;
  if (dragTargets.includes(container)) return null;
  return container;
}

function applyDropTargetHighlight(el: HTMLElement | null) {
  if (!el) return;
  const a = el as any;
  if (a._pvDropOrigOutline === undefined) {
    a._pvDropOrigOutline = el.style.outline;
    a._pvDropOrigOffset = el.style.outlineOffset;
  }
  el.style.outline = DROP_TARGET_OUTLINE;
  el.style.outlineOffset = DROP_TARGET_OFFSET;
}

function clearDropTargetHighlight(el: HTMLElement | null) {
  if (!el) return;
  const a = el as any;
  if (a._pvDropOrigOutline !== undefined) {
    el.style.outline = a._pvDropOrigOutline;
    el.style.outlineOffset = a._pvDropOrigOffset;
    delete a._pvDropOrigOutline;
    delete a._pvDropOrigOffset;
  }
}

function setCurrentDropTarget(next: HTMLElement | null) {
  if (currentDropTarget === next) return;
  clearDropTargetHighlight(currentDropTarget);
  currentDropTarget = next;
  applyDropTargetHighlight(currentDropTarget);
}

function clearCurrentDropTarget() {
  clearDropTargetHighlight(currentDropTarget);
  currentDropTarget = null;
}

/** Get the active sketchpad ID from the root data attribute. */
function getSketchpadId(): string | null {
  return document.querySelector('[data-sketchpad-id]')
    ?.getAttribute('data-sketchpad-id') ?? null;
}

/** Read the current canvas zoom from the InfiniteCanvas data attribute. */
function getCanvasZoom(): number {
  const el = document.querySelector('[data-sketchpad-zoom]');
  return parseFloat(el?.getAttribute('data-sketchpad-zoom') || '1') || 1;
}

/** Computed left/top of an absolutely-positioned element. */
function getComputedPos(el: HTMLElement): { left: number; top: number } {
  const s = window.getComputedStyle(el);
  return { left: parseFloat(s.left) || 0, top: parseFloat(s.top) || 0 };
}

/** Collect data-pv-loc-* attributes for inspector communication. */
function collectPvLocs(el: HTMLElement): { name: string; value: string }[] {
  const locs: { name: string; value: string }[] = [];
  for (let i = 0; i < el.attributes.length; i++) {
    const a = el.attributes[i];
    if (a.name.startsWith('data-pv-loc-')) {
      locs.push({ name: a.name, value: a.value });
    }
  }
  return locs;
}

/** Check if pointer is near any resizable edge/corner and return which one. */
function getResizeEdge(el: HTMLElement, clientX: number, clientY: number): ResizeEdge | null {
  const rect = el.getBoundingClientRect();
  const resizeMode = el.getAttribute('data-pv-resizable');
  const resizeBoth = resizeMode === 'both';
  const allowH = resizeBoth || resizeMode === 'horizontal' || resizeMode === null;
  const allowV = resizeBoth || resizeMode === 'vertical';
  const allowLeft = resizeBoth || resizeMode === 'horizontal' || resizeMode === null;

  const nearRight = allowH && clientX >= rect.right - RESIZE_EDGE_PX && clientX <= rect.right + RESIZE_EDGE_PX;
  const nearLeft = allowLeft && clientX >= rect.left - RESIZE_EDGE_PX && clientX <= rect.left + RESIZE_EDGE_PX;
  const nearTop = allowV && clientY >= rect.top - RESIZE_EDGE_PX && clientY <= rect.top + RESIZE_EDGE_PX;
  const nearBottom = allowV && clientY >= rect.bottom - RESIZE_EDGE_PX && clientY <= rect.bottom + RESIZE_EDGE_PX;

  const withinX = clientX >= rect.left - RESIZE_EDGE_PX && clientX <= rect.right + RESIZE_EDGE_PX;
  const withinY = clientY >= rect.top - RESIZE_EDGE_PX && clientY <= rect.bottom + RESIZE_EDGE_PX;

  if (!withinX || !withinY) return null;

  // Corners (check first — they overlap edges)
  if (nearTop && nearLeft) return 'nw';
  if (nearTop && nearRight) return 'ne';
  if (nearBottom && nearLeft) return 'sw';
  if (nearBottom && nearRight) return 'se';

  // Edges
  if (nearRight && clientY >= rect.top && clientY <= rect.bottom) return 'e';
  if (nearLeft && clientY >= rect.top && clientY <= rect.bottom) return 'w';
  if (nearTop && clientX >= rect.left && clientX <= rect.right) return 'n';
  if (nearBottom && clientX >= rect.left && clientX <= rect.right) return 's';

  return null;
}

// ─── Snap (magnet lines) ──────────────────────────────────────────────────────

function makeSnapRect(left: number, top: number, w: number, h: number): SnapRect {
  return {
    left, top,
    right: left + w,
    bottom: top + h,
    hcenter: left + w / 2,
    vcenter: top + h / 2,
  };
}

function unionSnapRect(rects: SnapRect[]): SnapRect {
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  for (const x of rects) {
    if (x.left < l) l = x.left;
    if (x.top < t) t = x.top;
    if (x.right > r) r = x.right;
    if (x.bottom > b) b = x.bottom;
  }
  return makeSnapRect(l, t, r - l, b - t);
}

function rectFromElement(el: HTMLElement, frameRect: DOMRect, zoom: number): SnapRect {
  const r = el.getBoundingClientRect();
  return makeSnapRect((r.left - frameRect.left) / zoom, (r.top - frameRect.top) / zoom, r.width / zoom, r.height / zoom);
}

function collectSnapContext(frameEl: HTMLElement, exclude: HTMLElement[]): SnapContext | null {
  const zoom = getCanvasZoom();
  const fr = frameEl.getBoundingClientRect();
  const all = Array.from(frameEl.querySelectorAll<HTMLElement>('[data-pv-sketchpad-el], [data-pv-block]'));
  const isExcluded = (el: HTMLElement) => exclude.some(x => x === el || x.contains(el) || el.contains(x));
  const targets: SnapRect[] = [];
  targets.push(makeSnapRect(0, 0, fr.width / zoom, fr.height / zoom));
  for (const el of all) {
    if (isExcluded(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    targets.push(makeSnapRect((r.left - fr.left) / zoom, (r.top - fr.top) / zoom, r.width / zoom, r.height / zoom));
  }
  const startRects = exclude.map(el => rectFromElement(el, fr, zoom));
  return { frameEl, targets, startRects };
}

function computeSnap(
  movingRect: SnapRect,
  movingEdgesX: Array<'left' | 'right' | 'hcenter'>,
  movingEdgesY: Array<'top' | 'bottom' | 'vcenter'>,
  targets: SnapRect[],
  threshold: number,
): { adjustX: number; adjustY: number; guides: SnapGuide[] } {
  let bestX: { delta: number; coord: number } | null = null;
  let bestY: { delta: number; coord: number } | null = null;

  for (const me of movingEdgesX) {
    const mv = movingRect[me];
    for (const t of targets) {
      for (const tv of [t.left, t.right, t.hcenter]) {
        const delta = tv - mv;
        const ad = Math.abs(delta);
        if (ad <= threshold && (!bestX || ad < Math.abs(bestX.delta))) {
          bestX = { delta, coord: tv };
        }
      }
    }
  }
  for (const me of movingEdgesY) {
    const mv = movingRect[me];
    for (const t of targets) {
      for (const tv of [t.top, t.bottom, t.vcenter]) {
        const delta = tv - mv;
        const ad = Math.abs(delta);
        if (ad <= threshold && (!bestY || ad < Math.abs(bestY.delta))) {
          bestY = { delta, coord: tv };
        }
      }
    }
  }

  const guides: SnapGuide[] = [];
  const adjustX = bestX ? bestX.delta : 0;
  const adjustY = bestY ? bestY.delta : 0;

  if (bestX) {
    const tops: number[] = [movingRect.top + adjustY, movingRect.bottom + adjustY];
    for (const t of targets) {
      if (Math.abs(t.left - bestX.coord) < 0.5 || Math.abs(t.right - bestX.coord) < 0.5 || Math.abs(t.hcenter - bestX.coord) < 0.5) {
        tops.push(t.top, t.bottom);
      }
    }
    guides.push({ axis: 'x', coord: bestX.coord, perpStart: Math.min(...tops), perpEnd: Math.max(...tops) });
  }
  if (bestY) {
    const lefts: number[] = [movingRect.left + adjustX, movingRect.right + adjustX];
    for (const t of targets) {
      if (Math.abs(t.top - bestY.coord) < 0.5 || Math.abs(t.bottom - bestY.coord) < 0.5 || Math.abs(t.vcenter - bestY.coord) < 0.5) {
        lefts.push(t.left, t.right);
      }
    }
    guides.push({ axis: 'y', coord: bestY.coord, perpStart: Math.min(...lefts), perpEnd: Math.max(...lefts) });
  }

  return { adjustX, adjustY, guides };
}

let guideOverlayEl: HTMLDivElement | null = null;

function ensureGuideOverlay(): HTMLDivElement {
  if (guideOverlayEl && guideOverlayEl.isConnected) return guideOverlayEl;
  const d = document.createElement('div');
  d.setAttribute('data-sketchpad-snap-guides', '');
  d.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9997;';
  document.body.appendChild(d);
  guideOverlayEl = d;
  return d;
}

function renderGuides(guides: SnapGuide[], frameEl: HTMLElement | null) {
  const overlay = ensureGuideOverlay();
  overlay.textContent = '';
  if (!frameEl || guides.length === 0) return;
  const fr = frameEl.getBoundingClientRect();
  const zoom = getCanvasZoom();
  for (const g of guides) {
    const line = document.createElement('div');
    line.style.position = 'absolute';
    line.style.background = SNAP_GUIDE_COLOR;
    line.style.pointerEvents = 'none';
    if (g.axis === 'x') {
      const screenX = fr.left + g.coord * zoom;
      const y1 = fr.top + g.perpStart * zoom;
      const y2 = fr.top + g.perpEnd * zoom;
      line.style.left = `${screenX - 0.5}px`;
      line.style.top = `${y1}px`;
      line.style.width = '1px';
      line.style.height = `${Math.max(1, y2 - y1)}px`;
    } else {
      const screenY = fr.top + g.coord * zoom;
      const x1 = fr.left + g.perpStart * zoom;
      const x2 = fr.left + g.perpEnd * zoom;
      line.style.top = `${screenY - 0.5}px`;
      line.style.left = `${x1}px`;
      line.style.height = '1px';
      line.style.width = `${Math.max(1, x2 - x1)}px`;
    }
    overlay.appendChild(line);
  }
}

function clearGuides() {
  if (guideOverlayEl) guideOverlayEl.textContent = '';
}

function snapEdgesForResize(edge: ResizeEdge): { x: Array<'left' | 'right' | 'hcenter'>; y: Array<'top' | 'bottom' | 'vcenter'> } {
  const x: Array<'left' | 'right' | 'hcenter'> = [];
  const y: Array<'top' | 'bottom' | 'vcenter'> = [];
  if (edge.includes('e')) x.push('right');
  if (edge.includes('w')) x.push('left');
  if (edge.includes('n')) y.push('top');
  if (edge.includes('s')) y.push('bottom');
  return { x, y };
}

const RESIZE_CURSOR_MAP: Record<ResizeEdge, string> = {
  e: 'ew-resize', w: 'ew-resize',
  n: 'ns-resize', s: 'ns-resize',
  ne: 'nesw-resize', sw: 'nesw-resize',
  nw: 'nwse-resize', se: 'nwse-resize',
};

// ─── Overlay layer (selection / hover / parent-preview rectangles + resize affordance) ───
// All selection visuals are rendered as positioned overlay rectangles in a dedicated layer
// inside the iframe, instead of mutating each element's inline `outline` style. This avoids
// stash/restore fragility, escapes ancestor `overflow: hidden` clipping, and gives us a place
// to draw the SE-corner resize affordance on top of the selection rectangle.

let overlayLayer: HTMLDivElement | null = null;
let selectionOverlays: Map<HTMLElement, HTMLDivElement> = new Map();
let hoverOverlay: HTMLDivElement | null = null;
let parentPreviewOverlay: HTMLDivElement | null = null;
let resizeAffordance: HTMLDivElement | null = null;
let eastResizeAffordance: HTMLDivElement | null = null;
let westResizeAffordance: HTMLDivElement | null = null;
let trackedElementObserver: ResizeObserver | null = null;
let trackedElements: Set<HTMLElement> = new Set();
let overlaySyncRafId: number | null = null;

function ensureOverlayLayer(): HTMLDivElement {
  if (overlayLayer && overlayLayer.isConnected) return overlayLayer;
  const d = document.createElement('div');
  d.setAttribute('data-pv-overlay-layer', '');
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

// `inset` matches `outline-offset` semantics inverted: positive = shrink inward (like
// outline-offset:-1px), negative = grow outward (like outline-offset:+1px).
function applyBoxStyle(box: HTMLDivElement, rect: DOMRect, inset: number, border: string) {
  box.style.left = `${rect.left + inset}px`;
  box.style.top = `${rect.top + inset}px`;
  box.style.width = `${Math.max(0, rect.width - inset * 2)}px`;
  box.style.height = `${Math.max(0, rect.height - inset * 2)}px`;
  box.style.border = border;
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
    // inset=-1 with a 2px border = border straddles the element edge (-1..+1 px),
    // so the rectangle sits on the border rather than 1px inside it.
    applyBoxStyle(box, el.getBoundingClientRect(), -1, SELECTION_OUTLINE);
  }

  // Parent preview
  if (selectedParentEl && selectedParentEl.isConnected) {
    if (!parentPreviewOverlay) {
      parentPreviewOverlay = makeOverlayBox();
      layer.appendChild(parentPreviewOverlay);
    }
    applyBoxStyle(parentPreviewOverlay, selectedParentEl.getBoundingClientRect(), -1, PARENT_PREVIEW_OUTLINE);
    parentPreviewOverlay.style.display = 'block';
  } else if (parentPreviewOverlay) {
    parentPreviewOverlay.style.display = 'none';
  }

  // Hover (suppress when the hover target is already selected or is the parent)
  const showHover = hoveredEl
    && hoveredEl.isConnected
    && !selectedEls.includes(hoveredEl)
    && hoveredEl !== selectedParentEl;
  if (showHover) {
    if (!hoverOverlay) {
      hoverOverlay = makeOverlayBox();
      layer.appendChild(hoverOverlay);
    }
    applyBoxStyle(hoverOverlay, hoveredEl!.getBoundingClientRect(), -1, HOVER_OUTLINE);
    hoverOverlay.style.display = 'block';
  } else if (hoverOverlay) {
    hoverOverlay.style.display = 'none';
  }

  // Resize affordances: only when exactly one sketchpad-el is selected.
  //   - SE 8x8 square for data-pv-resizable="both" (the only mode where getResizeEdge returns 'se').
  //   - E thin vertical pill for the width-only modes (data-pv-resizable="horizontal" or
  //     missing), where right-edge horizontal resize is allowed but the SE corner is not.
  const single = selectedEls.length === 1 ? selectedEls[0] : null;
  const isSingleSketchpadEl = !!single && single.isConnected && single.hasAttribute('data-pv-sketchpad-el');
  const resizeMode = isSingleSketchpadEl ? single!.getAttribute('data-pv-resizable') : null;
  const showSeAffordance = isSingleSketchpadEl && resizeMode === 'both';
  // East handle covers the "width only" cases. Excludes 'both' (SE handle conveys it)
  // and 'vertical' (no horizontal resize allowed).
  const showEastAffordance = isSingleSketchpadEl
    && (resizeMode === 'horizontal' || resizeMode === null);

  if (showSeAffordance) {
    if (!resizeAffordance) {
      resizeAffordance = document.createElement('div');
      resizeAffordance.setAttribute('data-pv-resize-affordance', '');
      resizeAffordance.style.cssText = 'position:absolute;width:8px;height:8px;background:#18a0fb;border:1px solid #fff;box-sizing:border-box;border-radius:1px;pointer-events:none;';
      layer.appendChild(resizeAffordance);
    }
    const rect = single!.getBoundingClientRect();
    // Center the 8px square on the corner of the selection rectangle (which now sits 1px
    // outside the element edge — see applyBoxStyle inset=-1 for selection overlays).
    resizeAffordance.style.left = `${rect.right - 3}px`;
    resizeAffordance.style.top = `${rect.bottom - 3}px`;
    resizeAffordance.style.display = 'block';
  } else if (resizeAffordance) {
    resizeAffordance.style.display = 'none';
  }

  if (showEastAffordance) {
    if (!eastResizeAffordance) {
      eastResizeAffordance = document.createElement('div');
      eastResizeAffordance.setAttribute('data-pv-resize-affordance', 'e');
      // Thin vertical pill — the shape signals "drag horizontally to change width" and
      // distinguishes it from the SE corner square's two-axis affordance.
      eastResizeAffordance.style.cssText = 'position:absolute;width:4px;height:18px;background:#18a0fb;border:1px solid #fff;box-sizing:border-box;border-radius:2px;pointer-events:none;';
      layer.appendChild(eastResizeAffordance);
    }
    const rect = single!.getBoundingClientRect();
    // Center the 4×18 pill on the right edge of the selection rectangle. left = right - 1
    // (half of 4px width minus the 1px inset from the selection straddle), top = vertical
    // midpoint - 9 (half the pill height).
    eastResizeAffordance.style.left = `${rect.right - 1}px`;
    eastResizeAffordance.style.top = `${rect.top + rect.height / 2 - 9}px`;
    eastResizeAffordance.style.display = 'block';
  } else if (eastResizeAffordance) {
    eastResizeAffordance.style.display = 'none';
  }

  if (showEastAffordance) {
    if (!westResizeAffordance) {
      westResizeAffordance = document.createElement('div');
      westResizeAffordance.setAttribute('data-pv-resize-affordance', 'w');
      westResizeAffordance.style.cssText = 'position:absolute;width:4px;height:18px;background:#18a0fb;border:1px solid #fff;box-sizing:border-box;border-radius:2px;pointer-events:none;';
      layer.appendChild(westResizeAffordance);
    }
    const rect = single!.getBoundingClientRect();
    westResizeAffordance.style.left = `${rect.left - 3}px`;
    westResizeAffordance.style.top = `${rect.top + rect.height / 2 - 9}px`;
    westResizeAffordance.style.display = 'block';
  } else if (westResizeAffordance) {
    westResizeAffordance.style.display = 'none';
  }

  syncTrackedElements();
}

// Schedule a single rAF-coalesced re-sync. ResizeObserver and MutationObserver can
// both fire many times per frame; this collapses them into one syncOverlays() call.
function scheduleSync() {
  if (overlaySyncRafId !== null) return;
  overlaySyncRafId = requestAnimationFrame(() => {
    overlaySyncRafId = null;
    syncOverlays();
  });
}

let trackedMutationObserver: MutationObserver | null = null;

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
    trackedMutationObserver.observe(el, { attributes: true, attributeFilter: ['class', 'style'] });
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

function updateOutlines() {
  syncOverlays();
}

function setHover(el: HTMLElement) {
  if (hoveredEl === el) return;
  hoveredEl = el;
  updateOutlines();
}

function clearHover() {
  if (!hoveredEl) return;
  hoveredEl = null;
  updateOutlines();
}

function setSelection(el: HTMLElement, isMulti = false) {
  if (isMulti) {
    if (selectedEls.includes(el)) {
      selectedEls = selectedEls.filter(e => e !== el);
    } else {
      selectedEls.push(el);
    }
  } else {
    selectedEls = [el];
  }

  // Keep drill-down context (selectedParentEl) sticky while extending a multi-selection.
  // Recompute only on first selection; preserve when adding/removing siblings so subsequent
  // shift-clicks resolve to the same drill depth instead of jumping back to the top of the path.
  if (selectedEls.length === 0) {
    selectedParentEl = null;
  } else if (selectedEls.length === 1) {
    selectedParentEl = findInspectableParent(selectedEls[0]);
  }
  updateOutlines();
}

function clearSelection() {
  if (selectedEls.length === 0) return;
  selectedEls = [];
  selectedParentEl = null;
  updateOutlines();
}

// ─── Cursor override ──────────────────────────────────────────────────────────

let cursorStyleEl: HTMLStyleElement | null = null;

function setForcedCursor(cursor: string) {
  if (!cursorStyleEl) {
    cursorStyleEl = document.createElement('style');
    cursorStyleEl.id = 'pv-cursor-override';
    document.head.appendChild(cursorStyleEl);
  }
  cursorStyleEl.textContent = `* { cursor: ${cursor} !important; }`;
}

function clearForcedCursor() {
  if (cursorStyleEl) {
    cursorStyleEl.textContent = '';
  }
}

// ─── API ──────────────────────────────────────────────────────────────────────

let apiQueue: Promise<void> = Promise.resolve();

function postApi(url: string, body: Record<string, unknown>) {
  apiQueue = apiQueue.then(() =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    .then((res) => {
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
    })
    .catch((e) => console.warn('[Sketchpad Bridge]', e))
  );
}

// ─── Inspector communication ──────────────────────────────────────────────────

function notifyInspector(primaryTarget: HTMLElement, skipSnapshot = false) {
  const runtimeIds = selectedEls.map(el => {
    let rId = el.getAttribute('data-pv-runtime-id');
    if (!rId) {
      rId = 'pv-' + Math.random().toString(36).substring(2);
      el.setAttribute('data-pv-runtime-id', rId);
    }
    return rId;
  });

  const pvLocs = collectPvLocs(primaryTarget);
  const componentId = primaryTarget.getAttribute('data-pv-component-id') ?? null;

  window.parent.postMessage(
    { type: 'PV_ELEMENT_CLICK', pvLocs, componentId, runtimeIds, skipSnapshot },
    '*',
  );
}

// ─── Event handlers ───────────────────────────────────────────────────────────

let pointerMoveRafId: number | null = null;
let latestClientX = 0;
let latestClientY = 0;
let latestMetaKey = false;

function applyPointerMoveUpdate() {
  pointerMoveRafId = null;

  // Handle resize
  if (resizeState) {
    const zoom = getCanvasZoom();
    let dx = (latestClientX - resizeState.startX) / zoom;
    let dy = (latestClientY - resizeState.startY) / zoom;
    const edge = resizeState.edge;

    if (resizeState.snap && !latestMetaKey && resizeState.snap.startRects[0]) {
      const start = resizeState.snap.startRects[0];
      // Build proposed rect from current edge logic
      let pl = start.left, pt = start.top, pr = start.right, pb = start.bottom;
      if (edge.includes('e')) pr = start.right + dx;
      if (edge.includes('w')) pl = start.left + dx;
      if (edge.includes('s')) pb = start.bottom + dy;
      if (edge.includes('n')) pt = start.top + dy;
      // Enforce min size in proposed coords (matches downstream Math.max(20, ...))
      if (pr - pl < 20) {
        if (edge.includes('e')) pr = pl + 20;
        else pl = pr - 20;
      }
      if (pb - pt < 20) {
        if (edge.includes('s')) pb = pt + 20;
        else pt = pb - 20;
      }
      const proposed = makeSnapRect(pl, pt, pr - pl, pb - pt);
      const moving = snapEdgesForResize(edge);
      const { adjustX, adjustY, guides } = computeSnap(
        proposed,
        moving.x,
        moving.y,
        resizeState.snap.targets,
        SNAP_THRESHOLD_SCREEN_PX / zoom,
      );
      if (edge.includes('e')) dx += adjustX;
      else if (edge.includes('w')) dx += adjustX;
      if (edge.includes('s')) dy += adjustY;
      else if (edge.includes('n')) dy += adjustY;
      renderGuides(guides, resizeState.snap.frameEl);
    } else {
      clearGuides();
    }

    // Width changes
    if (edge.includes('e')) {
      resizeState.target.style.width = `${Math.max(20, Math.round(resizeState.origWidth + dx))}px`;
    } else if (edge.includes('w')) {
      const delta = Math.min(dx, resizeState.origWidth - 20);
      resizeState.target.style.width = `${Math.round(resizeState.origWidth - delta)}px`;
      resizeState.target.style.left = `${Math.round(resizeState.origLeft + delta)}px`;
    }

    // Height changes
    if (edge.includes('s')) {
      resizeState.target.style.height = `${Math.max(20, Math.round(resizeState.origHeight + dy))}px`;
    } else if (edge.includes('n')) {
      const delta = Math.min(dy, resizeState.origHeight - 20);
      resizeState.target.style.height = `${Math.round(resizeState.origHeight - delta)}px`;
      resizeState.target.style.top = `${Math.round(resizeState.origTop + delta)}px`;
    }
    syncOverlays();
    return;
  }

  // Handle drag
  if (dragState) {
    const zoom = getCanvasZoom();
    let dx = (latestClientX - dragState.startX) / zoom;
    let dy = (latestClientY - dragState.startY) / zoom;

    if (!dragState.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      dragState.moved = true;
      setForcedCursor('grabbing');
      dragState.targets.forEach(t => {
        t.el.style.transition = 'none';
        // One below max so the overlay layer (selection rect + resize handle) stays on top.
        t.el.style.zIndex = '2147483640';
      });
    }

    if (dragState.snap && !latestMetaKey && dragState.snap.startRects.length > 0) {
      const proposed = unionSnapRect(dragState.snap.startRects.map(r =>
        makeSnapRect(r.left + dx, r.top + dy, r.right - r.left, r.bottom - r.top)
      ));
      const { adjustX, adjustY, guides } = computeSnap(
        proposed,
        ['left', 'right', 'hcenter'],
        ['top', 'bottom', 'vcenter'],
        dragState.snap.targets,
        SNAP_THRESHOLD_SCREEN_PX / zoom,
      );
      dx += adjustX;
      dy += adjustY;
      renderGuides(guides, dragState.snap.frameEl);
    } else {
      clearGuides();
    }

    // Universally use GPU-accelerated transform for BOTH flow and absolute elements during drag
    dragState.targets.forEach(t => {
      const existingTransform = t.origTransform && t.origTransform !== 'none' ? t.origTransform + ' ' : '';
      t.el.style.transform = `${existingTransform}translate(${dx}px, ${dy}px)`;
    });

    // Use all targets to find container through the selection
    const dragEls = dragState.targets.map(t => t.el);
    const dropContainer = findDropContainerAtPoint(latestClientX, latestClientY, dragEls);
    setCurrentDropTarget(dropContainer);
    syncOverlays();
  }
}

function handlePointerDown(e: PointerEvent) {
  window.parent.postMessage({ type: 'PV_IFRAME_POINTER_DOWN' }, '*');

  if (e.button !== 0) return;
  if (spaceHeld) return;

  const targetNode = e.target as HTMLElement | null;
  if (targetNode && targetNode.closest('[data-sketchpad-frame-overlay]')) {
    return;
  }

  const now = Date.now();
  const dist = Math.hypot(e.clientX - lastClickX, e.clientY - lastClickY);
  const isDoubleClick = (now - lastClickTime < 400) && (dist < 10);
  
  lastClickTime = now;
  lastClickX = e.clientX;
  lastClickY = e.clientY;

  const isMulti = e.shiftKey;

  // EARLY RESIZE INTERCEPT: Prioritize resizing the active selection over selecting background elements.
  // We check this BEFORE evaluating e.target, so clicking the 8px safe-margin works perfectly.
  const primarySel = selectedEls.length === 1 ? selectedEls[0] : null;
  const selEdge = primarySel?.hasAttribute('data-pv-sketchpad-el') ? getResizeEdge(primarySel, e.clientX, e.clientY) : null;

  if (primarySel && selEdge && !isMulti) {
    e.preventDefault();
    e.stopPropagation();
    const rect = primarySel.getBoundingClientRect();
    const zoom = getCanvasZoom();
    const pos = getComputedPos(primarySel);
    const frameForSnap = findFrameContainer(primarySel);
    resizeState = {
      target: primarySel,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origWidth: rect.width / zoom,
      origHeight: rect.height / zoom,
      origLeft: pos.left,
      origTop: pos.top,
      edge: selEdge,
      snap: frameForSnap ? collectSnapContext(frameForSnap, [primarySel]) : null,
    };
    setForcedCursor(RESIZE_CURSOR_MAP[selEdge]);
    primarySel.style.transition = 'none';
    return;
  }

  const path = getInspectablePath(e.target);

  // Custom double-click drill-down interception
  if (isDoubleClick && selectedEls.length === 1 && path.includes(selectedEls[0]) && !isMulti) {
    const idx = path.indexOf(selectedEls[0]);
    if (idx >= 0 && idx < path.length - 1) {
      e.preventDefault();
      e.stopPropagation();
      const nextTarget = path[idx + 1];
      clearHover();
      setSelection(nextTarget, false);
      notifyInspector(nextTarget);
      lastClickTime = 0; // Require two more clicks for next drill-down
      return;
    } else if (idx === path.length - 1) {
      e.preventDefault();
      e.stopPropagation();
      window.parent.postMessage({ type: 'PV_DOUBLE_CLICK' }, '*');
      lastClickTime = 0;
      return;
    }
  }

  // Determine click target based on hierarchy & modifiers
  let nextTarget: HTMLElement | null = null;
  let isClickingSelected = false;

  if (path.length > 0) {
    if (e.metaKey || e.ctrlKey) {
      // Cmd/Ctrl + Click -> Direct deep selection
      nextTarget = path[path.length - 1];
    } else if (!isMulti && selectedEls.some(sel => path.includes(sel))) {
      // Clicked down on an already selected element in a group -> keep group selection to drag it
      nextTarget = selectedEls.find(sel => path.includes(sel))!;
      isClickingSelected = true;
    } else if (selectedEls.length === 1 && path.includes(selectedEls[0]) && !isMulti) {
      nextTarget = selectedEls[0];
      isClickingSelected = true;
    } else if (selectedParentEl && path.includes(selectedParentEl)) {
      const parentIdx = path.indexOf(selectedParentEl);
      nextTarget = parentIdx + 1 < path.length ? path[parentIdx + 1] : path[parentIdx];
    } else {
      nextTarget = path[0];
    }
  }

  if (!nextTarget) {
    clearHover();
    clearSelection();

    const frameRoot = findFrameRoot(e.target as HTMLElement);
    if (frameRoot) {
      setSelection(frameRoot, false);
      notifyInspector(frameRoot);
    } else {
      window.parent.postMessage({ type: 'PV_ELEMENT_DESELECT' }, '*');
    }
    return;
  }

  e.preventDefault();
  e.stopPropagation();

  clearHover();
  if (!isClickingSelected) {
    setSelection(nextTarget, isMulti);
    notifyInspector(nextTarget);
  }

  const targetEdge = !isMulti && nextTarget.hasAttribute('data-pv-sketchpad-el') ? getResizeEdge(nextTarget, e.clientX, e.clientY) : null;
  if (targetEdge) {
    const rect = nextTarget.getBoundingClientRect();
    const zoom = getCanvasZoom();
    const pos = getComputedPos(nextTarget);
    const frameForSnap = findFrameContainer(nextTarget);
    resizeState = {
      target: nextTarget,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origWidth: rect.width / zoom,
      origHeight: rect.height / zoom,
      origLeft: pos.left,
      origTop: pos.top,
      edge: targetEdge,
      snap: frameForSnap ? collectSnapContext(frameForSnap, [nextTarget]) : null,
    };
    setForcedCursor(RESIZE_CURSOR_MAP[targetEdge]);
    nextTarget.style.transition = 'none';
    return;
  }

  const dragTargets = selectedEls.includes(nextTarget) ? selectedEls : [nextTarget];
  const frameForDragSnap = findFrameContainer(nextTarget);
  const dragAllAbsolute = dragTargets.every(t => t.hasAttribute('data-pv-sketchpad-el'));
  dragState = {
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    moved: false,
    targets: dragTargets.map(t => {
      const pos = getComputedPos(t);
      return {
        el: t,
        origLeft: pos.left,
        origTop: pos.top,
        origOffsetLeft: t.offsetLeft,
        origOffsetTop: t.offsetTop,
        origWidth: t.offsetWidth,
        origHeight: t.offsetHeight,
        origZIndex: t.style.zIndex,
        isFlow: !t.hasAttribute('data-pv-sketchpad-el'),
        origTransform: t.style.transform
      };
    }),
    snap: frameForDragSnap && dragAllAbsolute ? collectSnapContext(frameForDragSnap, dragTargets) : null,
  };
}

function handlePointerMove(e: PointerEvent) {
  if (spaceHeld) {
    clearHover();
    clearForcedCursor();
    return;
  }

  if ((resizeState && e.pointerId === resizeState.pointerId) ||
      (dragState && e.pointerId === dragState.pointerId)) {
    e.preventDefault();
    e.stopPropagation();

    latestClientX = e.clientX;
    latestClientY = e.clientY;
    latestMetaKey = e.metaKey || e.ctrlKey;

    if (dragState) {
      updateGhost(e.altKey);
    }

    if (pointerMoveRafId === null) {
      pointerMoveRafId = requestAnimationFrame(applyPointerMoveUpdate);
    }
    return;
  }

  // Hover (only when not dragging/resizing)
  const path = getInspectablePath(e.target);
  let hoverTarget: HTMLElement | null = null;

  if (path.length > 0) {
    if (e.metaKey || e.ctrlKey) {
      hoverTarget = path[path.length - 1];
    } else if (selectedEls.length === 1 && path.includes(selectedEls[0])) {
      // Hovering inside current single selection -> single click would just keep selection
      hoverTarget = selectedEls[0];
    } else if (selectedParentEl && path.includes(selectedParentEl)) {
      // Hovering sibling
      const parentIdx = path.indexOf(selectedParentEl);
      hoverTarget = parentIdx + 1 < path.length ? path[parentIdx + 1] : path[parentIdx];
    } else {
      // Hovering new top-level
      hoverTarget = path[0];
    }
  }

  if (!hoverTarget || selectedEls.includes(hoverTarget) || hoverTarget === selectedParentEl) {
    const primarySel = selectedEls.length === 1 ? selectedEls[0] : null;
    const selHoverEdge = primarySel?.hasAttribute('data-pv-sketchpad-el') ? getResizeEdge(primarySel, e.clientX, e.clientY) : null;
    if (selHoverEdge) {
      setForcedCursor(RESIZE_CURSOR_MAP[selHoverEdge]);
    } else {
      clearForcedCursor();
    }
    clearHover();
    return;
  }

  const hoverEdge = hoverTarget.hasAttribute('data-pv-sketchpad-el') ? getResizeEdge(hoverTarget, e.clientX, e.clientY) : null;
  if (hoverEdge) {
    setForcedCursor(RESIZE_CURSOR_MAP[hoverEdge]);
  } else {
    clearForcedCursor();
  }
  
  setHover(hoverTarget);
}

function handlePointerUp(e: PointerEvent) {
  // Force final sync of coordinates if a frame is pending
  if (pointerMoveRafId !== null) {
    cancelAnimationFrame(pointerMoveRafId);
    pointerMoveRafId = null;
    latestClientX = e.clientX;
    latestClientY = e.clientY;
    applyPointerMoveUpdate();
  }

  // Handle resize end
  if (resizeState && e.pointerId === resizeState.pointerId) {
    e.preventDefault();
    e.stopPropagation();
    clearForcedCursor();
    clearGuides();
    resizeState.target.style.transition = '';

    const frame = findFrameContainer(resizeState.target);
    const frameId = frame?.getAttribute('data-sketchpad-frame');
    const blockId = resizeState.target.getAttribute('data-pv-sketchpad-el');
    const sketchpadId = getSketchpadId();

    if (sketchpadId && frameId && blockId) {
      const newWidth = parseFloat(resizeState.target.style.width) || undefined;
      const newHeight = parseFloat(resizeState.target.style.height) || undefined;
      const newLeft = parseFloat(resizeState.target.style.left);
      const newTop = parseFloat(resizeState.target.style.top);

      // Persist position if it changed (top/left edge or corner resize)
      const edge = resizeState.edge;
      if (edge.includes('w') || edge.includes('n')) {
        postApi('/__sketchpad-update-element-position', {
          sketchpadId, frameId, blockId,
          x: Math.round(newLeft), y: Math.round(newTop),
          activeSourceId: currentActiveSourceId
        });
      }

      // Persist size
      if (newWidth || newHeight) {
        postApi('/__sketchpad-update-element-size', {
          sketchpadId, frameId, blockId,
          width: newWidth ? Math.round(newWidth) : undefined,
          height: newHeight ? Math.round(newHeight) : undefined,
          activeSourceId: currentActiveSourceId
        });
      }
    }
    resizeState = null;
    syncOverlays();
    return;
  }

  if (!dragState || e.pointerId !== dragState.pointerId) return;

  e.preventDefault();
  e.stopPropagation();
  clearForcedCursor();
  clearGuides();

  // Restore transitions
  dragState.targets.forEach(t => {
    t.el.style.transition = '';
    t.el.style.zIndex = t.origZIndex;
  });

  if (!dragState.moved) {
    dragState.targets.forEach(t => t.el.style.transform = t.origTransform);
  } else if (dragState.moved) {
    const dragEls = dragState.targets.map(t => t.el);
    const dropContainer = findDropContainerAtPoint(e.clientX, e.clientY, dragEls);
    clearCurrentDropTarget();

    const sourceFrameId = findFrameContainer(dragState.targets[0].el)?.getAttribute('data-sketchpad-frame');
    const targetFrameId = findFrameContainer(dropContainer as HTMLElement)?.getAttribute('data-sketchpad-frame') ?? null;
    const draggedBlockIds = dragState.targets.map(t => t.el.getAttribute('data-pv-sketchpad-el') || t.el.getAttribute('data-pv-block')).filter(Boolean) as string[];
    const sketchpadId = getSketchpadId();

    const currentContainer = dragState.targets[0].el.parentElement?.closest('[data-pv-block], [data-sketchpad-frame]');
    const isAnyFlow = dragState.targets.some(t => t.isFlow);

    // Calculate final drop delta for same-container drops
    const zoom = getCanvasZoom();
    let dx = (e.clientX - dragState.startX) / zoom;
    let dy = (e.clientY - dragState.startY) / zoom;

    // Re-apply snap so persisted position matches what was visible during drag.
    if (dragState.snap && !(e.metaKey || e.ctrlKey) && dragState.snap.startRects.length > 0) {
      const proposed = unionSnapRect(dragState.snap.startRects.map(r =>
        makeSnapRect(r.left + dx, r.top + dy, r.right - r.left, r.bottom - r.top)
      ));
      const { adjustX, adjustY } = computeSnap(
        proposed,
        ['left', 'right', 'hcenter'],
        ['top', 'bottom', 'vcenter'],
        dragState.snap.targets,
        SNAP_THRESHOLD_SCREEN_PX / zoom,
      );
      dx += adjustX;
      dy += adjustY;
    }

    if (sketchpadId && draggedBlockIds.length > 0 && sourceFrameId && targetFrameId && dropContainer && !dragEls.includes(dropContainer as HTMLElement)) {
      const isFrameTarget = dropContainer.hasAttribute('data-sketchpad-frame');
      const layoutMode = isFrameTarget ? 'absolute' : (dropContainer.getAttribute('data-layout-mode') || 'flow');

      if (dropContainer === currentContainer && !e.altKey) {
        // Same-container drop: handle each target by its own layout type so a
        // mixed flow+absolute selection doesn't snap absolute elements back.
        dragState.targets.forEach(t => {
          t.el.style.transform = t.origTransform;
          if (t.isFlow) return;
          const newLeft = t.origLeft + dx;
          const newTop = t.origTop + dy;
          t.el.style.left = `${newLeft}px`;
          t.el.style.top = `${newTop}px`;

          const blockId = t.el.getAttribute('data-pv-sketchpad-el') || t.el.getAttribute('data-pv-block');
          if (blockId) {
            postApi('/__sketchpad-update-element-position', {
              sketchpadId, frameId: sourceFrameId, blockId, x: newLeft, y: newTop,
              activeSourceId: currentActiveSourceId
            });
          }
        });
      } else {
        // Dragged to a different container OR duplicating
        const containerRect = dropContainer.getBoundingClientRect();
        
        // Find the visual bounding box of the group relative to the new container BEFORE resetting transform
        let minNewLeft = Infinity;
        let minNewTop = Infinity;
        
        dragState.targets.forEach(t => {
          const rect = t.el.getBoundingClientRect();
          minNewLeft = Math.min(minNewLeft, layoutMode === 'absolute' ? (rect.left - containerRect.left) / zoom : 0);
          minNewTop = Math.min(minNewTop, (rect.top - containerRect.top) / zoom);
        });

        dragState.targets.forEach(t => t.el.style.transform = t.origTransform);

        const targetLocatorId = getNearestPvLocId(dropContainer as HTMLElement);
        const targetBlockId = dropContainer.getAttribute('data-pv-block');

        // Source-frame-relative positions, used by the parent shell as a
        // fallback if zone resolution fails — keeps elements in place rather
        // than snapping them back to their pre-drag origin.
        const fallbackPositions = dragState.targets
          .map(t => {
            if (t.isFlow) return null;
            const blockId = t.el.getAttribute('data-pv-sketchpad-el') || t.el.getAttribute('data-pv-block');
            if (!blockId) return null;
            return { blockId, x: t.origLeft + dx, y: t.origTop + dy };
          })
          .filter((p): p is { blockId: string; x: number; y: number } => p !== null);

        window.dispatchEvent(new CustomEvent('pv-sketchpad-drop-element', {
          detail: {
            sketchpadId,
            sourceFrameId,
            targetFrameId,
            draggedBlockId: draggedBlockIds[0],
            draggedBlockIds,
            targetLocatorId,
            targetBlockId,
            isFrameTarget,
            x: minNewLeft,
            y: minNewTop,
            targetLayoutMode: layoutMode,
            isDuplicate: e.altKey,
            activeSourceId: currentActiveSourceId,
            fallbackPositions,
          },
        }));

        clearCurrentDropTarget();
        dragState = null;
        if (ghostEls.length > 0) {
          ghostEls.forEach(g => g.remove());
          ghostEls = [];
        }
        return;
      }
    } else if (!isAnyFlow) {
      // Fallback for same-frame move on empty canvas
      if (e.altKey && sketchpadId && sourceFrameId && draggedBlockIds.length > 0) {
         // Duplicating in place: calculate bounding box relative to its original parent
         const containerRect = dragState.targets[0].el.parentElement!.getBoundingClientRect();
         let minNewLeft = Infinity;
         let minNewTop = Infinity;
         
         dragState.targets.forEach(t => {
           const rect = t.el.getBoundingClientRect();
           minNewLeft = Math.min(minNewLeft, (rect.left - containerRect.left) / zoom);
           minNewTop = Math.min(minNewTop, (rect.top - containerRect.top) / zoom);
         });

         dragState.targets.forEach(t => t.el.style.transform = t.origTransform);

         window.dispatchEvent(new CustomEvent('pv-sketchpad-drop-element', {
          detail: {
            sketchpadId,
            sourceFrameId,
            targetFrameId: sourceFrameId,
            draggedBlockId: draggedBlockIds[0],
            draggedBlockIds,
            targetLocatorId: null,
            targetBlockId: null,
            isFrameTarget: true,
            x: minNewLeft,
            y: minNewTop,
            targetLayoutMode: 'absolute',
            isDuplicate: true,
            activeSourceId: currentActiveSourceId,
          },
         }));
      } else {
        dragState.targets.forEach(t => {
          t.el.style.transform = t.origTransform;
          const newLeft = t.origLeft + dx;
          const newTop = t.origTop + dy;
          t.el.style.left = `${newLeft}px`;
          t.el.style.top = `${newTop}px`;

          const blockId = t.el.getAttribute('data-pv-sketchpad-el') || t.el.getAttribute('data-pv-block');
          if (sketchpadId && sourceFrameId && blockId) {
            postApi('/__sketchpad-update-element-position', {
              sketchpadId, frameId: sourceFrameId, blockId, x: newLeft, y: newTop,
              activeSourceId: currentActiveSourceId
            });
          }
        });
      }
    } else {
      // No valid drop target (e.g. flow element dragged outside any frame). Snap back.
      dragState.targets.forEach(t => { t.el.style.transform = t.origTransform; });
    }
  }

  clearCurrentDropTarget();
  dragState = null;
  if (ghostEls.length > 0) {
    ghostEls.forEach(g => g.remove());
    ghostEls = [];
  }
  syncOverlays();
}

function handleClick(e: MouseEvent) {
  // Prevent clicks on sketchpad elements from bubbling to React handlers
  if (getInspectablePath(e.target).length > 0) {
    e.stopPropagation();
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Alt' && dragState) {
    updateGhost(true);
  }

  // Ignore when typing in inputs (but allow shortcuts for non-text inputs like checkboxes, radios, sliders)
  if (isTypingInput(document.activeElement as HTMLElement | null)) return;

  if (e.code === 'Space') {
    spaceHeld = true;
  }

  if (e.key === 'Escape' && selectedEls.length > 0) {
    e.preventDefault();
    e.stopPropagation();
    clearSelection();
    window.parent.postMessage({ type: 'PV_ELEMENT_DESELECT' }, '*');
    return;
  }

  // Forward keyboard events to parent for arrow navigation, shortcuts, etc.
  window.parent.postMessage({
    type: 'PV_KEYDOWN',
    key: e.key,
    code: e.code,
    metaKey: e.metaKey,
    ctrlKey: e.ctrlKey,
    shiftKey: e.shiftKey,
    altKey: e.altKey,
  }, '*');

  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEls.length > 0) {
    e.preventDefault();
    e.stopPropagation();
    selectedEls.forEach(el => {
      const frame = findFrameContainer(el);
      const frameId = frame?.getAttribute('data-sketchpad-frame');
      const blockId = el.getAttribute('data-pv-sketchpad-el');
      const sketchpadId = getSketchpadId();
      if (sketchpadId && frameId && blockId) {
        postApi('/__sketchpad-delete-element', { sketchpadId, frameId, blockId });
      }
    });
    clearSelection();
  }
}

function handleKeyUp(e: KeyboardEvent) {
  if (e.code === 'Space') {
    spaceHeld = false;
  }
  if (e.key === 'Alt') {
    updateGhost(false);
  }
  window.parent.postMessage({
    type: 'PV_KEYUP',
    key: e.key,
    code: e.code,
  }, '*');
}

// ─── Messages from parent shell ───────────────────────────────────────────────

function handleParentMessage(e: MessageEvent) {
  if (!e.data || typeof e.data !== 'object') return;

  if (e.data.type === 'PV_NUDGE_KEYDOWN') {
    if (selectedEls.length === 0) return;
    const { key, shiftKey } = e.data;
    const shiftMultiplier = shiftKey ? 8 : 1;

    if (!nudgeState) {
      const targets = selectedEls.map(el => {
        const container = el.parentElement?.closest('[data-layout-mode="absolute"]');
        const isAbsolute = el.style.position === 'absolute' || el.hasAttribute('data-pv-sketchpad-el');
        if (!container || !isAbsolute) return null;

        const frame = findFrameContainer(el);
        const frameId = frame?.getAttribute('data-sketchpad-frame');
        const blockId = el.getAttribute('data-pv-sketchpad-el') || el.getAttribute('data-pv-block');
        if (!frameId || !blockId) return null;

        const pos = getComputedPos(el);
        return {
          el,
          origLeft: pos.left,
          origTop: pos.top,
          origTransform: el.style.transform || '',
          frameId,
          blockId
        };
      }).filter(Boolean) as any[];

      if (targets.length === 0) return;

      nudgeState = {
        activeKeys: new Set(),
        dx: 0,
        dy: 0,
        targets
      };
    }

    nudgeState.activeKeys.add(key);

    if (key === 'ArrowLeft') nudgeState.dx -= shiftMultiplier;
    if (key === 'ArrowRight') nudgeState.dx += shiftMultiplier;
    if (key === 'ArrowUp') nudgeState.dy -= shiftMultiplier;
    if (key === 'ArrowDown') nudgeState.dy += shiftMultiplier;

    nudgeState.targets.forEach(t => {
      const existingTransform = t.origTransform && t.origTransform !== 'none' ? t.origTransform + ' ' : '';
      t.el.style.transform = `${existingTransform}translate(${nudgeState!.dx}px, ${nudgeState!.dy}px)`;
    });
    syncOverlays();
    return;
  }

  if (e.data.type === 'PV_NUDGE_KEYUP') {
    if (!nudgeState) return;
    const { key } = e.data;
    nudgeState.activeKeys.delete(key);

    if (nudgeState.activeKeys.size === 0) {
      const sketchpadId = getSketchpadId();
      nudgeState.targets.forEach(t => {
        const newLeft = t.origLeft + nudgeState!.dx;
        const newTop = t.origTop + nudgeState!.dy;

        t.el.style.transform = t.origTransform;
        t.el.style.left = `${newLeft}px`;
        t.el.style.top = `${newTop}px`;

        if (sketchpadId) {
          postApi('/__sketchpad-update-element-position', {
            sketchpadId,
            frameId: t.frameId,
            blockId: t.blockId,
            x: newLeft,
            y: newTop,
            activeSourceId: currentActiveSourceId
          });
        }
      });
      nudgeState = null;
      syncOverlays();
    }
    return;
  }

  if (e.data.type === 'PV_CLEAR_SELECTION') {
    clearSelection();
    nudgeState = null;
  }
  if (e.data.type === 'PV_SET_SELECTION') {
    const { runtimeIds } = e.data;
    if (!runtimeIds || !Array.isArray(runtimeIds) || runtimeIds.length === 0) {
      clearSelection();
      return;
    }
    selectedEls = [];
    runtimeIds.forEach((id: string) => {
      const el = document.querySelector(`[data-pv-runtime-id="${id}"]`) as HTMLElement | null;
      if (el) selectedEls.push(el);
    });
    // Same sticky-drill rule as setSelection: keep parent across multi-select echoes from the shell.
    if (selectedEls.length === 0) {
      selectedParentEl = null;
    } else if (selectedEls.length === 1) {
      selectedParentEl = findInspectableParent(selectedEls[0]);
    }
    updateOutlines();
  }
  if (e.data.type === 'PV_SET_THEME') document.documentElement.dataset.theme = e.data.theme;
  if (e.data.type === 'PV_SET_ACTIVE_SOURCE_ID') {
    currentActiveSourceId = e.data.activeSourceId;
  }
  if (e.data.type === 'PV_SPACE_MODE') {
    spaceHeld = e.data.active;
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  if (window.parent === window) return;

  const scrollbarStyle = document.createElement('style');
  scrollbarStyle.textContent = `
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: #222222; }
    ::-webkit-scrollbar-thumb { background: #444444; border-radius: 4px; border: 2px solid #222222; }
    ::-webkit-scrollbar-thumb:hover, *:hover::-webkit-scrollbar-thumb { background: #6a6a6a; }
    ::-webkit-scrollbar-corner { background: #222222; }
  `;
  document.head.appendChild(scrollbarStyle);

  document.addEventListener('pointerdown', handlePointerDown, true);
  document.addEventListener('pointermove', handlePointerMove, true);
  document.addEventListener('pointerup', handlePointerUp, true);
  document.addEventListener('click', handleClick, true);
  window.addEventListener('keydown', handleKeyDown, true);
  window.addEventListener('keyup', handleKeyUp, true);
  window.addEventListener('message', handleParentMessage);
  // Selection overlays live in fixed-position iframe coords; reposition on any internal scroll.
  window.addEventListener('scroll', () => syncOverlays(), { capture: true, passive: true });
  // InfiniteCanvas applies zoom/pan as a CSS transform on its inner wrapper. That doesn't
  // fire scroll or ResizeObserver, so the canvas dispatches this event each frame it
  // updates the transform — keeps overlay rectangles glued to elements during zoom/pan.
  window.addEventListener('pv-canvas-transform', () => syncOverlays());

  // Allow SketchpadApp to programmatically select one or more elements by blockId(s)
  window.addEventListener('pv-select-block', ((e: CustomEvent<{ blockId?: string; blockIds?: string[] }>) => {
    const ids = e.detail.blockIds?.length ? e.detail.blockIds : (e.detail.blockId ? [e.detail.blockId] : []);
    if (ids.length === 0) {
      clearHover();
      clearSelection();
      window.parent.postMessage({ type: 'PV_ELEMENT_DESELECT' }, '*');
      return;
    }
    const els = ids
      .map(id => document.querySelector(`[data-pv-block="${id}"]`) as HTMLElement | null)
      .filter(Boolean) as HTMLElement[];
    if (els.length === 0) return;
    els.forEach((el, i) => setSelection(el, i > 0));
    notifyInspector(els[els.length - 1], true); // skipSnapshot = true
  }) as EventListener);

  // Select a frame's root content div (the wrapper that has data-pv-loc-* but no
  // data-pv-block). Used when a frame is selected via its title bar so the inspector
  // shows the root, not the first child block.
  window.addEventListener('pv-select-frame-root', ((e: CustomEvent<{ frameId?: string }>) => {
    const frameId = e.detail.frameId;
    if (!frameId) return;
    const frameEl = document.querySelector(`[data-sketchpad-frame="${frameId}"]`) as HTMLElement | null;
    if (!frameEl) return;
    const root = findFrameRoot(frameEl);
    if (!root) return;
    clearHover();
    clearSelection();
    setSelection(root, false);
    notifyInspector(root, true);
  }) as EventListener);

  // Allow SketchpadApp to programmatically clear element selection (e.g. when frames are marquee-selected)
  window.addEventListener('pv-clear-selection', () => {
    clearHover();
    clearSelection();
    window.parent.postMessage({ type: 'PV_ELEMENT_DESELECT' }, '*');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export {};