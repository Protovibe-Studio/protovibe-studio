// plugins/protovibe/src/ui/ProtovibePreviewer.tsx
// Runs INSIDE the user's app iframe. Listens for PV_TOGGLE_COMPONENTS_OVERLAY
// and shows a full-screen catalog + variant-matrix playground.
import React, { useState, useEffect, memo } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

// ─── Component discovery ───────────────────────────────────────────────────────
// Vite resolves these glob patterns relative to the project root at build time.
const allModules = import.meta.glob('/src/**/*.{tsx,jsx}', { eager: true });

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
  filePath: string;
}

const DISCOVERED: ComponentEntry[] = [];
for (const [filePath, mod] of Object.entries(allModules as Record<string, any>)) {
  const pvConfig = mod?.pvConfig as PvConfig | undefined;
  if (!pvConfig?.name) continue;
  const Component = mod[pvConfig.name];
  if (typeof Component !== 'function') continue;
  DISCOVERED.push({ config: pvConfig, Component, filePath });
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

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
  propsSchema: Record<string, { type: string; options?: string[] }>,
  baseProps: Record<string, any>
): Record<string, any>[] {
  const varyEntries: [string, any[]][] = [];
  const textPropKeys: string[] = [];
  for (const [key, schema] of Object.entries(propsSchema || {})) {
    if (schema.type === 'boolean') {
      varyEntries.push([key, [false, true]]);
    } else if (schema.type === 'select' && schema.options && schema.options.length <= 12) {
      varyEntries.push([key, schema.options]);
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
  // Drop combos where every text prop is absent — avoids all-empty-label previews
  if (textPropKeys.length > 0) {
    combos = combos.filter(combo => textPropKeys.some(k => combo[k] != null && combo[k] !== ''));
  }
  // Sort: more text labels filled → first
  if (textPropKeys.length > 1) {
    combos.sort((a, b) => {
      const countFilled = (c: Record<string, any>) =>
        textPropKeys.filter(k => c[k] != null && c[k] !== '').length;
      return countFilled(b) - countFilled(a);
    });
  }
  return combos;
}

/** Build a short human-readable label for a variant combination. */
function comboLabel(combo: Record<string, any>, propsSchema: Record<string, { type: string; options?: string[] }>): string {
  const variantKeys = Object.keys(propsSchema || {}).filter(k => {
    const s = propsSchema[k];
    if (s.type === 'boolean') return true;
    if (s.type === 'string') return true;
    if (s.type === 'select' && (s.options?.length ?? 0) <= 12) return true;
    if (s.type === 'select' && (s.options?.length ?? 0) > 12 && iconExampleForKey(k)) return true;
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

// ─── Preview theme context ────────────────────────────────────────────────────
// ─── Sub-components ────────────────────────────────────────────────────────────

const PreviewCell: React.FC<{
  entry: ComponentEntry;
  props: Record<string, any>;
  label: string;
}> = memo(({ entry, props, label }) => {
  // Split label into individual "key=value" tokens for display
  const propTokens = label === 'default' ? [] : label.split('  ').filter(Boolean);

  return (
    <div
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
          <entry.Component {...props}>
            {typeof entry.config.defaultContent !== 'string' ? entry.config.defaultContent : undefined}
          </entry.Component>
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
                color: '#555',
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
    <button
      onClick={onClick}
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
        appearance: 'none',
        WebkitAppearance: 'none',
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
          <Component {...defaultProps}>
            {typeof config.defaultContent !== 'string' ? config.defaultContent : undefined}
          </Component>
        </ErrorBoundary>
      </div>
    </button>
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
        <input
          type="text"
          placeholder="Search components…"
          value={search}
          onChange={e => onSearch(e.target.value)}
          autoFocus
          style={{
            flex: 1,
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: 6,
            color: '#e5e5e5',
            fontSize: 12,
            fontFamily: 'sans-serif',
            padding: '6px 10px',
            outline: 'none',
          }}
        />
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
              {DISCOVERED.length === 0 ? 'No components with pvConfig found.' : 'No results.'}
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

const VariantMatrix: React.FC<{ entry: ComponentEntry; onBack: () => void }> = ({ entry, onBack }) => {
  const { config } = entry;
  const displayName = config.displayName || config.name;
  const baseProps = parseDefaultProps(config.defaultProps || '');
  const allCombos = generateCombinations(config.props || {}, baseProps);
  const checkers = config.invalidCombinations ?? [];
  const combos = checkers.length > 0
    ? allCombos.filter(combo => !checkers.some(fn => fn(combo)))
    : allCombos;
  const [variantSearch, setVariantSearch] = useState('');

  const visibleCombos = variantSearch.trim()
    ? combos.filter(combo =>
        comboLabel(combo, config.props || {}).toLowerCase().includes(variantSearch.toLowerCase())
      )
    : combos;

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
        <button
          onClick={onBack}
          style={{
            background: '#222',
            border: 'none',
            borderRadius: 6,
            color: '#aaa',
            fontSize: 12,
            padding: '5px 10px',
            cursor: 'pointer',
            fontFamily: 'sans-serif',
            flexShrink: 0,
          }}
        >
          ← Back
        </button>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#e5e5e5' }}>{displayName}</span>
        {config.description && (
          <span style={{ fontSize: 12, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {config.description}
          </span>
        )}
        <input
          type="text"
          placeholder="Filter variants…"
          value={variantSearch}
          onChange={e => setVariantSearch(e.target.value)}
          style={{
            marginLeft: 'auto',
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: 6,
            color: '#e5e5e5',
            fontSize: 12,
            fontFamily: 'sans-serif',
            padding: '5px 10px',
            outline: 'none',
            width: 180,
            flexShrink: 0,
          }}
        />
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

export function ProtovibePreviewer() {
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<ComponentEntry | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'PV_TOGGLE_COMPONENTS_OVERLAY') {
        const show = !!e.data.show;
        if (show) setSelected(null);
        setVisible(show);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        backgroundColor: '#0d0d0d',
        color: '#e5e5e5',
        fontFamily: 'sans-serif',
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
      </div>

      {selected ? (
        <VariantMatrix entry={selected} onBack={() => setSelected(null)} />
      ) : (
        <CatalogView
          entries={DISCOVERED}
          onSelect={entry => {
            setSelected(entry);
            setSearch('');
          }}
          search={search}
          onSearch={setSearch}
        />
      )}
    </div>
  );
}
