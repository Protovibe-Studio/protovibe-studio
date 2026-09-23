// plugins/protovibe/src/ui/components/specs/SpecThumbnail.tsx
// Live miniature of an annotation's state: a same-origin iframe loading the
// deep link, scaled with transform: scale() inside a clipped box. Mounted only
// while near the list viewport (IntersectionObserver) so the number of live
// app instances stays small — each one is a full Vite client in dev.
//
// With `revealSelector` the frame is also scrolled to the annotation's pinned
// element, mirroring what the canvas and the published viewer do for it, and
// `onRevealResult` reports whether that element showed up in the state at all.
//
// The iframe is named `pv-spec-thumbnail`: bridge.ts and hmr-liveness.ts skip
// their setup in such frames, and the shell's iframe scans exclude
// [data-pv-thumbnail] so a thumbnail never gets mistaken for the canvas.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { theme } from '../../theme';

export const THUMB_VIEWPORT = { width: 1280, height: 800 };
export const THUMB_IFRAME_NAME = 'pv-spec-thumbnail';

// How long to keep looking for the pinned element after the frame loads: the
// app mounts (and lays out) well after the load event, and a deep-linked state
// may render its dialog or tab a frame or two later still.
const REVEAL_ATTEMPTS = 25;
const REVEAL_INTERVAL_MS = 200;
// Webfonts and images can shift the element back out of view after the first
// successful reveal, so re-run at these delays once it has been found.
const REVEAL_SETTLE_MS = [400, 1200];
// Presence check behind `onRevealResult`: how long after the frame loads the
// element may stay absent before it counts as "not in this state". The check
// keeps watching afterwards, so an element that renders late (slow route, HMR
// re-render after a re-pin) flips the result back to found.
const PRESENCE_GRACE_MS = 8000;
const PRESENCE_POLL_MS = 1000;

/**
 * Is the pinned element rendered in the frame? It must be in the DOM and
 * generate a box — or be `display: contents`, whose box is its children's.
 */
function presentInFrame(frame: HTMLIFrameElement | null, selector: string): boolean {
  try {
    const doc = frame?.contentDocument;
    const el = doc?.querySelector(selector) as HTMLElement | null;
    if (!el) return false;
    if (el.getClientRects().length > 0) return true;
    return doc!.defaultView?.getComputedStyle(el).display === 'contents';
  } catch { return false; } // cross-origin guard
}

/**
 * Scroll a thumbnail's frame so the pinned element is visible, the same way the
 * canvas and the published viewer reveal one. Already fully in view ⇒ leave the
 * scroll alone; taller than the frame's viewport ⇒ align its top; otherwise
 * centre it. Returns false while the element is still missing or unlaid-out, so
 * the caller knows to keep polling.
 */
function revealInFrame(frame: HTMLIFrameElement | null, selector: string): boolean {
  try {
    const doc = frame?.contentDocument;
    const win = frame?.contentWindow;
    if (!doc || !win) return false;
    const el = doc.querySelector(selector) as HTMLElement | null;
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false; // not laid out (yet)
    const vw = win.innerWidth || THUMB_VIEWPORT.width;
    const vh = win.innerHeight || THUMB_VIEWPORT.height;
    if (r.top >= 0 && r.left >= 0 && r.bottom <= vh && r.right <= vw) return true;
    el.scrollIntoView({ behavior: 'auto', block: r.height > vh ? 'start' : 'center', inline: 'center' });
    return true;
  } catch { return false; } // cross-origin guard
}

