// plugins/protovibe/backend/server.ts
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';
import sharp from 'sharp';
import { Connect } from 'vite';
import * as babel from '@babel/core';
// Import babel plugins as modules so they resolve from the plugin's own
// node_modules instead of being resolved by string at Babel's runtime
// (which would look relative to the user's source files and fail).
import babelPluginSyntaxJsx from '@babel/plugin-syntax-jsx';
import babelPluginSyntaxTypeScript from '@babel/plugin-syntax-typescript';
import { locatorMap, redoStack, undoStack, clipboard } from '../shared/state';
import { parseTailwindClasses, splitTailwindClasses } from '../shared/utils';
import { parseThemeColors, parseThemeTokens, updateCssVariable } from './css-theme-parser';

function logUndoDebug(_event: string, _details: Record<string, unknown>): void {}

const RICH_TEXT_TAG_WHITELIST = new Set(['b', 'strong', 'i', 'em', 'u', 'a', 'span', 'br']);
const VOID_RICH_TEXT_TAGS = new Set(['br']);
const LINK_DEFAULT_CLASSNAME = 'text-foreground-primary-link hover:opacity-80 transition-opacity';

function escapeJsxText(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;');
}

function escapeJsxAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;');
}

// Parse HTML attributes from a raw attribute string, converting class→className
// and filtering to a safe allowlist per tag. Returns a serialized JSX attribute
// string ready to be interpolated inside an opening tag.
function normalizeTagAttrs(tagName: string, rawAttrs: string): string {
  const attrs: Record<string, string> = {};
  const attrRegex = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(rawAttrs)) !== null) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    if (name === 'class') attrs['className'] = value;
    else attrs[name] = value;
  }

  const keep: Record<string, string> = {};
  if (attrs.className) keep.className = attrs.className;
  if (tagName === 'a') {
    if (attrs.href) keep.href = attrs.href;
    keep.target = attrs.target && /^[\w-]+$/.test(attrs.target) ? attrs.target : '_blank';
    keep.rel = 'noopener noreferrer';
    if (!keep.className) keep.className = LINK_DEFAULT_CLASSNAME;
  }

  return Object.entries(keep)
    .map(([k, v]) => `${k}="${escapeJsxAttr(v)}"`)
    .join(' ');
}

// Convert WYSIWYG HTML into a JSX-safe inline expression. Unknown tags are
// unwrapped (their text content is preserved). Text nodes are escaped so stray
// `{`, `}`, `<`, `>` never break the build.
function sanitizeRichTextToJsx(html: string, indent: string): string {
  // contentEditable often uses <div> for newlines; normalize to <br>.
  let normalized = html
    .replace(/<div[^>]*>/gi, '<br>')
    .replace(/<\/div>/gi, '')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '<br>');

  const tokenRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)\/?>/g;
  let output = '';
  let cursor = 0;
  let m: RegExpExecArray | null;

  while ((m = tokenRegex.exec(normalized)) !== null) {
    const [full, rawName, rawAttrs] = m;
    const tagName = rawName.toLowerCase();
    const isClosing = full.startsWith('</');

    const textChunk = normalized.slice(cursor, m.index);
    if (textChunk) output += escapeJsxText(textChunk);
    cursor = m.index + full.length;

    if (!RICH_TEXT_TAG_WHITELIST.has(tagName)) continue;

    if (VOID_RICH_TEXT_TAGS.has(tagName)) {
      if (!isClosing) output += `<${tagName} />`;
      continue;
    }

    if (isClosing) {
      output += `</${tagName}>`;
    } else {
      const attrs = normalizeTagAttrs(tagName, rawAttrs || '');
      output += attrs ? `<${tagName} ${attrs}>` : `<${tagName}>`;
    }
  }

  const trailing = normalized.slice(cursor);
  if (trailing) output += escapeJsxText(trailing);

  // Reflow explicit newlines the same way the old textarea did.
  return output.split('\n').join(`\n${indent}`);
}

export const handleTakeSnapshot: Connect.NextHandleFunction = (req, res) => {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      const { file, files: filesArr, activeId, currentURLQueryString } = JSON.parse(body || '{}');
      // Deduplicate to prevent double-restores corrupting the redo stack
      const toSnapshot: string[] = Array.from(new Set(filesArr ?? (file ? [file] : [])));
      const files = toSnapshot.map((f: string) => {
        const absolutePath = path.resolve(process.cwd(), f);
        return { file: f, content: fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf-8') : '' };
      });

      if (files.length > 0) {
        const lastState = undoStack[undoStack.length - 1];
        let isIdentical = false;

        if (lastState && lastState.files.length === files.length) {
          isIdentical = files.every(f => {
            const match = lastState.files.find(lf => lf.file === f.file);
            return match && match.content === f.content;
          });
        }

        if (!isIdentical || (lastState && lastState.activeId !== (activeId || ''))) {
          undoStack.push({ files, activeId: activeId || '', currentURLQueryString });
          redoStack.length = 0;
          logUndoDebug('snapshot-created', {
            source: 'server',
            activeId: activeId || '',
            files: files.map((file) => ({ file: file.file, existed: file.content !== '', size: file.content.length })),
            undoDepth: undoStack.length,
            redoDepth: redoStack.length,
          });
        } else {
          logUndoDebug('snapshot-skipped-identical', {
            source: 'server',
            activeId: activeId || '',
            files: files.map((file) => file.file),
            undoDepth: undoStack.length,
          });
        }
      }

      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: String(err) }));
    }
  });
};

export const handleUndo: Connect.NextHandleFunction = (req, res) => {
  try {
    const lastState = undoStack.pop();
    if (!lastState) {
      logUndoDebug('undo-empty', {
        undoDepth: undoStack.length,
        redoDepth: redoStack.length,
      });
      return res.end(JSON.stringify({ success: false, message: 'No more actions to undo.' }));
    }

    const { files, activeId, currentURLQueryString } = lastState;
    logUndoDebug('undo-start', {
      activeId,
      files: files.map((file) => file.file),
      undoDepthAfterPop: undoStack.length,
      redoDepthBeforePush: redoStack.length,
    });
    const currentFiles = files.map(({ file, content: savedContent }) => {
      const absolutePath = path.resolve(process.cwd(), file);
      const currentContent = fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf-8') : '';
      const operation = savedContent === '' ? 'delete' : 'restore';
      if (savedContent === '') {
        // File did not exist before this operation — delete it to truly undo the creation
        if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
      } else {
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        fs.writeFileSync(absolutePath, savedContent, 'utf-8');
      }
      logUndoDebug('undo-file-applied', {
        file,
        operation,
        restoredSize: savedContent.length,
        previousSize: currentContent.length,
      });
      return { file, content: currentContent };
    });
    redoStack.push({ files: currentFiles, activeId, currentURLQueryString });
    logUndoDebug('undo-complete', {
      activeId,
      files: currentFiles.map((file) => file.file),
      undoDepth: undoStack.length,
      redoDepth: redoStack.length,
    });

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, file: files[0]?.file, activeId, currentURLQueryString }));
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: String(err) }));
  }
};

export const handleRedo: Connect.NextHandleFunction = (req, res) => {
  try {
    const nextState = redoStack.pop();
    if (!nextState) {
      return res.end(JSON.stringify({ success: false, message: 'No more actions to redo.' }));
    }

    const { files, activeId, currentURLQueryString } = nextState;
    const currentFiles = files.map(({ file, content: savedContent }) => {
      const absolutePath = path.resolve(process.cwd(), file);
      const currentContent = fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf-8') : '';
      if (savedContent === '') {
        if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
      } else {
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        fs.writeFileSync(absolutePath, savedContent, 'utf-8');
      }
      return { file, content: currentContent };
    });
    undoStack.push({ files: currentFiles, activeId, currentURLQueryString });

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, file: files[0]?.file, activeId, currentURLQueryString }));
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: String(err) }));
  }
};

// Scan src/ for the file that has a pvConfig with the given componentId.
// This allows the inspector to find pvConfig regardless of barrel imports.
async function findPvConfigByComponentId(componentId: string, server: import('vite').ViteDevServer): Promise<any> {
  const srcPath = path.resolve(process.cwd(), 'src');

  const collectCandidates = (dir: string): string[] => {
    const result: string[] = [];
    for (const f of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, f);
      if (fs.statSync(fullPath).isDirectory()) {
        if (f !== 'node_modules' && f !== '.git' && f !== 'dist') {
          result.push(...collectCandidates(fullPath));
        }
      } else if ((f.endsWith('.tsx') || f.endsWith('.jsx')) && fs.readFileSync(fullPath, 'utf-8').includes('export const pvConfig')) {
        result.push(fullPath);
      }
    }
    return result;
  };

  for (const filePath of collectCandidates(srcPath)) {
    try {
      const mod = await server.ssrLoadModule(filePath);
      if (mod?.pvConfig?.componentId === componentId) return mod.pvConfig;
    } catch {
      // skip files that fail to load
    }
  }
  return null;
}

