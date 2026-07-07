import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Sketchpad } from '../types';
import { ConfirmDialog } from '../../ui/components/ConfirmDialog';
import { theme } from '../../ui/theme';

interface SketchpadOverlayPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sketchpads: Sketchpad[];
  activeSketchpadId: string;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onDuplicate: (id: string) => void;
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
  onDuplicate,
}: SketchpadOverlayPanelProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [renameDialogId, setRenameDialogId] = useState<string | null>(null);
  const [renameDialogValue, setRenameDialogValue] = useState('');

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

      <RenameDialog
        isOpen={renameDialogId !== null}
        value={renameDialogValue}
        onChange={setRenameDialogValue}
        onConfirm={() => {
          if (renameDialogId && renameDialogValue.trim()) {
            onRename(renameDialogId, renameDialogValue.trim());
          }
          setRenameDialogId(null);
        }}
        onCancel={() => setRenameDialogId(null)}
      />

      <ConfirmDialog
        isOpen={deleteConfirmId !== null}
        title="Delete sketchpad"
        message={`This will permanently delete "${sketchpads.find((s) => s.id === deleteConfirmId)?.name}" and all its frames.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteConfirmId) onDelete(deleteConfirmId);
          setDeleteConfirmId(null);
        }}
        onCancel={() => setDeleteConfirmId(null)}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          left: 16,
          top: 60,
          zIndex: 9997,
          background: theme.bg_default,
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10,
          width: 300,
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          fontFamily: 'var(--font-sans, system-ui, sans-serif)',
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
            data-testid="btn-new-sketchpad"
            onClick={() => setShowNewInput(true)}
            style={{
              background: 'rgba(0,146,255,0.15)',
              border: 'none',
              borderRadius: 4,
              color: '#0092ff',
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
              data-testid="input-new-sketchpad"
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
                border: '1px solid rgba(0,146,255,0.3)',
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
                    ? 'rgba(0,146,255,0.12)'
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
                    border: '1px solid rgba(0,146,255,0.3)',
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
                  <FileIcon color={activeSketchpadId === sp.id ? '#0092ff' : '#888'} />
                  <span
                    style={{
                      fontSize: 12,
                      color: activeSketchpadId === sp.id ? '#0092ff' : '#ccc',
                      fontWeight: activeSketchpadId === sp.id ? 600 : 400,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      marginLeft: 6,
                    }}
                  >
                    {sp.name}
                  </span>
                  <span style={{ fontSize: 10, color: '#999', marginLeft: 8, flexShrink: 0 }}>
                    {sp.frames.length} frame{sp.frames.length !== 1 ? 's' : ''}
                  </span>
                </>
              )}

              {/* Duplicate button */}
              {renamingId !== sp.id && (
                <button
                  data-testid={`btn-duplicate-${sp.name.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(sp.id);
                  }}
                  title="Duplicate sketchpad"
                  style={{
                    marginLeft: 4,
                    background: 'transparent',
                    border: 'none',
                    color: '#999',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    display: 'flex',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <CopyIcon />
                </button>
              )}

              {/* Edit (rename) button */}
              {renamingId !== sp.id && (
                <button
                  data-testid={`btn-rename-${sp.name.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenameDialogId(sp.id);
                    setRenameDialogValue(sp.name);
                  }}
                  title="Rename sketchpad"
                  style={{
                    marginLeft: 4,
                    background: 'transparent',
                    border: 'none',
                    color: '#999',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    display: 'flex',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <EditIcon />
                </button>
              )}

              {/* Delete button */}
              {renamingId !== sp.id && (
                <button
                  data-testid={`btn-delete-${sp.name.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmId(sp.id);
                  }}
                  title="Delete sketchpad"
                  style={{
                    marginLeft: 4,
                    background: 'transparent',
                    border: 'none',
                    color: '#e05252',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    display: 'flex',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <TrashIcon />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function RenameDialog({
  isOpen,
  value,
  onChange,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return createPortal(
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 99998 }}
        onClick={onCancel}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 99999,
          background: theme.bg_default,
          border: `1px solid ${theme.border_default}`,
          borderRadius: 12,
          padding: '20px 24px',
          width: 340,
          boxShadow: '0 16px 64px rgba(0,0,0,0.7)',
          fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: theme.text_default, marginBottom: 12 }}>
          Rename sketchpad
        </div>
        <input
          autoFocus
          data-testid="input-rename-sketchpad"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onConfirm();
          }}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.06)',
            border: `1px solid ${theme.border_default}`,
            borderRadius: 6,
            padding: '8px 10px',
            color: theme.text_default,
            fontSize: 13,
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            marginBottom: 20,
          }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: `1px solid ${theme.border_default}`,
              background: 'transparent',
              color: theme.text_secondary,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            data-testid="dialog-rename-confirm"
            onClick={onConfirm}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              background: '#0092ff',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Rename
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}

function EditIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="10" x2="10" y1="11" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="14" x2="14" y1="11" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function FileIcon({ color }: { color: string }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 2v4a2 2 0 0 0 2 2h4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
