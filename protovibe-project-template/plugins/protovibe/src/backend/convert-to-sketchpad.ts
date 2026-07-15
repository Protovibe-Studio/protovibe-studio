// plugins/protovibe/src/backend/convert-to-sketchpad.ts
//
// Turns a DOM snapshot of a selected App-tab element into a flat, logic-free
// JSX block (maps expanded, conditionals resolved — the snapshot IS the
// rendered output) with pv-editable-zone / pv-block comments at every level,
// and stores it in the internal server-side clipboard so the existing paste
// flow drops it into a Sketchpad frame.

import fs from 'fs';
import path from 'path';
import { Connect } from 'vite';
import * as babel from '@babel/core';
import babelPluginSyntaxJsx from '@babel/plugin-syntax-jsx';
import babelPluginSyntaxTypeScript from '@babel/plugin-syntax-typescript';
import { locatorMap, clipboard } from '../shared/state';
import { findPvConfigByComponentId } from './server';

interface SnapshotRect { left: number; top: number; width: number; height: number }

interface SnapshotNode {
  kind: 'element' | 'text';
  text?: string;
  tag?: string;
  className?: string;
  attrs?: Record<string, string>;
  componentId?: string;
  pvBlockId?: string;
  props?: Record<string, string | number | boolean>;
  hasChildrenProp?: boolean;
  /** Flat mode: kept component emptied of its content — freeze its height too. */
  flatShell?: boolean;
  locId?: string;
  isSvg?: boolean;
  rect?: SnapshotRect;
  children?: SnapshotNode[];
}

interface ConvertOptions {
  layoutMode: 'flex' | 'absolute' | 'flat';
  keepComponents: string[];
}

const genId = () => Math.random().toString(36).substring(2, 8);

// ---------------------------------------------------------------------------
// Escaping / attribute helpers
// ---------------------------------------------------------------------------