// Notice we changed the signature to accept the server!
export const handleGetSourceInfo = (req: any, res: any, server: import('vite').ViteDevServer) => {
  let body = '';
  req.on('data', (chunk: string) => { body += chunk; });
  req.on('end', async () => {
    try {
      const payload = JSON.parse(body || '{}');
      if (!payload.id) return;
      const { id, componentId } = payload;
      const data = locatorMap.get(id);

      if (!data) throw new Error(`Could not find memory mapping for ID: ${id}. Please restart the dev server.`);

      const absolutePath = path.resolve(process.cwd(), data.file);
      if (!fs.existsSync(absolutePath)) throw new Error(`File not found: ${absolutePath}`);

      const fileContent = fs.readFileSync(absolutePath, 'utf-8');
      const lines = fileContent.split('\n');
      const codeBlock = lines.slice(data.bStart[0] - 1, data.bEnd[0]).join('\n');

      const ast = babel.parseSync(fileContent, {
        filename: absolutePath,
        plugins: [babelPluginSyntaxJsx, [babelPluginSyntaxTypeScript, { isTSX: true }]]
      });

      let classNameStr = null;
      let hasClass = false;
      let cStart = null;
      let cEnd = null;
      let nameEnd = null;
      let componentProps: any[] = [];
      let importedComponents: Record<string, string> = {};
      let compNameStr = data.comp || 'Element';
      let targetNode: any = null;

      // Helper to process a matched JSXOpeningElement and extract className/props info.
      const processOpeningElement = (openingEl: any) => {
        const nameNode = openingEl.name;
        if (nameNode.loc) nameEnd = [nameNode.loc.end.line, nameNode.loc.end.column];

        openingEl.attributes.forEach((attr: any) => {
          if (babel.types.isJSXSpreadAttribute(attr)) {
            componentProps.push({ name: '...', value: 'Spread Props', shouldNotBeEdited: true, loc: attr.loc });
            return;
          }
          if (babel.types.isJSXAttribute(attr)) {
            const propName = attr.name.type === 'JSXNamespacedName'
              ? `${attr.name.namespace.name}:${attr.name.name.name}`
              : attr.name.name;
            if (propName === 'className') {
              hasClass = true;
              if (attr.value && attr.value.loc) {
                cStart = [attr.value.loc.start.line, attr.value.loc.start.column];
                cEnd = [attr.value.loc.end.line, attr.value.loc.end.column];
                if (cStart[0] === cEnd[0]) {
                  classNameStr = lines[cStart[0] - 1].substring(cStart[1], cEnd[1]);
                } else {
                  const first = lines[cStart[0] - 1].substring(cStart[1]);
                  const middle = lines.slice(cStart[0], cEnd[0] - 1);
                  const last = lines[cEnd[0] - 1].substring(0, cEnd[1]);
                  classNameStr = [first, ...middle, last].join('\n');
                }
              }
              return;
            }
            let propValue: any = null;
            let shouldNotBeEdited = false;
            if (attr.value === null) {
              propValue = true;
            } else if (babel.types.isStringLiteral(attr.value)) {
              propValue = attr.value.value;
            } else if (babel.types.isJSXExpressionContainer(attr.value)) {
              const exp = attr.value.expression;
              if (babel.types.isStringLiteral(exp) || babel.types.isNumericLiteral(exp) || babel.types.isBooleanLiteral(exp)) {
                propValue = exp.value;
              } else {
                propValue = 'JS Expression';
                shouldNotBeEdited = true;
              }
            } else {
              propValue = 'Unknown';
              shouldNotBeEdited = true;
            }
            if (propName === 'data-pv-block') shouldNotBeEdited = true;
            componentProps.push({ name: propName, value: propValue, shouldNotBeEdited, loc: attr.loc });
          }
        });
      };

      // Collect all JSXOpeningElement candidates on the target line so we can
      // fall back to a line-only match when the file has drifted from the
      // locatorMap snapshot (e.g. indentation changed since last HMR cycle).
      const lineMatches: Array<{ el: any; nameEndCol: number }> = [];

      babel.traverse(ast, {
        // 1. Build a map of all imports in the file
        ImportDeclaration(path) {
          const source = path.node.source.value;
          path.node.specifiers.forEach(spec => {
            if (babel.types.isImportSpecifier(spec) || babel.types.isImportDefaultSpecifier(spec)) {
              importedComponents[spec.local.name] = source;
            }
          });
        },
        JSXElement(path) {
          const loc = path.node.loc;
          if (!loc) return;
          // Exact match — process immediately and stop traversal.
          if (loc.start.line === data.bStart[0] && loc.start.column === data.bStart[1]) {
            targetNode = path.node;
            processOpeningElement(path.node.openingElement);
            path.stop();
            return;
          }
          // Collect all elements on the same line as a fallback pool.
          if (loc.start.line === data.bStart[0]) {
            const nameEndCol = path.node.openingElement.name.loc?.end.column ?? -1;
            lineMatches.push({ el: path.node, nameEndCol });
          }
        }
      });

      // If the exact match didn't fire (nameEnd still null), pick the best
      // candidate from the same line using data.nameEnd[1] as a proximity hint.
      if (nameEnd === null && lineMatches.length > 0) {
        const hintCol: number = Array.isArray(data.nameEnd) ? data.nameEnd[1] : -1;
        lineMatches.sort((a, b) =>
          Math.abs(a.nameEndCol - hintCol) - Math.abs(b.nameEndCol - hintCol)
        );
        targetNode = lineMatches[0].el;
        processOpeningElement(targetNode.openingElement);
      }

      // Re-extract the codeBlock using the live AST node bounds if possible.
      // This gives the EXACT element string and fixes stale data.bEnd caused by multi-line text edits.
      let finalCodeBlock = codeBlock;
      if (targetNode && targetNode.start != null && targetNode.end != null) {
        finalCodeBlock = fileContent.substring(targetNode.start, targetNode.end);
      } else if (targetNode?.loc) {
        finalCodeBlock = lines.slice(targetNode.loc.start.line - 1, targetNode.loc.end.line).join('\n');
      }

      const parsedClasses = parseTailwindClasses(classNameStr);

      // 2. Resolve pvConfig: Ensure the AST node is actually a React component (capitalized).
      //    Native HTML elements (div, button, span) should never have a component props panel.
      let configSchema = null;
      const isComponent = compNameStr && compNameStr[0] === compNameStr[0].toUpperCase();

      if (isComponent) {
        // Try componentId-based scan first, but ONLY if the DOM componentId matches the 
        // AST component name. If they differ, it means we are editing a nested component 
        // that happens to be the root node, OR we are using an import alias.
        if (componentId && componentId === compNameStr) {
          try {
            configSchema = await findPvConfigByComponentId(componentId, server);
          } catch (err) {
            console.warn('Protovibe: componentId-based pvConfig lookup failed', err);
          }
        }

        // If fast lookup failed (or was bypassed due to mismatch), fall back to
        // AST import tracking. This correctly resolves nested components and aliases.
        if (!configSchema && importedComponents[compNameStr]) {
          try {
            // Ask Vite to resolve the import string (handles aliases like @/components/...)
            const rawImportStr = importedComponents[compNameStr];
            const resolvedId = await server.pluginContainer.resolveId(rawImportStr, absolutePath);
            
            if (resolvedId && resolvedId.id) {
              // Remove Vite query params if any, and strip the extension
              const cleanPath = resolvedId.id.split('?')[0];
              
              // Use Vite's SSR module loader to dynamically import the component file
              try {
                const mod = await server.ssrLoadModule(cleanPath);
                if (mod && mod.pvConfig) {
                  configSchema = mod.pvConfig;
                }
              } catch (modErr) {
                console.warn(`Protovibe: Failed to load component module ${cleanPath} for config extraction`, modErr);
              }
            }
          } catch (resolveErr) {
            console.warn('Protovibe: Failed to resolve component config path', resolveErr);
          }
        }
      }

      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        code: finalCodeBlock, classNameStr, parsedClasses, file: data.file,
        startLine: data.bStart[0], startCol: data.bStart[1], endLine: targetNode?.loc?.end.line || data.bEnd[0], compName: compNameStr,
        hasClass: hasClass, nameEnd: nameEnd || data.nameEnd, cStart: cStart || data.cStart, cEnd,
        componentProps,
        configSchema // Expose the co-located schema to the frontend!
      }));
    } catch (err) {
      res.statusCode = 500; res.end(JSON.stringify({ error: String(err) }));
    }
  });
};

export const handleUpdateSource: Connect.NextHandleFunction = (req, res) => {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      let { file, startLine, endLine, oldClass, oldClasses, newClass, hasClass, nameEnd, cStart, cEnd, action } = JSON.parse(body || '{}');
      if (!file) return res.end(JSON.stringify({ success: false, error: 'No file provided' }));

      const absolutePath = path.resolve(process.cwd(), file);
      const originalContent = fs.readFileSync(absolutePath, 'utf-8');
      const lines = originalContent.split('\n');
      let finalContent = originalContent;

      // Re-derive accurate positions from the current file state to guard against
      // stale locatorMap entries (e.g. when file indentation changed since last HMR
      // cycle). We search for a JSXOpeningElement on startLine and use the client's
      // nameEnd column as a proximity hint when multiple elements share the same line.
      if (startLine) {
        try {
          const freshAst = babel.parseSync(originalContent, {
            filename: absolutePath,
            plugins: [babelPluginSyntaxJsx, [babelPluginSyntaxTypeScript, { isTSX: true }]]
          });
          if (!freshAst) throw new Error('parse returned null');
          const hintCol: number = Array.isArray(nameEnd) ? Number(nameEnd[1]) : -1;
          const candidates: Array<{ nameEnd: number[]; hasClass: boolean; cStart: number[] | null; cEnd: number[] | null }> = [];

          babel.traverse(freshAst, {
            JSXOpeningElement(p) {
              if (p.node.loc?.start.line !== Number(startLine)) return;
              const nameNode = p.node.name;
              if (!nameNode.loc) return;
              const freshNameEnd = [nameNode.loc.end.line, nameNode.loc.end.column];
              let freshHasClass = false;
              let freshCStart: number[] | null = null;
              let freshCEnd: number[] | null = null;
              const classAttr = p.node.attributes.find(
                (attr: any) => babel.types.isJSXAttribute(attr) && (attr as any).name?.name === 'className'
              );
              if (classAttr && babel.types.isJSXAttribute(classAttr) && classAttr.value?.loc) {
                freshHasClass = true;
                freshCStart = [classAttr.value.loc.start.line, classAttr.value.loc.start.column];
                freshCEnd = [classAttr.value.loc.end.line, classAttr.value.loc.end.column];
              }
              candidates.push({ nameEnd: freshNameEnd, hasClass: freshHasClass, cStart: freshCStart, cEnd: freshCEnd });
            }
          });

          if (candidates.length > 0) {
            candidates.sort((a, b) => Math.abs(a.nameEnd[1] - hintCol) - Math.abs(b.nameEnd[1] - hintCol));
            const best = candidates[0];
            nameEnd = best.nameEnd;
            hasClass = best.hasClass;
            cStart = best.cStart;
            cEnd = best.cEnd;
          }
        } catch {
          // If re-parsing fails, fall through and use client-provided values.
        }
      }

      const toOffset = (content: string, line: number, col: number) => {
        const localLines = content.split('\n');
        let offset = 0;
        for (let i = 0; i < line - 1; i++) offset += localLines[i].length + 1;
        return offset + col;
      };

      const splitClasses = (value: string) => splitTailwindClasses(value);

      const parseStaticClassValue = (rawValue: string): { classes: string; build: (next: string) => string } | null => {
        const trimmed = rawValue.trim();
        const direct = trimmed.match(/^(["'`])([\s\S]*?)\1$/);
        if (direct) {
          const quote = direct[1];
          return {
            classes: direct[2],
            build: (next: string) => `${quote}${next}${quote}`
          };
        }

        const wrapped = trimmed.match(/^\{\s*(["'`])([\s\S]*?)\1\s*\}$/);
        if (wrapped) {
          const quote = wrapped[1];
          return {
            classes: wrapped[2],
            build: (next: string) => `{${quote}${next}${quote}}`
          };
        }

        // Handle {cn(...)} — extract string literal args for editing, preserve non-string args (variables, etc.)
        const cnMatch = trimmed.match(/^\{\s*(?:cn|clsx|classNames)\s*\(([\s\S]*)\)\s*\}$/);
        if (cnMatch) {
          const argsStr = cnMatch[1];
          const argRegex = /(["'`])([\s\S]*?)\1/g;
          const classes: string[] = [];
          const stringRanges: Array<{ start: number; end: number }> = [];
          let argMatch;
          while ((argMatch = argRegex.exec(argsStr)) !== null) {
            classes.push(argMatch[2]);
            stringRanges.push({ start: argMatch.index, end: argMatch.index + argMatch[0].length });
          }
          if (classes.length > 0) {
            // Reconstruct the non-string args by removing string literals
            let nonStringArgs = argsStr;
            for (let i = stringRanges.length - 1; i >= 0; i--) {
              nonStringArgs = nonStringArgs.slice(0, stringRanges[i].start) + nonStringArgs.slice(stringRanges[i].end);
            }
            nonStringArgs = nonStringArgs.replace(/^[\s,]+|[\s,]+$/g, '').trim();
            const joined = classes.join(' ').replace(/\s+/g, ' ').trim();
            return {
              classes: joined,
              build: (next: string) => {
                const parts: string[] = [`"${next}"`];
                if (nonStringArgs) parts.push(nonStringArgs);
                return `{cn(${parts.join(', ')})}`;
              }
            };
          }
        }

        return null;
      };

      const mutateTokens = (currentClasses: string) => {
        let tokens = splitClasses(currentClasses);

        if (action === 'replace-multiple') {
          if (Array.isArray(oldClasses)) {
            const toRemove = new Set(oldClasses.filter(Boolean));
            tokens = tokens.filter(cls => !toRemove.has(cls));
          }
          if (newClass) tokens.push(...splitClasses(newClass));
        } else if (action === 'edit') {
          if (oldClass) tokens = tokens.filter(cls => cls !== oldClass);
          if (newClass) tokens.push(...splitClasses(newClass));
        } else if (action === 'remove') {
          if (oldClass) tokens = tokens.filter(cls => cls !== oldClass);
        } else if (action === 'add') {
          if (newClass) tokens.push(...splitClasses(newClass));
        }

        const deduped: string[] = [];
        const seen = new Set<string>();
        tokens.forEach((token) => {
          if (!seen.has(token)) {
            seen.add(token);
            deduped.push(token);
          }
        });
        return deduped.join(' ').trim();
      };

      const canEditExistingClassValue = hasClass && Array.isArray(cStart) && cStart.length === 2 && Array.isArray(cEnd) && cEnd.length === 2;

      if (canEditExistingClassValue) {
        const startOffset = toOffset(finalContent, Number(cStart[0]), Number(cStart[1]));
        const endOffset = toOffset(finalContent, Number(cEnd[0]), Number(cEnd[1]));
        const rawValue = finalContent.slice(startOffset, endOffset);
        const parsed = parseStaticClassValue(rawValue);

        if (parsed) {
          const nextClasses = mutateTokens(parsed.classes);
          const nextRawValue = parsed.build(nextClasses);
          finalContent = finalContent.slice(0, startOffset) + nextRawValue + finalContent.slice(endOffset);
        } else if (action === 'add' && newClass) {
          const lineIdx = Number(cStart[0]) - 1;
          const colIdx = Number(cStart[1]);
          const line = lines[lineIdx];
          const charAtStart = line?.[colIdx];

          if (charAtStart === '"' || charAtStart === "'" || charAtStart === '`') {
            lines[lineIdx] = line.slice(0, colIdx + 1) + newClass + ' ' + line.slice(colIdx + 1);
            finalContent = lines.join('\n');
          } else if (charAtStart === '{') {
            lines[lineIdx] = line.slice(0, colIdx + 1) + `"${newClass} " + ` + line.slice(colIdx + 1);
            finalContent = lines.join('\n');
          }
        }
      } else if ((action === 'add' || action === 'replace-multiple') && newClass) {
        if (!hasClass) {
          const lineIdx = nameEnd[0] - 1;
          const colIdx = nameEnd[1];
          const line = lines[lineIdx];
          lines[lineIdx] = line.slice(0, colIdx) + ` className="${newClass}"` + line.slice(colIdx);
          finalContent = lines.join('\n');
        }
      }

      fs.writeFileSync(absolutePath, finalContent, 'utf-8');
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      res.statusCode = 500; res.end(JSON.stringify({ error: String(err) }));
    }
  });
};

export const handleGetZones: Connect.NextHandleFunction = (req, res) => {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      const { file, startLine, startCol, endLine } = JSON.parse(body || '{}');
      if (!file) return res.end(JSON.stringify({ zones: [] }));

      const absolutePath = path.resolve(process.cwd(), file);
      if (!fs.existsSync(absolutePath)) return res.end(JSON.stringify({ zones: [] }));

      const fileContent = fs.readFileSync(absolutePath, 'utf-8');

      // When we have precise element coordinates, use the Babel AST to collect only
      // zones that are DIRECT children of the focused element — not deeply nested ones.
      if (startLine != null && startCol != null) {
        const ast = babel.parseSync(fileContent, {
          filename: absolutePath,
          plugins: [babelPluginSyntaxJsx, [babelPluginSyntaxTypeScript, { isTSX: true }]]
        });

        const zones: any[] = [];
        let pristineIndex = 1;

        babel.traverse(ast, {
          JSXElement(jsxPath) {
            const openingEl = jsxPath.node.openingElement;
            if (
              openingEl.loc?.start.line !== Number(startLine) ||
              openingEl.loc?.start.column !== Number(startCol)
            ) return;

            // Found the focused element — inspect only its immediate children.
            for (const child of jsxPath.node.children) {
              // JSX comments {/* ... */} are JSXExpressionContainer > JSXEmptyExpression.
              // Use the AST-provided character offsets to read the raw text and regex-check it,
              // which avoids relying on Babel's comment-attachment behaviour.
              if (
                child.type === 'JSXExpressionContainer' &&
                child.expression?.type === 'JSXEmptyExpression' &&
                child.start != null && child.end != null
              ) {
                const childText = fileContent.slice(child.start, child.end);
                const m = childText.match(/pv-editable-zone-(start|end)(?::([a-zA-Z0-9_-]+))?/);
                if (m && m[1] === 'start') {
                  const nameOrId = m[2];
                  if (!nameOrId) {
                    zones.push({ id: `pristine-${pristineIndex}`, name: 'New Zone', isPristine: true });
                    pristineIndex++;
                  } else {
                    zones.push({ id: nameOrId, name: nameOrId, isPristine: false });
                  }
                }
              }
            }

            jsxPath.stop();
          }
        });

        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ zones }));
      }

      // Fallback (no element coordinates): return all zones within line bounds.
      const regex = /\{\/\*\s*pv-editable-zone-(start|end)(?::([a-zA-Z0-9_-]+))?\s*\*\/\}/g;
      const zones: any[] = [];
      let match;
      let pristineIndex = 1;

      while ((match = regex.exec(fileContent)) !== null) {
        const lineNum = fileContent.substring(0, match.index).split('\n').length;
        const kind = match[1];
        const nameOrId = match[2];

        if (kind !== 'start') continue;

        let zoneObj = null;
        if (!nameOrId) {
          zoneObj = { id: `pristine-${pristineIndex}`, name: 'New Zone', isPristine: true };
          pristineIndex++;
        } else {
          zoneObj = { id: nameOrId, name: nameOrId, isPristine: false };
        }

        if (zoneObj) {
          if (!startLine || !endLine || (lineNum >= Number(startLine) && lineNum <= Number(endLine))) {
            zones.push(zoneObj);
          }
        }
      }

      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ zones }));
    } catch (err) {
      res.statusCode = 500; res.end(JSON.stringify({ error: String(err) }));
    }
  });
};

