// Measures where a wrapper's direct child blocks sit relative to the
// wrapper's parent container, so Unwrap can re-position them absolutely
// without any visual jump. Coordinates are unscaled px (sketchpad zoom
// divided out, matching the drop-reparent idiom in sketchpad-bridge).

export interface UnwrapChildPosition {
  left: number;
  top: number;
  width: number;
  wasAbsolute: boolean;
}

export function collectChildPositions(wrapperEl: HTMLElement): Record<string, UnwrapChildPosition> {
  const doc = wrapperEl.ownerDocument;
  const zoomAttr = doc.querySelector('[data-sketchpad-zoom]')?.getAttribute('data-sketchpad-zoom');
  const zoom = (zoomAttr && parseFloat(zoomAttr)) || 1;
  const container = (wrapperEl.parentElement?.closest('[data-layout-mode]') as HTMLElement | null)
    ?? wrapperEl.parentElement
    ?? wrapperEl;
  const containerRect = container.getBoundingClientRect();
  const view = doc.defaultView || window;

  const result: Record<string, UnwrapChildPosition> = {};
  for (const el of Array.from(wrapperEl.querySelectorAll<HTMLElement>('[data-pv-block]'))) {
    if (el.parentElement?.closest('[data-pv-block]') !== wrapperEl) continue;
    const id = el.getAttribute('data-pv-block');
    if (!id || result[id]) continue;
    const rect = el.getBoundingClientRect();
    result[id] = {
      left: (rect.left - containerRect.left) / zoom,
      top: (rect.top - containerRect.top) / zoom,
      width: rect.width / zoom,
      wasAbsolute: view.getComputedStyle(el).position === 'absolute',
    };
  }
  return result;
}
