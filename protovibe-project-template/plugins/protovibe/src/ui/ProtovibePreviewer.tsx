// plugins/protovibe/src/ui/ProtovibePreviewer.tsx
// Runs INSIDE the user's app iframe. Listens for PV_TOGGLE_COMPONENTS_OVERLAY
// and shows a full-screen catalog + variant-matrix playground.
import React, { useState, useEffect, memo, useCallback, useRef } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

// ─── Component discovery ───────────────────────────────────────────────────────
// The static glob creates HMR boundaries for all existing component files so
// that class edits via the inspector hot-reload without a full page refresh.
// New files added after the server started aren't in the glob yet — those are
// discovered via a server fetch + dynamic import and shown after a tab switch.
const allModules = import.meta.glob(
  ['/src/**/*.{tsx,jsx}', '!/src/main.tsx', '!/src/store.tsx', '!/src/App.tsx', '!/src/sketchpads/**'],
  { eager: true }
);

interface PvConfig {
  name: string;
  displayName?: string;
  description?: string;
  defaultProps?: string;
  defaultContent?: string | React.ReactNode;
  props?: Record<string, { type: string; options?: string[]; exampleValue?: string }>;
  invalidCombinations?: Array<(props: Record<string, any>) => boolean>;
}

interface ComponentEntry {
  config: PvConfig;
  Component: React.ComponentType<any>;
  DefaultContent?: React.ComponentType<any>;
  PreviewWrapper?: React.ComponentType<any>;
  filePath: string;
}

async function discoverComponents(): Promise<ComponentEntry[]> {
  // Build a name → refs map from the static glob (these get HMR updates).
  const globRefs: Record<string, { Component: React.ComponentType<any>; DefaultContent?: React.ComponentType<any>; PreviewWrapper?: React.ComponentType<any>; filePath: string; config: PvConfig }> = {};
  for (const [filePath, mod] of Object.entries(allModules as Record<string, any>)) {
    const pvConfig = mod?.pvConfig as PvConfig | undefined;
    if (!pvConfig?.name) continue;
    const Component = mod[pvConfig.name];
    if (typeof Component !== 'function' && !(Component && typeof Component === 'object' && '$$typeof' in Component)) continue;
    const DefaultContent = typeof mod.PvDefaultContent === 'function' ? mod.PvDefaultContent : undefined;
    const PreviewWrapper = typeof mod.PvPreviewWrapper === 'function' ? mod.PvPreviewWrapper : undefined;
    globRefs[pvConfig.name] = { Component, DefaultContent, PreviewWrapper, filePath, config: pvConfig };
  }

  // Ask the server for the authoritative component list (includes newly-added files).
  let serverComponents: any[] = [];
  try {
    const res = await fetch('/__get-components');
    const data = await res.json();
    serverComponents = data.components ?? [];
  } catch {
    // Server unavailable — fall back to glob-only list.
    return Object.values(globRefs).map(r => ({ config: r.config, Component: r.Component, DefaultContent: r.DefaultContent, PreviewWrapper: r.PreviewWrapper, filePath: r.filePath }));
  }

  const entries: ComponentEntry[] = [];
  for (const c of serverComponents) {
    if (!c.importPath) continue;
    if (globRefs[c.name]) {
      // Component is in the static glob: use glob refs so HMR works.
      const r = globRefs[c.name];
      entries.push({ config: r.config, Component: r.Component, DefaultContent: r.DefaultContent, PreviewWrapper: r.PreviewWrapper, filePath: r.filePath });
    } else {
      // New file not yet in the glob: dynamic import (no HMR, but visible immediately).
      const resolvedPath = c.importPath.startsWith('@/') ? c.importPath.replace('@/', '/src/') : c.importPath;
      try {
        const mod = await import(/* @vite-ignore */ resolvedPath);
        const pvConfig = mod?.pvConfig as PvConfig | undefined;
        if (!pvConfig?.name) continue;
        const Component = mod[pvConfig.name];
        if (typeof Component !== 'function' && !(Component && typeof Component === 'object' && '$$typeof' in Component)) continue;
        const DefaultContent = typeof mod.PvDefaultContent === 'function' ? mod.PvDefaultContent : undefined;
        const PreviewWrapper = typeof mod.PvPreviewWrapper === 'function' ? mod.PvPreviewWrapper : undefined;
        entries.push({ config: pvConfig, Component, DefaultContent, PreviewWrapper, filePath: resolvedPath });
      } catch (e) {
        console.warn(`[Previewer] Failed to import ${resolvedPath}:`, e);
      }
    }
  }
  return entries;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Render default content for a component entry, unwrapping Fragment wrappers
 * so that children-splitting components (e.g. DialogTrigger) receive individual
 * children instead of a single Fragment element.
 */
function renderDefaultContent(entry: { DefaultContent?: React.ComponentType<any>; config: PvConfig }): React.ReactNode {
  if (entry.DefaultContent) {
    const DefaultContent = entry.DefaultContent as React.FC<any>;
    const result = DefaultContent({});
    if (result && typeof result === 'object' && 'type' in result && result.type === React.Fragment) {
      return (result as any).props.children;
    }
    return result as React.ReactNode;
  }
  if (typeof entry.config.defaultContent !== 'string') {
    return entry.config.defaultContent;
  }
  return undefined;
}

/** Parse a pvConfig.defaultProps string like `variant="default" label="Click me" disabled` into plain props. */
function parseDefaultProps(defaultProps: string): Record<string, any> {
  const result: Record<string, any> = {};
  // Match: key="value", key='value', key={true|false}, or bare key (boolean true)
  const re = /(\w[\w-]*)(?:=(?:"([^"]*)"|'([^']*)'|\{(true|false)\}))?(?=[\s>]|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(defaultProps)) !== null) {
    const [, key, dq, sq, boolStr] = m;
    if (dq !== undefined) result[key] = dq;
    else if (sq !== undefined) result[key] = sq;
    else if (boolStr !== undefined) result[key] = boolStr === 'true';
    else result[key] = true;
  }
  return result;
}