function escapeJsxText(s: string): string {
  return s
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

const KNOWN_HTML_TAGS = new Set([
  'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'button', 'input',
  'textarea', 'select', 'option', 'a', 'ul', 'ol', 'li', 'table', 'thead',
  'tbody', 'tfoot', 'tr', 'th', 'td', 'label', 'section', 'header', 'footer',
  'nav', 'main', 'aside', 'form', 'fieldset', 'legend', 'figure', 'figcaption',
  'blockquote', 'pre', 'hr', 'em', 'strong', 'b', 'i', 'u',
]);

// Plain-HTML attributes worth carrying into the flat copy, plus their JSX names.
const HTML_ATTR_MAP: Record<string, string> = {
  for: 'htmlFor',
  value: 'defaultValue',
  checked: 'defaultChecked',
  readonly: 'readOnly',
  maxlength: 'maxLength',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  tabindex: 'tabIndex',
};

const HTML_ATTR_ALLOWLIST = new Set([
  'href', 'target', 'rel', 'alt', 'title', 'placeholder', 'type', 'disabled',
  'name', 'role', 'for', 'value', 'checked', 'readonly', 'maxlength', 'rows',
  'cols', 'colspan', 'rowspan', 'src', 'width', 'height', 'tabindex',
]);

function jsxHtmlAttrs(attrs: Record<string, string> | undefined): string {
  if (!attrs) return '';
  const parts: string[] = [];
  for (const [rawName, value] of Object.entries(attrs)) {
    const name = rawName.toLowerCase();
    if (name.startsWith('aria-') || name.startsWith('data-')) {
      parts.push(value === '' ? rawName : `${rawName}="${escapeJsxAttr(value)}"`);
      continue;
    }
    if (!HTML_ATTR_ALLOWLIST.has(name)) continue;
    const jsxName = HTML_ATTR_MAP[name] || name;
    if (name === 'disabled' || name === 'checked' || name === 'readonly') {
      parts.push(jsxName === 'defaultChecked' ? 'defaultChecked' : jsxName);
    } else {
      parts.push(`${jsxName}="${escapeJsxAttr(value)}"`);
    }
  }
  return parts.length > 0 ? ' ' + parts.join(' ') : '';
}

// SVG attribute names → JSX camelCase (class handled separately).
function svgAttrName(name: string): string {
  if (name.includes('-')) {
    return name.replace(/-([a-z])/g, (_m, c) => c.toUpperCase());
  }
  return name;
}

function jsxSvgAttrs(attrs: Record<string, string> | undefined): string {
  if (!attrs) return '';
  const parts: string[] = [];
  for (const [name, value] of Object.entries(attrs)) {
    if (name.startsWith('aria-') || name.startsWith('data-')) {
      parts.push(`${name}="${escapeJsxAttr(value)}"`);
    } else {
      parts.push(`${svgAttrName(name)}="${escapeJsxAttr(value)}"`);
    }
  }
  return parts.length > 0 ? ' ' + parts.join(' ') : '';
}

function dedupeClasses(className: string | undefined): string {
  if (!className) return '';
  return Array.from(new Set(className.split(/\s+/).filter(Boolean))).join(' ');
}

// Tailwind tokens describing flow layout / positioning — meaningless (or
// harmful) once elements carry measured absolute positions.
const LAYOUT_CLASS_RE = /^(?:[a-z-]+:)?(?:flex$|flex-|inline-flex$|grid$|grid-|inline-grid$|gap-|space-|justify-|items-|content-|place-|self-|grow$|grow-|shrink$|shrink-|basis-|order-|col-|row-|absolute$|relative$|fixed$|sticky$|static$|inset|left-|right-|top-|bottom-|m-|mx-|my-|mt-|mb-|ml-|mr-|-m[trblxy]?-|w-|h-|min-w-|min-h-|max-w-|max-h-|size-)/;

function stripLayoutClasses(className: string): string {
  return className
    .split(/\s+/)
    .filter(c => c && !LAYOUT_CLASS_RE.test(c))
    .join(' ');
}

// Viewport-anchored positioning makes no sense inside a sketchpad frame —
// a fixed/sticky element would escape the frame entirely. Stripped from every
// converted element (flex mode; absolute mode strips these via
// LAYOUT_CLASS_RE already).
const FIXED_POS_CLASS_RE = /^(?:[a-z-]+:)?(?:fixed|sticky)$/;

// The pasted root gets its own inline position:absolute from the paste
// handler, so any positioning classes on it (absolute, fixed, inset/offsets)
// would fight that placement.
const ROOT_POS_CLASS_RE = /^(?:[a-z-]+:)?(?:absolute$|fixed$|sticky$|inset|top-|bottom-|left-|right-|-top-|-bottom-|-left-|-right-)/;

function stripPositioningClasses(className: string, isRoot: boolean): string {
  return className
    .split(/\s+/)
    .filter(c => c && !FIXED_POS_CLASS_RE.test(c) && !(isRoot && ROOT_POS_CLASS_RE.test(c)))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Source-AST prop recovery for kept components
// ---------------------------------------------------------------------------

type RecoveredProp = { name: string; code: string };

const fileAstCache = new Map<string, { content: string; ast: babel.types.File | null }>();

function parseFileCached(file: string): { content: string; ast: babel.types.File | null } | null {
  if (fileAstCache.has(file)) return fileAstCache.get(file)!;
  const absolutePath = path.resolve(process.cwd(), file);
  if (!fs.existsSync(absolutePath)) return null;
  const content = fs.readFileSync(absolutePath, 'utf-8');
  let ast: babel.types.File | null = null;
  try {
    ast = babel.parseSync(content, {
      filename: absolutePath,
      plugins: [babelPluginSyntaxJsx, [babelPluginSyntaxTypeScript, { isTSX: true }]],
    }) as babel.types.File | null;
  } catch {
    ast = null;
  }
  const entry = { content, ast };
  fileAstCache.set(file, entry);
  return entry;
}

// Pull literal-valued props off the JSX opening element the locator points at.
// Non-literal expressions, spreads, event handlers and pv bookkeeping are skipped.
function recoverPropsFromSource(locId: string): RecoveredProp[] | null {
  const data = locatorMap.get(locId);
  if (!data?.file || !Array.isArray(data.bStart)) return null;
  const parsed = parseFileCached(data.file);
  if (!parsed?.ast) return null;

  let props: RecoveredProp[] | null = null;
  babel.traverse(parsed.ast, {
    JSXElement(p) {
      const loc = p.node.loc;
      if (!loc) return;
      if (loc.start.line !== data.bStart[0] || loc.start.column !== data.bStart[1]) return;
      const collected: RecoveredProp[] = [];
      for (const attr of p.node.openingElement.attributes) {
        if (!babel.types.isJSXAttribute(attr)) continue;
        if (attr.name.type === 'JSXNamespacedName') continue;
        const name = attr.name.name as string;
        if (name === 'style' || name.startsWith('on') || name.startsWith('data-pv-')) continue;
        if (attr.value === null) {
          collected.push({ name, code: name });
        } else if (babel.types.isStringLiteral(attr.value)) {
          collected.push({ name, code: `${name}="${escapeJsxAttr(attr.value.value)}"` });
        } else if (babel.types.isJSXExpressionContainer(attr.value)) {
          const exp = attr.value.expression;
          if (babel.types.isStringLiteral(exp)) {
            collected.push({ name, code: `${name}="${escapeJsxAttr(exp.value)}"` });
          } else if (babel.types.isNumericLiteral(exp)) {
            collected.push({ name, code: `${name}={${exp.value}}` });
          } else if (babel.types.isBooleanLiteral(exp)) {
            collected.push({ name, code: `${name}={${exp.value}}` });
          }
        }
      }
      props = collected;
      p.stop();
    },
  });
  return props;
}

// Fallback: reconstruct props from data-* attributes the component exposes on
// its root DOM element, matched against the pvConfig props schema.
function recoverPropsFromDom(node: SnapshotNode, propsSchema: Record<string, any> | undefined): RecoveredProp[] {
  if (!propsSchema || !node.attrs) return [];
  const recovered: RecoveredProp[] = [];
  for (const key of Object.keys(propsSchema)) {
    const domValue =
      node.attrs[`data-${key}`] ??
      node.attrs[`data-${key.toLowerCase()}`] ??
      node.attrs[`data-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`];
    if (domValue === undefined) continue;
    const type = propsSchema[key]?.type;
    if (type === 'boolean' || domValue === 'true' || domValue === 'false') {
      if (domValue === 'true') recovered.push({ name: key, code: key });
      else if (domValue !== 'false') recovered.push({ name: key, code: `${key}="${escapeJsxAttr(domValue)}"` });
    } else if (domValue !== '') {
      recovered.push({ name: key, code: `${key}="${escapeJsxAttr(domValue)}"` });
    }
  }
  return recovered;
}

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

interface ConvertContext {
  keep: Set<string>;
  layoutMode: 'flex' | 'absolute' | 'flat';
  configs: Map<string, any>;
  imports: Map<string, string>; // name -> importPath
  warnings: string[];
  blockCount: number;
}

// Find the JSX children of a kept component: BFS through its rendered DOM,
// stopping descent at the first nodes that carry a data-pv-block id (those
// came from the app file / default content — i.e. real JSX children). The
// component's internal wrapper markup between root and blocks is dropped.
function findPvBlockDescendants(node: SnapshotNode): SnapshotNode[] {
  const result: SnapshotNode[] = [];
  for (const child of node.children || []) {
    if (child.kind !== 'element') continue;
    if (child.pvBlockId) {
      result.push(child);
    } else {
      result.push(...findPvBlockDescendants(child));
    }
  }
  return result;
}


function subtreeText(node: SnapshotNode): string {
  if (node.kind === 'text') return node.text || '';
  return (node.children || []).map(subtreeText).filter(Boolean).join(' ');
}

// Flat / ungrouped mode: rebuild the snapshot as one parent with ALL
// descendants as direct children, each positioned absolutely relative to the
// root. Containers become empty background shells (their classes paint the
// box, children follow later so they stack on top); leaves keep their text;
// kept components self-close and their content children are lifted next to
// them. Emission order = document order, which is exactly the right paint
// order for overlapping absolute layers.
function flattenForUngrouped(root: SnapshotNode, keep: Set<string>): SnapshotNode {
  const items: SnapshotNode[] = [];

  const handle = (node: SnapshotNode) => {
    if (node.kind === 'text') {
      items.push(node);
      return;
    }
    if (node.isSvg || node.tag === 'img') {
      items.push(node);
      return;
    }
    if (node.componentId && keep.has(node.componentId)) {
      const contentChildren = findPvBlockDescendants(node);
      const content = contentChildren.length > 0
        ? contentChildren
        : node.hasChildrenProp
          ? (node.children || []).filter(c => c.kind === 'element')
          : [];
      // When nothing is lifted out, keep the rendered subtree on the shell so
      // text-bearing components (allowTextInChildren) still recover their text
      // via subtreeText at emit time.
      items.push({
        ...node,
        children: content.length > 0 ? [] : node.children,
        hasChildrenProp: false,
        flatShell: content.length > 0,
      });
      content.forEach(handle);
      return;
    }
    const elementChildren = (node.children || []).filter(c => c.kind === 'element');
    if (elementChildren.length === 0) {
      items.push(node);
      return;
    }
    // Container: keep it as a childless shell (with any inline text), then
    // lift every child to the top level.
    items.push({ ...node, children: (node.children || []).filter(c => c.kind === 'text') });
    for (const child of node.children || []) {
      if (child.kind === 'element') handle(child);
    }
  };

  for (const child of root.children || []) handle(child);

  // The root itself always becomes a plain container so the flat list nests
  // exactly one level deep — even when the selection was a component.
  return { ...root, componentId: undefined, hasChildrenProp: false, children: items };
}

// A wrapper whose content is fixed/absolute-positioned measures 0x0 because
// such children don't contribute to its size. When the converted root is
// degenerate, replace its rect with the union of its descendants' rects so
// the frozen box (and child offsets) reflect what's actually visible.
function ensureRootRect(root: SnapshotNode): void {
  const rect = root.rect;
  if (rect && rect.width >= 1 && rect.height >= 1) return;
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  const visit = (node: SnapshotNode) => {
    const r = node.rect;
    if (node.kind === 'element' && r && r.width >= 1 && r.height >= 1) {
      left = Math.min(left, r.left);
      top = Math.min(top, r.top);
      right = Math.max(right, r.left + r.width);
      bottom = Math.max(bottom, r.top + r.height);
    }
    for (const child of node.children || []) visit(child);
  };
  for (const child of root.children || []) visit(child);
  if (right > left && bottom > top) {
    root.rect = { left, top, width: right - left, height: bottom - top };
  }
}

// Inline style for absolute mode, positioned relative to the nearest emitted
// ancestor (parentRect). Rects are viewport-absolute in the snapshot.
function absoluteStyle(node: SnapshotNode, parentRect: SnapshotRect | null, opts: { width?: boolean; height?: boolean }): string {
  const rect = node.rect;
  if (!rect) return '';
  const left = parentRect ? rect.left - parentRect.left : 100;
  const top = parentRect ? rect.top - parentRect.top : 100;
  let style = `position: 'absolute', left: ${Math.round(left)}, top: ${Math.round(top)}`;
  if (opts.width) style += `, width: ${Math.round(rect.width)}`;
  if (opts.height) style += `, height: ${Math.round(rect.height)}`;
  return ` style={{ ${style} }}`;
}

interface EmitState {
  // Rect of the nearest emitted (absolute-positioned) ancestor; null at root.
  parentRect: SnapshotRect | null;
  // Absolute mode applies at every nesting level, kept components included:
  // components get a hardcoded width (height stays content-driven), flattened
  // elements get hardcoded width + height.
  absolute: boolean;
  // True only for the converted root — its positioning classes are stripped
  // because the paste handler injects its own inline absolute position.
  isRoot: boolean;
  indent: string;
}

// Emits a full pv-block (comments + element) for one snapshot node.
// Returns null when the node is skippable noise.
function emitBlock(node: SnapshotNode, ctx: ConvertContext, state: EmitState): string | null {
  if (node.kind === 'text') {
    const text = (node.text || '').trim();
    if (!text) return null;
    const id = genId();
    const style = state.absolute ? absoluteStyle(node, state.parentRect, { width: true, height: true }) : '';
    const sketchpadEl = state.absolute ? ` data-pv-sketchpad-el="${id}"` : '';
    ctx.blockCount++;
    const i = state.indent;
    return `${i}{/* pv-block-start:${id} */}\n${i}<span data-pv-block="${id}"${sketchpadEl}${style}>${escapeJsxText(text)}</span>\n${i}{/* pv-block-end:${id} */}`;
  }

  if (node.componentId && ctx.keep.has(node.componentId)) {
    return emitKeptComponent(node, ctx, state);
  }
  return emitHtmlElement(node, ctx, state);
}

function emitChildrenZone(children: SnapshotNode[], ctx: ConvertContext, state: EmitState): string | null {
  const childBlocks = children
    .map(child => emitBlock(child, ctx, { ...state, isRoot: false, indent: state.indent + '  ' }))
    .filter(Boolean) as string[];
  if (childBlocks.length === 0) return null;
  const zoneId = genId();
  const i = state.indent;
  return `${i}{/* pv-editable-zone-start:${zoneId} */}\n${childBlocks.join('\n')}\n${i}{/* pv-editable-zone-end:${zoneId} */}`;
}

function emitKeptComponent(node: SnapshotNode, ctx: ConvertContext, state: EmitState): string | null {
  const cfg = ctx.configs.get(node.componentId!);
  if (!cfg) {
    ctx.warnings.push(`${node.componentId}: pvConfig not found — flattened to HTML instead.`);
    return emitHtmlElement(node, ctx, state);
  }

  const name = cfg.name || node.componentId!;
  if (cfg.importPath) ctx.imports.set(name, cfg.importPath);

  // Props, best source first:
  // 1. React fiber props from the snapshot — the instance's actual resolved
  //    props (sees icons, labels, and dynamic expressions already evaluated).
  // 2. Source AST via the node's locator (literal-valued attributes).
  // 3. DOM data-* attributes matched against the pvConfig schema.
  let props: RecoveredProp[] = [];
  if (node.props && Object.keys(node.props).length > 0) {
    for (const [key, value] of Object.entries(node.props)) {
      if (key.startsWith('data-pv-') || key === 'children' || key === 'style') continue;
      if (typeof value === 'boolean') {
        props.push({ name: key, code: value ? key : `${key}={false}` });
      } else if (typeof value === 'number') {
        props.push({ name: key, code: `${key}={${value}}` });
      } else {
        props.push({ name: key, code: `${key}="${escapeJsxAttr(value)}"` });
      }
    }
  } else {
    const fromSource = node.locId ? recoverPropsFromSource(node.locId) : null;
    if (fromSource) {
      props = fromSource;
    } else {
      ctx.warnings.push(`${name}: no fiber props or source locator — props recovered from DOM attributes only.`);
    }
  }
  const haveNames = new Set(props.map(p => p.name));
  for (const domProp of recoverPropsFromDom(node, cfg.props)) {
    if (!haveNames.has(domProp.name)) props.push(domProp);
  }
  // data-pv bookkeeping and className are re-emitted separately or dropped.
  props = props.filter(p => !p.name.startsWith('data-pv-') && p.name !== 'children');

  // Positioning classes in a className override (fixed/sticky, and everything
  // positional in absolute mode) would fight the sketchpad placement.
  props = props.flatMap(p => {
    if (p.name !== 'className') return [p];
    const m = p.code.match(/^className="(.*)"$/);
    if (!m) return [p];
    const cleaned = state.absolute
      ? stripLayoutClasses(m[1])
      : stripPositioningClasses(m[1], state.isRoot);
    return cleaned ? [{ name: 'className', code: `className="${cleaned}"` }] : [];
  });

  const id = genId();
  const sketchpadEl = state.absolute ? ` data-pv-sketchpad-el="${id}"` : '';
  const propsStr = props.length > 0 ? ' ' + props.map(p => p.code).join(' ') : '';
  const i = state.indent;
  ctx.blockCount++;

  // Absolute conversion continues inside kept components: their JSX children
  // are positioned from measured DOM rects relative to the component root.
  const childState: EmitState = { parentRect: node.rect || state.parentRect, absolute: state.absolute, isRoot: false, indent: i + '  ' };

  let childBlocks = findPvBlockDescendants(node);
  if (childBlocks.length === 0 && node.hasChildrenProp) {
    // The instance was passed children, but they carry no pv-block markers
    // (map-rendered content, expressions). Take the rendered DOM as the
    // reference and copy whatever is listed: the component's direct element
    // children. Gated on hasChildrenProp so leaf components (Button etc.)
    // never duplicate their internal markup as children.
    childBlocks = (node.children || []).filter(c => c.kind === 'element');
  }
  if (childBlocks.length > 0) {
    // Container component: absolute children don't contribute to auto height,
    // so freeze both dimensions and mark it as an absolute layout context.
    const style = state.absolute ? absoluteStyle(node, state.parentRect, { width: true, height: true }) : '';
    const layoutModeAttr = state.absolute ? ' data-layout-mode="absolute"' : '';
    const open = `<${name} data-pv-block="${id}"${sketchpadEl}${layoutModeAttr}${style}${propsStr}`;
    const zone = emitChildrenZone(childBlocks, ctx, childState);
    if (zone) {
      return `${i}{/* pv-block-start:${id} */}\n${i}${open}>\n${zone}\n${i}</${name}>\n${i}{/* pv-block-end:${id} */}`;
    }
  }
  // Leaf component: hardcode only the width — height stays content-driven.
  // (Flat-mode shells emptied of their content also freeze the height.)
  const style = state.absolute ? absoluteStyle(node, state.parentRect, { width: true, height: !!node.flatShell }) : '';
  const open = `<${name} data-pv-block="${id}"${sketchpadEl}${style}${propsStr}`;

  if (cfg.allowTextInChildren) {
    const text = subtreeText(node).trim();
    if (text) {
      return `${i}{/* pv-block-start:${id} */}\n${i}${open}>${escapeJsxText(text)}</${name}>\n${i}{/* pv-block-end:${id} */}`;
    }
  }

  return `${i}{/* pv-block-start:${id} */}\n${i}${open} />\n${i}{/* pv-block-end:${id} */}`;
}

function emitSvgSubtree(node: SnapshotNode, indent: string): string {
  const tag = node.tag!;
  const cls = dedupeClasses(node.className);
  const clsStr = cls ? ` className="${escapeJsxAttr(cls)}"` : '';
  const attrsStr = jsxSvgAttrs(node.attrs);
  const children = node.children || [];
  if (children.length === 0) {
    return `${indent}<${tag}${clsStr}${attrsStr} />`;
  }
  const inner = children
    .map(c => (c.kind === 'text' ? `${indent}  ${escapeJsxText(c.text || '')}` : emitSvgSubtree(c, indent + '  ')))
    .join('\n');
  return `${indent}<${tag}${clsStr}${attrsStr}>\n${inner}\n${indent}</${tag}>`;
}

function emitHtmlElement(node: SnapshotNode, ctx: ConvertContext, state: EmitState): string | null {
  const i = state.indent;

  // Whole SVG subtree is one block — icons and illustrations move as a unit.
  if (node.isSvg) {
    const id = genId();
    const style = state.absolute ? absoluteStyle(node, state.parentRect, { width: true, height: true }) : '';
    const sketchpadEl = state.absolute ? ` data-pv-sketchpad-el="${id}"` : '';
    ctx.blockCount++;
    const svg = emitSvgSubtree(node, i);
    // Inject block attrs into the svg root tag.
    const withBlock = svg.replace(/^(\s*<svg)/, `$1 data-pv-block="${id}"${sketchpadEl}${style}`);
    return `${i}{/* pv-block-start:${id} */}\n${withBlock}\n${i}{/* pv-block-end:${id} */}`;
  }

  // Images become background-image divs per the Protovibe styling rules.
  if (node.tag === 'img') {
    const src = node.attrs?.src;
    if (!src) return null;
    const id = genId();
    const rect = node.rect;
    let className = `bg-[url('${src}')] bg-contain bg-center bg-no-repeat`;
    let style = '';
    if (state.absolute) {
      style = absoluteStyle(node, state.parentRect, { width: true, height: true });
    } else if (rect) {
      className += ` w-[${rect.width}px] h-[${rect.height}px]`;
    }
    const sketchpadEl = state.absolute ? ` data-pv-sketchpad-el="${id}"` : '';
    ctx.blockCount++;
    return `${i}{/* pv-block-start:${id} */}\n${i}<div data-pv-block="${id}"${sketchpadEl}${style} className="${escapeJsxAttr(className)}" />\n${i}{/* pv-block-end:${id} */}`;
  }

  const tag = KNOWN_HTML_TAGS.has(node.tag || '') ? node.tag! : 'div';
  let className = dedupeClasses(node.className);
  if (state.absolute) className = stripLayoutClasses(className);
  else className = stripPositioningClasses(className, state.isRoot);

  const children = node.children || [];
  const elementChildren = children.filter(c => c.kind === 'element');
  const textChildren = children.filter(c => c.kind === 'text');

  // Skip pure structural noise: unnamed empty wrappers contribute nothing.
  if (children.length === 0 && !className && !node.attrs) return null;

  const id = genId();
  const hasElementChildren = elementChildren.length > 0;
  const style = state.absolute
    ? absoluteStyle(node, state.parentRect, { width: true, height: true })
    : '';
  const sketchpadEl = state.absolute ? ` data-pv-sketchpad-el="${id}"` : '';
  const layoutModeAttr = state.absolute && hasElementChildren ? ' data-layout-mode="absolute"' : '';
  const clsStr = className ? ` className="${escapeJsxAttr(className)}"` : '';
  const attrsStr = jsxHtmlAttrs(node.attrs);
  const open = `<${tag} data-pv-block="${id}"${sketchpadEl}${layoutModeAttr}${style}${clsStr}${attrsStr}`;
  ctx.blockCount++;

  if (!hasElementChildren) {
    const text = textChildren.map(t => t.text).join(' ').trim();
    if (text) {
      return `${i}{/* pv-block-start:${id} */}\n${i}${open}>${escapeJsxText(text)}</${tag}>\n${i}{/* pv-block-end:${id} */}`;
    }
    return `${i}{/* pv-block-start:${id} */}\n${i}${open} />\n${i}{/* pv-block-end:${id} */}`;
  }

  const childState: EmitState = {
    parentRect: node.rect || state.parentRect,
    absolute: state.absolute,
    isRoot: false,
    indent: i + '  ',
  };
  const zone = emitChildrenZone(children, ctx, childState);
  if (!zone) {
    return `${i}{/* pv-block-start:${id} */}\n${i}${open} />\n${i}{/* pv-block-end:${id} */}`;
  }
  return `${i}{/* pv-block-start:${id} */}\n${i}${open}>\n${zone}\n${i}</${tag}>\n${i}{/* pv-block-end:${id} */}`;
}

// ---------------------------------------------------------------------------
// HTTP handler
// ---------------------------------------------------------------------------

export const handleConvertToSketchpad = (req: any, res: any, server: import('vite').ViteDevServer): void => {
  let body = '';
  req.on('data', (chunk: string) => { body += chunk; });
  req.on('end', async () => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { file, snapshot, options } = JSON.parse(body || '{}') as {
        file: string;
        snapshot: SnapshotNode;
        options: ConvertOptions;
      };
      if (!snapshot || snapshot.kind !== 'element') {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'No element snapshot provided' }));
      }

      fileAstCache.clear();

      const keep = new Set(options?.keepComponents || []);
      const configs = new Map<string, any>();
      for (const componentId of keep) {
        try {
          const cfg = await findPvConfigByComponentId(componentId, server);
          if (cfg) configs.set(componentId, cfg);
        } catch {
          // resolved lazily; missing configs fall back to flatten with a warning
        }
      }

      const layoutMode: ConvertOptions['layoutMode'] =
        options?.layoutMode === 'absolute' || options?.layoutMode === 'flat' ? options.layoutMode : 'flex';

      const ctx: ConvertContext = {
        keep,
        layoutMode,
        configs,
        imports: new Map(),
        warnings: [],
        blockCount: 0,
      };

      ensureRootRect(snapshot);

      const rootState: EmitState = {
        parentRect: null,
        absolute: layoutMode !== 'flex',
        isRoot: true,
        indent: '',
      };

      const emittedRoot = layoutMode === 'flat' ? flattenForUngrouped(snapshot, keep) : snapshot;
      const block = emitBlock(emittedRoot, ctx, rootState);
      if (!block) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'Selected element produced no content' }));
      }

      const imports = Array.from(ctx.imports.entries()).map(([name, importPath]) => ({
        name,
        path: importPath,
        isDefault: false,
      }));

      clipboard.data = { file: file || '', blocks: [block], imports };

      res.end(JSON.stringify({
        success: true,
        blockCount: ctx.blockCount,
        imports: imports.map(({ name, path: p }) => ({ name, path: p })),
        warnings: Array.from(new Set(ctx.warnings)),
      }));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: String(err) }));
    }
  });
};
