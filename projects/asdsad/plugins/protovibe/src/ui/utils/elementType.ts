export const PV_FOCUS_TEXT_CONTENT_EVENT = 'pv-focus-text-content';

export function isTextEditableElement(el: HTMLElement | null): boolean {
  return el?.tagName?.toLowerCase() === 'span';
}