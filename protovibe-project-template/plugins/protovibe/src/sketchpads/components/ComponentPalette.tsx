import React, { useState, useMemo, useRef, useLayoutEffect, useEffect, Component } from 'react';
import type { ComponentEntry } from '../types';
import { parseDefaultProps } from '../utils';
import { theme } from '../../ui/theme';

// ─── Error Boundary ──────────────────────────────────────────────────────────

class PreviewErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ fontSize: 10, color: theme.text_tertiary, padding: 4 }}>Preview unavailable</div>
      );
    }
    return this.props.children;
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function renderDefaultContent(comp: ComponentEntry): React.ReactNode {
  if (comp.DefaultContent) {
    const DC = comp.DefaultContent as React.FC<any>;
    const result = DC({});
    if (result && typeof result === 'object' && 'type' in result && (result as any).type === React.Fragment) {
      return (result as any).props.children;
    }
    return result as React.ReactNode;
  }
  return undefined;
}

// ─── ComponentPreview ────────────────────────────────────────────────────────

const PREVIEW_WIDTH = 180; // px, visible width of the preview cell
const PREVIEW_HEIGHT = 80; // px visible height of the preview cell
const PREVIEW_PADDING = 12; // px padding inside preview
const PREVIEW_RENDER_WIDTH = 300; // px min width at which the component is rendered before scaling

const ComponentPreview: React.FC<{ comp: ComponentEntry }> = ({ comp }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const defaultProps = useMemo(
    () => parseDefaultProps(comp.defaultProps || ''),
    [comp.defaultProps],
  );

  // After render, measure the inner content and scale it to fit the cell
  useLayoutEffect(() => {
    const inner = innerRef.current;
    const wrap = wrapRef.current;
    if (!inner || !wrap) return;
    const contentW = Math.max(inner.scrollWidth, PREVIEW_RENDER_WIDTH);
    const contentH = inner.scrollHeight || PREVIEW_HEIGHT;
    const availW = PREVIEW_WIDTH - PREVIEW_PADDING * 2;
    const availH = PREVIEW_HEIGHT - PREVIEW_PADDING * 2;
    const scaleX = availW / contentW;
    const scaleY = availH / contentH;
    setScale(Math.min(1, scaleX, scaleY));
  }, [comp.name]);

  return (
    <div
      ref={(el) => {
        (wrapRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        el?.setAttribute('inert', '');
      }}
      style={{
        width: PREVIEW_WIDTH,
        height: PREVIEW_HEIGHT,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px 8px 0 0',
        background: 'var(--background-default, #ffffff)',
        padding: PREVIEW_PADDING,
        pointerEvents: 'none',
      }}
    >
      <div
        ref={innerRef}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: PREVIEW_RENDER_WIDTH,
        }}
      >
        <PreviewErrorBoundary>
          {comp.PreviewWrapper ? (
            <comp.PreviewWrapper>
              <comp.Component {...defaultProps}>
                {renderDefaultContent(comp)}
              </comp.Component>
            </comp.PreviewWrapper>
          ) : (
            <comp.Component {...defaultProps}>
              {renderDefaultContent(comp)}
            </comp.Component>
          )}
        </PreviewErrorBoundary>
      </div>
    </div>
  );
};

// ─── ComponentPalette ────────────────────────────────────────────────────────

interface ComponentPaletteProps {
  components: ComponentEntry[];
  onDragStart: (comp: ComponentEntry) => void;
  onClickAdd: (comp: ComponentEntry) => void;
  onClose?: () => void;
}

export function ComponentPalette({
  components,
  onDragStart,
  onClickAdd,
  onClose,
}: ComponentPaletteProps) {
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, []);

  const filtered = useMemo(() => {
    if (!search) return components;
    const q = search.toLowerCase();
    const exact: ComponentEntry[] = [];
    const nameIncludes: ComponentEntry[] = [];
    const descOnly: ComponentEntry[] = [];
    for (const c of components) {
      const name = (c.displayName ?? c.name).toLowerCase();
      const desc = (c.description ?? '').toLowerCase();
      if (name.startsWith(q)) exact.push(c);
      else if (name.includes(q)) nameIncludes.push(c);
      else if (desc.includes(q)) descOnly.push(c);
    }
    return [...exact, ...nameIncludes, ...descOnly];
  }, [components, search]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    listRef.current?.scrollTo({ top: 0 });
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 60,
        left: 12,
        bottom: 52,
        width: 200,
        zIndex: 100,
        background: theme.bg_default,
        border: `1px solid ${theme.border_secondary}`,
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        overflow: 'hidden',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 12px 8px',
          borderBottom: `1px solid ${theme.border_tertiary}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: theme.text_default,
            }}
          >
            Drag & drop components
          </div>
          {onClose && (
            <button
              data-testid="btn-close-palette"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: theme.text_tertiary,
                cursor: 'pointer',
                padding: '2px 4px',
                lineHeight: 1,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              ✕
            </button>
          )}
        </div>
        <input
          type="text"
          data-testid="input-component-search"
          placeholder="Search…"
          ref={searchRef}
          value={search}
          onChange={handleSearchChange}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.border_accent; }}
          onMouseLeave={(e) => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = theme.border_secondary; }}
          onFocus={(e) => { e.currentTarget.style.borderColor = theme.border_accent; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = theme.border_secondary; }}
          style={{
            width: '100%',
            background: theme.bg_low,
            border: `1px solid ${theme.border_secondary}`,
            borderRadius: 6,
            padding: '6px 10px',
            color: theme.text_default,
            fontSize: 12,
            outline: 'none',
            transition: 'border-color 0.15s',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Component list */}
      <div
        ref={listRef}
        onFocusCapture={(e) => {
          e.target.blur();
          if (listRef.current) listRef.current.scrollTop = 0;
          requestAnimationFrame(() => searchRef.current?.focus());
        }}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '6px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          background: theme.bg_strong,
        }}
      >
        {filtered.map((comp) => (
          <div
            key={comp.name}
            data-testid={`component-item-${comp.name}`}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', comp.name);
              onDragStart(comp);
            }}
            onClick={() => onClickAdd(comp)}
            style={{
              background: theme.bg_strong,
              border: `1px solid ${theme.border_default}`,
              borderRadius: 8,
              cursor: 'grab',
              overflow: 'hidden',
              flexShrink: 0,
              transition: 'border-color 0.12s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = theme.border_accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = theme.border_default;
            }}
          >
            {/* Live preview */}
            <ComponentPreview comp={comp} />

            {/* Label */}
            <div
              style={{
                padding: '4px 10px 6px',
                borderTop: `1px solid ${theme.border_tertiary}`,
                background: theme.bg_secondary,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: theme.text_secondary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {comp.displayName || comp.name}
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: theme.text_tertiary,
              padding: '24px 0',
              fontSize: 12,
            }}
          >
            No components found
          </div>
        )}
      </div>
    </div>
  );
}
