export interface SavedAppPath {
  path: string;
  updatedAt: number;
}

// Keep restoration on the project's origin, including browser normalization.
export function isValidAppPath(value: unknown): value is string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') ||
      value.length > 2000 || /[\\\u0000-\u0020\u007f]/.test(value)) return false;
  const url = new URL(value, 'http://protovibe.local');
  return url.origin === 'http://protovibe.local' &&
    !['/protovibe.html', '/components.html', '/sketchpad.html', '/specs.html'].includes(url.pathname);
}

export function isSavedAppPath(value: unknown): value is SavedAppPath {
  const state = value as SavedAppPath | null;
  return !!state && isValidAppPath(state.path) && Number.isSafeInteger(state.updatedAt) && state.updatedAt >= 0;
}
