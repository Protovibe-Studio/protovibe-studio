export const PV_FOCUS_TEXT_CONTENT_EVENT = 'pv-focus-text-content';

export function isTextEditableElement(el: HTMLElement | null, codeSnippet?: string, configSchema?: any): boolean {
  if (!el || !codeSnippet) return false;

  // 1. Enforce strict pvConfig contract:
  // If it's a registered component, it MUST explicitly allow text children.
  if (configSchema && configSchema.allowTextInChildren !== true) {
    return false;
  }

  const tagName = el.tagName.toLowerCase();
  const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
  if (voidElements.includes(tagName)) return false;

  // 1. Prevent editing if it contains an editable zone
  if (codeSnippet.includes('pv-editable-zone')) return false;

  const firstClose = codeSnippet.indexOf('>');
  const lastOpen = codeSnippet.lastIndexOf('<');

  // 2. MUST have an opening tag and a closing tag in the correct order
  // E.g., <div>Text</div> -> lastOpen '<' is AFTER firstClose '>'
  if (firstClose !== -1 && lastOpen !== -1 && lastOpen > firstClose) {
    const innerContent = codeSnippet.slice(firstClose + 1, lastOpen);
    
    // Strip JSX comments to ignore { /* ... */ }
    const noComments = innerContent.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
    
    // Exclude <br /> tags from the nested tag check
    const noBrs = noComments.replace(/<br\s*\/?>/gi, '');

    // 3. If any other HTML/JSX tags exist, it's not a simple text node
    if (noBrs.includes('<') || noBrs.includes('>')) {
      return false;
    }

    // 4. If it contains JS logic/expressions
    if (noBrs.includes('{') || noBrs.includes('}')) {
      return false;
    }

    // Passes all checks! It is a valid text container (or perfectly empty <div></div>)
    return true;
  }

  // 5. Fail-closed: Reject self-closing tags (<Button />), incomplete snippets, etc.
  return false;
}