export const handleWrapBlocks: Connect.NextHandleFunction = (req, res) => {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      const { file, blockIds, targetLayoutMode } = JSON.parse(body || '{}');
      if (!file || !blockIds || blockIds.length === 0) {
        return res.end(JSON.stringify({ success: false, error: 'Missing parameters' }));
      }

      const absolutePath = path.resolve(process.cwd(), file);
      let fileContent = fs.readFileSync(absolutePath, 'utf-8');

      const extractedBlocks: string[] = [];
      let insertIndex = -1;
      let baseSpaces = '';

      const blockMatches: { id: string, index: number, content: string, length: number }[] = [];

      for (const blockId of blockIds) {
        const regex = new RegExp(`(?:\\n?)([ \\t]*)\\{\\/\\*\\s*pv-block-start:${blockId}\\s*\\*\\/\\}[\\s\\S]*?\\{\\/\\*\\s*pv-block-end:${blockId}\\s*\\*\\/\\}(?:\\n?)`);
        const match = fileContent.match(regex);
        if (match) {
          blockMatches.push({
            id: blockId,
            index: match.index!,
            content: match[0],
            length: match[0].length
          });
          if (insertIndex === -1 || match.index! < insertIndex) {
            insertIndex = match.index!;
            baseSpaces = match[1] || '';
          }
        }
      }

      if (blockMatches.length === 0) {
        return res.end(JSON.stringify({ success: false, error: 'Blocks not found' }));
      }

      // Sort reverse so we delete from bottom up without invalidating earlier indices
      blockMatches.sort((a, b) => b.index - a.index);

      for (const match of blockMatches) {
        extractedBlocks.unshift(match.content.trim());
        fileContent = fileContent.slice(0, match.index) + '\n' + fileContent.slice(match.index + match.length);
      }

      const wrapperId = Math.random().toString(36).substring(2, 8);
      const zoneId = Math.random().toString(36).substring(2, 8);
      const i = baseSpaces;
      const i2 = i + '  ';

      let wrapperAttrs = `data-pv-block="${wrapperId}" className="flex flex-col gap-2"`;
      
      // Safely verify if the first block is actually positioned absolutely
      const isFirstBlockAbsolute = extractedBlocks.length > 0 && /style=\{\s*\{[^}]*position:\s*['"]absolute['"]/.test(extractedBlocks[0]);

      if (targetLayoutMode === 'absolute' && isFirstBlockAbsolute) {
        // Calculate the top-left bounding box to position the new wrapper
        let minLeft = Infinity;
        let minTop = Infinity;
        extractedBlocks.forEach(block => {
          const leftMatch = block.match(/left:\s*(-?[\d.]+)/);
          const topMatch = block.match(/top:\s*(-?[\d.]+)/);
          if (leftMatch) minLeft = Math.min(minLeft, parseFloat(leftMatch[1]));
          if (topMatch) minTop = Math.min(minTop, parseFloat(topMatch[1]));
        });
        const left = minLeft === Infinity ? 100 : minLeft;
        const top = minTop === Infinity ? 100 : minTop;
        wrapperAttrs += ` data-pv-sketchpad-el="${wrapperId}" style={{ position: 'absolute', left: ${left}, top: ${top} }}`;
      }

      const processedBlocks = extractedBlocks.map(block => {
        let newBlock = block;
        // Universally strip sketchpad draggable attribute from the children
        newBlock = newBlock.replace(/\s*data-pv-sketchpad-el=(["'])[^"']*\1/g, '');

        // Strip absolute positioning from the root element's style tag
        const firstTagRegex = /(<[A-Za-z0-9_.-]+)([^>]*?)(>|\/>)/;
        newBlock = newBlock.replace(firstTagRegex, (match, tag, attrs, closing) => {
          const styleRegex = /style=\{\s*\{([\s\S]*?)\}\s*\}/;
          if (styleRegex.test(attrs)) {
            const newAttrs = attrs.replace(styleRegex, (_m: string, innerStyles: string) => {
              const cleaned = innerStyles
                .replace(/(?:position|left|top|right|bottom|zIndex)\s*:\s*[^,}]*,?/g, '')
                .trim()
                .replace(/,$/, '')
                .trim();
              return cleaned ? `style={{ ${cleaned} }}` : '';
            });
            return `${tag}${newAttrs}${closing}`;
          }
          return match;
        });
        return newBlock;
      });

      const innerContent = processedBlocks.map(b =>
        b.split('\n').map(line => {
          if (line.startsWith(baseSpaces)) {
            return i2 + line.slice(baseSpaces.length);
          }
          return i2 + line;
        }).join('\n')
      ).join('\n');

      const wrapperHtml = `\n${i}{/* pv-block-start:${wrapperId} */}\n${i}<div ${wrapperAttrs}>\n${i2}{/* pv-editable-zone-start:${zoneId} */}\n${innerContent}\n${i2}{/* pv-editable-zone-end:${zoneId} */}\n${i}</div>\n${i}{/* pv-block-end:${wrapperId} */}\n`;
            
      fileContent = fileContent.slice(0, insertIndex) + wrapperHtml + fileContent.slice(insertIndex);

      fs.writeFileSync(absolutePath, fileContent, 'utf-8');
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, wrapperId }));

    } catch (err) {
      res.statusCode = 500; res.end(JSON.stringify({ error: String(err) }));
    }
  });
};

export const handleDeleteBlocks: Connect.NextHandleFunction = (req, res) => {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      const { file, blockIds } = JSON.parse(body || '{}');
      if (!file || !blockIds || blockIds.length === 0) {
        return res.end(JSON.stringify({ success: false, error: 'Missing parameters' }));
      }

      const absolutePath = path.resolve(process.cwd(), file);
      let fileContent = fs.readFileSync(absolutePath, 'utf-8');

      const blockMatches: { id: string, index: number, length: number }[] = [];

      for (const blockId of blockIds) {
        const regex = new RegExp(`\\n?[ \\t]*\\{\\/\\*\\s*pv-block-start:${blockId}\\s*\\*\\/\\}[\\s\\S]*?\\{\\/\\*\\s*pv-block-end:${blockId}\\s*\\*\\/\\}\\n?`);
        const match = fileContent.match(regex);
        if (match) {
          blockMatches.push({
            id: blockId,
            index: match.index!,
            length: match[0].length
          });
        }
      }

      if (blockMatches.length === 0) {
        return res.end(JSON.stringify({ success: false, error: 'Blocks not found' }));
      }

      // Sort reverse so we delete from bottom up without invalidating earlier indices
      blockMatches.sort((a, b) => b.index - a.index);

      let smallestIndex = Infinity;
      for (const match of blockMatches) {
        smallestIndex = Math.min(smallestIndex, match.index);
        const deleteRegex = new RegExp(`\\n?[ \\t]*\\{\\/\\*\\s*pv-block-start:${match.id}\\s*\\*\\/\\}[\\s\\S]*?\\{\\/\\*\\s*pv-block-end:${match.id}\\s*\\*\\/\\}\\n?`);
        fileContent = fileContent.replace(deleteRegex, "\n");
      }

      const safeIndex = Math.min(smallestIndex, fileContent.length - 1);
      const zoneRange = findEnclosingZoneRange(fileContent, safeIndex);
      fileContent = zoneRange
        ? cleanupBlankLinesInRange(fileContent, zoneRange.start, zoneRange.end)
        : cleanupBlankLinesInRange(fileContent, safeIndex, safeIndex + 1);

      fs.writeFileSync(absolutePath, fileContent, 'utf-8');
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, deletedCount: blockMatches.length }));

    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: String(err) }));
    }
  });
};

