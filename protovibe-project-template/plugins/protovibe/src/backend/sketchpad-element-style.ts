import * as babel from '@babel/core';
import babelPluginSyntaxJsx from '@babel/plugin-syntax-jsx';
import babelPluginSyntaxTypeScript from '@babel/plugin-syntax-typescript';

// Reparenting a flow element can put data-pv-sketchpad-el after its existing
// style. Locate the JSX node independently of attribute order, then edit only
// the requested properties so the rest of the frame's source stays untouched.
export function updateSketchpadElementStyle(
  content: string,
  blockId: string,
  values: Partial<Record<'left' | 'top' | 'width' | 'height', number>>,
  clearProperties: Array<'width' | 'height'> = [],
): string {
  const ast = babel.parseSync(content, {
    filename: 'frame.tsx',
    configFile: false,
    babelrc: false,
    plugins: [babelPluginSyntaxJsx, [babelPluginSyntaxTypeScript, { isTSX: true }]],
  });
  const edits: Array<{ start: number; end: number; text: string }> = [];
  let found = false;
  babel.traverse(ast!, {
    JSXOpeningElement(p) {
      const attrs = p.node.attributes;
      const matches = attrs.some(attr => babel.types.isJSXAttribute(attr)
        && babel.types.isJSXIdentifier(attr.name, { name: 'data-pv-sketchpad-el' })
        && babel.types.isStringLiteral(attr.value, { value: blockId }));
      if (!matches) return;
      found = true;

      const style = attrs.find(attr => babel.types.isJSXAttribute(attr)
        && babel.types.isJSXIdentifier(attr.name, { name: 'style' }));
      let object = babel.types.isJSXAttribute(style) && babel.types.isJSXExpressionContainer(style.value)
        ? style.value.expression : null;
      // TypeScript annotations do not change the runtime style object. Unwrap
      // them for the lookup, but leave their source intact when patching it.
      while (babel.types.isTSAsExpression(object)
        || babel.types.isTSSatisfiesExpression(object)
        || babel.types.isTSNonNullExpression(object)) {
        object = object.expression;
      }
      if (!babel.types.isObjectExpression(object)) {
        if (clearProperties.length) { p.stop(); return; }
        throw new Error(`Element ${blockId} requires an inline style object`);
      }
      const updates = Object.entries(values).map(([key, value]) => {
        if (!Number.isFinite(value)) throw new Error(`Invalid ${key} value`);
        return [key, String(Math.round(value))] as const;
      });
      // React omits undefined dimensions, allowing inspector classes to win.
      // Keep the override explicit so a spread cannot restore a resized value.
      for (const key of clearProperties) {
        if (object.properties.some(prop => babel.types.isSpreadElement(prop) || prop.computed
          || babel.types.isIdentifier(prop.key, { name: key })
          || babel.types.isStringLiteral(prop.key, { value: key }))) {
          updates.push([key, 'undefined']);
        }
      }
      if (!updates.length) { p.stop(); return; }
      const needsOverride = updates.some(([key]) => {
        const lastWriter = [...object.properties].reverse().find(prop =>
          babel.types.isSpreadElement(prop) || prop.computed
          || babel.types.isIdentifier(prop.key, { name: key })
          || babel.types.isStringLiteral(prop.key, { value: key }));
        return lastWriter && (!babel.types.isObjectProperty(lastWriter) || lastWriter.computed);
      });
      if (needsOverride) {
        // A spread, computed key, or getter can override an in-place edit or a
        // prepended property. Preserve the original object's source/evaluation
        // and put explicit overrides after it without duplicate static keys.
        // Later edits update these outer properties directly.
        edits.push({
          start: object.start!, end: object.end!,
          text: `{ ...${content.slice(object.start!, object.end!)}, ${updates.map(([key, text]) => `${key}: ${text}`).join(', ')} }`,
        });
        p.stop();
        return;
      }
      const missing: string[] = [];
      for (const [key, text] of updates) {
        const properties = object.properties.filter(prop => babel.types.isObjectProperty(prop)
          && !prop.computed && (babel.types.isIdentifier(prop.key, { name: key })
            || babel.types.isStringLiteral(prop.key, { value: key })));
        if (!properties.length) missing.push(`${key}: ${text}`);
        for (const prop of properties) {
          if (!babel.types.isObjectProperty(prop)) continue;
          const node = prop.shorthand ? prop : prop.value;
          edits.push({ start: node.start!, end: node.end!, text: prop.shorthand ? `${key}: ${text}` : text });
        }
      }
      if (missing.length) {
        // Insert before the first property (and any leading comments), keeping
        // existing commas and trailing comments valid in empty/multiline styles.
        const start = object.start! + 1;
        edits.push({ start, end: start, text: ` ${missing.join(', ')}${object.properties.length ? ',' : ''} ` });
      }
      p.stop();
    },
  });
  if (!found) throw new Error(`Sketchpad element ${blockId} not found`);
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    content = content.slice(0, edit.start) + edit.text + content.slice(edit.end);
  }
  return content;
}
