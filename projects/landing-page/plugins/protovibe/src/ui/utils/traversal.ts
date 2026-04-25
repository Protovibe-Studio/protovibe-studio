// plugins/protovibe/src/ui/utils/traversal.ts
// Environment-aware DOM traversal utilities for the Protovibe inspector.
//
// Three environments are supported:
//   app.html       - Only elements tagged with data-pv-loc-app-* are inspectable.
//                    Pure UI-component internals (data-pv-loc-ui-* only) are blocked.
//   components.html - All elements with any data-pv-loc-* are inspectable (deep edit).
//   sketchpad.html  - Only top-level draggable blocks (data-pv-sketchpad-el) or
//                     registered components (data-pv-component-id) are inspectable.

type Environment = 'app' | 'components' | 'sketchpad';

/**
 * Determine which Protovibe environment an element belongs to by inspecting
 * the owning document's location. This works whether called from the parent
 * shell (with an iframe element) or from inside the iframe itself.
 */
function getEnvironment(el: HTMLElement): Environment {
  const pathname = (el.ownerDocument?.defaultView?.location?.pathname ?? '').toLowerCase();
  if (pathname.includes('components')) return 'components';
  if (pathname.includes('sketchpad')) return 'sketchpad';
  return 'app'; // covers app.html and any unknown context
}

/**
 * Returns true if the element is a valid inspection target in its environment.
 *
 * - app.html:        Must have at least one `data-pv-loc-app-*` attr.
 *                    Elements that only carry `data-pv-loc-ui-*` are internal
 *                    component details and are blocked ("Root Element Wall").
 * - components.html: Any `data-pv-loc-*` attr qualifies.
 * - sketchpad.html:  Must have `data-pv-sketchpad-el` or `data-pv-component-id`.
 */
export function isElementAllowed(el: HTMLElement): boolean {
  const env = getEnvironment(el);

  if (env === 'components') {
    for (let i = 0; i < el.attributes.length; i++) {
      if (el.attributes[i].name.startsWith('data-pv-loc-')) return true;
    }
    return false;
  }

  if (env === 'app') {
    for (let i = 0; i < el.attributes.length; i++) {
      if (el.attributes[i].name.startsWith('data-pv-loc-app-')) return true;
    }
    return false;
  }

  if (env === 'sketchpad') {
    return el.hasAttribute('data-pv-sketchpad-el') || el.hasAttribute('data-pv-component-id') || el.hasAttribute('data-pv-block');
  }

  return false;
}

/**
 * Walk up the DOM from `el` and return the first ancestor that satisfies
 * `isElementAllowed`, or null if none exists before the document root.
 */
export function getAllowedParent(el: HTMLElement): HTMLElement | null {
  const docRoot = el.ownerDocument?.documentElement;
  let t = el.parentElement;
  while (t && t !== docRoot) {
    if (isElementAllowed(t)) return t;
    t = t.parentElement;
  }
  return null;
}

/**
 * Walk siblings in the given direction and return the first that satisfies
 * `isElementAllowed`, or null if none found.
 */
export function getAllowedSibling(
  el: HTMLElement,
  direction: 'next' | 'prev',
): HTMLElement | null {
  let t =
    direction === 'next'
      ? (el.nextElementSibling as HTMLElement | null)
      : (el.previousElementSibling as HTMLElement | null);

  while (t) {
    if (isElementAllowed(t)) return t;
    t =
      direction === 'next'
        ? (t.nextElementSibling as HTMLElement | null)
        : (t.previousElementSibling as HTMLElement | null);
  }
  return null;
}

/**
 * BFS through descendants of `el` to find the first element that satisfies
 * `isElementAllowed`. If a descendant is itself not allowed, its children are
 * still searched—this handles deeply-nested component roots.
 */
export function getAllowedChild(el: HTMLElement): HTMLElement | null {
  const queue = Array.from(el.children) as HTMLElement[];
  while (queue.length > 0) {
    const child = queue.shift()!;
    if (isElementAllowed(child)) return child;
    // Child is not directly allowed — keep searching its subtree
    queue.push(...(Array.from(child.children) as HTMLElement[]));
  }
  return null;
}

/**
 * Walk up from `el` (inclusive) and return the first element that satisfies
 * `isElementAllowed`. Equivalent to `el` itself when already allowed, or
 * `getAllowedParent(el)` when not.
 *
 * Useful as the entry point for click-to-select: pass the raw event target
 * and get back the nearest inspectable ancestor.
 */
export function findAllowedAncestorOrSelf(el: HTMLElement): HTMLElement | null {
  const docRoot = el.ownerDocument?.documentElement;
  let t: HTMLElement | null = el;
  while (t && t !== docRoot) {
    if (isElementAllowed(t)) return t;
    t = t.parentElement;
  }
  return null;
}