export const handleAddBlock: Connect.NextHandleFunction = (req, res) => {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      const { file, zoneId, afterBlockId, isPristine, elementType = 'block', compName, importPath, defaultProps, defaultContent, additionalImportsForDefaultContent, targetStartLine, targetEndLine, pasteX, pasteY, targetLayoutMode, imageUrl, imageWidth, imageHeight } = JSON.parse(body || '{}');
      const absolutePath = path.resolve(process.cwd(), file);
      let fileContent = fs.readFileSync(absolutePath, 'utf-8');
      
      const blockId = Math.random().toString(36).substring(2, 8);

      // Establish the character bounds using the exact line numbers from pv-loc
      let blockStart = 0;
      let blockEnd = fileContent.length;
      if (targetStartLine && targetEndLine) {
        const getOffset = (lineNum: number) => {
          if (lineNum <= 1) return 0;
          return fileContent.split('\n').slice(0, lineNum - 1).join('\n').length + 1;
        };
        blockStart = getOffset(targetStartLine);
        blockEnd = getOffset(targetEndLine + 1); // Get start of the line *after* the end line
      }

      // 1. Handle component imports safely without breaking formatting
      let pastedContent = '';
      let pastedImports: Array<{ name: string; path: string }> = [];
      let newBlockIds: string[] = [];

      if (elementType === 'paste') {
        if (!clipboard.data) {
          throw new Error('Clipboard is empty.');
        }
        const originalBlocks = clipboard.data.blocks;
        pastedContent = originalBlocks.join('\n');
        pastedImports = clipboard.data.imports || [];

        // Identify top-level IDs
        const topLevelOldIds = originalBlocks.map(b => {
          const m = b.match(/pv-block-start:([a-zA-Z0-9_-]{6})/);
          return m ? m[1] : null;
        }).filter(Boolean) as string[];

        const idMap: Record<string, string> = {};

        topLevelOldIds.forEach((oldId, index) => {
          const newId = index === 0 ? blockId : Math.random().toString(36).substring(2, 8);
          idMap[oldId] = newId;
          newBlockIds.push(newId);
        });

        const idRegex = /data-pv-block="([a-zA-Z0-9_-]{6})"/g;
        let match;
        while ((match = idRegex.exec(pastedContent)) !== null) {
          if (!idMap[match[1]]) {
            idMap[match[1]] = Math.random().toString(36).substring(2, 8);
          }
        }

        // Apply ID mappings directly to individual blocks to avoid \n\n splitting issues
        let mappedBlocks = originalBlocks.map(b => {
          let mapped = b;
          for (const [oldId, newId] of Object.entries(idMap)) {
            mapped = mapped.split(oldId).join(newId);
          }
          return mapped;
        });

        pastedContent = mappedBlocks.join('\n');

        // Hybrid style transform: add, update, or strip absolute-positioning styles
        if (targetLayoutMode) {
          let minLeft = Infinity;
          let minTop = Infinity;

          if (targetLayoutMode === 'absolute') {
            mappedBlocks.forEach(block => {
              // Only check the first opening tag of the root block for bounding box
              const firstTagMatch = block.match(/(<[A-Za-z0-9_.-]+)([^>]*?)(>|\/>)/);
              if (firstTagMatch) {
                const attrs = firstTagMatch[2];
                const styleMatch = attrs.match(/style=\{\s*\{([\s\S]*?)\}\s*\}/);
                if (styleMatch) {
                  const leftMatch = styleMatch[1].match(/left:\s*(-?[\d.]+)/);
                  const topMatch = styleMatch[1].match(/top:\s*(-?[\d.]+)/);
                  if (leftMatch) minLeft = Math.min(minLeft, parseFloat(leftMatch[1]));
                  if (topMatch) minTop = Math.min(minTop, parseFloat(topMatch[1]));
                }
              }
            });
            if (minLeft === Infinity) minLeft = 100;
            if (minTop === Infinity) minTop = 100;
          }

          const deltaX = (pasteX ?? 100) - minLeft;
          const deltaY = (pasteY ?? 100) - minTop;

          const processedBlocks = mappedBlocks.map(block => {
            const firstTagRegex = /(<[A-Za-z0-9_.-]+)([^>]*?)(>|\/>)/;
            
            // Only replace the very first tag in the block (the root element)
            return block.replace(firstTagRegex, (match, tag, attrs, closing) => {
              let newAttrs = attrs;
              const styleRegex = /style=\{\s*\{([\s\S]*?)\}\s*\}/;
              const hasStyle = styleRegex.test(attrs);

              if (targetLayoutMode === 'flow') {
                if (hasStyle) {
                  newAttrs = newAttrs.replace(styleRegex, (_m: string, innerStyles: string) => {
                    let cleaned = innerStyles
                      .replace(/(?:position|left|top|right|bottom|width|height|zIndex)\s*:\s*[^,}]*,?/g, '')
                      .trim().replace(/,$/, '').trim();
                    return cleaned ? `style={{ ${cleaned} }}` : '';
                  });
                }
              } else if (targetLayoutMode === 'absolute') {
                if (!newAttrs.includes('data-pv-sketchpad-el')) {
                  const blockIdMatch = newAttrs.match(/data-pv-block="([^"]+)"/);
                  if (blockIdMatch) newAttrs += ` data-pv-sketchpad-el="${blockIdMatch[1]}"`;
                }

                if (hasStyle) {
                  newAttrs = newAttrs.replace(styleRegex, (_m: string, innerStyles: string) => {
                    let leftVal = pasteX ?? 100;
                    let topVal = pasteY ?? 100;
                    
                    const leftMatch = innerStyles.match(/left:\s*(-?[\d.]+)/);
                    const topMatch = innerStyles.match(/top:\s*(-?[\d.]+)/);
                    
                    if (leftMatch) leftVal = parseFloat(leftMatch[1]) + deltaX;
                    if (topMatch) topVal = parseFloat(topMatch[1]) + deltaY;

                    let cleaned = innerStyles
                      .replace(/(?:position|left|top)\s*:\s*[^,}]*,?/g, '')
                      .trim().replace(/,$/, '').trim();
                    
                    const separator = cleaned ? ', ' : '';
                    return `style={{ position: 'absolute', left: ${Math.round(leftVal)}, top: ${Math.round(topVal)}${separator}${cleaned} }}`;
                  });
                } else {
                  newAttrs = `${newAttrs} style={{ position: 'absolute', left: ${Math.round(pasteX ?? 100)}, top: ${Math.round(pasteY ?? 100)} }}`;
                }
              }

              return `${tag}${newAttrs}${closing}`;
            });
          });

          pastedContent = processedBlocks.join('\n');

          if (targetLayoutMode === 'flow') {
            pastedContent = pastedContent.replace(/\s*data-pv-sketchpad-el=(["'])[^"']*\1/g, '');
          }
        }
      }

      if (elementType === 'component' || (elementType === 'paste' && pastedImports.length > 0)) {
        const ast = babel.parseSync(fileContent, {
          filename: absolutePath,
          plugins: [babelPluginSyntaxJsx, [babelPluginSyntaxTypeScript, { isTSX: true }]]
        });

        const existingNames = new Set<string>();
        let lastImportLine = 0;
        let useClientLine = 0;

        babel.traverse(ast, {
          Directive(path) {
            if (path.node.value.value === 'use client' && path.node.loc) {
              useClientLine = path.node.loc.end.line;
            }
          },
          ImportDeclaration(path) {
            path.node.specifiers.forEach(spec => {
              if (babel.types.isImportSpecifier(spec)) {
                existingNames.add(spec.local.name);
              }
            });
            if (path.node.loc) {
              lastImportLine = Math.max(lastImportLine, path.node.loc.end.line);
            }
          }
        });

        const toInject: Array<{ name: string; path: string }> = [];

        if (elementType === 'component') {
          if (importPath && compName && !existingNames.has(compName)) {
            toInject.push({ name: compName, path: importPath });
          }
          if (Array.isArray(additionalImportsForDefaultContent)) {
            for (const dep of additionalImportsForDefaultContent) {
              if (dep.name && dep.path && !existingNames.has(dep.name)) {
                toInject.push({ name: dep.name, path: dep.path });
              }
            }
          }
        }

        if (elementType === 'paste') {
          for (const dep of pastedImports) {
            if (!existingNames.has(dep.name)) {
              toInject.push(dep);
            }
          }
        }

        if (toInject.length > 0) {
          const lines = fileContent.split('\n');
          const insertAt = Math.max(lastImportLine, useClientLine);
          for (const imp of [...toInject].reverse()) {
            const importStatement = (imp as any).isDefault
              ? `import ${imp.name} from '${imp.path}'`
              : `import { ${imp.name} } from '${imp.path}'`;
            lines.splice(insertAt, 0, importStatement);
          }
          fileContent = lines.join('\n');

          // Recalculate blockStart/blockEnd: injected import lines shift everything after them down.
          if (targetStartLine && targetEndLine) {
            const getOffsetUpdated = (lineNum: number) => {
              if (lineNum <= 1) return 0;
              return fileContent.split('\n').slice(0, lineNum - 1).join('\n').length + 1;
            };
            const shiftedStart = targetStartLine + toInject.length;
            const shiftedEnd = targetEndLine + toInject.length;
            blockStart = getOffsetUpdated(shiftedStart);
            blockEnd = getOffsetUpdated(shiftedEnd + 1);
          }
        }
      }

      // Helper: replace bare pv-block-start/end tags with fresh random IDs in defaultContent strings.
      // Uses iterative innermost-first matching so nested bare blocks are handled correctly.
      // Also assigns IDs to bare pv-editable-zone-start/end pairs using a stack-based pass.
      const assignDefaultContentIds = (content: string): string => {
        // 1. Assign IDs to bare pv-block tags (innermost-first, iterative)
        const bareBlockRe = /\{\/\*\s*pv-block-start\s*\*\/\}((?:(?!\{\/\*\s*pv-block-start\s*\*\/\}).)*?)\{\/\*\s*pv-block-end\s*\*\/\}/s;
        while (bareBlockRe.test(content)) {
          const id = Math.random().toString(36).substring(2, 8);
          content = content.replace(bareBlockRe, (_match, inner) => {
            const updatedInner = inner.replace('data-pv-block=""', `data-pv-block="${id}"`);
            return `{/* pv-block-start:${id} */}${updatedInner}{/* pv-block-end:${id} */}`;
          });
        }

        // 2. Assign IDs to bare pv-editable-zone tags using a stack-based scan
        const bareZoneStartRe = /\{\/\*\s*pv-editable-zone-start\s*\*\/\}/g;
        const bareZoneEndRe = /\{\/\*\s*pv-editable-zone-end\s*\*\/\}/g;
        const zoneTags: Array<{ index: number; length: number; type: 'start' | 'end' }> = [];
        let zm: RegExpExecArray | null;
        bareZoneStartRe.lastIndex = 0;
        while ((zm = bareZoneStartRe.exec(content)) !== null) {
          zoneTags.push({ index: zm.index, length: zm[0].length, type: 'start' });
        }
        bareZoneEndRe.lastIndex = 0;
        while ((zm = bareZoneEndRe.exec(content)) !== null) {
          zoneTags.push({ index: zm.index, length: zm[0].length, type: 'end' });
        }
        if (zoneTags.length > 0) {
          zoneTags.sort((a, b) => a.index - b.index);
          const stack: string[] = [];
          const replacements: Array<{ index: number; length: number; replacement: string }> = [];
          for (const tag of zoneTags) {
            if (tag.type === 'start') {
              const id = Math.random().toString(36).substring(2, 8);
              stack.push(id);
              replacements.push({ index: tag.index, length: tag.length, replacement: `{/* pv-editable-zone-start:${id} */}` });
            } else {
              const id = stack.pop();
              if (id) {
                replacements.push({ index: tag.index, length: tag.length, replacement: `{/* pv-editable-zone-end:${id} */}` });
              }
            }
          }
          // Apply in reverse order so earlier offsets stay valid
          replacements.sort((a, b) => b.index - a.index);
          for (const r of replacements) {
            content = content.slice(0, r.index) + r.replacement + content.slice(r.index + r.length);
          }
        }

        return content;
      };

      // 2. Generate the correct HTML snippet based on type
      const generateBlockHtml = (blockIndent: string) => {
        const i = blockIndent;
        const i2 = blockIndent + '  ';

        if (elementType === 'paste') {
          const cleanPasted = pastedContent.replace(/^\n/, '').trimEnd();
          const lines = cleanPasted.split('\n');
          const baseMatch = lines[0].match(/^([ \t]*)/);
          const baseIndent = baseMatch ? baseMatch[1] : '';
          const baseIndentRegex = new RegExp(`^${baseIndent}`);
          return lines.map(line => i + line.replace(baseIndentRegex, '')).join('\n');
        }

        let layoutAttrs = '';
        if (targetLayoutMode === 'absolute') {
          layoutAttrs = ` data-pv-sketchpad-el="${blockId}" style={{ position: 'absolute', left: ${pasteX ?? 100}, top: ${pasteY ?? 100} }}`;
        }

        if (elementType === 'text') {
          return `${i}{/* pv-block-start:${blockId} */}\n${i}<span data-pv-block="${blockId}"${layoutAttrs}>Lorem ipsum</span>\n${i}{/* pv-block-end:${blockId} */}`;
        }
        if (elementType === 'image') {
          let aspectClass = '';
          if (imageWidth && imageHeight) {
            const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
            const d = gcd(Math.round(imageWidth), Math.round(imageHeight));
            aspectClass = ` aspect-[${Math.round(imageWidth / d)}/${Math.round(imageHeight / d)}]`;
          }
          const className = `w-full bg-[url('${imageUrl}')] bg-contain bg-center bg-no-repeat${aspectClass}`;
          return `${i}{/* pv-block-start:${blockId} */}\n${i}<div data-pv-block="${blockId}"${layoutAttrs} className="${className}" />\n${i}{/* pv-block-end:${blockId} */}`;
        }
        if (elementType === 'component') {
          const propsStr = defaultProps ? ` ${defaultProps}` : '';

          if (defaultContent) {
            // Assign fresh IDs to bare pv-block tags, then format with indentation
            const contentWithIds = assignDefaultContentIds(defaultContent.trim());
            const formattedContent = contentWithIds.split('\n').join(`\n${i2}`);
            return `${i}{/* pv-block-start:${blockId} */}\n${i}<${compName} data-pv-block="${blockId}"${layoutAttrs}${propsStr}>\n${i2}${formattedContent}\n${i}</${compName}>\n${i}{/* pv-block-end:${blockId} */}`;
          } else {
            // Render a clean self-closing tag if there are no inner children
            return `${i}{/* pv-block-start:${blockId} */}\n${i}<${compName} data-pv-block="${blockId}"${layoutAttrs}${propsStr} />\n${i}{/* pv-block-end:${blockId} */}`;
          }
        }

        const innerZoneId = Math.random().toString(36).substring(2, 8);
        return `${i}{/* pv-block-start:${blockId} */}\n${i}<div className="flex flex-col min-h-4" data-pv-block="${blockId}"${layoutAttrs}>\n${i2}{/* pv-editable-zone-start:${innerZoneId} */}\n${i2}{/* pv-editable-zone-end:${innerZoneId} */}\n${i}</div>\n${i}{/* pv-block-end:${blockId} */}`;
      };

      if (isPristine) {
        // New pristine format: ID-less start/end pair {/* pv-editable-zone-start */} + {/* pv-editable-zone-end */}
        const pristineStartRe = /\{\/\*\s*pv-editable-zone-start\s*\*\/\}/g;

        // Collect all pristine start tags within bounds (in document order)
        const starts: { index: number; fullMatch: string }[] = [];
        let sm: RegExpExecArray | null;
        pristineStartRe.lastIndex = 0;
        while ((sm = pristineStartRe.exec(fileContent)) !== null) {
          if (sm.index >= blockStart && sm.index <= blockEnd) {
            starts.push({ index: sm.index, fullMatch: sm[0] });
          }
        }

        const pristineN = parseInt(zoneId.replace('pristine-', ''), 10);
        const target = starts[pristineN - 1];
        if (target) {
          const endRegex = new RegExp(`([ \\t]*)\\{\\/\\*\\s*pv-editable-zone-end\\s*\\*\\/\\}`, 'g');
          endRegex.lastIndex = target.index + target.fullMatch.length;
          const endMatch = endRegex.exec(fileContent);

          if (endMatch && endMatch.index <= blockEnd) {
            const spaces = endMatch[1];
            const blockIndent = spaces + '  ';
            const blockHtml = generateBlockHtml(blockIndent);
            const permanentId = Math.random().toString(36).substring(2, 8);
            const newStartTag = `{/* pv-editable-zone-start:${permanentId} */}`;
            const newEndTag = `${spaces}{/* pv-editable-zone-end:${permanentId} */}`;

            fileContent =
              fileContent.slice(0, target.index) +
              newStartTag +
              fileContent.slice(target.index + target.fullMatch.length, endMatch.index) +
              blockHtml + '\n' +
              newEndTag +
              fileContent.slice(endMatch.index + endMatch[0].length);
          }
        }
      } else if (zoneId === 'target-zone-placeholder') {
        // Cross-frame paste: inject before the last pv-editable-zone-end in the file
        const zoneEndRe = /([ \t]*)\{\/\* pv-editable-zone-end(?::[a-zA-Z0-9_-]+)? \*\/\}/g;
        let lastMatch: RegExpExecArray | null = null;
        let zm: RegExpExecArray | null;
        while ((zm = zoneEndRe.exec(fileContent)) !== null) {
          lastMatch = zm;
        }
        if (lastMatch) {
          const spaces = lastMatch[1];
          const blockIndent = spaces + '  ';
          const blockHtml = generateBlockHtml(blockIndent);

          fileContent =
            fileContent.slice(0, lastMatch.index) +
            blockHtml + '\n' +
            lastMatch[0] +
            fileContent.slice(lastMatch.index + lastMatch[0].length);
        }
      } else if (afterBlockId) {
        const endRegex = new RegExp(`([ \\t]*)\\{\\/\\*\\s*pv-block-end:${afterBlockId}\\s*\\*\\/\\}`, 'g');
        let hasReplaced = false;
        fileContent = fileContent.replace(endRegex, (match, spaces) => {
          if (hasReplaced) return match;
          hasReplaced = true;
          const blockIndent = spaces;
          return match + '\n' + generateBlockHtml(blockIndent);
        });
        if (!hasReplaced) {
          throw new Error(`Could not find target block-end tag to insert after: ${afterBlockId}`);
        }
      } else {
        const endRegex = new RegExp(`([ \\t]*)\\{\\/\\*\\s*pv-editable-zone-end:${zoneId}\\s*\\*\\/\\}`, 'g');
        let hasReplaced = false;
        fileContent = fileContent.replace(endRegex, (match, spaces, offset) => {
          if (offset < blockStart || offset > blockEnd) return match;
          if (hasReplaced) return match;
          hasReplaced = true;
          const blockIndent = spaces + '  ';
          return generateBlockHtml(blockIndent) + '\n' + match;
        });
        if (!hasReplaced) {
          throw new Error(`Could not find target editable-zone-end tag to insert into: ${zoneId}`);
        }
      }

      fs.writeFileSync(absolutePath, fileContent, 'utf-8');
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, blockId, newBlockIds: newBlockIds.length > 0 ? newBlockIds : [blockId] }));
    } catch (err) {
      res.statusCode = 500; res.end(JSON.stringify({ error: String(err) }));
    }
  });
};

