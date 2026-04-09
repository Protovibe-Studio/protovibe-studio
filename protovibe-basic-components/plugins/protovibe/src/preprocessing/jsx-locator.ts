// plugins/protovibe/preprocessing/jsx-locator.ts
import path from 'path';
import { Plugin } from 'vite';
import * as babel from '@babel/core';
import { locatorMap } from '../shared/state';

export function jsxLocatorPlugin(): Plugin {
  return {
    name: 'vite-plugin-jsx-locator',
    enforce: 'pre',
    transform(code: string, id: string) {
      // Skip node_modules and the protovibe plugin's own UI files.
      // The previewer overlay (ProtovibePreviewer.tsx etc.) must not get pv-loc
      // attributes — bridge.ts would otherwise intercept clicks on the catalog
      // chrome and break navigation.  Components rendered *inside* the previewer
      // still get their attributes because they live in the user's src/.
      if (
        !/\.(jsx|tsx)$/.test(id) ||
        id.includes('node_modules') ||
        id.includes('/plugins/protovibe/')
      ) return null;

      const relativeFilePath = path.relative(process.cwd(), id);

      const result = babel.transformSync(code, {
        filename: id,
        sourceMaps: true,
        plugins: [
          '@babel/plugin-syntax-jsx',
          ['@babel/plugin-syntax-typescript', { isTSX: true }],
          function injectSourceLocation({ types: t }) {
            return {
              visitor: {
                JSXElement(path: any) {
                  const loc = path.node.loc;
                  if (!loc) return;

                  const opening = path.node.openingElement;

                  // Find className
                  const classAttr = opening.attributes.find(
                    (attr: any) => t.isJSXAttribute(attr) && attr.name.name === 'className'
                  );

                  const hasClass = !!(classAttr && classAttr.value && classAttr.value.loc);

                  // Extract block ID to make the hash robust against structural shifting
                  const blockAttr = opening.attributes.find(
                    (attr: any) => t.isJSXAttribute(attr) && attr.name.name === 'data-pv-block'
                  );
                  const blockId = blockAttr && t.isStringLiteral(blockAttr.value) ? blockAttr.value.value : '';

                  let compName = '';
                  if (t.isJSXIdentifier(opening.name)) {
                    compName = opening.name.name;
                  } else if (t.isJSXMemberExpression(opening.name)) {
                    compName = `${(opening.name.object as any).name}.${opening.name.property.name}`;
                  }

                  const nameEndLoc = opening.name.loc?.end;
                  if (!nameEndLoc) return;

                  const cLoc = hasClass ? classAttr.value.loc : null;

                  const payload: any = {
                    file: relativeFilePath,
                    bStart: [loc.start.line, loc.start.column],
                    bEnd: [loc.end.line, loc.end.column],
                    cStart: cLoc ? [cLoc.start.line, cLoc.start.column] : null,
                    cEnd: cLoc ? [cLoc.end.line, cLoc.end.column] : null,
                    nameEnd: [nameEndLoc.line, nameEndLoc.column],
                    comp: compName || 'HTMLElement',
                    hasClass: hasClass
                  };

                  // Generate Deterministic ID
                  const uniqueString = `${relativeFilePath}:${blockId}:${compName || 'HTMLElement'}:${loc.start.line}:${loc.start.column}`;
                  let hash = 0;
                  for (let i = 0; i < uniqueString.length; i++) {
                    hash = ((hash << 5) - hash) + uniqueString.charCodeAt(i);
                    hash |= 0;
                  }
                  const uniqueId = Math.abs(hash).toString(36);

                  // Tag the attribute with an environment prefix so the visual
                  // inspector can distinguish internal UI-component elements from
                  // application-level elements (the "Root Element Wall").
                  //   data-pv-loc-ui-<hash>  → element lives inside src/components/ui
                  //   data-pv-loc-app-<hash> → element lives in application code
                  const isUiComponent = relativeFilePath.replace(/\\/g, '/').includes('src/components/ui');
                  const attrPrefix = isUiComponent ? 'data-pv-loc-ui-' : 'data-pv-loc-app-';
                  const attrName = `${attrPrefix}${uniqueId}`;

                  // Save payload to Server Memory
                  locatorMap.set(uniqueId, payload);

                  // Inject our clean, valueless data attribute
                  opening.attributes.push(
                    t.jsxAttribute(t.jsxIdentifier(attrName))
                  );
                }
              }
            };
          }
        ]
      });

      if (!result) return null;
      return { code: result.code as string, map: result.map };
    }
  };
}