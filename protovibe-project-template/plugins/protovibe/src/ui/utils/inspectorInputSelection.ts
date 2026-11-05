import type React from 'react';

/** Keep native mousedown from collapsing the select-all performed on focus.
 * Subsequent clicks/drags retain normal caret editing; never reselect on mouseup.
 */
export function selectOnFirstMouseDown(e: React.MouseEvent<HTMLInputElement | HTMLTextAreaElement>) {
  if (!e.defaultPrevented && e.button === 0 && e.currentTarget.ownerDocument.activeElement !== e.currentTarget) {
    e.preventDefault();
    e.currentTarget.focus();
  }
}