const lineStartAt = (content: string, index: number): number => {
  if (index <= 0) return 0;
  const prevNewline = content.lastIndexOf('\n', index - 1);
  return prevNewline === -1 ? 0 : prevNewline + 1;
};

const lineEndAt = (content: string, index: number): number => {
  if (index >= content.length) return content.length;
  const nextNewline = content.indexOf('\n', index);
  return nextNewline === -1 ? content.length : nextNewline;
};

const expandToNeighborLines = (content: string, start: number, end: number) => {
  const first = lineStartAt(content, Math.max(0, start));
  const second = lineStartAt(content, Math.max(0, first - 1));
  const last = lineEndAt(content, Math.min(content.length, end));
  const after = last < content.length ? lineEndAt(content, last + 1) : last;
  return { start: second, end: after };
};

const cleanupBlankLinesInRange = (content: string, rangeStart: number, rangeEnd: number): string => {
  const boundedStart = Math.max(0, Math.min(rangeStart, content.length));
  const boundedEnd = Math.max(0, Math.min(rangeEnd, content.length));
  const window = expandToNeighborLines(content, boundedStart, boundedEnd);

  const before = content.slice(0, window.start);
  let segment = content.slice(window.start, window.end);
  const after = content.slice(window.end);

  // Keep at most one blank line in a local run.
  segment = segment.replace(/\n[ \t]*\n[ \t]*\n+/g, '\n\n');

  // Avoid loose blank lines hugging structural markers.
  segment = segment.replace(/(\{\/\*\s*pv-(?:editable-zone|block)-start:[^*]+\*\/\})\n[ \t]*\n/g, '$1\n');
  segment = segment.replace(/\n[ \t]*\n([ \t]*\{\/\*\s*pv-(?:editable-zone|block)-end:[^*]+\*\/\})/g, '\n$1');

  return before + segment + after;
};

const findEnclosingZoneRange = (content: string, anchorIndex: number): { start: number; end: number } | null => {
  const zoneTagRegex = /\{\/\*\s*pv-editable-zone-(start|end):([a-zA-Z0-9_-]+)\s*\*\/\}/g;
  const stack: Array<{ id: string; start: number }> = [];
  const ranges: Array<{ start: number; end: number }> = [];

  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = zoneTagRegex.exec(content)) !== null) {
    const kind = tagMatch[1];
    const id = tagMatch[2];
    const tagStart = tagMatch.index;
    const tagEnd = tagStart + tagMatch[0].length;

    if (kind === 'start') {
      stack.push({ id, start: tagStart });
      continue;
    }

    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].id === id) {
        const startTag = stack[i];
        stack.splice(i, 1);
        ranges.push({ start: startTag.start, end: tagEnd });
        break;
      }
    }
  }

  let best: { start: number; end: number } | null = null;
  for (const range of ranges) {
    if (anchorIndex >= range.start && anchorIndex <= range.end) {
      if (!best || (range.end - range.start) < (best.end - best.start)) {
        best = range;
      }
    }
  }

  if (!best) return null;

  return {
    start: lineStartAt(content, best.start),
    end: lineEndAt(content, best.end)
  };
};

// Deduplicate enclosing zones across N anchor positions and run blank-line
// cleanup once per unique zone, bottom-up so earlier indices stay valid.
const cleanupZonesAtAnchors = (content: string, anchors: number[]): string => {
  const seen = new Set<string>();
  const targets: { start: number; end: number }[] = [];
  for (const pos of anchors) {
    const zr = findEnclosingZoneRange(content, pos);
    const key = zr ? `z:${zr.start}-${zr.end}` : `b:${pos}`;
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push(zr ?? { start: pos, end: pos + 1 });
  }
  targets.sort((a, b) => b.start - a.start);
  for (const t of targets) {
    content = cleanupBlankLinesInRange(content, t.start, t.end);
  }
  return content;
};

