import React, { useState } from 'react';
import type { Sketchpad } from '../types';

interface SketchpadOverlayPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sketchpads: Sketchpad[];
  activeSketchpadId: string;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
}

export function SketchpadOverlayPanel({
  isOpen,
  onClose,
  sketchpads,
  activeSketchpadId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
}: SketchpadOverlayPanelProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState('');

  if (!isOpen) return null;

  const handleRenameSubmit = (id: string) => {
    if (renameValue.trim()) {
      onRename(id, renameValue.trim());
    }
    setRenamingId(null);
  };

  const handleCreateSubmit = () => {
    if (newName.trim()) {
      onCreate(newName.trim());
      setNewName('');
      setShowNewInput(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9996 }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          left: 16,
          top: 60,
          zIndex: 9997,
          background: '#2a2a3e',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10,
          width: 240,
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px 8px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: '#ddd', letterSpacing: '-0.2px' }}>
            Sketchpads
          </span>
          <button
            onClick={() => setShowNewInput(true)}
            style={{
              background: 'rgba(24,160,251,0.15)',
              border: 'none',
              borderRadius: 4,
              color: '#18a0fb',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
              padding: '4px 8px',
            }}
          >
            + New
          </button>
        </div>

        {/* New sketchpad input */}
        {showNewInput && (
          <div style={{ padding: '8px 14px' }}>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateSubmit();
                if (e.key === 'Escape') { setShowNewInput(false); setNewName(''); }
              }}
              onBlur={handleCreateSubmit}
              placeholder="Sketchpad name…"
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(24,160,251,0.3)',
                borderRadius: 4,
                padding: '6px 8px',
                color: '#eee',
                fontSize: 12,
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {/* Sketchpad list */}
        <div style={{ padding: '4px 6px 8px' }}>
          {sketchpads.map((sp) => (
            <div
              key={sp.id}
              onClick={() => onSelect(sp.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setRenamingId(sp.id);
                setRenameValue(sp.name);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px',
                borderRadius: 6,
                cursor: 'pointer',
                background:
                  activeSketchpadId === sp.id
                    ? 'rgba(24,160,251,0.12)'
                    : 'transparent',
                transition: 'background 0.12s',
              }}
              onMouseEnter={(e) => {
                if (activeSketchpadId !== sp.id)
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              }}
              onMouseLeave={(e) => {
                if (activeSketchpadId !== sp.id)
                  e.currentTarget.style.background = 'transparent';
              }}
            >
              {renamingId === sp.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameSubmit(sp.id);
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  onBlur={() => handleRenameSubmit(sp.id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(24,160,251,0.3)',
                    borderRadius: 3,
                    padding: '3px 6px',
                    color: '#eee',
                    fontSize: 12,
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              ) : (
                <>
                  <span
                    style={{
                      fontSize: 12,
                      color: activeSketchpadId === sp.id ? '#18a0fb' : '#ccc',
                      fontWeight: activeSketchpadId === sp.id ? 600 : 400,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {sp.name}
                  </span>
                  <span style={{ fontSize: 10, color: '#666', marginLeft: 8, flexShrink: 0 }}>
                    {sp.frames.length} frame{sp.frames.length !== 1 ? 's' : ''}
                  </span>
                </>
              )}

              {/* Delete button */}
              {sketchpads.length > 1 && renamingId !== sp.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(sp.id);
                  }}
                  style={{
                    marginLeft: 4,
                    background: 'transparent',
                    border: 'none',
                    color: '#666',
                    cursor: 'pointer',
                    fontSize: 14,
                    padding: '0 4px',
                    opacity: 0.5,
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
