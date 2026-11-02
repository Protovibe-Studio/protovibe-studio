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
      if (!babel.types.isJSXAttribute(style)
        || !babel.types.isJSXExpressionContainer(style.value)
        || !babel.types.isObjectExpression(style.value.expression)) {
        throw new Error(`Element ${blockId} requires an inline style object`);
      }
      const object = style.value.expression;
      const missing: string[] = [];
      for (const [key, value] of Object.entries(values)) {
        if (!Number.isFinite(value)) throw new Error(`Invalid ${key} value`);
        const text = String(Math.round(value));
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
