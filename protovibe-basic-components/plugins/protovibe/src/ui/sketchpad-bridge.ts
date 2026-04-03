// plugins/protovibe/src/ui/sketchpad-bridge.ts
// Runs inside sketchpad.html (the sketchpad iframe). Targets only elements
// tagged with data-pv-sketchpad-el (absolutely-positioned sketchpad components).
// Supports selecting, dragging, and focusing them in the inspector.

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
const PARENT_PREVIEW_OUTLINE = '1px dashed rgba(24, 160, 251, 0.7)';
const PARENT_PREVIEW_OFFSET = '2px';
const HOVER_OUTLINE = '1px solid rgba(24, 160, 251, 0.6)';
const HOVER_OFFSET = '2px';
const DROP_TARGET_OUTLINE = '2px solid #1ABC9C';
const DROP_TARGET_OFFSET = '2px';
const DRAG_THRESHOLD = 3;
const RESIZE_EDGE_PX = 8;

// ─── State ────────────────────────────────────────────────────────────────────

let hoveredEl: HTMLElement | null = null;
let selectedEl: HTMLElement | null = null;
let selectedParentEl: HTMLElement | null = null;

let dragState: {
  target: HTMLElement;
  pointerId: number;
  startX: number;
  startY: number;
  origLeft: number;
  origTop: number;
  origZIndex: string;
  moved: boolean;
  isFlow: boolean;
  origTransform: string;
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
    if (current.hasAttribute('data-pv-sketchpad-el') || current.hasAttribute('data-pv-component-id')) {
      return current;
    }
    current = current.parentElement;
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

function updateOutlines(
  oldHover: HTMLElement | null,
  oldSelection: HTMLElement | null,
  oldParent: HTMLElement | null,
) {
  const elementsToUpdate = new Set(
    [oldHover, oldSelection, oldParent, hoveredEl, selectedEl, selectedParentEl].filter(
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

    if (el === selectedEl) {
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
  updateOutlines(oldHover, selectedEl, selectedParentEl);
}

function clearHover() {
  if (!hoveredEl) return;
  const oldHover = hoveredEl;
  hoveredEl = null;
  updateOutlines(oldHover, selectedEl, selectedParentEl);
}

function setSelectedParent(el: HTMLElement | null) {
  if (selectedParentEl === el) return;
  const oldParent = selectedParentEl;
  selectedParentEl = el;
  updateOutlines(hoveredEl, selectedEl, oldParent);
}

function setSelection(el: HTMLElement) {
  if (selectedEl === el) return;
  const oldSelection = selectedEl;
  const oldParent = selectedParentEl;
  selectedEl = el;
  selectedParentEl = findInspectableParent(el);
  updateOutlines(hoveredEl, oldSelection, oldParent);
}

function clearSelection() {
  if (!selectedEl) return;
  const oldSelection = selectedEl;
  const oldParent = selectedParentEl;
  selectedEl = null;
  selectedParentEl = null;
  updateOutlines(hoveredEl, oldSelection, oldParent);
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

  // Build a top-down path of all inspectable elements (frame -> wrapper -> component -> ...)
  const path: HTMLElement[] = [];
  let t = e.target as HTMLElement | null;
  while (t && t !== document.documentElement) {
    if (t.hasAttribute('data-pv-sketchpad-el') || t.hasAttribute('data-pv-component-id')) {
      path.unshift(t);
    }
    t = t.parentElement;
  }

  // Single click logic: select top-level, or maintain current selection if clicking inside it
  let nextTarget: HTMLElement | null = path.length > 0 ? path[0] : null;
  if (selectedEl && path.includes(selectedEl)) {
    nextTarget = selectedEl; // Keep current selection on single click
  }

  if (!nextTarget) {
    // If pointer is in the right-edge resize zone of the currently selected element
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

    // Fall back to frame root selection
    const frameRoot = findFrameRoot(e.target as HTMLElement);
    if (frameRoot) {
      setSelection(frameRoot);
      notifyInspector(frameRoot);
    } else {
      window.parent.postMessage({ type: 'PV_ELEMENT_DESELECT' }, '*');
    }
    return;
  }

  e.preventDefault();
  e.stopPropagation();

  clearHover();
  setSelection(nextTarget);
  notifyInspector(nextTarget);

  if (isNearRightEdge(nextTarget, e.clientX, e.clientY)) {
    const rect = nextTarget.getBoundingClientRect();
    const zoom = getCanvasZoom();
    resizeState = {
      target: nextTarget,
      pointerId: e.pointerId,
      startX: e.clientX,
      origWidth: rect.width / zoom,
    };
    setForcedCursor('ew-resize');
    nextTarget.style.transition = 'none';
    return;
  }

  const pos = getComputedPos(nextTarget);
  dragState = {
    target: nextTarget,
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    origLeft: pos.left,
    origTop: pos.top,
    origZIndex: nextTarget.style.zIndex,
    moved: false,
    isFlow: !nextTarget.hasAttribute('data-pv-sketchpad-el'),
    origTransform: nextTarget.style.transform
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
      dragState.target.style.transition = 'none';
      dragState.target.style.zIndex = '2147483647';
    }

    if (dragState.isFlow) {
      // Visually translate flow elements on the canvas
      dragState.target.style.transform = `translate(${dx}px, ${dy}px)`;
    } else {
      // Standard position updates for absolute elements
      dragState.target.style.left = `${Math.round(dragState.origLeft + dx)}px`;
      dragState.target.style.top = `${Math.round(dragState.origTop + dy)}px`;
    }

    const dropContainer = findDropContainerAtPoint(e.clientX, e.clientY, dragState.target);
    setCurrentDropTarget(dropContainer);
    return;
  }

  // Hover (only when not dragging)
  const el = findSketchpadElement(e.target);
  if (!el || el === selectedEl || el === selectedParentEl) {
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
  
  // Capture the bounding rect BEFORE resetting the transform so we know where it was dropped
  const draggedRect = dragState.target.getBoundingClientRect();

  if (dragState.isFlow) {
    dragState.target.style.transform = dragState.origTransform; // Remove visual translate
  }

  if (dragState.moved) {
    const dropContainer = findDropContainerAtPoint(e.clientX, e.clientY, dragState.target);
    clearCurrentDropTarget();

    const sourceFrameId = findFrameContainer(dragState.target)?.getAttribute('data-sketchpad-frame');
    const targetFrameId = findFrameContainer(dropContainer as HTMLElement)?.getAttribute('data-sketchpad-frame') ?? null;
    const draggedBlockId = dragState.target.getAttribute('data-pv-sketchpad-el') || dragState.target.getAttribute('data-pv-block');
    const sketchpadId = getSketchpadId();

    const currentContainer = dragState.target.parentElement?.closest('[data-pv-block], [data-sketchpad-frame]');

    if (sketchpadId && draggedBlockId && sourceFrameId && targetFrameId && dropContainer && dropContainer !== dragState.target) {
      const isFrameTarget = dropContainer.hasAttribute('data-sketchpad-frame');
      const layoutMode = isFrameTarget ? 'absolute' : (dropContainer.getAttribute('data-layout-mode') || 'flow');
      
      if (dragState.isFlow && dropContainer === currentContainer) {
        // Dropped inside its own flow container -> transform revert handles this cleanly.
      } else if (!dragState.isFlow && sourceFrameId === targetFrameId && isFrameTarget) {
        // Same-frame absolute move
        const newLeft = parseFloat(dragState.target.style.left) || 0;
        const newTop = parseFloat(dragState.target.style.top) || 0;
        postApi('/__sketchpad-update-element-position', {
          sketchpadId, frameId: sourceFrameId, blockId: draggedBlockId, x: newLeft, y: newTop,
        });
      } else {
        // Dragged to a different container, OR a flow element being moved somewhere else
        const containerRect = dropContainer.getBoundingClientRect();
        const zoom = getCanvasZoom();
        const newLeft = layoutMode === 'absolute' ? (draggedRect.left - containerRect.left) / zoom : 0;
        const newTop = layoutMode === 'absolute' ? (draggedRect.top - containerRect.top) / zoom : 0;

        const targetLocatorId = getNearestPvLocId(dropContainer as HTMLElement);
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
    } else if (!dragState.isFlow) {
      // Fallback for same-frame move on empty canvas
      const newLeft = parseFloat(dragState.target.style.left) || 0;
      const newTop = parseFloat(dragState.target.style.top) || 0;

      if (sketchpadId && sourceFrameId && draggedBlockId) {
        postApi('/__sketchpad-update-element-position', {
          sketchpadId, frameId: sourceFrameId, blockId: draggedBlockId, x: newLeft, y: newTop,
        });
      }
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

function handleDoubleClick(e: MouseEvent) {
  if (e.button !== 0) return;

  const path: HTMLElement[] = [];
  let t = e.target as HTMLElement | null;
  while (t && t !== document.documentElement) {
    if (t.hasAttribute('data-pv-sketchpad-el') || t.hasAttribute('data-pv-component-id')) {
      path.unshift(t);
    }
    t = t.parentElement;
  }

  // Drill-down into the next child on double click
  if (selectedEl && path.includes(selectedEl)) {
    const idx = path.indexOf(selectedEl);
    if (idx >= 0 && idx < path.length - 1) {
      e.preventDefault();
      e.stopPropagation();
      const nextTarget = path[idx + 1];
      clearHover();
      setSelection(nextTarget);
      notifyInspector(nextTarget);
    }
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
  document.addEventListener('dblclick', handleDoubleClick, true);
  window.addEventListener('keydown', handleKeyDown, true);
  window.addEventListener('message', handleParentMessage);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export {};
