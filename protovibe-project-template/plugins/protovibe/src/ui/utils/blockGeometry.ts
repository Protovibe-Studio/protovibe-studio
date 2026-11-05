import type { BlockGeometry } from '../../shared/state';

// Capture before cut removes the DOM or a drag resets its transforms. All
// coordinates share a viewport origin; only relative offsets survive paste.
export function collectBlockGeometry(elements: HTMLElement[]): Record<string, BlockGeometry> {
  const result: Record<string, BlockGeometry> = {};
  for (const el of elements) {
    const id = el.getAttribute('data-pv-block');
    if (!id || result[id]) continue;
    const doc = el.ownerDocument;
    const zoom = Number(doc.querySelector('[data-sketchpad-zoom]')?.getAttribute('data-sketchpad-zoom')) || 1;
    const rect = el.getBoundingClientRect();
    result[id] = {
      left: rect.left / zoom,
      top: rect.top / zoom,
      width: rect.width / zoom,
      height: rect.height / zoom,
      isFlow: doc.defaultView?.getComputedStyle(el).position !== 'absolute',
    };
  }
  return result;
}
