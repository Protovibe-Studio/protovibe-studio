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

const SELECTION_OUTLINE = '1.5px solid #18a0fb';
const SELECTION_OFFSET = '1px';
const PARENT_PREVIEW_OUTLINE = '1px dashed rgba(24, 160, 251, 0.7)';
const PARENT_PREVIEW_OFFSET = '2px';
const HOVER_OUTLINE = '1px solid rgba(24, 160, 251, 0.6)';
const HOVER_OFFSET = '1px';

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

// ─── Outline Manager ──────────────────────────────────────────────────────────

function updateOutlines(
  oldHover: HTMLElement | null,
  oldSels: HTMLElement[],
  oldParent: HTMLElement | null,
) {
  const elementsToUpdate = new Set(
    [oldHover, oldParent, hoveredEl, selectedParentEl, ...oldSels, ...selectedEls].filter(
      (el): el is HTMLElement => el !== null
    )
  );
  
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
  updateOutlines(oldHover, selectedEls, selectedParentEl);
}

function clearHoverOutline() {
  if (!hoveredEl) return;
  const oldHover = hoveredEl;
  hoveredEl = null;
  updateOutlines(oldHover, selectedEls, selectedParentEl);
}

function applySelectionOutline(el: HTMLElement, multi = false) {
  const oldSels = [...selectedEls];
  const oldParent = selectedParentEl;

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
  updateOutlines(hoveredEl, oldSels, oldParent);
}

function clearSelectionOutline() {
  if (selectedEls.length === 0) return;
  const oldSels = [...selectedEls];
  const oldParent = selectedParentEl;
  selectedEls = [];
  selectedParentEl = null;
  updateOutlines(hoveredEl, oldSels, oldParent);
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
      const oldSels = [...selectedEls];
      const oldParent = selectedParentEl;
      selectedEls = [];
      runtimeIds.forEach((id: string) => {
        const el = document.querySelector(`[data-pv-runtime-id="${id}"]`) as HTMLElement | null;
        if (el) selectedEls.push(el);
      });
      selectedParentEl = selectedEls.length === 1 ? findInspectableParent(selectedEls[0]) : null;
      updateOutlines(hoveredEl, oldSels, oldParent);
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
