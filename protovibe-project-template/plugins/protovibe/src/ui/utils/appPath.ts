import { isSafeAppPath, isSavedAppPath, isValidAppPath, type SavedAppPath } from '../../shared/app-path';

// The project-local file survives browser/port changes. A project-scoped browser
// cache also survives an immediate reload while its keepalive write is pending.
const element = document.getElementById('pv-app-path-state');
let bootstrap: { projectKey?: string } & Partial<SavedAppPath> = {};
try { bootstrap = JSON.parse(element?.textContent || '{}'); } catch { /* No saved state. */ }
const storageKey = typeof bootstrap.projectKey === 'string'
  ? `pv-app-iframe-path:${bootstrap.projectKey}` : null;
let saved: SavedAppPath = isSavedAppPath(bootstrap) ? bootstrap : { path: '/', updatedAt: 0 };
try {
  const cached = JSON.parse(storageKey ? localStorage.getItem(storageKey) || 'null' : 'null');
  if (isSavedAppPath(cached) && cached.updatedAt > saved.updatedAt) saved = cached;
} catch { /* Storage may be disabled; the project-local file still works. */ }

// Specs, published links, and recovery need the live URL even when it is too
// long to persist. Initialize it from the reconciled restoration state.
let currentPath = saved.path;

function saveToProject(state: SavedAppPath) {
  if (!storageKey) return;
  void fetch('/__app-path', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...state, projectKey: bootstrap.projectKey }), keepalive: true,
  }).catch(() => { /* The browser cache retains this URL until the server returns. */ });
}

// Retry a write interrupted by a server restart. Never import the old unscoped
// localStorage key: it may belong to a different project that used this port.
if (saved.updatedAt > (bootstrap.updatedAt || 0)) saveToProject(saved);

export function getCurrentAppPath(): string {
  return currentPath;
}

export function persistAppPath(path: string) {
  if (!isValidAppPath(path) || path === saved.path) return;
  saved = { path, updatedAt: Math.max(Date.now(), saved.updatedAt + 1) };
  // This snapshot also survives HMR of this utility when localStorage is blocked.
  if (element) element.textContent = JSON.stringify({ projectKey: bootstrap.projectKey, ...saved });
  try { if (storageKey) localStorage.setItem(storageKey, JSON.stringify(saved)); } catch { /* Best effort. */ }
  saveToProject(saved);
}

export function setCurrentAppPath(path: string) {
  if (!isSafeAppPath(path)) return;
  currentPath = path;
  persistAppPath(path);
}

// Reading is deliberately repeatable: React remounts and automatic shell
// reloads must never consume the URL or silently send the user home.
export function readPersistedAppPath(): string {
  return saved.path;
}