export const handleBlockAction: Connect.NextHandleFunction = (req, res) => {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      const { file, blockId, blockIds, action, text, startLine, nameEnd } = JSON.parse(body || '{}');
      const targetIds = blockIds || (blockId ? [blockId] : []);
      const absolutePath = path.resolve(process.cwd(), file);
      let fileContent = fs.readFileSync(absolutePath, 'utf-8');

      if (action === 'copy' || action === 'cut') {
        const rawBlocksArr: string[] = [];
        const matchesToCut: { start: number; end: number }[] = [];

        for (const id of targetIds) {
          const extractRegex = new RegExp(`\\n?[ \\t]*\\{\\/\\*\\s*pv-block-start:${id}\\s*\\*\\/\\}[\\s\\S]*?\\{\\/\\*\\s*pv-block-end:${id}\\s*\\*\\/\\}\\n?`);
          const match = extractRegex.exec(fileContent);
          if (match) {
            rawBlocksArr.push(match[0].trimEnd());
            matchesToCut.push({ start: match.index, end: match.index + match[0].length });
          }
        }

        if (rawBlocksArr.length > 0) {
          const usedComponents = new Set<string>();
          const fileImports = new Map<string, { source: string; isDefault: boolean }>();

          // 1. Parse the full source file to map all available imports
          try {
            const fileAst = babel.parseSync(fileContent, {
              filename: absolutePath,
              plugins: [babelPluginSyntaxJsx, [babelPluginSyntaxTypeScript, { isTSX: true }]]
            });
            if (!fileAst) throw new Error('Failed to parse file AST');
            babel.traverse(fileAst, {
              ImportDeclaration(p) {
                const source = p.node.source.value;
                p.node.specifiers.forEach(spec => {
                  if (babel.types.isImportSpecifier(spec)) {
                    fileImports.set(spec.local.name, { source, isDefault: false });
                  } else if (babel.types.isImportDefaultSpecifier(spec)) {
                    fileImports.set(spec.local.name, { source, isDefault: true });
                  }
                });
              }
            });
          } catch (e) {
            console.warn('Protovibe: Failed to parse source file imports', e);
          }

          // 2. Parse each extracted block independently so a single malformed
          //    block can't poison import discovery for the rest of the selection.
          for (const block of rawBlocksArr) {
            try {
              const blockAst = babel.parseSync(`<>${block}</>`, {
                filename: 'temp.tsx',
                plugins: [babelPluginSyntaxJsx, [babelPluginSyntaxTypeScript, { isTSX: true }]]
              });
              if (!blockAst) continue;
              babel.traverse(blockAst, {
                JSXOpeningElement(p) {
                  let compName = '';
                  if (babel.types.isJSXIdentifier(p.node.name)) {
                    compName = p.node.name.name;
                  } else if (babel.types.isJSXMemberExpression(p.node.name)) {
                    compName = (p.node.name.object as babel.types.JSXIdentifier).name;
                  }
                  if (compName && /^[A-Z]/.test(compName)) {
                    usedComponents.add(compName);
                  }
                }
              });
            } catch (e) {
              console.warn('Protovibe: Failed to parse copied block for imports', e);
            }
          }

          // 3. Intersect used components with available imports.
          // Harvest @/ aliases and npm packages; skip relative paths (./, ../) as they are file-local.
          const requiredImports: Array<{ name: string; path: string; isDefault: boolean }> = [];
          usedComponents.forEach(comp => {
            const entry = fileImports.get(comp);
            if (entry && !entry.source.startsWith('./') && !entry.source.startsWith('../')) {
              requiredImports.push({ name: comp, path: entry.source, isDefault: entry.isDefault });
            }
          });

          clipboard.data = { file, blocks: rawBlocksArr, imports: requiredImports };
        }
        if (action === 'copy') {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: true }));
        }
        // If cut, splice all bottom-up first so indices stay valid, then run a
        // single cleanup pass per unique enclosing zone — running cleanup per
        // splice would shrink the zone and shift sibling cuts' anchors mid-loop.
        matchesToCut.sort((a, b) => b.start - a.start);
        const cutAnchors: number[] = [];
        for (const match of matchesToCut) {
          fileContent = fileContent.slice(0, match.start) + "\n" + fileContent.slice(match.end);
          cutAnchors.push(match.start);
        }
        fileContent = cleanupZonesAtAnchors(fileContent, cutAnchors);
      }
      else if (action === 'duplicate') {
        const matches: { index: number; length: number; content: string }[] = [];
        
        for (const id of targetIds) {
          const extractRegex = new RegExp(`(\\n?[ \\t]*\\{\\/\\*\\s*pv-block-start:${id}\\s*\\*\\/\\}[\\s\\S]*?\\{\\/\\*\\s*pv-block-end:${id}\\s*\\*\\/\\}\\n?)`);
          const match = fileContent.match(extractRegex);
          if (match) {
            matches.push({ index: match.index!, length: match[0].length, content: match[1] });
          }
        }

        // Build ONE shared idMap across all duplicated blocks first, so cross-block
        // references (e.g., a sibling pointing at another sibling's id) stay linked
        // in the duplicated copies instead of getting independently re-randomised.
        const idMap: Record<string, string> = {};
        const idRegex = /data-pv-block="([a-zA-Z0-9_-]{6})"/g;
        for (const match of matches) {
          let idMatch;
          const r = new RegExp(idRegex.source, 'g');
          while ((idMatch = r.exec(match.content)) !== null) {
            if (!idMap[idMatch[1]]) {
              idMap[idMatch[1]] = Math.random().toString(36).substring(2, 8);
            }
          }
        }

        // Process bottom to top so inserting doesn't invalidate earlier string indices
        matches.sort((a, b) => b.index - a.index);

        for (const match of matches) {
          let duplicatedContent = match.content;
          for (const [oldId, newId] of Object.entries(idMap)) {
            duplicatedContent = duplicatedContent.split(oldId).join(newId);
          }
          // Inject the duplicated content immediately following the original block
          fileContent = fileContent.slice(0, match.index + match.length) + duplicatedContent + fileContent.slice(match.index + match.length);
        }
      }
      else if (action === 'delete') {
        // Collect every match against the original file content, splice bottom-up,
        // then run a single cleanup pass per unique enclosing zone.
        const deletions: { start: number; end: number }[] = [];
        for (const id of targetIds) {
          const deleteRegex = new RegExp(`\\n?[ \\t]*\\{\\/\\*\\s*pv-block-start:${id}\\s*\\*\\/\\}[\\s\\S]*?\\{\\/\\*\\s*pv-block-end:${id}\\s*\\*\\/\\}\\n?`);
          const match = deleteRegex.exec(fileContent);
          if (match) deletions.push({ start: match.index, end: match.index + match[0].length });
        }
        deletions.sort((a, b) => b.start - a.start);
        const deleteAnchors: number[] = [];
        for (const d of deletions) {
          fileContent = fileContent.slice(0, d.start) + "\n" + fileContent.slice(d.end);
          deleteAnchors.push(d.start);
        }
        fileContent = cleanupZonesAtAnchors(fileContent, deleteAnchors);
      }
      else if (action === 'move-up' || action === 'move-down') {
        // 1. Find all block AND editable-zone start/end tags so siblings respect zone scope.
        const allTagsRegex = /(^[ \t]*)\{\/\*\s*pv-(block|editable-zone)-(start|end):([a-zA-Z0-9_-]+)\s*\*\/\}\n?/gm;
        let match;
        type Tag = { kind: 'block' | 'editable-zone'; type: 'start' | 'end'; id: string; index: number; length: number };
        const tags: Tag[] = [];
        while ((match = allTagsRegex.exec(fileContent)) !== null) {
          tags.push({ kind: match[2] as 'block' | 'editable-zone', type: match[3] as 'start' | 'end', id: match[4], index: match.index, length: match[0].length });
        }

        // 2. Build a hierarchy that includes both blocks and zones. A block's siblings
        //    are only the other blocks that share its immediate enclosing zone.
        type Node = { kind: 'block' | 'editable-zone' | 'root'; id: string; startTag: Tag | null; endTag: Tag | null; children: Node[] };
        const root: Node = { kind: 'root', id: '__root__', startTag: null, endTag: null, children: [] };
        const stack: Node[] = [root];

        for (const tag of tags) {
          if (tag.type === 'start') {
            const node: Node = { kind: tag.kind, id: tag.id, startTag: tag, endTag: null, children: [] };
            stack[stack.length - 1].children.push(node);
            stack.push(node);
          } else {
            // Pop until we find the matching open node (tolerate minor nesting glitches).
            for (let i = stack.length - 1; i >= 1; i--) {
              if (stack[i].kind === tag.kind && stack[i].id === tag.id) {
                stack[i].endTag = tag;
                stack.length = i;
                break;
              }
            }
          }
        }

        // 3. Find the target block and the zone it lives in. Only swap with a sibling
        //    block that shares the same direct enclosing zone.
        let targetParent: Node | null = null;
        let targetSiblings: Node[] = [];
        let targetIndex = -1;

        function findBlock(node: Node): boolean {
          const blockChildren = node.children.filter(c => c.kind === 'block');
          for (let i = 0; i < blockChildren.length; i++) {
            if (blockChildren[i].id === blockId) {
              targetParent = node;
              targetSiblings = blockChildren;
              targetIndex = i;
              return true;
            }
          }
          for (const child of node.children) {
            if (findBlock(child)) return true;
          }
          return false;
        }

        findBlock(root);

        // 4. Swap the block with its sibling — but only if the parent is an editable
        //    zone. Blocks at the file root (outside any zone) are not reorderable.
        if (targetParent && targetParent.kind === 'editable-zone' && targetIndex !== -1) {
          if (action === 'move-up' && targetIndex > 0) {
            const prev = targetSiblings[targetIndex - 1];
            const curr = targetSiblings[targetIndex];

            if (prev.startTag && prev.endTag && curr.startTag && curr.endTag) {
              const prevStart = prev.startTag.index;
              const prevEnd = prev.endTag.index + prev.endTag.length;
              const currStart = curr.startTag.index;
              const currEnd = curr.endTag.index + curr.endTag.length;

              const prevStr = fileContent.substring(prevStart, prevEnd);
              const currStr = fileContent.substring(currStart, currEnd);
              const between = fileContent.substring(prevEnd, currStart);

              fileContent = fileContent.substring(0, prevStart) + currStr + between + prevStr + fileContent.substring(currEnd);
            }
          }
          else if (action === 'move-down' && targetIndex < targetSiblings.length - 1) {
            const curr = targetSiblings[targetIndex];
            const next = targetSiblings[targetIndex + 1];

            if (curr.startTag && curr.endTag && next.startTag && next.endTag) {
              const currStart = curr.startTag.index;
              const currEnd = curr.endTag.index + curr.endTag.length;
              const nextStart = next.startTag.index;
              const nextEnd = next.endTag.index + next.endTag.length;

              const currStr = fileContent.substring(currStart, currEnd);
              const nextStr = fileContent.substring(nextStart, nextEnd);
              const between = fileContent.substring(currEnd, nextStart);

              fileContent = fileContent.substring(0, currStart) + nextStr + between + currStr + fileContent.substring(nextEnd);
            }
          }
        }
      }
      else if (action === 'edit-text') {
        const ast = babel.parseSync(fileContent, {
          filename: absolutePath,
          plugins: [babelPluginSyntaxJsx, [babelPluginSyntaxTypeScript, { isTSX: true }]]
        });

        let targetNode: any = null;
        babel.traverse(ast, {
          JSXOpeningElement(p) {
            const hasBlockId = p.node.attributes.some(attr =>
              babel.types.isJSXAttribute(attr) &&
              attr.name.name === 'data-pv-block' &&
              babel.types.isStringLiteral(attr.value) &&
              attr.value.value === blockId
            );
            if (hasBlockId) {
              targetNode = p.parentPath.node; // Get the full JSXElement
              p.stop();
            }
          }
        });

        if (!targetNode && startLine) {
          const hintCol: number = Array.isArray(nameEnd) ? Number(nameEnd[1]) : -1;
          const candidates: Array<{ node: any; nameEndCol: number }> = [];

          babel.traverse(ast, {
            JSXOpeningElement(p) {
              if (p.node.loc?.start.line !== Number(startLine)) return;
              const nameNode = p.node.name;
              if (!nameNode?.loc) return;
              candidates.push({
                node: p.parentPath.node,
                nameEndCol: nameNode.loc.end.column,
              });
            },
          });

          if (candidates.length > 0) {
            candidates.sort((a, b) =>
              Math.abs(a.nameEndCol - hintCol) - Math.abs(b.nameEndCol - hintCol)
            );
            targetNode = candidates[0].node;
          }
        }

        if (targetNode) {
          const opening = targetNode.openingElement;
          const closing = targetNode.closingElement;

          // Grab original indentation from the opening tag's line
          const lineStartPos = fileContent.lastIndexOf('\n', opening.start) + 1;
          const spaces = (fileContent.substring(lineStartPos, opening.start).match(/^([ \t]*)/) ?? ['', ''])[1];
          const i2 = spaces + '  ';

          // Escape and prepare new text. Input may be WYSIWYG HTML containing
          // whitelisted inline tags (<b>, <strong>, <i>, <em>, <u>, <a>, <span>,
          // <br>). Everything else is stripped to plain text so we never emit
          // invalid JSX into a .tsx file.
          const escapedText = sanitizeRichTextToJsx(String(text), i2);

          if (closing) {
            // Standard tag: <tag>...</tag>
            const innerContent = fileContent.slice(opening.end, closing.start);

            // Preserve any existing Protovibe comments (e.g., pv-editable-zone)
            const comments = innerContent.match(/\{\/\*[\s\S]*?\*\/\}/g) || [];
            const commentsStr = comments.length > 0 ? '\n' + i2 + comments.join(`\n${i2}`) : '';

            const newInnerContent = `\n${i2}${escapedText}${commentsStr}\n${spaces}`;
            fileContent = fileContent.slice(0, opening.end) + newInnerContent + fileContent.slice(closing.start);
          } else {
            // Self-closing tag: <tag /> -> convert to <tag>...</tag>
            const openingText = fileContent.slice(opening.start, opening.end);
            const newOpening = openingText.replace(/\s*\/\>$/, '>');

            let tagName = 'div';
            if (babel.types.isJSXIdentifier(opening.name)) {
              tagName = opening.name.name;
            } else if (babel.types.isJSXMemberExpression(opening.name)) {
              tagName = `${(opening.name.object as any).name}.${opening.name.property.name}`;
            }

            const newInnerContent = `\n${i2}${escapedText}\n${spaces}</${tagName}>`;
            fileContent = fileContent.slice(0, opening.start) + newOpening + newInnerContent + fileContent.slice(opening.end);
          }
        }
      }

      fs.writeFileSync(absolutePath, fileContent, 'utf-8');
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      res.statusCode = 500; res.end(JSON.stringify({ error: String(err) }));
    }
  });
};

export const handleUpdateProp: Connect.NextHandleFunction = (req, res) => {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      const { file, action, propName, propValue, loc, nameEnd } = JSON.parse(body || '{}');
      if (!file) return res.end(JSON.stringify({ success: false, error: 'No file provided' }));

      const absolutePath = path.resolve(process.cwd(), file);
      const lines = fs.readFileSync(absolutePath, 'utf-8').split('\n');

      if (action === 'edit' || action === 'remove') {
        const startLine = loc.start.line - 1;
        const startCol = loc.start.column;
        const endLine = loc.end.line - 1;
        const endCol = loc.end.column;

        // Cleanly format React props and escape dangerous JSX characters
        let replacement = '';
        if (action === 'edit') {
          if (propValue === 'true') {
             replacement = propName; 
          } else if (propValue === 'false') {
             replacement = `${propName}={false}`; 
          } else {
             const escapedValue = String(propValue)
               .replace(/"/g, '&quot;')
               .replace(/{/g, '&#123;')
               .replace(/}/g, '&#125;');
             replacement = `${propName}="${escapedValue}"`;
          }
        }

        if (startLine === endLine) {
          lines[startLine] = lines[startLine].substring(0, startCol) + replacement + lines[startLine].substring(endCol);
        } else {
          lines[startLine] = lines[startLine].substring(0, startCol) + replacement;
          lines[endLine] = lines[endLine].substring(endCol);
          lines.splice(startLine + 1, endLine - startLine - 1); // remove intermediate lines
        }
      } 
      else if (action === 'add') {
        // Insert directly after the component name (e.g., <Button[HERE] ...)
        const lineIdx = nameEnd[0] - 1;
        const colIdx = nameEnd[1];
        
        let newPropStr = '';
        if (propValue === 'true') {
           newPropStr = ` ${propName}`; 
        } else if (propValue === 'false') {
           newPropStr = ` ${propName}={false}`;
        } else {
           const escapedValue = String(propValue)
             .replace(/"/g, '&quot;')
             .replace(/{/g, '&#123;')
             .replace(/}/g, '&#125;');
           newPropStr = ` ${propName}="${escapedValue}"`;
        }
        
        lines[lineIdx] = lines[lineIdx].substring(0, colIdx) + newPropStr + lines[lineIdx].substring(colIdx);
      }

      fs.writeFileSync(absolutePath, lines.join('\n'), 'utf-8');
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      res.statusCode = 500; res.end(JSON.stringify({ error: String(err) }));
    }
  });
};

/**
 * Extracts the inner JSX string from a `defaultContent: (...)` expression in a pvConfig source file.
 * Used when pvConfig.defaultContent is a React node (JSX) rather than a plain string — the server
 * reads the same source text it already has and pulls out the JSX body for canvas injection.
 */
