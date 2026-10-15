// plugins/protovibe/src/ui/utils/canvasEditGuard.ts
//
// While the Comments or Specs panel is open the canvas is for pointing at
// elements, not editing them. Those panels are text-heavy, and a Backspace or
// Cmd+X meant for an annotation could slip through to the selected canvas
// element and delete or cut it. Every canvas mutation path (keyboard shortcuts,
// the floating toolbar, sketchpad drag/resize) checks this guard first and
// shows an error toast instead of editing the app.
import { emitToast } from '../events/toast';

export const DESIGN_MODE_REQUIRED_MESSAGE = 'You need to switch to design tab to do this';

/** Parent → iframe message carrying the lock state (sketchpad bridge). */
export const PV_SET_CANVAS_EDIT_LOCKED = 'PV_SET_CANVAS_EDIT_LOCKED';
/** Iframe → parent message: the user tried an edit while locked. */
export const PV_CANVAS_EDIT_BLOCKED = 'PV_CANVAS_EDIT_BLOCKED';

// Holding Backspace auto-repeats keydown; one toast per burst is enough.
const TOAST_THROTTLE_MS = 1200;

let locked = false;
let lastToastAt = 0;

export function setCanvasEditingLocked(next: boolean) {
  locked = next;
}

export function isCanvasEditingLocked(): boolean {
  return locked;
}

export function notifyCanvasEditBlocked() {
  const now = Date.now();
  if (now - lastToastAt < TOAST_THROTTLE_MS) return;
  lastToastAt = now;
  emitToast({ message: DESIGN_MODE_REQUIRED_MESSAGE, variant: 'error' });
}

/**
 * Returns true — and shows the "switch to design tab" toast — when canvas
 * edits are currently blocked. Call at the top of any canvas mutation.
 */
export function blockCanvasEditIfLocked(): boolean {
  if (!locked) return false;
  notifyCanvasEditBlocked();
  return true;
}

/**
 * Keyboard shortcuts that change the app's source: delete, cut/copy/paste,
 * duplicate, wrap/unwrap, reorder and add element. Arrow-key nudging is
 * checked where it applies (absolute elements only). Traversal, Escape and
 * undo/redo stay available in every mode.
 */
export function isCanvasMutationShortcut(e: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>): boolean {
  const mod = e.metaKey || e.ctrlKey;
  const key = e.key.toLowerCase();
  if (e.key === 'Backspace' || e.key === 'Delete') return true;
  if (mod && ['c', 'x', 'v', 'd', 'e'].includes(key)) return true;
  if (!mod && !e.altKey && (e.key === '[' || e.key === ']')) return true;
  if (!mod && e.shiftKey && (e.key === 'A' || e.key === 'G')) return true;
  return false;
}
