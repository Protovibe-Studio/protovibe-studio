import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { theme } from '../theme';

export interface LinkPopoverProps {
  initialUrl: string;
  anchorRect: DOMRect;
  onSave: (url: string) => void;
  onRemove: () => void;
  onCancel: () => void;
}

export function LinkPopover({ initialUrl, anchorRect, onSave, onRemove, onCancel }: LinkPopoverProps) {
  const [url, setUrl] = useState(initialUrl || 'https://');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Positioning: prefer above the toolbar button since the toolbar sits at
  // the bottom of the field. Fall back below if there's not enough room.
  const POPOVER_W = 260;
  const PAD = 10;
  let left = anchorRect.left;
  let top = anchorRect.top - 8 - 96;
  if (left + POPOVER_W > window.innerWidth - PAD) left = window.innerWidth - POPOVER_W - PAD;
  if (left < PAD) left = PAD;
  if (top < PAD) top = anchorRect.bottom + 8;

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onCancel();
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [onCancel]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  const submit = () => {
    const trimmed = url.trim();
    // Allow saving even the bare "https://" placeholder — useful when the
    // user wants a link affordance now and will fill in the href later.
    if (!trimmed) onCancel();
    else onSave(trimmed);
  };

  return createPortal(
    <div
      ref={rootRef}
      style={{
        position: 'fixed', top, left, width: POPOVER_W,
        zIndex: 9999999,
        background: theme.bg_strong,
        border: `1px solid ${theme.border_default}`,
        borderRadius: 12,
        boxShadow: '0 12px 40px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{
        padding: '12px 14px 10px',
        borderBottom: `1px solid ${theme.border_secondary}`,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: theme.text_default }}>Link</div>
      </div>

      <div style={{ padding: '12px 14px' }}>
        <input
          ref={inputRef}
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); submit(); }
          }}
          spellCheck={false}
          placeholder="https://example.com"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: theme.bg_secondary,
            border: `1px solid ${theme.border_default}`,
            borderRadius: 5,
            color: theme.text_default,
            fontFamily: 'monospace', fontSize: 12,
            padding: '6px 8px', outline: 'none',
          }}
        />
      </div>

      <div style={{
        padding: '10px 14px',
        borderTop: `1px solid ${theme.border_secondary}`,
        display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center',
      }}>
        <button
          type="button"
          onClick={onRemove}
          style={{
            padding: '6px 12px', background: 'transparent',
            border: `1px solid ${theme.border_default}`, borderRadius: 6,
            cursor: 'pointer', color: theme.text_secondary,
            fontFamily: 'sans-serif', fontSize: 12,
          }}
        >
          Remove
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '6px 12px', background: 'transparent',
              border: `1px solid ${theme.border_default}`, borderRadius: 6,
              cursor: 'pointer', color: theme.text_secondary,
              fontFamily: 'sans-serif', fontSize: 12,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            style={{
              padding: '6px 16px',
              background: theme.accent_default,
              border: 'none', borderRadius: 6,
              cursor: 'pointer', color: '#fff',
              fontFamily: 'sans-serif', fontSize: 12, fontWeight: 600,
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
