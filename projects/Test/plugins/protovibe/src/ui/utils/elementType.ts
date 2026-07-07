export const PV_FOCUS_TEXT_CONTENT_EVENT = 'pv-focus-text-content';

export const INLINE_RICH_TEXT_TAGS = ['b', 'strong', 'i', 'em', 'u', 'a', 'span', 'br', 'code', 'kbd', 'samp', 'var', 'mark', 'small', 'sub', 'sup', 'abbr', 'cite', 'q', 'time', 'del', 'ins', 's'];

const ALLOWED_TAG_REGEX = new RegExp(
  `^<\\/?(?:${INLINE_RICH_TEXT_TAGS.join('|')})(?:\\s[^<>]*?)?\\/?>$`,
  'i'
);

export function isTextEditableElement(el: HTMLElement | null, codeSnippet?: string, configSchema?: any): boolean {
  if (!el || !codeSnippet) return false;

  if (configSchema && configSchema.allowTextInChildren !== true) {
    return false;
  }

  const tagName = el.tagName.toLowerCase();
  const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
  if (voidElements.includes(tagName)) return false;

  if (codeSnippet.includes('pv-editable-zone')) return false;

  const firstClose = codeSnippet.indexOf('>');
  const lastOpen = codeSnippet.lastIndexOf('<');

  if (firstClose !== -1 && lastOpen !== -1 && lastOpen > firstClose) {
    const innerContent = codeSnippet.slice(firstClose + 1, lastOpen);

    const noComments = innerContent.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

    // Scan every tag in the inner content; if any is outside the whitelist, reject.
    const tagMatches = noComments.match(/<[^>]+>/g) || [];
    for (const tag of tagMatches) {
      if (!ALLOWED_TAG_REGEX.test(tag)) return false;
    }

    // Strip whitelisted tags before checking for leftover < / > / { / } that
    // would indicate nested components or JS expressions.
    const stripped = noComments.replace(/<[^>]+>/g, '');
    if (stripped.includes('<') || stripped.includes('>')) return false;
    if (stripped.includes('{') || stripped.includes('}')) return false;

    return true;
  }

  return false;
}

export function isTypingInput(element: HTMLElement | null): boolean {
  if (!element) return false;
  if (element.tagName === 'INPUT') {
    const type = (element as HTMLInputElement).type.toLowerCase();
    return !['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'color', 'file'].includes(type);
  }
  return element.tagName === 'TEXTAREA' || element.tagName === 'SELECT' || element.isContentEditable;
}