/**
 * Generate the Cartesian product of all select (≤12 options) and boolean props.
 * String props and large selects (icon pickers, etc.) stay fixed at their baseProps value.
 */
// Fixed example values for icon-picker props, keyed by a substring match on the prop name.
const ICON_EXAMPLE: Record<string, string> = {
  prefix: 'Settings',
  suffix: 'ArrowRight',
  left: 'Settings',
  right: 'ArrowRight',
  start: 'Settings',
  end: 'ArrowRight',
};

/** Return the example icon name to use for an icon-picker prop, or null if not an icon prop. */
function iconExampleForKey(key: string): string | null {
  const lower = key.toLowerCase();
  if (!lower.includes('icon')) return null;
  for (const [substr, value] of Object.entries(ICON_EXAMPLE)) {
    if (lower.includes(substr)) return value;
  }
  return 'Settings'; // generic fallback
}

function generateCombinations(
  propsSchema: Record<string, { type: string; options?: string[]; exampleValue?: string }>,
  baseProps: Record<string, any>
): Record<string, any>[] {
  const varyEntries: [string, any[]][] = [];
  const textPropKeys: string[] = [];
  for (const [key, schema] of Object.entries(propsSchema || {})) {
    if (schema.type === 'boolean') {
      varyEntries.push([key, [false, true]]);
    } else if (schema.type === 'select' && schema.options && schema.options.length <= 12) {
      varyEntries.push([key, schema.options]);
    } else if (schema.type === 'iconSearch') {
      // Vary between absent and exampleValue; fall back to key-based heuristic
      const example = schema.exampleValue ?? iconExampleForKey(key);
      if (example) varyEntries.push([key, [undefined, example]]);
    } else if (schema.type === 'select' && schema.options && schema.options.length > 12) {
      // Large select — only vary if it looks like an icon picker
      const example = iconExampleForKey(key);
      if (example) {
        varyEntries.push([key, [undefined, example]]);
      }
    } else if (schema.type === 'string') {
      // Vary text props between absent and the exampleValue (or a Lorem ipsum fallback)
      const example = schema.exampleValue ?? 'Lorem ipsum';
      varyEntries.push([key, [undefined, example]]);
      textPropKeys.push(key);
    }
  }
  if (varyEntries.length === 0) return [{ ...baseProps }];
  let combos: Record<string, any>[] = [{ ...baseProps }];
  for (const [key, values] of varyEntries) {
    combos = combos.flatMap(combo => values.map(val => {
      const next = { ...combo };
      if (val === undefined) {
        delete next[key];
      } else {
        next[key] = val;
      }
      return next;
    }));
  }
  // Sort: ascending by total number of props set (least set -> most set)
  combos.sort((a, b) => {
    const countProps = (c: Record<string, any>) => Object.keys(c).length;
    const propDiff = countProps(a) - countProps(b);
    
    if (propDiff !== 0) return propDiff;
    
    // Tie-breaker: more text labels filled -> first
    if (textPropKeys.length > 1) {
      const countFilled = (c: Record<string, any>) =>
        textPropKeys.filter(k => c[k] != null && c[k] !== '').length;
      return countFilled(b) - countFilled(a);
    }
    return 0;
  });

  return combos;
}

