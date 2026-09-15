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
  /** Scroll container used as the observer root (null ⇒ viewport). */
  scrollRoot?: HTMLElement | null;
  /** Bump to force a reload of a mounted thumbnail. */
  reloadKey?: number;
}> = ({ src, width = 112, height = 70, scrollRoot = null, reloadKey = 0 }) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [near, setNear] = useState(false);

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
        width, height, flexShrink: 0, overflow: 'hidden', borderRadius: 4, position: 'relative',
        background: theme.bg_sunken, border: `1px solid ${theme.border_default}`,
      }}
    >
      {near && (
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
