// plugins/protovibe/src/backend/source-attr.ts
// Pure string helpers for injecting / removing a valueless JSX attribute on an
// element's opening tag. Shared by the comments (`data-pv-comment-{id}`) and
// specs (`data-pv-spec-{id}`) features, which anchor to source elements the
// same way but otherwise share nothing.

/**
 * Insert a valueless ` {attrName}` right after the element's tag name at
 * `nameEnd` ([line, column], 1-based line), mirroring handleUpdateProp's 'add'
 * branch. Every anchored feature uses a uniquely named attribute, so a second
 * anchor on the same element can never collide into a duplicate attribute.
 */
export function injectValuelessAttr(source: string, nameEnd: [number, number], attrName: string): string {
  const lines = source.split('\n');
  const lineIdx = nameEnd[0] - 1;
  const colIdx = nameEnd[1];
  if (lineIdx < 0 || lineIdx >= lines.length) {
    throw new Error('nameEnd is out of range for the current file');
  }
  const line = lines[lineIdx];
  lines[lineIdx] = line.substring(0, colIdx) + ` ${attrName}` + line.substring(colIdx);
  return lines.join('\n');
}

/**
 * Boundary-safe matcher for a single ` {attrName}` attribute, optionally with an
 * empty value (`=""` / `={...}`). Attribute names end in [a-z0-9-] ids, so the
 * lookahead stops a short id from matching inside a longer one.
 */
export function valuelessAttrRegex(attrName: string): RegExp {
  return new RegExp(`\\s*${attrName}(?:=(?:""|'')|=\\{[^}]*\\})?(?![\\w-])`, 'g');
}

export function hasValuelessAttr(source: string, attrName: string): boolean {
  return valuelessAttrRegex(attrName).test(source);
}

/** Remove one attribute (with its leading whitespace); everything else untouched. */
export function removeValuelessAttr(source: string, attrName: string): string {
  return source.replace(valuelessAttrRegex(attrName), '');
}