function extractDefaultContentSource(source: string): string {
  const match = source.match(/defaultContent\s*:\s*\(/);
  if (!match || match.index === undefined) return '';
  let depth = 0;
  let i = source.indexOf('(', match.index) + 1;
  const start = i;
  while (i < source.length) {
    if (source[i] === '(') depth++;
    else if (source[i] === ')') {
      if (depth === 0) break;
      depth--;
    }
    i++;
  }
  let jsx = source.substring(start, i).trim();
  // Strip outer Fragment wrapper <> ... </>
  jsx = jsx.replace(/^\s*<>\s*/, '').replace(/\s*<\/>\s*$/, '');
  return jsx.trim();
}

/**
 * Extracts the inner JSX from an `export function PvDefaultContent()` component.
 * Finds the function's return statement and extracts the parenthesized JSX body,
 * stripping any outer Fragment wrapper.
 */
function extractPvDefaultContentSource(source: string): string {
  const fnMatch = source.match(/export\s+function\s+PvDefaultContent\s*\(/);
  if (!fnMatch || fnMatch.index === undefined) return '';
  // Find the opening brace of the function body
  let i = source.indexOf('{', fnMatch.index + fnMatch[0].length);
  if (i === -1) return '';
  // Find `return (` inside the function body
  const returnMatch = source.substring(i).match(/return\s*\(/);
  if (!returnMatch || returnMatch.index === undefined) return '';
  const returnStart = i + returnMatch.index + returnMatch[0].length;
  // Match parentheses to find the end of the return expression
  let depth = 0;
  let j = returnStart;
  while (j < source.length) {
    if (source[j] === '(') depth++;
    else if (source[j] === ')') {
      if (depth === 0) break;
      depth--;
    }
    j++;
  }
  let jsx = source.substring(returnStart, j);
  // Strip outer Fragment wrapper — remove only the <> and </> tags/lines
  jsx = jsx.replace(/^[\s\S]*?<>[ \t]*\n?/, '').replace(/\n?[ \t]*<\/>[\s\S]*$/, '');
  // Dedent: strip the common leading whitespace so the content is indentation-neutral
  const jsxLines = jsx.split('\n');
  const nonEmptyJsxLines = jsxLines.filter(l => l.trim().length > 0);
  if (nonEmptyJsxLines.length > 0) {
    const minIndent = nonEmptyJsxLines.reduce((min, l) => {
      const m = l.match(/^([ \t]*)/);
      return Math.min(min, m ? m[1].length : 0);
    }, Infinity);
    if (minIndent > 0 && minIndent < Infinity) {
      jsx = jsxLines.map(l => l.length > 0 ? l.slice(minIndent) : l).join('\n');
    }
  }
  return jsx.trim();
}

export const handleGetComponents = (req: any, res: any, server: import('vite').ViteDevServer) => {
  const srcPath = path.resolve(process.cwd(), 'src');
  const components: any[] = [];
  const tasks: Promise<void>[] = [];

  // Recursively search the file system for pvConfig
  const walkDirAsync = (dir: string) => {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const dirPath = path.join(dir, f);
      if (fs.statSync(dirPath).isDirectory()) {
        if (f !== 'node_modules' && f !== '.git' && f !== 'dist') walkDirAsync(dirPath);
      } else if (f.endsWith('.tsx') || f.endsWith('.jsx')) {
        const content = fs.readFileSync(dirPath, 'utf-8');
        
        // Fast string check before executing Vite's heavy module loader
        if (content.includes('export const pvConfig')) {
          tasks.push((async () => {
            try {
              const mod = await server.ssrLoadModule(dirPath);
              if (mod && mod.pvConfig && mod.pvConfig.importPath) {
                components.push({
                  name: mod.pvConfig.name || f.replace(/\.[^/.]+$/, ""),
                  displayName: mod.pvConfig.displayName || mod.pvConfig.name || f.replace(/\.[^/.]+$/, ""),
                  description: mod.pvConfig.description || 'Custom component',
                  importPath: mod.pvConfig.importPath,
                  defaultProps: mod.pvConfig.defaultProps || '',
                  defaultContent: typeof mod.pvConfig.defaultContent === 'string'
                    ? mod.pvConfig.defaultContent
                    : (mod.PvDefaultContent
                      ? extractPvDefaultContentSource(content)
                      : extractDefaultContentSource(content)),
                  additionalImportsForDefaultContent: mod.pvConfig.additionalImportsForDefaultContent || []
                });
              }
            } catch (err) {
              console.warn(`Protovibe: Failed to load config from ${dirPath}`, err);
            }
          })());
        }
      }
    }
  };

  try {
    walkDirAsync(srcPath);
    // Wait for all ssrLoadModule promises to resolve
    Promise.all(tasks).then(() => {
      components.sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name));
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ components }));
    });
  } catch(e) {
    res.statusCode = 500; res.end(JSON.stringify({ error: String(e) }));
  }
};

export const handleGetThemeColors: Connect.NextHandleFunction = (req, res) => {
  try {
    const cssFilePath = path.resolve(process.cwd(), 'src/index.css');
    const colors = parseThemeColors(cssFilePath);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ colors }));
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: String(err) }));
  }
};

export const handleUpdateThemeColor: Connect.NextHandleFunction = (req, res) => {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      const { tokenName, themeMode, value } = JSON.parse(body);
      const cssFilePath = path.resolve(process.cwd(), 'src/index.css');
      const selector = themeMode === 'light' ? '[data-theme="light"]' : '[data-theme="dark"]';
      const css = fs.readFileSync(cssFilePath, 'utf-8');
      undoStack.push({ files: [{ file: 'src/index.css', content: css }], activeId: '' });
      redoStack.length = 0;
      const updated = updateCssVariable(css, selector, tokenName, value);
      fs.writeFileSync(cssFilePath, updated, 'utf-8');
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: String(err) }));
    }
  });
};

export const handleGetThemeTokens: Connect.NextHandleFunction = (req, res) => {
  try {
    const cssFilePath = path.resolve(process.cwd(), 'src/index.css');
    const tokens = parseThemeTokens(cssFilePath);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ tokens }));
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: String(err) }));
  }
};

async function compressImage(input: Buffer, ext: string): Promise<Buffer> {
  try {
    const pipeline = sharp(input, { failOn: 'none' }).rotate();
    if (ext === '.png') {
      return await pipeline.png({ compressionLevel: 9, palette: true, quality: 80, effort: 7 }).toBuffer();
    }
    if (ext === '.jpg' || ext === '.jpeg') {
      return await pipeline.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    }
    if (ext === '.webp') {
      return await pipeline.webp({ quality: 80 }).toBuffer();
    }
    if (ext === '.avif') {
      return await pipeline.avif({ quality: 60 }).toBuffer();
    }
    return input;
  } catch {
    return input;
  }
}

export const handleUploadImage: Connect.NextHandleFunction = (req, res) => {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const { filename, base64Data } = JSON.parse(body);
      if (!filename || !base64Data) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'Missing filename or base64Data' }));
      }

      const imagesDir = path.resolve(process.cwd(), 'src/images/from-protovibe');
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }

      // Sanitize filename: lowercase, kebab-case, remove invalid chars
      const ext = path.extname(filename).toLowerCase();
      const baseName = path.basename(filename, path.extname(filename));
      const sanitized = baseName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'image';

      // Auto-rename if file exists
      let finalName = `${sanitized}${ext}`;
      let counter = 1;
      while (fs.existsSync(path.join(imagesDir, finalName))) {
        finalName = `${sanitized}-${counter}${ext}`;
        counter++;
      }

      // Strip base64 header (supports SVG and all image types)
      const raw = base64Data.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
      const inputBuffer = Buffer.from(raw, 'base64');

      // Compress before hashing so dedup matches what's actually written to disk.
      // SVGs are skipped (sharp would rasterize them).
      const buffer = ext === '.svg' ? inputBuffer : await compressImage(inputBuffer, ext);
      const uploadHash = crypto.createHash('sha256').update(buffer).digest('hex');

      // Check if a file with the same content hash already exists
      if (fs.existsSync(imagesDir)) {
        const existingFiles = fs.readdirSync(imagesDir);
        for (const file of existingFiles) {
          const filePath = path.join(imagesDir, file);
          if (!fs.statSync(filePath).isFile()) continue;
          const existingHash = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
          if (existingHash === uploadHash) {
            const url = `/src/images/from-protovibe/${file}`;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: true, url }));
          }
        }
      }

      fs.writeFileSync(path.join(imagesDir, finalName), buffer);

      // Always use forward slashes in the URL
      const url = `/src/images/from-protovibe/${finalName}`;

      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, url }));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: String(err) }));
    }
  });
};

export const handleUpdateThemeToken: Connect.NextHandleFunction = (req, res) => {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      const { tokenName, value } = JSON.parse(body);
      const cssFilePath = path.resolve(process.cwd(), 'src/index.css');
      const css = fs.readFileSync(cssFilePath, 'utf-8');
      undoStack.push({ files: [{ file: 'src/index.css', content: css }], activeId: '' });
      redoStack.length = 0;
      const updated = updateCssVariable(css, '@theme', tokenName, value);
      fs.writeFileSync(cssFilePath, updated, 'utf-8');
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: String(err) }));
    }
  });
};

// ─── Font Family ──────────────────────────────────────────────────────────────

/** Remove the managed Google Font @import for a given token slot (e.g. "font-sans"). */
function removeGoogleFontImport(css: string, tokenSlot: string): string {
  // Each managed block looks like:
  //   /* pv-google-font:font-sans */\n@import url('...');\n
  const pattern = new RegExp(
    `\\/\\* pv-google-font:${tokenSlot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\*\\/\\n@import url\\([^)]+\\);\\n`,
    'g'
  );
  return css.replace(pattern, '');
}

/** Prepend a managed Google Font @import for a given token slot at the top of the CSS. */
function addGoogleFontImport(css: string, tokenSlot: string, fontName: string): string {
  const encodedName = fontName.replace(/ /g, '+');
  const importLine = `/* pv-google-font:${tokenSlot} */\n@import url('https://fonts.googleapis.com/css2?family=${encodedName}:wght@400;700&display=swap');\n`;
  return importLine + css;
}

export const handleUpdateFontFamily: Connect.NextHandleFunction = (req, res) => {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      const { tokenName, value, googleFontName } = JSON.parse(body);
      const cssFilePath = path.resolve(process.cwd(), 'src/index.css');
      let css = fs.readFileSync(cssFilePath, 'utf-8');
      undoStack.push({ files: [{ file: 'src/index.css', content: css }], activeId: '' });
      redoStack.length = 0;
      // Remove existing managed import for this slot
      css = removeGoogleFontImport(css, tokenName);
      // Add new import if a Google Font was selected
      if (googleFontName) {
        css = addGoogleFontImport(css, tokenName, googleFontName);
      }
      // Update the CSS variable in @theme
      css = updateCssVariable(css, '@theme', tokenName, value);
      fs.writeFileSync(cssFilePath, css, 'utf-8');
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: String(err) }));
    }
  });
};

// ─── Cloudflare Pages publish ─────────────────────────────────────────────────

type CfPublishStatus =
  | 'idle'
  | 'installing-wrangler'
  | 'building'
  | 'publishing'
  | 'waiting-for-browser-approval'
  | 'needs-api-token'
  | 'account-selection'
  | 'not-logged-in'
  | 'success'
  | 'error';

interface CfPublishState {
  status: CfPublishStatus;
  message: string;
  url?: string;
  authUrl?: string;
  accounts?: Array<{ id: string; name: string }>;
  error?: string;
}

let cfState: CfPublishState = { status: 'idle', message: '' };
let cfStateTimestamp = 0;

/** If cfState has been stuck in an active status for longer than this, treat it as stale and allow re-entry. */
const CF_STALE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function isCfBusy(): boolean {
  const active: CfPublishStatus[] = ['installing-wrangler', 'building', 'publishing', 'waiting-for-browser-approval'];
  if (!active.includes(cfState.status)) return false;
  // Guard against permanently stuck state: if it's been active for too long, treat as stale
  if (Date.now() - cfStateTimestamp > CF_STALE_TIMEOUT_MS) {
    console.warn('[protovibe:cloudflare] Stale active state detected, resetting.');
    cfState = { status: 'error', message: 'Previous operation timed out.' };
    return false;
  }
  return true;
}

function setCfState(state: CfPublishState): void {
  cfState = state;
  cfStateTimestamp = Date.now();
}

const PUBLISH_META_PATH = path.resolve(process.cwd(), 'protovibe-data.json');

function readPublishMeta(): Record<string, any> {
  if (!fs.existsSync(PUBLISH_META_PATH)) return {};
  try { return JSON.parse(fs.readFileSync(PUBLISH_META_PATH, 'utf-8')); } catch { return {}; }
}

function writePublishMeta(data: Record<string, any>): void {
  fs.writeFileSync(PUBLISH_META_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}


function parseWranglerAccounts(output: string): Array<{ id: string; name: string }> {
  const accounts: Array<{ id: string; name: string }> = [];
  let seenHeader = false;
  for (const line of output.split('\n')) {
    if (line.includes('Account Name') && line.includes('Account ID')) { seenHeader = true; continue; }
    if (!seenHeader) continue;
    if (/^[-|⎯\s]+$/.test(line)) continue;
    const parts = line.split('|');
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const id = parts[1].trim();
      if (name && /^[a-f0-9]{32}$/i.test(id)) accounts.push({ id, name });
    }
  }
  return accounts;
}

