// plugins/protovibe/src/ui/components/specs/SpecThumbnail.tsx
// Live miniature of an annotation's state: a same-origin iframe loading the
// deep link, scaled with transform: scale() inside a clipped box. Mounted only
// while near the list viewport (IntersectionObserver) so the number of live
// app instances stays small — each one is a full Vite client in dev.
//
// The iframe is named `pv-spec-thumbnail`: bridge.ts and hmr-liveness.ts skip
// their setup in such frames, and the shell's iframe scans exclude
// [data-pv-thumbnail] so a thumbnail never gets mistaken for the canvas.
import React, { useEffect, useRef, useState } from 'react';
import { theme } from '../../theme';

export const THUMB_VIEWPORT = { width: 1280, height: 800 };
export const THUMB_IFRAME_NAME = 'pv-spec-thumbnail';

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
}> = ({ src, width: widthProp = 112, height: heightProp = 70, fullWidth = false, scrollRoot = null, reloadKey = 0 }) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [near, setNear] = useState(false);
  const [measured, setMeasured] = useState(0);

  // Full-width mode: follow the host's width (the panel can be resized).
  useEffect(() => {
    const el = hostRef.current;
    if (!el || !fullWidth) return;
    const update = () => setMeasured(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fullWidth]);

  const width = fullWidth ? measured : widthProp;
  // +2 for the border (box-sizing: border-box) so the scaled frame is not clipped.
  const height = fullWidth ? Math.round(measured * THUMB_VIEWPORT.height / THUMB_VIEWPORT.width) + 2 : heightProp;

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

  const scale = Math.min(width / THUMB_VIEWPORT.width, height / THUMB_VIEWPORT.height);

  return (
    <div
      ref={hostRef}
      style={{
        width: fullWidth ? '100%' : width, height, boxSizing: 'border-box', flexShrink: 0, overflow: 'hidden', borderRadius: 4, position: 'relative',
        background: theme.bg_sunken, border: `1px solid ${theme.border_default}`,
      }}
    >
      {near && width > 0 && (
        <iframe
          key={`${src}#${reloadKey}`}
          name={THUMB_IFRAME_NAME}
          data-pv-thumbnail="true"
          src={src}
          tabIndex={-1}
          aria-hidden="true"
          loading="lazy"
          style={{
            width: THUMB_VIEWPORT.width, height: THUMB_VIEWPORT.height, border: 'none',
            transform: `scale(${scale})`, transformOrigin: '0 0', pointerEvents: 'none',
            position: 'absolute', top: 0, left: 0, background: '#fff',
          }}
        />
      )}
    </div>
  );
};
