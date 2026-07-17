// plugins/protovibe/src/ui/components/ElementsPanel.tsx
// Left-hand DOM tree of the active canvas iframe. Hovering a row draws the
// canvas hover outline (via PV_TREE_HOVER — see bridge.ts), clicking selects
// the element through the same focusElement path a canvas click uses.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, ChevronsDownUp, ChevronsUpDown, ListTree } from 'lucide-react';
import { useProtovibe } from '../context/ProtovibeContext';
import { theme } from '../theme';
import { isElementAllowed } from '../utils/traversal';
import { ELEMENTS_PANEL_WIDTH_PX } from '../constants/layout';
import type { IframeTab } from './ShellNavBar';

// Guardrails for very large documents: traversal stops once the whole tree
// holds MAX_TREE_NODES elements, and any single parent lists at most
// MAX_CHILDREN_PER_NODE children (the rest collapse into a "+N more" row).
const MAX_TREE_NODES = 3000;
const MAX_CHILDREN_PER_NODE = 200;
// Initial expansion stops once this many rows would be visible.
const AUTO_EXPAND_MAX_ROWS = 300;
// DOM mutations are coalesced into one rebuild per window.
const REBUILD_DEBOUNCE_MS = 300;

const SKIPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'TEMPLATE', 'TITLE', 'VITE-ERROR-OVERLAY']);

interface TreeNode {
  id: string;
  el: HTMLElement;
  tag: string;
  /** Component name from data-pv-component-id or the React fiber tree. */
  componentName: string | null;
  idAttr: string | null;
  editable: boolean;
  depth: number;
  children: TreeNode[];
  /** Children beyond MAX_CHILDREN_PER_NODE, shown as a "+N more" row. */
  hiddenChildren: number;
}

type Row =
  | { kind: 'node'; node: TreeNode }
  | { kind: 'more'; key: string; depth: number; count: number };

function shouldSkipElement(el: Element): boolean {
  if (SKIPPED_TAGS.has(el.tagName)) return true;
  // Protovibe's own chrome (selection overlays, playground UI) is not content.
  if ((el as HTMLElement).dataset?.pvUi === 'true') return true;
  if (el.hasAttribute('data-pv-overlay-layer')) return true;
  return false;
}

// Resolve the name a React devtools-style tree would give this element: walk
// the fiber's return chain and take the first named function/class component,
// but only if no other host element sits in between — that way just the root
// DOM node of a component carries its name, not every div inside it.
function getReactComponentName(el: HTMLElement): string | null {
  const key = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
  if (!key) return null;
  let fiber = (el as any)[key];
  if (!fiber) return null;
  let f = fiber.return;
  let hops = 0;
  while (f && hops < 30) {
    if (typeof f.type === 'string') return null; // hit the enclosing DOM element first
    const name = fiberTypeName(f.type);
    if (name) return name;
    f = f.return;
    hops++;
  }
  return null;
}

// Unwrap forwardRef ({ render }) and memo ({ type }) wrappers to a display name.
function fiberTypeName(t: any): string | null {
  if (!t) return null;
  if (typeof t === 'function') return t.displayName || t.name || null;
  if (typeof t === 'object') {
    return t.displayName || fiberTypeName(t.render) || fiberTypeName(t.type) || null;
  }
  return null;
}

function ensureRuntimeId(el: HTMLElement): string {
  let rId = el.getAttribute('data-pv-runtime-id');
  if (!rId) {
    rId = 'pv-' + Math.random().toString(36).substring(2);
    el.setAttribute('data-pv-runtime-id', rId);
  }
  return rId;
}

type ElementsPanelProps = {
  activeIframeTab: IframeTab;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
};

