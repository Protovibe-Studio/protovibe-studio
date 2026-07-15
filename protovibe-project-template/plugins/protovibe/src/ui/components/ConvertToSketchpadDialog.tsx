// plugins/protovibe/src/ui/components/ConvertToSketchpadDialog.tsx
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { theme } from '../theme';
import { convertToSketchpad } from '../api/client';
import { emitToast } from '../events/toast';
import type { DomSnapshot } from '../utils/domSnapshot';

interface ConvertToSketchpadDialogProps {
  file: string;
  snapshot: DomSnapshot;
  onClose: () => void;
}

export function ConvertToSketchpadDialog({ file, snapshot, onClose }: ConvertToSketchpadDialogProps) {
  // Defaults: absolute (non-flat) with every component flattened to HTML —
  // the most reliable conversion.
  const [layoutMode, setLayoutMode] = useState<'flex' | 'absolute' | 'flat'>('absolute');
  const [flattened, setFlattened] = useState<Set<string>>(
    () => new Set(snapshot.foundComponents.map(c => c.componentId)),
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const toggleFlatten = (componentId: string) => {
    setFlattened(prev => {
      const next = new Set(prev);
      if (next.has(componentId)) next.delete(componentId);
      else next.add(componentId);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const keepComponents = snapshot.foundComponents
        .map(c => c.componentId)
        .filter(id => !flattened.has(id));
      const res = await convertToSketchpad({ file, snapshot: snapshot.root, options: { layoutMode, keepComponents } });
      // Overwrite any stale OS-clipboard content (e.g. a copied image) so the
      // sketchpad paste handler routes the paste to the internal block clipboard.
      try { await navigator.clipboard?.writeText('protovibe-block'); } catch { /* clipboard permission denied is fine */ }
      const warningNote = res.warnings?.length ? ' (some props could not be recovered)' : '';
      emitToast({
        message: `Copied ${res.blockCount} block${res.blockCount === 1 ? '' : 's'} — open the Sketchpad tab, click a frame and press Cmd+V to paste${warningNote}`,
        variant: 'success',
        durationMs: 8000,
      });
      onClose();
    } catch (err) {
      emitToast({ message: `Convert failed: ${err instanceof Error ? err.message : String(err)}`, variant: 'error' });
      setBusy(false);
    }
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    color: theme.text_secondary,
    cursor: 'pointer',
    padding: '4px 0',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: theme.text_tertiary,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    margin: '14px 0 6px',
  };

  return createPortal(
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 99998 }}
        onClick={onClose}
      />
      <div
        data-testid="convert-to-sketchpad-dialog"
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
          width: 380,
          boxShadow: '0 16px 64px rgba(0,0,0,0.7)',
          fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: theme.text_default, marginBottom: 6 }}>
          Convert to Sketchpad
        </div>
        <div style={{ fontSize: 12, color: theme.text_secondary, lineHeight: 1.5 }}>
          Creates a flat, logic-free copy of the selected element and puts it in the
          clipboard, ready to paste into a Sketchpad frame.
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={sectionTitleStyle}>Components</div>
          {snapshot.foundComponents.length > 1 && (
            <button
              data-testid="convert-toggle-all"
              onClick={() => {
                setFlattened(
                  flattened.size === 0
                    ? new Set(snapshot.foundComponents.map(c => c.componentId))
                    : new Set(),
                );
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: 11,
                color: theme.accent_default,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {flattened.size === 0 ? 'Uncheck all' : 'Check all'}
            </button>
          )}
        </div>
        {snapshot.foundComponents.length === 0 ? (
          <div style={{ fontSize: 12, color: theme.text_tertiary }}>No library components in selection.</div>
        ) : (
          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
            {snapshot.foundComponents.map(({ componentId, count }) => (
              <label key={componentId} style={labelStyle} data-testid={`convert-keep-${componentId}`}>
                <input
                  type="checkbox"
                  checked={!flattened.has(componentId)}
                  onChange={() => toggleFlatten(componentId)}
                />
                <span style={{ color: theme.text_default }}>
                  {componentId}
                  {count > 1 ? ` (×${count})` : ''}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: theme.text_tertiary }}>
                  {flattened.has(componentId) ? 'flatten to HTML' : 'keep as component'}
                </span>
              </label>
            ))}
          </div>
        )}

        <div style={sectionTitleStyle}>Layout</div>
        <label style={labelStyle} data-testid="convert-layout-absolute">
          <input type="radio" name="pv-convert-layout" checked={layoutMode === 'absolute'} onChange={() => setLayoutMode('absolute')} />
          <span style={{ color: theme.text_default }}>Convert to absolute positions</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: theme.text_tertiary }}>freeze measured layout</span>
        </label>
        <label style={labelStyle}>
          <input type="radio" name="pv-convert-layout" checked={layoutMode === 'flex'} onChange={() => setLayoutMode('flex')} />
          <span style={{ color: theme.text_default }}>Keep flex layout</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: theme.text_tertiary }}>structure stays fluid</span>
        </label>
        <label style={labelStyle} data-testid="convert-layout-flat">
          <input type="radio" name="pv-convert-layout" checked={layoutMode === 'flat'} onChange={() => setLayoutMode('flat')} />
          <span style={{ color: theme.text_default }}>Absolute, ungrouped (flat)</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: theme.text_tertiary }}>one parent, flat children</span>
        </label>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button
            onClick={onClose}
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
            data-testid="btn-convert-confirm"
            onClick={handleConfirm}
            disabled={busy}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              background: theme.accent_default,
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: busy ? 'progress' : 'pointer',
              opacity: busy ? 0.6 : 1,
              fontFamily: 'inherit',
            }}
          >
            {busy ? 'Converting…' : 'Convert & copy'}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