/** Build a short human-readable label for a variant combination. */
function comboLabel(combo: Record<string, any>, propsSchema: Record<string, { type: string; options?: string[]; exampleValue?: string }>): string {
  const variantKeys = Object.keys(propsSchema || {}).filter(k => {
    const s = propsSchema[k];
    if (s.type === 'boolean') return true;
    if (s.type === 'string') return true;
    if (s.type === 'select' && (s.options?.length ?? 0) <= 12) return true;
    if (s.type === 'select' && (s.options?.length ?? 0) > 12 && iconExampleForKey(k)) return true;
    if (s.type === 'iconSearch') return !!(s.exampleValue ?? iconExampleForKey(k));
    return false;
  });
  if (variantKeys.length === 0) return 'default';
  return variantKeys
    .map(k => {
      if (!(k in combo) || combo[k] == null || combo[k] === '') return `${k}=none`;
      // Show string props as "key=text" instead of the full Lorem ipsum value
      if (propsSchema[k]?.type === 'string') return `${k}=text`;
      return `${k}=${JSON.stringify(combo[k])}`;
    })
    .join('  ');
}

function activateOnEnterOrSpace(e: React.KeyboardEvent<HTMLElement>, onActivate: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onActivate();
  }
}

// ─── Preview theme context ────────────────────────────────────────────────────
// ─── Sub-components ────────────────────────────────────────────────────────────

