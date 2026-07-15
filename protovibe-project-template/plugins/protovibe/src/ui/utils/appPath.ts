// plugins/protovibe/src/ui/utils/appPath.ts
// Tracks the app iframe's current path (pathname + search + hash) so other
// shell components (e.g. the publish popover) can read it, and persists it
// across a single shell refresh.
//
// Persistence is deliberately one-shot: the stored path is consumed on read.
// User interactions (client-side navigation, element selection on the canvas)
// re-arm it, so refreshing twice in a row with no interaction in between —
// e.g. because the restored page is broken — falls back to home.

const STORAGE_KEY = 'pv-app-iframe-path';

let currentPath = '/';

export function getCurrentAppPath(): string {
  return currentPath;
}

export function setCurrentAppPath(path: string) {
  currentPath = path || '/';
}

// Only relative in-app paths survive persistence; anything else (absolute
// URLs, protocol-relative `//`, junk) is dropped so a malformed value can
// never hijack the iframe src.
function isValidAppPath(path: unknown): path is string {
  return (
    typeof path === 'string' &&
    path.startsWith('/') &&
    !path.startsWith('//') &&
    path.length <= 2000
  );
}

export function persistAppPath(path: string) {
  try {
    if (path === '/' || !isValidAppPath(path)) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, path);
    }
  } catch { /* storage unavailable — persistence is best-effort */ }
}

export function consumePersistedAppPath(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    return isValidAppPath(stored) ? stored : '/';
  } catch {
    return '/';
  }
}
