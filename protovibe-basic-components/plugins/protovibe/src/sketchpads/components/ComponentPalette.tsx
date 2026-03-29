import React, { useState, useMemo } from 'react';
import type { ComponentEntry } from '../types';

interface ComponentPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  components: ComponentEntry[];
  onDragStart: (comp: ComponentEntry) => void;
  onClickAdd: (comp: ComponentEntry) => void;
}

export function ComponentPalette({
  isOpen,
  onClose,
  components,
  onDragStart,
  onClickAdd,
}: ComponentPaletteProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () =>
      components.filter(
        (c) =>
          !search ||
          (c.displayName ?? c.name).toLowerCase().includes(search.toLowerCase()),
      ),
    [components, search],
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
        onClick={onClose}
      />

      {/* Palette panel */}
      <div
        style={{
          position: 'fixed',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: '#2a2a3e',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: 16,
          width: 480,
          maxHeight: 400,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Search components…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              padding: '8px 12px',
              color: '#eee',
              fontSize: 13,
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={onClose}
            style={{
              marginLeft: 8,
              background: 'transparent',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              fontSize: 18,
              padding: '4px 8px',
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
          }}
        >
          {filtered.map((comp) => (
            <div
              key={comp.name}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', comp.name);
                onDragStart(comp);
              }}
              onClick={() => onClickAdd(comp)}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                padding: '10px 12px',
                cursor: 'grab',
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.borderColor = 'rgba(24,160,251,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#ddd',
                  marginBottom: 4,
                }}
              >
                {comp.displayName || comp.name}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: '#888',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {comp.description || `<${comp.name} />`}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                color: '#666',
                padding: 24,
                fontSize: 13,
              }}
            >
              No components found
            </div>
          )}
        </div>
      </div>
    </>
  );
}
