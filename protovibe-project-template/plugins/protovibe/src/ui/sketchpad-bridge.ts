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
const SELECTION_OFFSET = '-1px';
const PARENT_PREVIEW_OUTLINE = '1px dashed rgba(24, 160, 251, 0.7)';
const PARENT_PREVIEW_OFFSET = '1px';
const HOVER_OUTLINE = '1px solid rgba(24, 160, 251, 0.6)';
const HOVER_OFFSET = '-1px';
const DROP_TARGET_OUTLINE = '2px solid #1ABC9C';
const DROP_TARGET_OFFSET = '-1px';
const DRAG_THRESHOLD = 3;
const RESIZE_EDGE_PX = 8;

// ─── State ────────────────────────────────────────────────────────────────────

let hoveredEl: HTMLElement | null = null;
let selectedEls: HTMLElement[] = [];
let selectedParentEl: HTMLElement | null = null;

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
  const resizeBoth = el.getAttribute('data-pv-resizable') === 'both';

  const nearRight = clientX >= rect.right - RESIZE_EDGE_PX && clientX <= rect.right + RESIZE_EDGE_PX;
  const nearLeft = resizeBoth && clientX >= rect.left - RESIZE_EDGE_PX && clientX <= rect.left + RESIZE_EDGE_PX;
  const nearTop = resizeBoth && clientY >= rect.top - RESIZE_EDGE_PX && clientY <= rect.top + RESIZE_EDGE_PX;
  const nearBottom = resizeBoth && clientY >= rect.bottom - RESIZE_EDGE_PX && clientY <= rect.bottom + RESIZE_EDGE_PX;

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

const RESIZE_CURSOR_MAP: Record<ResizeEdge, string> = {
  e: 'ew-resize', w: 'ew-resize',
  n: 'ns-resize', s: 'ns-resize',
  ne: 'nesw-resize', sw: 'nesw-resize',
  nw: 'nwse-resize', se: 'nwse-resize',
};

// ─── Outline helpers ──────────────────────────────────────────────────────────

function updateOutlines(
  oldHover: HTMLElement | null,
  oldSelections: HTMLElement[],
  oldParent: HTMLElement | null,
) {
  const elementsToUpdate = new Set(
    [oldHover, oldParent, hoveredEl, selectedParentEl, ...oldSelections, ...selectedEls].filter(
      (el): el is HTMLElement => el !== null
    )
  );

  elementsToUpdate.forEach((el) => {
    const elAny = el as any;

    if (elAny._pvOrigOutline === undefined) {
      elAny._pvOrigOutline = el.style.outline;
      elAny._pvOrigOffset = el.style.outlineOffset;
    } else {
      el.style.outline = elAny._pvOrigOutline;
      el.style.outlineOffset = elAny._pvOrigOffset;
    }

    if (selectedEls.includes(el)) {
      el.style.outline = SELECTION_OUTLINE;
      el.style.outlineOffset = SELECTION_OFFSET;
    } else if (el === selectedParentEl) {
      el.style.outline = PARENT_PREVIEW_OUTLINE;
      el.style.outlineOffset = PARENT_PREVIEW_OFFSET;
    } else if (el === hoveredEl) {
      el.style.outline = HOVER_OUTLINE;
      el.style.outlineOffset = HOVER_OFFSET;
    } else {
      delete elAny._pvOrigOutline;
      delete elAny._pvOrigOffset;
    }
  });
}

function setHover(el: HTMLElement) {
  if (hoveredEl === el) return;
  const oldHover = hoveredEl;
  hoveredEl = el;
  updateOutlines(oldHover, selectedEls, selectedParentEl);
}

function clearHover() {
  if (!hoveredEl) return;
  const oldHover = hoveredEl;
  hoveredEl = null;
  updateOutlines(oldHover, selectedEls, selectedParentEl);
}

function setSelectedParent(el: HTMLElement | null) {
  if (selectedParentEl === el) return;
  const oldParent = selectedParentEl;
  selectedParentEl = el;
  updateOutlines(hoveredEl, selectedEls, oldParent);
}

function setSelection(el: HTMLElement, isMulti = false) {
  const oldSelections = [...selectedEls];
  const oldParent = selectedParentEl;

  if (isMulti) {
    if (selectedEls.includes(el)) {
      selectedEls = selectedEls.filter(e => e !== el);
    } else {
      selectedEls.push(el);
    }
  } else {
    selectedEls = [el];
  }

  selectedParentEl = selectedEls.length === 1 ? findInspectableParent(selectedEls[0]) : null;
  updateOutlines(hoveredEl, oldSelections, oldParent);
}

function clearSelection() {
  if (selectedEls.length === 0) return;
  const oldSelections = [...selectedEls];
  const oldParent = selectedParentEl;
  selectedEls = [];
  selectedParentEl = null;
  updateOutlines(hoveredEl, oldSelections, oldParent);
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

function applyPointerMoveUpdate() {
  pointerMoveRafId = null;

  // Handle resize
  if (resizeState) {
    const zoom = getCanvasZoom();
    const dx = (latestClientX - resizeState.startX) / zoom;
    const dy = (latestClientY - resizeState.startY) / zoom;
    const edge = resizeState.edge;

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
    return;
  }

  // Handle drag
  if (dragState) {
    const zoom = getCanvasZoom();
    const dx = (latestClientX - dragState.startX) / zoom;
    const dy = (latestClientY - dragState.startY) / zoom;

    if (!dragState.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      dragState.moved = true;
      setForcedCursor('grabbing');
      dragState.targets.forEach(t => {
        t.el.style.transition = 'none';
        t.el.style.zIndex = '2147483647';
      });
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
  }
}

function handlePointerDown(e: PointerEvent) {
  window.parent.postMessage({ type: 'PV_IFRAME_POINTER_DOWN' }, '*');

  if (e.button !== 0) return;

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
    };
    setForcedCursor(RESIZE_CURSOR_MAP[targetEdge]);
    nextTarget.style.transition = 'none';
    return;
  }

  const dragTargets = selectedEls.includes(nextTarget) ? selectedEls : [nextTarget];
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
    })
  };
}

function handlePointerMove(e: PointerEvent) {
  if ((resizeState && e.pointerId === resizeState.pointerId) ||
      (dragState && e.pointerId === dragState.pointerId)) {
    e.preventDefault();
    e.stopPropagation();

    latestClientX = e.clientX;
    latestClientY = e.clientY;

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
    return;
  }

  if (!dragState || e.pointerId !== dragState.pointerId) return;

  e.preventDefault();
  e.stopPropagation();
  clearForcedCursor();

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
    const dx = (e.clientX - dragState.startX) / zoom;
    const dy = (e.clientY - dragState.startY) / zoom;

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
    }
  }

  clearCurrentDropTarget();
  dragState = null;
  if (ghostEls.length > 0) {
    ghostEls.forEach(g => g.remove());
    ghostEls = [];
  }
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
    const oldSelections = [...selectedEls];
    const oldParent = selectedParentEl;
    selectedEls = [];
    runtimeIds.forEach((id: string) => {
      const el = document.querySelector(`[data-pv-runtime-id="${id}"]`) as HTMLElement | null;
      if (el) selectedEls.push(el);
    });
    selectedParentEl = selectedEls.length === 1 ? findInspectableParent(selectedEls[0]) : null;
    updateOutlines(hoveredEl, oldSelections, oldParent);
  }
  if (e.data.type === 'PV_SET_THEME') document.documentElement.dataset.theme = e.data.theme;
  if (e.data.type === 'PV_SET_ACTIVE_SOURCE_ID') {
    currentActiveSourceId = e.data.activeSourceId;
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