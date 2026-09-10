// plugins/protovibe/src/sketchpads/local-view-state.ts
// Where the camera was left: the last-active sketchpad and each sketchpad's
// pan/zoom.
//
// This is per-user, per-machine state — it says nothing about the design and
// everything about who was looking at it. It used to live in
// `src/sketchpads/_registry.json`, which is committed, so every pan and zoom
// dirtied a tracked file and two collaborators conflicted on it just by opening
// a sketchpad. It lives in localStorage instead: never committed, nothing for
// Git to merge, and no backend round-trip.
//
// localStorage is keyed by origin and each project runs on its own dev-server
// port, so this is naturally scoped per project. A recycled port can hand a new
// project a stale camera, which is why entries are keyed by sketchpad id and
// why callers still run the restored transform through `ensureFramesVisible`.
//
// Every read is defensive: absent, unparsable, or malformed state is treated as
// "no saved state" and the caller falls back to auto-centering on the frames.

import type { CanvasTransform } from './types';

const STORAGE_KEY = 'pv-sketchpad-view-state';

interface LocalViewState {
  lastActiveSketchpadId?: string;
  viewStates: Record<string, CanvasTransform>;
}

const EMPTY: LocalViewState = { viewStates: {} };

function isTransform(value: unknown): value is CanvasTransform {
  const t = value as CanvasTransform | undefined;
  return (
    !!t &&
    typeof t === 'object' &&
    typeof t.zoom === 'number' && isFinite(t.zoom) && t.zoom > 0 &&
    typeof t.panX === 'number' && isFinite(t.panX) &&
    typeof t.panY === 'number' && isFinite(t.panY)
  );
}

function read(): LocalViewState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return EMPTY;

    const viewStates: Record<string, CanvasTransform> = {};
    for (const [id, transform] of Object.entries(parsed.viewStates ?? {})) {
      if (isTransform(transform)) viewStates[id] = transform;
    }
    const lastActiveSketchpadId =
      typeof parsed.lastActiveSketchpadId === 'string' ? parsed.lastActiveSketchpadId : undefined;

    return { lastActiveSketchpadId, viewStates };
  } catch {
    return EMPTY;
  }
}

function write(state: LocalViewState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* storage unavailable or full — persistence is best-effort */ }
}

/** The sketchpad open when the user last left, or undefined on a fresh browser. */
export function getLastActiveSketchpadId(): string | undefined {
  return read().lastActiveSketchpadId;
}

export function setLastActiveSketchpadId(sketchpadId: string): void {
  const state = read();
  if (state.lastActiveSketchpadId === sketchpadId) return;
  write({ ...state, lastActiveSketchpadId: sketchpadId });
}

/** Saved pan/zoom for one sketchpad, or undefined when there is none to restore. */
export function getViewState(sketchpadId: string): CanvasTransform | undefined {
  return read().viewStates[sketchpadId];
}

export function saveViewState(sketchpadId: string, transform: CanvasTransform): void {
  if (!sketchpadId || !isTransform(transform)) return;
  const state = read();
  write({ ...state, viewStates: { ...state.viewStates, [sketchpadId]: transform } });
}

/** Drop a deleted sketchpad's camera so a recycled id can't inherit it. */
export function forgetSketchpad(sketchpadId: string): void {
  const state = read();
  const hasViewState = sketchpadId in state.viewStates;
  const wasActive = state.lastActiveSketchpadId === sketchpadId;
  if (!hasViewState && !wasActive) return;

  const viewStates = { ...state.viewStates };
  delete viewStates[sketchpadId];
  write({
    lastActiveSketchpadId: wasActive ? undefined : state.lastActiveSketchpadId,
    viewStates,
  });
}
