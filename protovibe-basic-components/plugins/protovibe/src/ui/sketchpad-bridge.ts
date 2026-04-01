// plugins/protovibe/src/ui/sketchpad-bridge.ts
// Runs inside sketchpad.html (the sketchpad iframe). Targets only elements
// tagged with data-pv-sketchpad-el (absolutely-positioned sketchpad components).
// Supports selecting, dragging, and focusing them in the inspector.

import { findAllowedAncestorOrSelf } from './utils/traversal';

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
const SELECTION_OFFSET = '2px';
const HOVER_OUTLINE = '1px solid rgba(24, 160, 251, 0.6)';
const HOVER_OFFSET = '2px';
const DROP_TARGET_OUTLINE = '2px solid #1ABC9C';
const DROP_TARGET_OFFSET = '2px';
const DRAG_THRESHOLD = 3;
const RESIZE_EDGE_PX = 8;

// ─── State ────────────────────────────────────────────────────────────────────

let hoveredEl: HTMLElement | null = null;
let selectedEl: HTMLElement | null = null;

let dragState: {
  target: HTMLElement;
  pointerId: number;
  startX: number;
  startY: number;
  origLeft: number;
  origTop: number;
  origZIndex: string;
  moved: boolean;
} | null = null;

let resizeState: {
  target: HTMLElement;
  pointerId: number;
  startX: number;
  origWidth: number;
} | null = null;

let currentDropTarget: HTMLElement | null = null;

// ─── DOM helpers ──────────────────────────────────────────────────────────────

/**
 * Walk up from event target to find the nearest element with
 * `data-pv-sketchpad-el`. This is the only attribute the sketchpad bridge
 * cares about — it marks absolutely-positioned sketchpad components.
 */
function findSketchpadElement(start: EventTarget | null): HTMLElement | null {
  let t = start as HTMLElement | null;
  while (t && t !== document.documentElement) {
    if (t.hasAttribute('data-pv-sketchpad-el')) return t;
    t = t.parentElement;
  }
  return null;
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
    for (let i = 0; i < t.attributes.length; i++) {
      const a = t.attributes[i];
      if (a.name.startsWith('data-pv-loc-')) {
        const rawId = a.name.replace('data-pv-loc-', '');
        return rawId.replace(/^(app|ui)-/, '');
      }
    }
    t = t.parentElement;
  }
  return null;
}

