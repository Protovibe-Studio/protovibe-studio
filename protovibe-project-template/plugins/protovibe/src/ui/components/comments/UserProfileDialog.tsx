// plugins/protovibe/src/ui/components/comments/UserProfileDialog.tsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { theme } from '../../theme';
import type { CommentAuthor } from '../../../shared/comments';

interface UserProfileDialogProps {
  isOpen: boolean;
  currentUser: CommentAuthor | null;
  onSave: (name: string, email: string) => void;
  onCancel: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: theme.bg_secondary,
  border: `1px solid ${theme.border_default}`,
  borderRadius: 6,
  padding: '8px 10px',
  color: theme.text_default,
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: theme.font_ui,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: theme.text_secondary,
  marginBottom: 4,
};

export const UserProfileDialog: React.FC<UserProfileDialogProps> = ({
  isOpen,
  currentUser,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(currentUser?.name || '');
      setEmail(currentUser?.email || '');
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const canSave = name.trim().length > 0;
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSave) onSave(name, email);
  };

  return createPortal(
    <div data-pv-ui="true">
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.55)' }}
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 100000,
          background: theme.bg_strong,
          border: `1px solid ${theme.border_default}`,
          borderRadius: 12,
          padding: '20px 24px',
          width: 340,
          boxShadow: '0 16px 64px rgba(0,0,0,0.7)',
          fontFamily: theme.font_ui,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: theme.text_default, marginBottom: 8 }}>
          {currentUser ? 'Edit your profile' : 'Who are you?'}
        </div>
        <div style={{ fontSize: 12, color: theme.text_secondary, marginBottom: 20, lineHeight: 1.4 }}>
          This is <b>not a signup</b>. Your name is stored locally in this browser so teammates know who
          left a comment.
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Name *</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jane Doe"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Email (optional)</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. jane@example.com"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: `1px solid ${theme.border_default}`,
                background: 'transparent',
                color: theme.text_secondary,
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: theme.font_ui,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSave}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                background: canSave ? theme.accent_default : theme.bg_tertiary,
                color: canSave ? '#fff' : theme.text_tertiary,
                fontSize: 12,
                fontWeight: 600,
                cursor: canSave ? 'pointer' : 'not-allowed',
                fontFamily: theme.font_ui,
              }}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};
