import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { theme } from '../theme';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  /** 'destructive' (default) renders a red confirm button, 'primary' a blue one. */
  confirmVariant?: 'destructive' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  confirmVariant = 'destructive',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onCancel, onConfirm]);

  if (!isOpen) return null;

  const confirmBg = confirmVariant === 'primary' ? theme.primary_solid : theme.destructive_default;
  const confirmHoverBg = confirmVariant === 'primary' ? theme.primary_solid_hover : theme.destructive_secondary;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          zIndex: 99998,
        }}
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        data-pv-ui="true"
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
          width: 440,
          boxShadow: '0 16px 64px rgba(0,0,0,0.7)',
          fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: theme.text_default,
            marginBottom: 8,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: theme.text_secondary,
            marginBottom: 20,
            lineHeight: 1.6,
          }}
        >
          {message}
        </div>
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
              transition: 'background 0.12s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = theme.bg_secondary)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Cancel
          </button>
          <button
            data-testid="dialog-confirm"
            onClick={onConfirm}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              background: confirmBg,
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.12s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = confirmHoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = confirmBg)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