export const SpecThumbnail: React.FC<{
  /** App path (pathname + search + hash) or a full URL base + path. */
  src: string;
  width?: number;
  height?: number;
  /** Fill the container's width; height follows the viewport aspect ratio. */
  fullWidth?: boolean;
  /** Scroll container used as the observer root (null ⇒ viewport). */
  scrollRoot?: HTMLElement | null;
  /** Bump to force a reload of a mounted thumbnail. */
  reloadKey?: number;
  /**
   * Force the embedded app into this colour mode, matching the editor's
   * light/dark switch for the main canvas. Omitted in the published viewer,
   * which has no such switch and leaves the app's own theme alone.
   */
  themeMode?: 'light' | 'dark';
  /**
   * CSS selector for the annotation's pinned element (`specIdSelector(id)`).
   * When given, the frame is scrolled so that element is in view — otherwise a
   * thumbnail of a state whose subject sits below the fold shows nothing of it.
   */
  revealSelector?: string;
  /**
   * Reports whether the `revealSelector` element is rendered in the frame:
   * true as soon as it is, false once it has stayed absent for a grace period
   * after load. Keeps watching, so a later appearance reports true again.
   */
  onRevealResult?: (found: boolean) => void;
}> = ({ src, width: widthProp = 112, height: heightProp = 70, fullWidth = false, scrollRoot = null, reloadKey = 0, themeMode, revealSelector, onRevealResult }) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [near, setNear] = useState(false);
  const [measured, setMeasured] = useState(0);
  // Bumped on every frame load so the reveal poll restarts against the new
  // document instead of whatever the previous one left behind.
  const [loadNonce, setLoadNonce] = useState(0);
  // Whether the *current* frame has loaded. Reset whenever a new frame mounts
  // (scrolled back into view, new src, reload), so a check never judges a
  // blank, still-loading frame by an earlier frame's load.
  const [frameLoaded, setFrameLoaded] = useState(false);
  useEffect(() => { setFrameLoaded(false); }, [near, src, reloadKey]);
  // Read through a ref: a new callback identity must not restart the poll.
  const onRevealResultRef = useRef(onRevealResult);
  onRevealResultRef.current = onRevealResult;

  // Full-width mode: follow the host's width (the panel can be resized).
  useEffect(() => {
    const el = hostRef.current;
    if (!el || !fullWidth) return;
    const update = () => setMeasured((w) => (w === el.clientWidth ? w : el.clientWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fullWidth]);

  // Full-width mode sizes the box purely in CSS (aspect-ratio), so its height
  // never depends on a JS measurement or on whether the iframe is mounted.
  // The measured width only feeds the iframe scale — otherwise a 0 → N
  // measurement would shift the layout, re-trigger the observer, unmount
  // the frame, and loop.
  const width = fullWidth ? measured : widthProp;
  const height = fullWidth ? undefined : heightProp;

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => { for (const e of entries) setNear(e.isIntersecting); },
      { root: scrollRoot, rootMargin: '160px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [scrollRoot]);

  // The thumbnail is same-origin, but bridge.ts skips its message listener in
  // `pv-spec-*` frames, so the shell's PV_SET_THEME broadcast never reaches it —
  // write `data-theme` straight onto the frame's <html> instead. Runs on load
  // and whenever the editor's theme switch flips while the frame stays mounted.
  const applyTheme = useCallback(() => {
    if (!themeMode) return;
    try {
      const doc = frameRef.current?.contentDocument;
      if (doc?.documentElement) doc.documentElement.dataset.theme = themeMode;
    } catch { /* cross-origin guard */ }
  }, [themeMode]);

  useEffect(() => { applyTheme(); }, [applyTheme, near, src, reloadKey]);

  const handleLoad = useCallback(() => {
    applyTheme();
    setFrameLoaded(true);
    setLoadNonce((n) => n + 1);
  }, [applyTheme]);

  // Reveal the pinned element. The thumbnail is same-origin and gets no bridge
  // (bridge.ts skips `pv-spec-*` frames), so scroll its document directly.
  useEffect(() => {
    if (!revealSelector || !near || width <= 0) return;
    let attempts = 0;
    const timers: number[] = [];
    const tick = () => {
      if (revealInFrame(frameRef.current, revealSelector)) {
        for (const ms of REVEAL_SETTLE_MS) timers.push(window.setTimeout(() => revealInFrame(frameRef.current, revealSelector), ms));
        return;
      }
      if (++attempts < REVEAL_ATTEMPTS) timers.push(window.setTimeout(tick, REVEAL_INTERVAL_MS));
    };
    tick();
    return () => { for (const t of timers) clearTimeout(t); };
  }, [revealSelector, near, width, src, reloadKey, loadNonce]);

  // Presence for `onRevealResult`, separate from the reveal scroll: watch the
  // loaded frame's DOM (plus a slow poll as a backstop) and report changes.
  useEffect(() => {
    if (!revealSelector || !near || !frameLoaded) return;
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    const win = frame?.contentWindow;
    if (!frame || !doc || !win) return;
    const loadedAt = Date.now();
    let last: boolean | null = null;
    let raf = 0;
    const check = () => {
      raf = 0;
      const found = presentInFrame(frame, revealSelector);
      // Absent only counts once the grace period is over.
      if (!found && Date.now() - loadedAt < PRESENCE_GRACE_MS) return;
      if (found !== last) { last = found; onRevealResultRef.current?.(found); }
    };
    const schedule = () => { if (!raf) raf = win.requestAnimationFrame(check); };
    const MO = (win as Window & typeof globalThis).MutationObserver || MutationObserver;
    const mo = new MO(schedule);
    mo.observe(doc.documentElement, { childList: true, subtree: true, attributes: true });
    const poll = window.setInterval(check, PRESENCE_POLL_MS);
    const grace = window.setTimeout(check, PRESENCE_GRACE_MS + 50);
    check();
    return () => {
      mo.disconnect();
      clearInterval(poll);
      clearTimeout(grace);
      if (raf) win.cancelAnimationFrame(raf);
    };
  }, [revealSelector, near, frameLoaded, loadNonce]);

  const scale = fullWidth || height === undefined
    ? width / THUMB_VIEWPORT.width
    : Math.min(width / THUMB_VIEWPORT.width, height / THUMB_VIEWPORT.height);

  return (
    <div
      ref={hostRef}
      style={{
        width: fullWidth ? '94%' : width, height, aspectRatio: fullWidth ? `${THUMB_VIEWPORT.width} / ${THUMB_VIEWPORT.height}` : undefined,
        boxSizing: 'border-box', flexShrink: 0, overflow: 'hidden', borderRadius: 4, position: 'relative',
        background: theme.bg_sunken, border: `1px solid ${theme.border_default}`,
      }}
    >
      {near && width > 0 && (
        <iframe
          key={`${src}#${reloadKey}`}
          ref={frameRef}
          onLoad={handleLoad}
          name={THUMB_IFRAME_NAME}
          data-pv-thumbnail="true"
          src={src}
          tabIndex={-1}
          aria-hidden="true"
          loading="lazy"
          style={{
            width: THUMB_VIEWPORT.width, height: THUMB_VIEWPORT.height, border: 'none',
            transform: `scale(${scale})`, transformOrigin: '0 0', pointerEvents: 'none',
            position: 'absolute', top: 0, left: 0, background: themeMode === 'dark' ? '#111' : '#fff',
          }}
        />
      )}
    </div>
  );
};
