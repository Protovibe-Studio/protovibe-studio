// plugins/protovibe/src/ui/bridge.ts
// Runs inside app.html (the iframe). Intercepts canvas interactions and
// communicates them to the parent Protovibe shell via postMessage.

import { isElementAllowed } from './utils/traversal';

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

const SELECTION_OUTLINE = '1.5px solid #18a0fb';
const SELECTION_OFFSET = '2px';
const HOVER_OUTLINE = '1px solid rgba(24, 160, 251, 0.6)';
const HOVER_OFFSET = '2px';

let isLocked = false;
let isPreviewModeActive = false;
let hoveredEl: HTMLElement | null = null;
let selectedEl: HTMLElement | null = null;
let suppressNextClickTarget: HTMLElement | null = null;

// ─── DOM helpers ──────────────────────────────────────────────────────────────

function findInspectableTarget(start: EventTarget | null): HTMLElement | null {
  let t = start as HTMLElement | null;
  while (t && t !== document.documentElement) {
    // Skip Protovibe UI chrome — not inspectable
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

// ─── Outline Manager ──────────────────────────────────────────────────────────

function updateOutlines(oldHover: HTMLElement | null, oldSel: HTMLElement | null) {
  const elementsToUpdate = new Set([oldHover, oldSel, hoveredEl, selectedEl].filter(Boolean));
  
  elementsToUpdate.forEach(el => {
    const elAny = el as any;
    
    // 1. Restore the true original state first before recalculating
    if (elAny._pv_orig_outline !== undefined) {
      el.style.outline = elAny._pv_orig_outline;
      el.style.outlineOffset = elAny._pv_orig_offset;
    } else {
      // First time tracking this element, save its true original state
      elAny._pv_orig_outline = el.style.outline;
      elAny._pv_orig_offset = el.style.outlineOffset;
    }

    // 2. Apply new outlines (Selection wins over Hover)
    if (el === selectedEl) {
      el.style.outline = SELECTION_OUTLINE;
      el.style.outlineOffset = SELECTION_OFFSET;
    } else if (el === hoveredEl) {
      el.style.outline = HOVER_OUTLINE;
      el.style.outlineOffset = HOVER_OFFSET;
    } else {
      // Element is neither hovered nor selected anymore. Clean up.
      delete elAny._pv_orig_outline;
      delete elAny._pv_orig_offset;
    }
  });
}

function setHoverOutline(el: HTMLElement) {
  if (hoveredEl === el) return;
  const oldHover = hoveredEl;
  hoveredEl = el;
  updateOutlines(oldHover, selectedEl);
}

function clearHoverOutline() {
  if (!hoveredEl) return;
  const oldHover = hoveredEl;
  hoveredEl = null;
  updateOutlines(oldHover, selectedEl);
}

function applySelectionOutline(el: HTMLElement) {
  if (selectedEl === el) return;
  const oldSel = selectedEl;
  selectedEl = el;
  updateOutlines(hoveredEl, oldSel);
}

function clearSelectionOutline() {
  if (!selectedEl) return;
  const oldSel = selectedEl;
  selectedEl = null;
  updateOutlines(hoveredEl, oldSel);
}

// ─── Event handlers ───────────────────────────────────────────────────────────

function handlePointerDown(e: PointerEvent) {
  if (!isPreviewModeActive) return;
  if (isLocked) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  const target = findInspectableTarget(e.target);
  if (!target) return;

  if (target === selectedEl) {
    suppressNextClickTarget = null;
    clearHoverOutline();
    return;
  }

  e.preventDefault();
  e.stopPropagation();
  suppressNextClickTarget = target;
  clearHoverOutline();

  // Instantly apply outline inside the iframe for snappier feedback
  applySelectionOutline(target);

  // Assign a unique runtime ID to prevent the parent from querying the wrong instance
  const runtimeId = 'pv-' + Math.random().toString(36).substring(2);
  target.setAttribute('data-pv-runtime-id', runtimeId);

  const pvLocs = collectPvLocs(target);
  const componentId = target.getAttribute('data-pv-component-id') ?? null;

  console.log('[Protovibe Bridge] Clicked Element:', target.tagName, pvLocs);

  window.parent.postMessage(
    { type: 'PV_ELEMENT_CLICK', pvLocs, componentId, runtimeId },
    '*'
  );
}

function handleClick(e: MouseEvent) {
  if (!isPreviewModeActive) return;
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

  if (target === selectedEl) {
    clearHoverOutline();
    return;
  }

  e.preventDefault();
  e.stopPropagation();
}

function handleMouseMove(e: MouseEvent) {
  if (!isPreviewModeActive) return;
  if (isLocked) {
    clearHoverOutline();
    return;
  }

  const target = findInspectableTarget(e.target);
  if (!target || target === selectedEl) {
    clearHoverOutline();
    return;
  }

  setHoverOutline(target);
}

function handleMouseLeave() {
  if (!isPreviewModeActive) return;
  clearHoverOutline();
}

function handleKeyDown(e: KeyboardEvent) {
  if (!isPreviewModeActive) return;
  // Let the iframe handle key events that target real text-entry elements.
  const active = document.activeElement as HTMLElement | null;
  if (
    active &&
    (active.tagName === 'INPUT' ||
      active.tagName === 'TEXTAREA' ||
      active.tagName === 'SELECT' ||
      active.isContentEditable)
  ) {
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
  if (!isPreviewModeActive) return;
  if (isLocked) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  const target = findInspectableTarget(e.target);
  if (!target || !selectedEl) return;
  if (target !== selectedEl) return;

  e.preventDefault();
  e.stopPropagation();
  window.parent.postMessage({ type: 'PV_DOUBLE_CLICK' }, '*');
}

// ─── Messages from parent ─────────────────────────────────────────────────────

function handleParentMessage(e: MessageEvent) {
  if (!e.data || typeof e.data !== 'object') return;

  switch (e.data.type) {
    case 'PV_SET_SELECTION': {
      // Called by parent during Keyboard Navigation traversal
      const { runtimeId } = e.data;
      if (!runtimeId) {
        clearSelectionOutline();
        break;
      }
      const el = document.querySelector(`[data-pv-runtime-id="${runtimeId}"]`) as HTMLElement | null;
      if (el) applySelectionOutline(el);
      break;
    }
    case 'PV_CLEAR_SELECTION':
      clearSelectionOutline();
      break;
    case 'PV_SET_PREVIEW_MODE': {
      const active = !!e.data.active;
      isPreviewModeActive = active;
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

  document.addEventListener('pointerdown', handlePointerDown, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('mouseleave', handleMouseLeave, true);
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
