// plugins/protovibe/src/ui/components/ComponentsTab.tsx
import React, { useState } from 'react';
import { useProtovibe } from '../context/ProtovibeContext';
import { theme } from '../theme';

export const ComponentsTab: React.FC = () => {
  const { availableComponents, refreshComponents } = useProtovibe();
  const [search, setSearch] = useState('');

  const filtered = availableComponents.filter((c: any) =>
    !search || (c.displayName ?? c.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: theme.bg_default,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${theme.border_default}`,
          backgroundColor: theme.bg_strong,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
          }}
        >
          <span style={{ fontFamily: 'sans-serif', fontSize: '14px', fontWeight: 600, color: theme.text_default }}>
            Components
          </span>
          <button
            onClick={refreshComponents}
            title="Refresh"
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.text_tertiary,
              cursor: 'pointer',
              fontSize: '12px',
              fontFamily: 'sans-serif',
              padding: '2px 6px',
              borderRadius: '4px',
            }}
          >
            ↻ Refresh
          </button>
        </div>
        <input
          type="text"
          placeholder="Search components…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: theme.bg_secondary,
            border: `1px solid ${theme.border_default}`,
            borderRadius: '6px',
            color: theme.text_default,
            fontFamily: 'sans-serif',
            fontSize: '12px',
            padding: '6px 10px',
            outline: 'none',
          }}
        />
      </div>

      {/* Grid */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '12px',
          alignContent: 'start',
        }}
      >
        {filtered.length === 0 && (
          <div
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              color: theme.text_tertiary,
              fontFamily: 'sans-serif',
              fontSize: '13px',
              paddingTop: '40px',
            }}
          >
            {availableComponents.length === 0 ? 'No components found.' : 'No results.'}
          </div>
        )}

        {filtered.map((comp: any) => (
          <ComponentCard key={comp.name ?? comp.displayName} comp={comp} />
        ))}
      </div>
    </div>
  );
};

const ComponentCard: React.FC<{ comp: any }> = ({ comp }) => {
  const name: string = comp.displayName ?? comp.name ?? 'Unknown';
  const description: string = comp.description ?? '';
  const defaultProps: string = comp.defaultProps ?? '';

  return (
    <div
      title={description || name}
      style={{
        backgroundColor: theme.bg_secondary,
        border: `1px solid ${theme.border_default}`,
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        cursor: 'default',
        transition: 'border-color 0.15s ease',
      }}
      onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.borderColor = theme.accent_default)}
      onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = theme.border_default)}
    >
      {/* Preview placeholder */}
      <div
        style={{
          height: '64px',
          borderRadius: '6px',
          backgroundColor: theme.bg_tertiary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          fontSize: '11px',
          fontFamily: 'monospace',
          color: theme.text_tertiary,
          wordBreak: 'break-all',
          padding: '4px 6px',
          textAlign: 'center',
        }}
      >
        {`<${name} />`}
      </div>

      <div>
        <div
          style={{
            fontFamily: 'sans-serif',
            fontSize: '12px',
            fontWeight: 600,
            color: theme.text_default,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </div>
        {description && (
          <div
            style={{
              fontFamily: 'sans-serif',
              fontSize: '11px',
              color: theme.text_tertiary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginTop: '2px',
            }}
          >
            {description}
          </div>
        )}
      </div>
    </div>
  );
};
