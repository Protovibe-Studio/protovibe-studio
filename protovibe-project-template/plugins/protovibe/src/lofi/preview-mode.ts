export type PreviewMode = 'light' | 'dark' | 'lofi';

/** Use the frame's own event constructor, including for Specs thumbnails. */
export function applyPreviewMode(doc: Document, mode: PreviewMode): void {
  const event = doc.createEvent('CustomEvent');
  event.initCustomEvent('pv-preview-mode', false, false, mode);
  doc.defaultView?.dispatchEvent(event);
}

/** Decorate a prototype URL without touching its route, query state or hash. */
export function withLofiParam(url: URL, enabled: boolean): string {
  if (enabled) url.searchParams.set('lofi', 'true');
  else url.searchParams.delete('lofi');
  return url.toString();
}