function findDropContainerAtPoint(clientX: number, clientY: number, dragTarget: HTMLElement): HTMLElement | null {
  dragTarget.style.pointerEvents = 'none';
  const raw = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
  dragTarget.style.pointerEvents = '';
  if (!raw) return null;

  const container = raw.closest('[data-pv-block], [data-sketchpad-frame]') as HTMLElement | null;
  if (!container) return null;
  if (container === dragTarget) return null;
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

/** Check if pointer is near the right edge of an element (8px on either side). */
function isNearRightEdge(el: HTMLElement, clientX: number, clientY: number): boolean {
  const rect = el.getBoundingClientRect();
  return (
    clientX >= rect.right - RESIZE_EDGE_PX &&
    clientX <= rect.right + RESIZE_EDGE_PX &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  );
}

// ─── Outline helpers ──────────────────────────────────────────────────────────

function applyOutline(el: HTMLElement | null, style: string, offset: string) {
  if (!el) return;
  const a = el as any;
  if (a._pvOrigOutline === undefined) {
    a._pvOrigOutline = el.style.outline;
    a._pvOrigOffset = el.style.outlineOffset;
  }
  el.style.outline = style;
  el.style.outlineOffset = offset;
}

function restoreOutline(el: HTMLElement | null) {
  if (!el) return;
  const a = el as any;
  if (a._pvOrigOutline !== undefined) {
    el.style.outline = a._pvOrigOutline;
    el.style.outlineOffset = a._pvOrigOffset;
    delete a._pvOrigOutline;
    delete a._pvOrigOffset;
  }
}

function setHover(el: HTMLElement) {
  if (hoveredEl === el) return;
  if (hoveredEl && hoveredEl !== selectedEl) restoreOutline(hoveredEl);
  hoveredEl = el;
  if (el !== selectedEl) applyOutline(el, HOVER_OUTLINE, HOVER_OFFSET);
}

function clearHover() {
  if (!hoveredEl) return;
  if (hoveredEl !== selectedEl) restoreOutline(hoveredEl);
  hoveredEl = null;
}

function setSelection(el: HTMLElement) {
  if (selectedEl === el) return;
  if (selectedEl) restoreOutline(selectedEl);
  selectedEl = el;
  applyOutline(el, SELECTION_OUTLINE, SELECTION_OFFSET);
}

function clearSelection() {
  if (!selectedEl) return;
  restoreOutline(selectedEl);
  selectedEl = null;
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

function notifyInspector(el: HTMLElement) {
  const runtimeId = 'pv-' + Math.random().toString(36).substring(2);
  el.setAttribute('data-pv-runtime-id', runtimeId);

  const pvLocs = collectPvLocs(el);
  const componentId = el.getAttribute('data-pv-component-id') ?? null;

  window.parent.postMessage(
    { type: 'PV_ELEMENT_CLICK', pvLocs, componentId, runtimeId },
    '*',
  );
}

// ─── Event handlers ───────────────────────────────────────────────────────────

function handlePointerDown(e: PointerEvent) {
  if (e.button !== 0) return;

  // Drag target: always the top-level sketchpad block, so dragging a nested
  // element moves the entire block rather than orphaning it.
  const dragTarget = findSketchpadElement(e.target);

  // Inspector target: the nearest allowed element for the sketchpad environment
  // (data-pv-sketchpad-el or data-pv-component-id), found by walking up.
  const inspectorTarget = findAllowedAncestorOrSelf(e.target as HTMLElement);

  // Click on empty space — but first check if we're in the resize zone of the selected element
  if (!dragTarget) {
    // If pointer is in the right-edge resize zone of the currently selected element,
    // start a resize without changing focus
    if (selectedEl && isNearRightEdge(selectedEl, e.clientX, e.clientY)) {
      e.preventDefault();
      e.stopPropagation();
      const rect = selectedEl.getBoundingClientRect();
      const zoom = getCanvasZoom();
      resizeState = {
        target: selectedEl,
        pointerId: e.pointerId,
        startX: e.clientX,
        origWidth: rect.width / zoom,
      };
      setForcedCursor('ew-resize');
      selectedEl.style.transition = 'none';
      return;
    }

    clearHover();
    clearSelection();

    // Walk up from click target to find the frame container's content root
    // (the div with position:relative that has data-pv-loc-* attributes)
    const frameRoot = findFrameRoot(e.target as HTMLElement);
    if (frameRoot) {
      setSelection(frameRoot);
      notifyInspector(frameRoot);
    } else {
      window.parent.postMessage({ type: 'PV_ELEMENT_DESELECT' }, '*');
    }
    return;
  }

  // Stop event from reaching InfiniteCanvas (pan) and FrameContainer handlers
  e.preventDefault();
  e.stopPropagation();

  // Select visually using the drag target (top-level block outline).
  // Notify the inspector with the more specific allowed target when available,
  // so props panels for nested registered components still work.
  clearHover();
  setSelection(dragTarget);
  notifyInspector(inspectorTarget ?? dragTarget);

  // Check if pointer is near right edge → start resize instead of drag
  if (isNearRightEdge(dragTarget, e.clientX, e.clientY)) {
    const rect = dragTarget.getBoundingClientRect();
    const zoom = getCanvasZoom();
    resizeState = {
      target: dragTarget,
      pointerId: e.pointerId,
      startX: e.clientX,
      origWidth: rect.width / zoom,
    };
    setForcedCursor('ew-resize');
    dragTarget.style.transition = 'none';
    return;
  }

  // Begin drag tracking using the top-level block (actual drag starts after threshold)
  const pos = getComputedPos(dragTarget);
  dragState = {
    target: dragTarget,
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    origLeft: pos.left,
    origTop: pos.top,
    origZIndex: dragTarget.style.zIndex,
    moved: false,
  };
}

function handlePointerMove(e: PointerEvent) {
  // Handle resize
  if (resizeState && e.pointerId === resizeState.pointerId) {
    e.preventDefault();
    e.stopPropagation();
    const zoom = getCanvasZoom();
    const dx = (e.clientX - resizeState.startX) / zoom;
    const newWidth = Math.max(20, Math.round(resizeState.origWidth + dx));
    resizeState.target.style.width = `${newWidth}px`;
    return;
  }

  if (dragState && e.pointerId === dragState.pointerId) {
    e.preventDefault();
    e.stopPropagation();

    const zoom = getCanvasZoom();
    const dx = (e.clientX - dragState.startX) / zoom;
    const dy = (e.clientY - dragState.startY) / zoom;

    if (!dragState.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      dragState.moved = true;
      setForcedCursor('grabbing');
      // Disable CSS transitions during drag to prevent sluggish movement
      dragState.target.style.transition = 'none';
      // Keep dragged element above all frames while dragging
      dragState.target.style.zIndex = '2147483647';
    }

    dragState.target.style.left = `${Math.round(dragState.origLeft + dx)}px`;
    dragState.target.style.top = `${Math.round(dragState.origTop + dy)}px`;

    const dropContainer = findDropContainerAtPoint(e.clientX, e.clientY, dragState.target);
    setCurrentDropTarget(dropContainer);
    return;
  }

  // Hover (only when not dragging)
  const el = findSketchpadElement(e.target);
  if (!el || el === selectedEl) {
    // If hovering over the right edge of the selected element, show resize cursor
    if (selectedEl && isNearRightEdge(selectedEl, e.clientX, e.clientY)) {
      setForcedCursor('ew-resize');
    } else {
      clearForcedCursor();
    }
    clearHover();
    return;
  }
  // Show resize cursor when hovering right edge of any sketchpad element
  if (isNearRightEdge(el, e.clientX, e.clientY)) {
    setForcedCursor('ew-resize');
  } else {
    clearForcedCursor();
  }
  setHover(el);
}

function handlePointerUp(e: PointerEvent) {
  // Handle resize end
  if (resizeState && e.pointerId === resizeState.pointerId) {
    e.preventDefault();
    e.stopPropagation();
    clearForcedCursor();
    resizeState.target.style.transition = '';

    const newWidth = parseFloat(resizeState.target.style.width) || 0;
    if (newWidth > 0) {
      const frame = findFrameContainer(resizeState.target);
      const frameId = frame?.getAttribute('data-sketchpad-frame');
      const blockId = resizeState.target.getAttribute('data-pv-sketchpad-el');
      const sketchpadId = getSketchpadId();
      if (sketchpadId && frameId && blockId) {
        postApi('/__sketchpad-update-element-size', {
          sketchpadId, frameId, blockId, width: Math.round(newWidth),
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
  dragState.target.style.transition = '';
  dragState.target.style.zIndex = dragState.origZIndex;

  if (dragState.moved) {
    const dropContainer = findDropContainerAtPoint(e.clientX, e.clientY, dragState.target);
    clearCurrentDropTarget();

    const sourceFrameId = findFrameContainer(dragState.target)?.getAttribute('data-sketchpad-frame');
    const targetFrameId = findFrameContainer(dropContainer as HTMLElement)?.getAttribute('data-sketchpad-frame') ?? null;
    const draggedBlockId = dragState.target.getAttribute('data-pv-sketchpad-el') || dragState.target.getAttribute('data-pv-block');
    const sketchpadId = getSketchpadId();

    if (sketchpadId && draggedBlockId && sourceFrameId && targetFrameId && dropContainer && dropContainer !== dragState.target) {
      const isFrameTarget = dropContainer.hasAttribute('data-sketchpad-frame');
      const layoutMode = isFrameTarget ? 'absolute' : (dropContainer.getAttribute('data-layout-mode') || 'flow');
      const isSameFrameRoot = sourceFrameId === targetFrameId && isFrameTarget;

      if (!isSameFrameRoot) {
        const elRect = dragState.target.getBoundingClientRect();
        const containerRect = dropContainer.getBoundingClientRect();
        const zoom = getCanvasZoom();
        const newLeft = layoutMode === 'absolute' ? (elRect.left - containerRect.left) / zoom : 0;
        const newTop = layoutMode === 'absolute' ? (elRect.top - containerRect.top) / zoom : 0;

        const targetLocatorId = getNearestPvLocId(dropContainer);
        const targetBlockId = dropContainer.getAttribute('data-pv-block');

        window.dispatchEvent(new CustomEvent('pv-sketchpad-drop-element', {
          detail: {
            sketchpadId,
            sourceFrameId,
            targetFrameId,
            draggedBlockId,
            targetLocatorId,
            targetBlockId,
            isFrameTarget,
            x: newLeft,
            y: newTop,
            targetLayoutMode: layoutMode,
          },
        }));

        dragState = null;
        return;
      }
    }

    // SAME-FRAME MOVE (or drop on empty canvas — fall back to original position update)
    const newLeft = parseFloat(dragState.target.style.left) || 0;
    const newTop = parseFloat(dragState.target.style.top) || 0;

    const frame = findFrameContainer(dragState.target);
    const frameId = frame?.getAttribute('data-sketchpad-frame');

    if (sketchpadId && frameId && draggedBlockId) {
      postApi('/__sketchpad-update-element-position', {
        sketchpadId, frameId, blockId: draggedBlockId, x: newLeft, y: newTop,
      });
    }
  }

  clearCurrentDropTarget();
  dragState = null;
}

function handleClick(e: MouseEvent) {
  // Prevent clicks on sketchpad elements from bubbling to React handlers
  if (findSketchpadElement(e.target)) {
    e.stopPropagation();
  }
}

function handleKeyDown(e: KeyboardEvent) {
  // Ignore when typing in inputs
  const active = document.activeElement as HTMLElement | null;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' ||
      active.tagName === 'SELECT' || active.isContentEditable)) return;

  if (e.key === 'Escape' && selectedEl) {
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

  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEl) {
    e.preventDefault();
    const frame = findFrameContainer(selectedEl);
    const frameId = frame?.getAttribute('data-sketchpad-frame');
    const blockId = selectedEl.getAttribute('data-pv-sketchpad-el');
    const sketchpadId = getSketchpadId();
    if (sketchpadId && frameId && blockId) {
      postApi('/__sketchpad-delete-element', { sketchpadId, frameId, blockId });
    }
    clearSelection();
  }
}

// ─── Messages from parent shell ───────────────────────────────────────────────

function handleParentMessage(e: MessageEvent) {
  if (!e.data || typeof e.data !== 'object') return;
  if (e.data.type === 'PV_CLEAR_SELECTION') clearSelection();
  if (e.data.type === 'PV_SET_SELECTION') {
    const { runtimeId } = e.data;
    if (!runtimeId) {
      clearSelection();
      return;
    }
    const el = document.querySelector(`[data-pv-runtime-id="${runtimeId}"]`) as HTMLElement | null;
    if (el) setSelection(el);
  }
  if (e.data.type === 'PV_SET_THEME') document.documentElement.dataset.theme = e.data.theme;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  if (window.parent === window) return;

  document.addEventListener('pointerdown', handlePointerDown, true);
  document.addEventListener('pointermove', handlePointerMove, true);
  document.addEventListener('pointerup', handlePointerUp, true);
  document.addEventListener('click', handleClick, true);
  window.addEventListener('keydown', handleKeyDown, true);
  window.addEventListener('message', handleParentMessage);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export {};
