// plugins/protovibe/src/ui/ProtovibePreviewer.tsx
// Runs INSIDE the user's app iframe. Listens for PV_TOGGLE_COMPONENTS_OVERLAY
// and shows a full-screen catalog + variant-matrix playground.
import React, { useState, useEffect, memo, useCallback, useRef } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { theme } from './theme';

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

async function discoverComponents(forceFresh = false): Promise<ComponentEntry[]> {
  // Build a name → refs map. By default we use the static glob (HMR-tracked);
  // when forceFresh is true (refresh button), we dynamic-import every glob path
  // with a cache-busting query so latest pvConfig — including invalidCombinations
  // and exampleValue — is read from disk regardless of HMR boundaries.
  const cacheBust = forceFresh ? `?t=${Date.now()}` : '';
  const globRefs: Record<string, { Component: React.ComponentType<any>; DefaultContent?: React.ComponentType<any>; PreviewWrapper?: React.ComponentType<any>; filePath: string; config: PvConfig }> = {};

  const ingestModule = (filePath: string, mod: any) => {
    const pvConfig = mod?.pvConfig as PvConfig | undefined;
    if (!pvConfig?.name) return;
    const Component = mod[pvConfig.name];
    if (typeof Component !== 'function' && !(Component && typeof Component === 'object' && '$$typeof' in Component)) return;
    const DefaultContent = typeof mod.PvDefaultContent === 'function' ? mod.PvDefaultContent : undefined;
    const PreviewWrapper = typeof mod.PvPreviewWrapper === 'function' ? mod.PvPreviewWrapper : undefined;
    globRefs[pvConfig.name] = { Component, DefaultContent, PreviewWrapper, filePath, config: pvConfig };
  };

  if (forceFresh) {
    await Promise.all(Object.keys(allModules).map(async (filePath) => {
      try {
        const mod = await import(/* @vite-ignore */ filePath + cacheBust);
        ingestModule(filePath, mod);
      } catch (e) {
        console.warn(`[Previewer] Failed to refresh ${filePath}:`, e);
      }
    }));
  } else {
    for (const [filePath, mod] of Object.entries(allModules as Record<string, any>)) {
      ingestModule(filePath, mod);
    }
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
        const mod = await import(/* @vite-ignore */ resolvedPath + cacheBust);
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
): { combos: Record<string, any>[], isCapped: boolean } {
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

  if (varyEntries.length === 0) return { combos: [{ ...baseProps }], isCapped: false };

  const MAX_COMBOS = 1000;

  // Pre-trim: only include props whose cumulative combinations stay under MAX_COMBOS.
  // Skipped props are dropped entirely rather than causing a partial explosion.
  const trimmedEntries: [string, any[]][] = [];
  let estimatedTotal = 1;
  for (const entry of varyEntries) {
    const factor = entry[1].length;
    if (estimatedTotal * factor > MAX_COMBOS) break;
    trimmedEntries.push(entry);
    estimatedTotal *= factor;
  }
  const isCapped = trimmedEntries.length < varyEntries.length;

  let combos: Record<string, any>[] = [{ ...baseProps }];
  for (const [key, values] of trimmedEntries) {
    const nextCombos: Record<string, any>[] = [];
    for (const combo of combos) {
      for (const val of values) {
        const next = { ...combo };
        if (val === undefined) {
          delete next[key];
        } else {
          next[key] = val;
        }
        nextCombos.push(next);
      }
    }
    combos = nextCombos;
  }

  // Sort: ascending by total number of props set (least set -> most set)
  combos.sort((a, b) => {
    const countProps = (c: Record<string, any>) => Object.keys(c).length;
    const propDiff = countProps(a) - countProps(b);

    if (propDiff !== 0) return propDiff;

    // Tie-breaker: more text labels filled -> first
    if (textPropKeys.length > 0) {
      const countFilled = (c: Record<string, any>) =>
        textPropKeys.filter(k => c[k] != null && c[k] !== '').length;
      return countFilled(b) - countFilled(a);
    }
    return 0;
  });

  return { combos, isCapped };
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
        border: `1px solid ${theme.border_tertiary}`,
        background: '#222222',
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
            padding: '8px',
            borderTop: `1px solid ${theme.border_tertiary}`,
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px',
          }}
        >
          {propTokens.map((token, i) => {
            const isNone = token.endsWith('=none');
            return (
              <span
                key={i}
                style={{
                  fontSize: 9,
                  fontFamily: 'monospace',
                  lineHeight: 1,
                  padding: '3px 6px',
                  borderRadius: '4px',
                  background: isNone ? 'transparent' : theme.bg_tertiary,
                  color: isNone ? theme.text_low : theme.text_secondary,
                  border: isNone ? `1px dashed ${theme.border_default}` : `1px solid ${theme.border_default}`,
                }}
              >
                {token}
              </span>
            );
          })}
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
        background: '#222222',
        border: `1px solid ${theme.border_tertiary}`,
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
        e.currentTarget.style.borderColor = theme.border_accent;
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = theme.border_tertiary;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Label column — fixed 30% width */}
      <div
        style={{
          width: '30%',
          flexShrink: 0,
          padding: '14px 14px',
          borderRight: `1px solid ${theme.border_tertiary}`,
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
            color: theme.text_default,
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
              color: theme.text_tertiary,
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
          borderBottom: `1px solid ${theme.border_tertiary}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
          background: theme.bg_default,
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
              background: theme.bg_secondary,
              border: `1px solid ${theme.border_default}`,
              borderRadius: 6,
              color: theme.text_default,
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
                color: theme.text_tertiary,
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
        <span style={{ fontSize: 11, color: theme.text_low, whiteSpace: 'nowrap' }}>
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
                color: theme.text_low,
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
  const { combos: allCombos, isCapped: generationCapped } = generateCombinations(config.props || {}, baseProps);
  const checkers = config.invalidCombinations ?? [];
  const isCapped = generationCapped && checkers.length === 0;
  const combos = checkers.length > 0
    ? allCombos.filter((combo: Record<string, any>) => !checkers.some(fn => fn(combo)))
    : allCombos;
  const [variantSearch, setVariantSearch] = useState('');
  const lastTargetPropsRef = useRef<Record<string, any> | null>(null);

  const visibleCombos = variantSearch.trim()
    ? combos.filter((combo: Record<string, any>) => {
        const label = comboLabel(combo, config.props || {}).toLowerCase();
        const searchTokens = variantSearch.toLowerCase().trim().split(/\s+/);
        return searchTokens.every(token => label.includes(token));
      })
    : combos;

  useEffect(() => {
    // Only run if we have target props, we haven't processed THESE exact props yet, and there are combos to check
    if (!targetProps || lastTargetPropsRef.current === targetProps || visibleCombos.length === 0) return;

    lastTargetPropsRef.current = targetProps;
    let bestMatchIndex = 0;
    let maxScore = -1;

    visibleCombos.forEach((combo: Record<string, any>, i: number) => {
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

    // Poll until the variant cell, the component element, AND its Babel-injected
    // data-pv-loc-* locator attributes are all present. A fixed timeout was racing
    // with mount/locator attachment, causing the first focus to land on a stale
    // ancestor and leaving the inspector scoped to the consumer-side source
    // (which has minimal parsedClasses, so the "Which state to style" list rendered
    // incomplete until the user clicked the tab a second time).
    const MAX_ATTEMPTS = 20;
    const INTERVAL_MS = 50;
    const INITIAL_DELAY_MS = 50;
    let attempts = 0;
    const tryFocus = () => {
      const cell = document.querySelector(`[data-combo-index="${bestMatchIndex}"]`);
      const targetEl = cell
        ? (cell.querySelector(`[data-pv-component-id="${config.name}"]`) || cell.querySelector('[data-pv-component-id]'))
        : null;
      const hasLocator = targetEl
        ? Array.from(targetEl.attributes).some(a => a.name.startsWith('data-pv-loc-'))
        : false;

      if (targetEl && hasLocator) {
        targetEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
        targetEl.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
        return;
      }
      attempts++;
      if (attempts < MAX_ATTEMPTS) {
        setTimeout(tryFocus, INTERVAL_MS);
        return;
      }
      // Last-resort: dispatch on whatever we have so the user still sees a focus.
      if (targetEl) {
        targetEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
        targetEl.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
      }
    };
    setTimeout(tryFocus, INITIAL_DELAY_MS);
  }, [targetProps, visibleCombos, config]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Matrix header */}
      <div
        style={{
          padding: '10px 16px',
          borderBottom: `1px solid ${theme.border_tertiary}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
          background: theme.bg_default,
        }}
      >
        <div
          role="button"
          tabIndex={0}
          aria-label="Back to components list"
          onClick={onBack}
          onKeyDown={e => activateOnEnterOrSpace(e, onBack)}
          style={{
            background: theme.bg_secondary,
            border: 'none',
            borderRadius: 6,
            color: theme.text_secondary,
            fontSize: 12,
            padding: '5px 10px',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans, system-ui, sans-serif)',
            flexShrink: 0,
          }}
        >
          ← Back
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: theme.text_default }}>{displayName}</span>
        {config.description && (
          <span style={{ fontSize: 12, color: theme.text_low, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
              background: theme.bg_secondary,
              border: `1px solid ${theme.border_default}`,
              borderRadius: 6,
              color: theme.text_default,
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
                color: theme.text_tertiary,
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
        <span style={{ fontSize: 11, color: theme.text_low, flexShrink: 0 }}>
          {visibleCombos.length}/{combos.length}
        </span>
      </div>

      {/* Variant grid */}
      <div
        data-pv-overlay-clip="true"
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
          {visibleCombos.map((combo: Record<string, any>, i: number) => (
            <PreviewCell
              key={i}
              index={i}
              entry={entry}
              props={combo}
              label={comboLabel(combo, config.props || {})}
            />
          ))}
        </div>

        {isCapped && (
          <div style={{
            textAlign: 'center',
            padding: '24px 16px',
            marginTop: '16px',
            borderTop: `1px solid ${theme.destructive_secondary}`,
            color: theme.destructive_default,
            fontSize: 13,
            fontFamily: 'var(--font-sans, system-ui, sans-serif)',
            lineHeight: 1.6,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
              Some props were skipped — too many combinations to display safely.
            </div>
            <div style={{ color: theme.destructive_default, fontSize: 12 }}>
              Use <code style={{ background: theme.destructive_low, padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>invalidCombinations</code> in your component's <code style={{ background: theme.destructive_low, padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>pvConfig</code> to filter out prop combinations you don't want to preview, reducing the total count.
            </div>
          </div>
        )}
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
    background: ${theme.bg_strong};
  }
  ::-webkit-scrollbar-thumb {
    background: ${theme.border_default};
    border-radius: 4px;
    border: 2px solid ${theme.bg_strong};
  }
  ::-webkit-scrollbar-thumb:hover,
  *:hover::-webkit-scrollbar-thumb {
    background: ${theme.border_strong};
  }
  ::-webkit-scrollbar-corner {
    background: ${theme.bg_strong};
  }
`;

export function ProtovibePreviewer() {
  const [discovered, setDiscovered] = useState<ComponentEntry[]>([]);
  const [selected, setSelected] = useState<ComponentEntry | null>(null);
  const [targetProps, setTargetProps] = useState<Record<string, any> | null>(null);
  const [search, setSearch] = useState('');
  const [refreshFlash, setRefreshFlash] = useState(false);
  const [pendingOpen, setPendingOpen] = useState<{ normalised: string, currentProps: any } | null>(null);

  const refresh = useCallback(async (forceFresh = false) => {
    const entries = await discoverComponents(forceFresh);
    setDiscovered(entries);
  }, []);

  const handleRefreshClick = useCallback(() => {
    refresh(true);
    setRefreshFlash(true);
    setTimeout(() => setRefreshFlash(false), 400);
  }, [refresh]);

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
      } else {
        // Component is not yet in the discovered list (likely a brand-new file
        // whose HMR notification hasn't arrived). Stash the request and trigger
        // a refresh; the effect below will resolve it once discovery updates.
        setPendingOpen({ normalised, currentProps: currentProps || null });
        refresh();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [discovered, refresh]);

  // Resolve a pending PV_OPEN_COMPONENT request once `discovered` includes it.
  useEffect(() => {
    if (!pendingOpen) return;
    const match = discovered.find(entry => {
      const entryPath = entry.filePath.replace(/\\/g, '/').replace(/^\//, '').replace(/\.[^/.]+$/, '');
      return entryPath === pendingOpen.normalised;
    });
    if (match) {
      setSelected(match);
      setTargetProps(pendingOpen.currentProps);
      setPendingOpen(null);
    }
  }, [discovered, pendingOpen]);

  return (
    <>
    <style>{PREVIEWER_STYLE}</style>
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        backgroundColor: theme.bg_sunken,
        color: theme.text_default,
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
          backgroundColor: theme.bg_default,
          borderBottom: `1px solid ${theme.border_tertiary}`,
          flexShrink: 0,
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: theme.text_default,
            letterSpacing: '-0.3px',
            userSelect: 'none',
          }}
        >
          Component Playground
        </span>

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: 11, color: theme.text_low }}>
          Click any element to inspect &amp; edit styles
        </span>

        <div
          role="button"
          tabIndex={0}
          aria-label="Refresh components"
          onClick={handleRefreshClick}
          onKeyDown={e => activateOnEnterOrSpace(e, handleRefreshClick)}
          style={{
            width: 16,
            height: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: refreshFlash ? theme.text_default : theme.text_tertiary,
            fontSize: 14,
            flexShrink: 0,
            transition: 'color 0.15s, transform 0.4s ease',
            transform: refreshFlash ? 'rotate(360deg)' : 'rotate(0deg)',
          }}
          onMouseEnter={e => {
            if (!refreshFlash) e.currentTarget.style.color = theme.text_secondary;
          }}
          onMouseLeave={e => {
            if (!refreshFlash) e.currentTarget.style.color = theme.text_tertiary;
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
