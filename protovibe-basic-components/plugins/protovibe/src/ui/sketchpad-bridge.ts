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
const HOVER_OUTLINE = '1px solid rgba(24, 160, 251, 0.6)';
const HOVER_OFFSET = '2px';
const DRAG_THRESHOLD = 3;

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
  moved: boolean;
} | null = null;

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

// ─── API ──────────────────────────────────────────────────────────────────────

function postApi(url: string, body: Record<string, unknown>) {
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch((e) => console.warn('[Sketchpad Bridge]', e));
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

  const el = findSketchpadElement(e.target);

  // Click on empty space → deselect + tell inspector
  if (!el) {
    clearHover();
    clearSelection();
    window.parent.postMessage({ type: 'PV_ELEMENT_DESELECT' }, '*');
    return;
  }

  // Stop event from reaching InfiniteCanvas (pan) and FrameContainer handlers
  e.preventDefault();
  e.stopPropagation();

  // Select + notify inspector
  clearHover();
  setSelection(el);
  notifyInspector(el);

  // Begin drag tracking (actual drag starts after threshold)
  const pos = getComputedPos(el);
  dragState = {
    target: el,
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    origLeft: pos.left,
    origTop: pos.top,
    moved: false,
  };
}

function handlePointerMove(e: PointerEvent) {
  if (dragState && e.pointerId === dragState.pointerId) {
    e.preventDefault();
    e.stopPropagation();

    const zoom = getCanvasZoom();
    const dx = (e.clientX - dragState.startX) / zoom;
    const dy = (e.clientY - dragState.startY) / zoom;

    if (!dragState.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      dragState.moved = true;
      document.body.style.cursor = 'grabbing';
    }

    dragState.target.style.left = `${Math.round(dragState.origLeft + dx)}px`;
    dragState.target.style.top = `${Math.round(dragState.origTop + dy)}px`;
    return;
  }

  // Hover (only when not dragging)
  const el = findSketchpadElement(e.target);
  if (!el || el === selectedEl) {
    clearHover();
    return;
  }
  setHover(el);
}

function handlePointerUp(e: PointerEvent) {
  if (!dragState || e.pointerId !== dragState.pointerId) return;

  e.preventDefault();
  e.stopPropagation();
  document.body.style.cursor = '';

  if (dragState.moved) {
    const newLeft = parseFloat(dragState.target.style.left) || 0;
    const newTop = parseFloat(dragState.target.style.top) || 0;

    const frame = findFrameContainer(dragState.target);
    const frameId = frame?.getAttribute('data-sketchpad-frame');
    const blockId = dragState.target.getAttribute('data-pv-sketchpad-el');
    const sketchpadId = getSketchpadId();

    if (sketchpadId && frameId && blockId) {
      postApi('/__sketchpad-update-element-position', {
        sketchpadId, frameId, blockId, x: newLeft, y: newTop,
      });
    }
  }

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