const PreviewCell: React.FC<{
  index: number;
  entry: ComponentEntry;
  props: Record<string, any>;
  label: string;
}> = memo(({ index, entry, props, label }) => {
  // Split label into individual "key=value" tokens for display
  const propTokens = label === 'default' ? [] : label.split('  ').filter(Boolean);

  return (
    <div
      data-combo-index={index}
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 8,
        border: '1px solid #262626',
        background: '#161616',
        height: '100%',
      }}
    >
      <div
        data-pv-preview-area="true"
        className="bg-background-default"
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px 24px',
          borderRadius: '8px 8px 0 0',
          transform: 'scale(1)',
          minHeight: 100,
          color: 'var(--foreground-default)',
        }}
      >
        <ErrorBoundary>
          {entry.PreviewWrapper ? (
            <entry.PreviewWrapper>
              <entry.Component {...props}>
                {renderDefaultContent(entry)}
              </entry.Component>
            </entry.PreviewWrapper>
          ) : (
            <entry.Component {...props}>
              {renderDefaultContent(entry)}
            </entry.Component>
          )}
        </ErrorBoundary>
      </div>
      {propTokens.length > 0 && (
        <div
          style={{
            padding: '5px 8px 6px',
            borderTop: '1px solid #222',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '3px 6px',
          }}
        >
          {propTokens.map((token, i) => (
            <span
              key={i}
              style={{
                fontSize: 9,
                color: '#999',
                fontFamily: 'monospace',
                lineHeight: 1.4,
              }}
            >
              {token}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

const CatalogCard: React.FC<{ entry: ComponentEntry; onClick: () => void }> = ({ entry, onClick }) => {
  const { config, Component } = entry;
  const displayName = config.displayName || config.name;
  const defaultProps = parseDefaultProps(config.defaultProps || '');

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${displayName} variants`}
      onClick={onClick}
      onKeyDown={e => activateOnEnterOrSpace(e, onClick)}
      style={{
        background: '#161616',
        border: '1px solid #262626',
        borderRadius: 10,
        padding: 0,
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        transition: 'border-color 0.15s, transform 0.1s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#3a7bfd';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#262626';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Label column — fixed 30% width */}
      <div
        style={{
          width: '30%',
          flexShrink: 0,
          padding: '14px 14px',
          borderRight: '1px solid #222',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 4,
          minWidth: 0,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#e5e5e5',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayName}
        </div>
        {config.description && (
          <div
            style={{
              fontSize: 11,
              color: '#666',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              lineHeight: 1.5,
            }}
          >
            {config.description}
          </div>
        )}
      </div>

      {/* Preview area — fills remaining width */}
      <div
        className="bg-background-default"
        ref={(el) => el?.setAttribute('inert', '')}
        style={{
          color: 'var(--foreground-default)',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 32px',
          borderRadius: '0 10px 10px 0',
          minWidth: 0,
          transform: 'scale(1)',
          minHeight: 100,
        }}
      >
        <ErrorBoundary>
          {entry.PreviewWrapper ? (
            <entry.PreviewWrapper>
              <Component {...defaultProps}>
                {renderDefaultContent(entry)}
              </Component>
            </entry.PreviewWrapper>
          ) : (
            <Component {...defaultProps}>
              {renderDefaultContent(entry)}
            </Component>
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
};

const CatalogView: React.FC<{
  entries: ComponentEntry[];
  onSelect: (e: ComponentEntry) => void;
  search: string;
  onSearch: (s: string) => void;
}> = ({ entries, onSelect, search, onSearch }) => {
  const filtered = entries.filter(e => {
    if (!search) return true;
    const name = (e.config.displayName || e.config.name).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Search bar */}
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid #222',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
          background: '#111',
        }}
      >
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            placeholder="Search components…"
            value={search}
            onChange={e => onSearch(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 6,
              color: '#e5e5e5',
              fontSize: 12,
              fontFamily: 'var(--font-sans, system-ui, sans-serif)',
              padding: '6px 10px',
              paddingRight: search ? 28 : 10,
              outline: 'none',
            }}
          />
          {search && (
            <div
              role="button"
              tabIndex={0}
              aria-label="Clear search"
              onClick={() => onSearch('')}
              onKeyDown={e => activateOnEnterOrSpace(e, () => onSearch(''))}
              style={{
                position: 'absolute',
                right: 6,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#666',
                cursor: 'pointer',
                fontSize: 14,
                lineHeight: 1,
                padding: '2px 4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </div>
          )}
        </div>
        <span style={{ fontSize: 11, color: '#444', whiteSpace: 'nowrap' }}>
          {filtered.length} / {entries.length}
        </span>
      </div>

      {/* List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {filtered.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                color: '#444',
                fontSize: 13,
                paddingTop: 48,
              }}
            >
              {entries.length === 0 ? 'No components with pvConfig found.' : 'No results.'}
            </div>
          )}
          {filtered.map(entry => (
            <CatalogCard key={entry.config.name} entry={entry} onClick={() => onSelect(entry)} />
          ))}
        </div>
      </div>
    </div>
  );
};

const VariantMatrix: React.FC<{ entry: ComponentEntry; targetProps: Record<string, any> | null; onBack: () => void }> = ({ entry, targetProps, onBack }) => {
  const { config } = entry;
  const displayName = config.displayName || config.name;
  const baseProps = parseDefaultProps(config.defaultProps || '');
  const allCombos = generateCombinations(config.props || {}, baseProps);
  const checkers = config.invalidCombinations ?? [];
  const combos = checkers.length > 0
    ? allCombos.filter(combo => !checkers.some(fn => fn(combo)))
    : allCombos;
  const [variantSearch, setVariantSearch] = useState('');
  const lastTargetPropsRef = useRef<Record<string, any> | null>(null);

  const visibleCombos = variantSearch.trim()
    ? combos.filter(combo =>
        comboLabel(combo, config.props || {}).toLowerCase().includes(variantSearch.toLowerCase())
      )
    : combos;

  useEffect(() => {
    // Only run if we have target props, we haven't processed THESE exact props yet, and there are combos to check
    if (!targetProps || lastTargetPropsRef.current === targetProps || visibleCombos.length === 0) return;

    lastTargetPropsRef.current = targetProps;
    let bestMatchIndex = 0;
    let maxScore = -1;

    visibleCombos.forEach((combo, i) => {
      let score = 0;

      for (const [key, schema] of Object.entries(config.props || {})) {
        const tVal = targetProps[key];
        const cVal = combo[key];

        // Normalize to strings for comparison
        const normTarget = (tVal === undefined || tVal === null) ? '' : String(tVal);
        const normCombo = (cVal === undefined || cVal === null) ? '' : String(cVal);

        if (schema.type === 'string') {
          // For strings, we just care about presence vs absence
          const tHasText = normTarget !== '';
          const cHasText = normCombo !== '';
          if (tHasText === cHasText) {
            score += 1;
          }
        } else {
          // For selects and booleans, exact match gets 2 points
          if (normTarget === normCombo) {
            score += 2;
          }
          // Partial match: Target is unset, but combo explicitly sets it to 'default'
          else if (normTarget === '' && normCombo === 'default') {
            score += 1;
          }
        }
      }

      if (score > maxScore) {
        maxScore = score;
        bestMatchIndex = i;
      }
    });

    // Delay the focus to ensure PV_CLEAR_SELECTION from the tab switch is fully processed
    setTimeout(() => {
      const cell = document.querySelector(`[data-combo-index="${bestMatchIndex}"]`);
      if (cell) {
        const targetEl = cell.querySelector(`[data-pv-component-id="${config.name}"]`) || cell.querySelector('[data-pv-component-id]');
        if (targetEl) {
          targetEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
          targetEl.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
        }
      }
    }, 250);
  }, [targetProps, visibleCombos, config]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Matrix header */}
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid #222',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
          background: '#111',
        }}
      >
        <div
          role="button"
          tabIndex={0}
          aria-label="Back to components list"
          onClick={onBack}
          onKeyDown={e => activateOnEnterOrSpace(e, onBack)}
          style={{
            background: '#222',
            border: 'none',
            borderRadius: 6,
            color: '#aaa',
            fontSize: 12,
            padding: '5px 10px',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans, system-ui, sans-serif)',
            flexShrink: 0,
          }}
        >
          ← Back
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#e5e5e5' }}>{displayName}</span>
        {config.description && (
          <span style={{ fontSize: 12, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {config.description}
          </span>
        )}
        <div style={{ marginLeft: 'auto', position: 'relative', width: 180, flexShrink: 0 }}>
          <input
            type="text"
            placeholder="Filter variants…"
            value={variantSearch}
            onChange={e => setVariantSearch(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 6,
              color: '#e5e5e5',
              fontSize: 12,
              fontFamily: 'var(--font-sans, system-ui, sans-serif)',
              padding: '5px 10px',
              paddingRight: variantSearch ? 28 : 10,
              outline: 'none',
            }}
          />
          {variantSearch && (
            <div
              role="button"
              tabIndex={0}
              aria-label="Clear variant filter"
              onClick={() => setVariantSearch('')}
              onKeyDown={e => activateOnEnterOrSpace(e, () => setVariantSearch(''))}
              style={{
                position: 'absolute',
                right: 6,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#666',
                cursor: 'pointer',
                fontSize: 14,
                lineHeight: 1,
                padding: '2px 4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </div>
          )}
        </div>
        <span style={{ fontSize: 11, color: '#444', flexShrink: 0 }}>
          {visibleCombos.length}/{combos.length}
        </span>
      </div>

      {/* Variant grid */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridAutoRows: '1fr',
            gap: 10,
            alignContent: 'start',
          }}
        >
          {visibleCombos.map((combo, i) => (
            <PreviewCell
              key={i}
              index={i}
              entry={entry}
              props={combo}
              label={comboLabel(combo, config.props || {})}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Root Overlay ──────────────────────────────────────────────────────────────

const PREVIEWER_STYLE = `
  [data-pv-preview-area] [disabled],
  [data-pv-preview-area] [data-disabled],
  [data-pv-preview-area] [aria-disabled="true"] {
    pointer-events: auto !important;
    cursor: default !important;
  }

  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-track {
    background: #222222;
  }
  ::-webkit-scrollbar-thumb {
    background: #444444;
    border-radius: 4px;
    border: 2px solid #222222;
  }
  ::-webkit-scrollbar-thumb:hover,
  *:hover::-webkit-scrollbar-thumb {
    background: #6a6a6a;
  }
  ::-webkit-scrollbar-corner {
    background: #222222;
  }
`;

export function ProtovibePreviewer() {
  const [discovered, setDiscovered] = useState<ComponentEntry[]>([]);
  const [selected, setSelected] = useState<ComponentEntry | null>(null);
  const [targetProps, setTargetProps] = useState<Record<string, any> | null>(null);
  const [search, setSearch] = useState('');

  const refresh = useCallback(async () => {
    const entries = await discoverComponents();
    setDiscovered(entries);
  }, []);

  useEffect(() => {
    refresh();
  }, []);

  // Re-run discovery when any glob-tracked component file changes via HMR.
  // This updates the Component refs so the previewer stays in sync.
  useEffect(() => {
    if (import.meta.hot) {
      import.meta.hot.accept(Object.keys(allModules), () => {
        refresh();
      });
    }
  }, [refresh]);

  // When components refresh, update selected to the latest discovered version
  useEffect(() => {
    if (selected) {
      const updated = discovered.find(e => e.config.name === selected.config.name);
      if (updated) {
        setSelected(updated);
      }
    }
  }, [discovered, selected?.config.name]);

  // Allow the parent shell to trigger a refresh (e.g. on tab switch)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'PV_REFRESH_COMPONENTS') refresh();
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [refresh]);

  // Listen for PV_OPEN_COMPONENT messages from the parent shell (triggered when
  // the user clicks a src/components/ui source tab in the inspector).
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.data || e.data.type !== 'PV_OPEN_COMPONENT') return;
      const { filePath, currentProps } = e.data as { filePath: string, currentProps?: any };
      if (!filePath) return;
      // Normalise both sides: forward-slashes, strip leading slash, and strip file extensions
      const normalised = filePath.replace(/\\/g, '/').replace(/^\//, '').replace(/\.[^/.]+$/, '');
      const match = discovered.find(entry => {
        const entryPath = entry.filePath.replace(/\\/g, '/').replace(/^\//, '').replace(/\.[^/.]+$/, '');
        return entryPath === normalised;
      });
      if (match) {
        setSelected(match);
        setTargetProps(currentProps || null);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [discovered]);

  return (
    <>
    <style>{PREVIEWER_STYLE}</style>
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        backgroundColor: '#0d0d0d',
        color: '#e5e5e5',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          height: 44,
          backgroundColor: '#111',
          borderBottom: '1px solid #222',
          flexShrink: 0,
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#e5e5e5',
            letterSpacing: '-0.3px',
            userSelect: 'none',
          }}
        >
          Component Playground
        </span>

        {selected && (
          <>
            <span style={{ color: '#333', fontSize: 14 }}>›</span>
            <span style={{ fontSize: 13, color: '#3a7bfd', fontWeight: 600 }}>
              {selected.config.displayName || selected.config.name}
            </span>
          </>
        )}

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: 11, color: '#444' }}>
          Click any element to inspect &amp; edit styles
        </span>

        <div
          role="button"
          tabIndex={0}
          aria-label="Refresh components"
          onClick={refresh}
          onKeyDown={e => activateOnEnterOrSpace(e, refresh)}
          style={{
            width: 16,
            height: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#666',
            fontSize: 14,
            flexShrink: 0,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#aaa';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '#666';
          }}
        >
          ↻
        </div>
      </div>

      <div style={{ display: selected ? 'none' : 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <CatalogView
          entries={discovered}
          onSelect={entry => setSelected(entry)}
          search={search}
          onSearch={setSearch}
        />
      </div>
      {selected && (
        <VariantMatrix entry={selected} targetProps={targetProps} onBack={() => setSelected(null)} />
      )}
    </div>
    </>
  );
}