export const ElementsPanel: React.FC<ElementsPanelProps> = ({ activeIframeTab, iframeRef }) => {
  const { focusElement, currentBaseTarget } = useProtovibe();

  const [roots, setRoots] = useState<TreeNode[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  // Stable node ids per element so expansion state survives rebuilds. Entries
  // for elements dropped by a reload garbage-collect with their document.
  const nodeIdsRef = useRef(new WeakMap<HTMLElement, string>());
  const nextIdRef = useRef(1);
  // The tree auto-expands once per loaded document / tab, not on every rebuild.
  const didInitExpandRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const getNodeId = useCallback((el: HTMLElement): string => {
    let id = nodeIdsRef.current.get(el);
    if (!id) {
      id = `n${nextIdRef.current++}`;
      nodeIdsRef.current.set(el, id);
    }
    return id;
  }, []);

  const treeSupported = activeIframeTab !== 'sketchpad';

  const buildTree = useCallback(() => {
    const body = iframeRef.current?.contentDocument?.body;
    if (!body) {
      setRoots([]);
      setTruncated(false);
      return;
    }
    let count = 0;
    let didTruncate = false;

    const visit = (el: HTMLElement, depth: number): TreeNode | null => {
      if (shouldSkipElement(el)) return null;
      if (count >= MAX_TREE_NODES) {
        didTruncate = true;
        return null;
      }
      count++;
      const componentName =
        el.getAttribute('data-pv-component-id') || getReactComponentName(el);
      const node: TreeNode = {
        id: getNodeId(el),
        el,
        tag: el.tagName.toLowerCase(),
        componentName,
        idAttr: el.id || null,
        editable: isElementAllowed(el),
        depth,
        children: [],
        hiddenChildren: 0,
      };
      const children = el.children;
      for (let i = 0; i < children.length; i++) {
        if (node.children.length >= MAX_CHILDREN_PER_NODE) {
          node.hiddenChildren = children.length - i;
          didTruncate = true;
          break;
        }
        if (count >= MAX_TREE_NODES) {
          didTruncate = true;
          node.hiddenChildren = children.length - i;
          break;
        }
        const child = visit(children[i] as HTMLElement, depth + 1);
        if (child) node.children.push(child);
      }
      return node;
    };

    const newRoots: TreeNode[] = [];
    for (let i = 0; i < body.children.length; i++) {
      const node = visit(body.children[i] as HTMLElement, 0);
      if (node) newRoots.push(node);
    }
    setRoots(newRoots);
    setTruncated(didTruncate);

    // First build for this document: expand top levels breadth-first until the
    // visible row budget is spent.
    if (!didInitExpandRef.current) {
      didInitExpandRef.current = true;
      const initial = new Set<string>();
      let visible = newRoots.length;
      const queue = [...newRoots];
      while (queue.length > 0) {
        const n = queue.shift()!;
        if (n.children.length === 0) continue;
        if (visible + n.children.length > AUTO_EXPAND_MAX_ROWS) continue;
        initial.add(n.id);
        visible += n.children.length;
        queue.push(...n.children);
      }
      setExpanded(initial);
    }
  }, [iframeRef, getNodeId]);

  // Build the tree and track DOM mutations only while the panel is mounted and
  // the active tab supports it — when hidden, this component is unmounted, so
  // no observers run and no tree is retained.
  useEffect(() => {
    if (!treeSupported) {
      setRoots([]);
      setTruncated(false);
      return;
    }
    const iframe = iframeRef.current;
    if (!iframe) return;

    didInitExpandRef.current = false;
    let observer: MutationObserver | null = null;
    let timer: number | null = null;

    const scheduleRebuild = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        buildTree();
      }, REBUILD_DEBOUNCE_MS);
    };

    const attachObserver = () => {
      observer?.disconnect();
      const body = iframe.contentDocument?.body;
      if (!body) return;
      observer = new MutationObserver(scheduleRebuild);
      observer.observe(body, { childList: true, subtree: true });
    };

    // A reload replaces the document: re-scan and re-observe the new body.
    const handleLoad = () => {
      didInitExpandRef.current = false;
      buildTree();
      attachObserver();
    };

    buildTree();
    attachObserver();
    iframe.addEventListener('load', handleLoad);
    return () => {
      iframe.removeEventListener('load', handleLoad);
      observer?.disconnect();
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [treeSupported, iframeRef, activeIframeTab, buildTree]);

  const setCanvasHover = useCallback((el: HTMLElement | null) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage(
      { type: 'PV_TREE_HOVER', runtimeId: el ? ensureRuntimeId(el) : null },
      '*'
    );
  }, [iframeRef]);

  // Never leave a stale hover outline behind when the panel unmounts.
  useEffect(() => () => { setCanvasHover(null); }, [setCanvasHover]);

  const handleSelect = useCallback((node: TreeNode) => {
    focusElement(node.el);
    try {
      node.el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    } catch {}
  }, [focusElement]);

  const toggleNode = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const all = new Set<string>();
    const walk = (n: TreeNode) => {
      if (n.children.length > 0) all.add(n.id);
      n.children.forEach(walk);
    };
    roots.forEach(walk);
    setExpanded(all);
  }, [roots]);

  const collapseAll = useCallback(() => setExpanded(new Set()), []);

  // Auto-expand ancestors of the current selection and scroll its row into view.
  useEffect(() => {
    if (!currentBaseTarget || !treeSupported) return;
    const doc = iframeRef.current?.contentDocument;
    if (!doc || currentBaseTarget.ownerDocument !== doc) return;
    const targetId = nodeIdsRef.current.get(currentBaseTarget);
    if (!targetId) return; // outside the (possibly truncated) tree

    setExpanded(prev => {
      const next = new Set(prev);
      let p = currentBaseTarget.parentElement;
      while (p && p !== doc.body) {
        const id = nodeIdsRef.current.get(p as HTMLElement);
        if (id) next.add(id);
        p = p.parentElement;
      }
      return next;
    });
    // After the expansion has rendered, reveal the row inside the panel.
    requestAnimationFrame(() => {
      const row = scrollRef.current?.querySelector(`[data-pv-tree-row="${targetId}"]`);
      row?.scrollIntoView({ block: 'nearest' });
    });
  }, [currentBaseTarget, treeSupported, iframeRef, roots]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    const walk = (n: TreeNode) => {
      out.push({ kind: 'node', node: n });
      if (!expanded.has(n.id)) return;
      n.children.forEach(walk);
      if (n.hiddenChildren > 0) {
        out.push({ kind: 'more', key: `${n.id}-more`, depth: n.depth + 1, count: n.hiddenChildren });
      }
    };
    roots.forEach(walk);
    return out;
  }, [roots, expanded]);

  const stopScrollEventEscape = (event: React.UIEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const headerButtonStyle = (enabled: boolean): React.CSSProperties => ({
    width: 24,
    height: 22,
    border: 'none',
    borderRadius: 4,
    cursor: enabled ? 'pointer' : 'default',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    color: enabled ? theme.text_tertiary : theme.text_low,
    padding: 0,
  });

  return (
    <div
      data-pv-ui="true"
      style={{
        width: ELEMENTS_PANEL_WIDTH_PX,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        background: theme.bg_strong,
        borderRight: `1px solid ${theme.border_default}`,
        color: theme.text_default,
        fontFamily: theme.font_ui,
        fontSize: 12,
      }}
      onWheelCapture={stopScrollEventEscape}
      onTouchMoveCapture={stopScrollEventEscape}
    >
      <div
        style={{
          height: 36,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px 0 12px',
          borderBottom: `1px solid ${theme.border_default}`,
          gap: 8,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 12, color: theme.text_secondary, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ListTree size={14} />
          Elements
        </span>
        <div style={{ display: 'flex', gap: 2 }}>
          <button
            onClick={expandAll}
            disabled={!treeSupported || roots.length === 0}
            data-tooltip="Expand all"
            style={headerButtonStyle(treeSupported && roots.length > 0)}
            onMouseEnter={e => { e.currentTarget.style.background = theme.bg_low; e.currentTarget.style.color = theme.text_secondary; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.text_tertiary; }}
          >
            <ChevronsUpDown size={14} />
          </button>
          <button
            onClick={collapseAll}
            disabled={!treeSupported || roots.length === 0}
            data-tooltip="Collapse all"
            style={headerButtonStyle(treeSupported && roots.length > 0)}
            onMouseEnter={e => { e.currentTarget.style.background = theme.bg_low; e.currentTarget.style.color = theme.text_secondary; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.text_tertiary; }}
          >
            <ChevronsDownUp size={14} />
          </button>
        </div>
      </div>

      {truncated && (
        <div
          style={{
            flexShrink: 0,
            padding: '6px 12px',
            fontSize: 11,
            lineHeight: 1.4,
            color: theme.warning_primary,
            background: theme.warning_low,
            borderBottom: `1px solid ${theme.border_default}`,
          }}
        >
          Large page — the tree is capped at {MAX_TREE_NODES.toLocaleString()} elements.
        </div>
      )}

      {!treeSupported ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', color: theme.text_tertiary, fontSize: 12, lineHeight: 1.5 }}>
          The elements tree is available on the App and Components tabs.
        </div>
      ) : rows.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', color: theme.text_tertiary, fontSize: 12 }}>
          No elements yet
        </div>
      ) : (
        <div
          ref={scrollRef}
          style={{ flex: 1, minHeight: 0, overflow: 'auto', overscrollBehavior: 'contain' }}
          onMouseLeave={() => { setCanvasHover(null); setHoveredRowId(null); }}
        >
          <div style={{ width: 'max-content', minWidth: '100%', padding: '4px 0' }}>
            {rows.map(row => {
              if (row.kind === 'more') {
                return (
                  <div
                    key={row.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      height: 22,
                      paddingLeft: 12 + row.depth * 14 + 16,
                      paddingRight: 12,
                      color: theme.text_low,
                      whiteSpace: 'nowrap',
                      fontStyle: 'italic',
                    }}
                  >
                    +{row.count.toLocaleString()} more…
                  </div>
                );
              }
              const { node } = row;
              const isSelected = currentBaseTarget === node.el;
              const isHovered = hoveredRowId === node.id;
              const hasChildren = node.children.length > 0 || node.hiddenChildren > 0;
              const isExpanded = expanded.has(node.id);
              return (
                <div
                  key={node.id}
                  data-pv-tree-row={node.id}
                  onMouseEnter={() => { setHoveredRowId(node.id); setCanvasHover(node.el); }}
                  onMouseLeave={() => { setHoveredRowId(prev => (prev === node.id ? null : prev)); }}
                  onClick={() => handleSelect(node)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    height: 22,
                    paddingLeft: 6 + node.depth * 14,
                    paddingRight: 12,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    background: isSelected ? theme.accent_tertiary : isHovered ? theme.bg_low : 'transparent',
                    boxShadow: isSelected ? `inset 2px 0 0 ${theme.accent_default}` : 'none',
                  }}
                >
                  {hasChildren ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleNode(node.id); }}
                      style={{
                        width: 16,
                        height: 16,
                        flexShrink: 0,
                        border: 'none',
                        background: 'transparent',
                        color: theme.text_tertiary,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                      }}
                    >
                      <ChevronRight
                        size={12}
                        style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.1s' }}
                      />
                    </button>
                  ) : (
                    <span style={{ width: 16, flexShrink: 0 }} />
                  )}
                  {node.componentName ? (
                    <>
                      <span style={{ color: node.editable ? theme.text_default : theme.text_secondary, fontWeight: 500 }}>
                        {node.componentName}
                      </span>
                      <span style={{ color: theme.text_low, marginLeft: 6 }}>{node.tag}</span>
                    </>
                  ) : (
                    <span style={{ color: node.editable ? theme.text_default : theme.text_tertiary }}>
                      {node.tag}
                    </span>
                  )}
                  {node.idAttr && (
                    <span style={{ color: theme.text_low, marginLeft: 6 }}>#{node.idAttr}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
