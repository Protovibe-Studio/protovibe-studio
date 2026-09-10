// plugins/protovibe/src/ui/utils/canvasLinks.ts
// Keeps canvas navigation inside the canvas iframe.
//
// The prototype on the canvas is ordinary app markup, so it contains ordinary
// `<a target="_blank">` links and `window.open()` calls. Both ask for a NEW
// browsing context, and inside the Electron shell that request is answered with
// a real second app window: the shell's window-open policy allows popups for
// localhost URLs (they're the manager's own flows), and every prototype page is
// a localhost URL. So double-clicking such a link on the canvas — which replays
// a real click into the app — pops a bare Electron window with no editor around
// it, and the same happens on a single click in preview mode.
//
// A same-origin destination is just another page of the prototype, so cancel the
// new-context request and navigate the canvas iframe instead: the link still
// works, the editor stays wrapped around it, and the shell's existing iframe
// `load` tracking picks the new path up. `_top`/`_parent` are cancelled the same
// way — those would replace the whole editor document with the prototype.
//
// Cross-origin destinations are left alone: a link to a real website belongs in
// the user's real browser, and the shell already routes it there
// (`shell.openExternal` in electron/src/main.js).
//
// Where the page ends up depends on which document is doing the linking. The app
// canvas navigates itself. The components preview and the sketchpad are shell
// documents (`components.html`, `sketchpad.html`) that merely host prototype
// components — navigating them in place would destroy the preview — so they ask
// the shell to open the page in the app canvas instead.

/** Message the shell listens for to open `path` in the app canvas iframe. */
export const PV_OPEN_IN_CANVAS = 'PV_OPEN_IN_CANVAS';

type Destination =
  /** Navigate this document — for the app canvas, which IS the prototype. */
  | 'self'
  /** Ask the shell to open it in the app canvas — for preview documents. */
  | 'shell';

// Targets that navigate the frame the link lives in — nothing to intercept.
const SAME_FRAME_TARGETS = new Set(['', '_self']);

/** The target an element navigates to, honouring `<base target>`. */
function effectiveTarget(explicit: string | null): string {
  if (explicit) return explicit.trim().toLowerCase();
  const base = document.querySelector('base[target]')?.getAttribute('target');
  return base ? base.trim().toLowerCase() : '';
}

/**
 * Resolve `raw` against the document and return it only when it is an http(s)
 * URL on the canvas iframe's own origin — i.e. a page of the prototype.
 */
function samePrototypeUrl(raw: string): string | null {
  try {
    const url = new URL(raw, document.baseURI);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.origin !== window.location.origin) return null;
    return url.href;
  } catch {
    return null;
  }
}

/** Nearest link in the event path — `composedPath` so shadow DOM works too. */
function findLink(e: Event): HTMLAnchorElement | HTMLAreaElement | null {
  const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
  for (const node of path) {
    if (node instanceof HTMLAnchorElement || node instanceof HTMLAreaElement) return node;
    if (node === document) break;
  }
  const target = e.target as Element | null;
  const closest = target?.closest?.('a[href], area[href]');
  return (closest as HTMLAnchorElement | HTMLAreaElement | null) ?? null;
}

/**
 * Would this click leave the canvas iframe? Either the link says so, or the user
 * asked for a new tab/window with a modifier or the middle button — which the
 * shell answers with an Electron window just the same.
 */
function leavesCanvas(e: MouseEvent, target: string): boolean {
  if (e.type === 'auxclick' || e.button === 1) return true;
  if (e.metaKey || e.ctrlKey || e.shiftKey) return true;
  return !SAME_FRAME_TARGETS.has(target);
}

let destination: Destination = 'self';

/** Send the prototype page wherever this document's links are supposed to land. */
function openInCanvas(url: string) {
  if (destination === 'self') {
    window.location.href = url;
    return;
  }
  const { pathname, search, hash } = new URL(url);
  window.parent.postMessage({ type: PV_OPEN_IN_CANVAS, path: pathname + search + hash }, '*');
}

function handleLinkClick(e: MouseEvent) {
  // The app (or its router) already handled this one.
  if (e.defaultPrevented) return;
  if (e.button !== 0 && e.button !== 1) return;

  const link = findLink(e);
  if (!link || !link.getAttribute('href')) return;
  if (link.hasAttribute('download')) return;

  if (!leavesCanvas(e, effectiveTarget(link.getAttribute('target')))) return;

  const url = samePrototypeUrl(link.href);
  if (!url) return; // external — let the shell hand it to the real browser

  e.preventDefault();
  openInCanvas(url);
}

/**
 * `window.open(url)` defaults to `_blank`, so anything but an explicit `_self`
 * is a new-context request.
 */
function installWindowOpen() {
  const nativeOpen = window.open.bind(window);

  window.open = function patchedOpen(
    url?: string | URL,
    target?: string,
    features?: string,
  ): Window | null {
    const raw = typeof url === 'string' ? url : url instanceof URL ? url.href : '';
    const wanted = target ? String(target).trim().toLowerCase() : '_blank';

    if (raw && wanted !== '_self') {
      const resolved = samePrototypeUrl(raw);
      if (resolved) {
        openInCanvas(resolved);
        // Callers that keep the handle around (`w.focus()`, `w.closed`) get this
        // frame rather than a null they'd read as a blocked popup.
        return window;
      }
    }

    return nativeOpen(url as string, target as string, features as string);
  } as typeof window.open;
}

/**
 * Install on a canvas iframe document. Safe to call once per document; never
 * call it when the app runs standalone — outside the editor a `target="_blank"`
 * link should behave exactly as authored.
 */
export function installCanvasLinkInterceptor(opts: { destination?: Destination } = {}): void {
  destination = opts.destination ?? 'self';
  document.addEventListener('click', handleLinkClick);
  document.addEventListener('auxclick', handleLinkClick);
  installWindowOpen();
}
