// plugins/protovibe/src/ui/components/specs/SpecThumbnail.tsx
// Live miniature of an annotation's state: a same-origin iframe loading the
// deep link, scaled with transform: scale() inside a clipped box. Mounted only
// while near the list viewport (IntersectionObserver) so the number of live
// app instances stays small — each one is a full Vite client in dev.
//
// With `revealSelector` the frame is also scrolled to the annotation's pinned
// element, mirroring what the canvas and the published viewer do for it.
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
}> = ({ src, width: widthProp = 112, height: heightProp = 70, fullWidth = false, scrollRoot = null, reloadKey = 0, themeMode, revealSelector }) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [near, setNear] = useState(false);
  const [measured, setMeasured] = useState(0);
  // Bumped on every frame load so the reveal poll restarts against the new
  // document instead of whatever the previous one left behind.
  const [loadNonce, setLoadNonce] = useState(0);

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