/** Environment overrides that suppress all interactive wrangler prompts. */
const WRANGLER_NON_INTERACTIVE_ENV: Record<string, string> = {
  CI: '1',
  WRANGLER_SEND_METRICS: 'false',
  DO_NOT_TRACK: '1',
};

function spawnCmd(
  cmd: string,
  args: string[],
  opts: { cwd: string; env?: NodeJS.ProcessEnv; onData?: (chunk: string) => void; timeoutMs?: number },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: opts.cwd, env: opts.env ?? process.env, stdio: 'pipe' });
    let out = '';
    let settled = false;
    const settle = (fn: typeof resolve | typeof reject, val: string | Error) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      (fn as any)(val);
    };

    const onChunk = (buf: Buffer) => { const t = buf.toString(); out += t; opts.onData?.(t); };
    child.stdout.on('data', onChunk);
    child.stderr.on('data', onChunk);
    child.on('close', (code) =>
      code === 0
        ? settle(resolve, out)
        : settle(reject, new Error(`[exit ${code}] ${out.slice(-600)}`)),
    );
    child.on('error', (err) => settle(reject, err));

    const timeoutMs = opts.timeoutMs ?? 3 * 60 * 1000; // default 3 min
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, 5000);
      settle(reject, new Error(`Command timed out after ${timeoutMs / 1000}s. Output:\n${out.slice(-400)}`));
    }, timeoutMs);
  });
}

async function runCloudflarePublish(projectName: string, accountId?: string, apiToken?: string): Promise<void> {
  const cwd = process.cwd();
  const baseEnv: NodeJS.ProcessEnv = { ...process.env, ...WRANGLER_NON_INTERACTIVE_ENV };
  if (apiToken) {
    baseEnv.CLOUDFLARE_API_TOKEN = apiToken;
  }

  // 0. Verify wrangler is available
  try {
    await spawnCmd('pnpm', ['exec', 'wrangler', '--version'], { cwd, env: baseEnv, timeoutMs: 15_000 });
  } catch {
    setCfState({ status: 'error', message: 'Wrangler is not installed. Run `pnpm add -D wrangler` and try again.' });
    return;
  }

  // 1. Verify auth / get account list
  setCfState({ status: 'publishing', message: 'Checking Cloudflare login…' });
  let whoami = '';
  try {
    whoami = await spawnCmd('pnpm', ['exec', 'wrangler', 'whoami'], { cwd, env: baseEnv, timeoutMs: 30_000 });

    if (whoami.includes('You are not authenticated') || whoami.includes('not logged in')) {
      if (apiToken) {
        setCfState({ status: 'error', message: 'Invalid Cloudflare API Token.', error: whoami });
        return;
      }
      setCfState({ status: 'not-logged-in', message: 'You are not logged in to Cloudflare.' });
      return;
    }
  } catch (whoamiErr) {
    const errStr = String(whoamiErr);
    if (apiToken) {
      setCfState({ status: 'error', message: 'Invalid Cloudflare API Token.', error: errStr });
      return;
    }
    // Distinguish between "not logged in" and genuine failures (network, wrangler crash)
    if (errStr.includes('not authenticated') || errStr.includes('not logged in')) {
      setCfState({ status: 'not-logged-in', message: 'You are not logged in to Cloudflare.' });
    } else {
      setCfState({ status: 'error', message: 'Failed to verify Cloudflare credentials.', error: errStr });
    }
    return;
  }

  // 2. Account selection (only when no explicit account provided)
  const accounts = parseWranglerAccounts(whoami);
  if (!accountId && accounts.length > 1) {
    setCfState({ status: 'account-selection', message: 'Select a Cloudflare account to deploy to.', accounts });
    return;
  }
  const resolvedAccount = accountId ?? accounts[0]?.id;

  // 3. Build
  setCfState({ status: 'building', message: 'Building project…' });
  try {
    await spawnCmd('pnpm', ['build'], { cwd, timeoutMs: 5 * 60 * 1000 });
  } catch (err) {
    setCfState({ status: 'error', message: 'Build failed.', error: String(err) });
    return;
  }

  // 4. Ensure the Pages project exists (create if missing; ignore "already exists" errors)
  setCfState({ status: 'publishing', message: 'Ensuring Cloudflare Pages project exists…' });
  const projectEnv: NodeJS.ProcessEnv = { ...baseEnv };
  if (resolvedAccount) projectEnv.CLOUDFLARE_ACCOUNT_ID = resolvedAccount;
  try {
    await spawnCmd(
      'pnpm',
      ['exec', 'wrangler', 'pages', 'project', 'create', projectName, '--production-branch', 'main'],
      { cwd, env: projectEnv, timeoutMs: 30_000 },
    );
  } catch (err) {
    // "already exists" is expected on subsequent deploys — any other error is surfaced below
    const msg = String(err).toLowerCase();
    if (!msg.includes('already exists') && !msg.includes('a project with this name')) {
      console.warn('[protovibe] wrangler pages project create warning:', err);
    }
  }

  // 5. Deploy
  setCfState({ status: 'publishing', message: 'Deploying to Cloudflare Pages…' });
  const deployEnv: NodeJS.ProcessEnv = { ...baseEnv };
  if (resolvedAccount) deployEnv.CLOUDFLARE_ACCOUNT_ID = resolvedAccount;

  try {
    const output = await spawnCmd(
      'pnpm',
      ['exec', 'wrangler', 'pages', 'deploy', './dist', '--project-name', projectName, '--branch', 'main'],
      { cwd, env: deployEnv, timeoutMs: 3 * 60 * 1000 },
    );
    const hashedMatch = output.match(/https?:\/\/[^\s]+\.pages\.dev[^\s]*/);
    const hashedUrl = hashedMatch ? hashedMatch[0].replace(/[.,;)]+$/, '') : undefined;
    const canonicalUrl = `https://${projectName}.pages.dev`;

    const meta = readPublishMeta();
    meta['cloudflare-pages-url'] = canonicalUrl;
    const history: string[] = Array.isArray(meta['cloudflare-deploy-history']) ? meta['cloudflare-deploy-history'] : [];
    if (hashedUrl && hashedUrl !== canonicalUrl && !history.includes(hashedUrl)) {
      history.unshift(hashedUrl);
      if (history.length > 20) history.pop();
    }
    meta['cloudflare-deploy-history'] = history;
    writePublishMeta(meta);

    setCfState({ status: 'success', message: 'Deployed successfully!', url: canonicalUrl });
  } catch (err) {
    setCfState({ status: 'error', message: 'Deployment failed.', error: String(err) });
  }
}

export const handleCloudflarePublishMetadata: Connect.NextHandleFunction = (_req, res) => {
  try {
    const pkg = readPublishMeta();
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      projectName: pkg['cloudflare-wrangler-project-name'] ?? '',
      url: pkg['cloudflare-pages-url'] ?? '',
      deployHistory: Array.isArray(pkg['cloudflare-deploy-history']) ? pkg['cloudflare-deploy-history'] : [],
    }));
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: String(err) }));
  }
};

export const handleCloudflarePublishSaveName: Connect.NextHandleFunction = (req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    try {
      const { projectName } = JSON.parse(body || '{}');
      if (!projectName?.trim()) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'projectName required' }));
      }
      const pkg = readPublishMeta();
      pkg['cloudflare-wrangler-project-name'] = projectName.trim();
      writePublishMeta(pkg);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: String(err) }));
    }
  });
};

export const handleCloudflarePublishStart: Connect.NextHandleFunction = (req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    try {
      const { accountId, apiToken } = JSON.parse(body || '{}');
      if (isCfBusy()) {
        res.statusCode = 409;
        return res.end(JSON.stringify({ error: 'Publish already in progress.' }));
      }
      const pkg = readPublishMeta();
      const projectName = pkg['cloudflare-wrangler-project-name'] ?? '';
      if (!projectName) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'Project name not set.' }));
      }
      runCloudflarePublish(projectName, accountId || undefined, apiToken || undefined).catch((err) => {
        setCfState({ status: 'error', message: 'Unexpected error.', error: String(err) });
      });
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: String(err) }));
    }
  });
};

export const handleCloudflarePublishStatus: Connect.NextHandleFunction = (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(cfState));
};

export const handleCloudflareLoginStart: Connect.NextHandleFunction = (req, res) => {
  try {
    console.log('\n[protovibe:cloudflare] === Starting Login Process ===');

    if (isCfBusy()) {
      res.statusCode = 409;
      return res.end(JSON.stringify({ error: 'Another operation is already in progress.' }));
    }

    setCfState({ status: 'waiting-for-browser-approval', message: 'Generating login link…' });

    const cwd = process.cwd();

    // 1. Write a temporary CommonJS pre-loader script to spoof the TTY environment
    const spoofScriptPath = path.join(cwd, '.pv-spoof-tty.cjs');
    const spoofScriptContent = `
      Object.defineProperty(process.stdout, 'isTTY', { value: true });
      Object.defineProperty(process.stderr, 'isTTY', { value: true });
      Object.defineProperty(process.stdin, 'isTTY', { value: true });
      process.stdout.columns = 80;
      process.stdout.rows = 24;
      process.stdin.setRawMode = function() {};
    `;
    fs.writeFileSync(spoofScriptPath, spoofScriptContent, 'utf-8');

    // 2. Set up environment variables to inject the script and suppress browser launch
    //    Note: WRANGLER_SEND_METRICS and DO_NOT_TRACK suppress the telemetry prompt that
    //    would otherwise hang the process on first-ever wrangler run.
    const existingNodeOptions = process.env.NODE_OPTIONS || '';
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      BROWSER: 'none',
      FORCE_COLOR: '0',
      WRANGLER_SEND_METRICS: 'false',
      DO_NOT_TRACK: '1',
      NODE_OPTIONS: `${existingNodeOptions} --require "${spoofScriptPath}"`.trim()
    };
    delete env.CI; // Must unset CI to force interactive behavior for the login flow

    console.log('[protovibe:cloudflare] Spawning pnpm exec wrangler login...');

    // 3. Spawn the standard CLI command (letting pnpm handle the binary resolution)
    const child = spawn('pnpm', ['exec', 'wrangler', 'login'], {
      cwd,
      env,
      stdio: 'pipe',
      shell: process.platform === 'win32'
    });

    let out = '';
    const onChunk = (buf: Buffer) => {
      const t = buf.toString();
      out += t;
      console.log('[wrangler]:', t.trim());

      const lower = t.toLowerCase();
      // Wait for the permission prompt before sending the affirmative response
      if (lower.includes('allow wrangler to open a page') || lower.includes('open a page in your browser')) {
        console.log('[protovibe:cloudflare] Saw prompt! Writing "y" to stdin...');
        child.stdin.write('y\n');
      }

      // Auto-answer any other yes/no prompts wrangler might throw (e.g. update prompt)
      if (lower.includes('would you like to') || lower.includes('do you want to')) {
        console.log('[protovibe:cloudflare] Saw unexpected prompt, answering "n":', t.trim());
        child.stdin.write('n\n');
      }

      // Capture the OAuth URL to present in the UI
      const match = out.match(/(https:\/\/dash\.cloudflare\.com\/oauth2\/[^\s]+)/);
      if (match && cfState.status === 'waiting-for-browser-approval' && !cfState.authUrl) {
        console.log('[protovibe:cloudflare] OAuth URL captured successfully!');
        setCfState({ ...cfState, authUrl: match[1] });
      }
    };

    child.stdout.on('data', onChunk);
    child.stderr.on('data', onChunk);

    // 4. Timeout: if the user never completes OAuth in the browser, kill the process
    const LOGIN_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
    const loginTimer = setTimeout(() => {
      console.warn('[protovibe:cloudflare] Login timed out, killing wrangler process.');
      child.kill('SIGTERM');
      setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, 5000);
      setCfState({ status: 'error', message: 'Login timed out. Please try again.' });
    }, LOGIN_TIMEOUT_MS);

    child.on('close', (code) => {
      clearTimeout(loginTimer);
      console.log(`[protovibe:cloudflare] Process exited with code ${code}`);

      // Clean up the temporary script
      try { if (fs.existsSync(spoofScriptPath)) fs.unlinkSync(spoofScriptPath); } catch {}

      if (code === 0) {
        setCfState({ status: 'idle', message: 'Logged in successfully.' });
      } else if (cfState.status === 'waiting-for-browser-approval') {
        setCfState({ status: 'error', message: 'Login failed.', error: out.slice(-600) });
      }
    });

    child.on('error', (err) => {
      clearTimeout(loginTimer);
      try { if (fs.existsSync(spoofScriptPath)) fs.unlinkSync(spoofScriptPath); } catch {}
      setCfState({ status: 'error', message: 'Failed to start login process.', error: String(err) });
    });

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true }));
  } catch (err) {
    console.error('[protovibe:cloudflare] Server exception during login:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: String(err) }));
  }
};