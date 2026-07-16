// plugins/protovibe/src/ui/components/CrashLoadingOverlay.tsx
import React from 'react';
import { RotateCw, RefreshCw, Undo2 } from 'lucide-react';
import { theme } from '../theme';

const SPIN_KEYFRAMES = '@keyframes pv-crash-spin { to { transform: rotate(360deg); } }';

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 10,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 16,
  background: theme.bg_default,
};

const buttonStyle: React.CSSProperties = {
  background: theme.bg_tertiary,
  color: theme.text_default,
  border: 'none',
  padding: '6px 14px',
  borderRadius: '4px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  minWidth: 180,
};

const CoverButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button
    onClick={onClick}
    style={buttonStyle}
    onMouseEnter={e => (e.currentTarget.style.background = theme.bg_low)}
    onMouseLeave={e => (e.currentTarget.style.background = theme.bg_tertiary)}
  >
    {children}
  </button>
);

// Refresh sits above Undo: reloading is always safe, undo only applies when the
// user's own change caused the crash.
const CoverActions: React.FC<{ onRefresh: () => void; onUndo: () => void }> = ({ onRefresh, onUndo }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
    <CoverButton onClick={onRefresh}><RefreshCw size={14} />Refresh page</CoverButton>
    <CoverButton onClick={onUndo}><Undo2 size={14} />Undo last change</CoverButton>
  </div>
);

// Opaque cover shown over the canvas while a Vite crash is inside its grace
// period (see ProtovibeApp). When an AI agent edits code the app routinely
// passes through broken states that the next HMR update clears, so this reads
// as "working" rather than "crashed" — with a small hint that it might be an
// error, and Refresh/Undo escape hatches.
export const CrashLoadingOverlay: React.FC<{ onRefresh: () => void; onUndo: () => void }> = ({ onRefresh, onUndo }) => (
  <div style={containerStyle}>
    <style>{SPIN_KEYFRAMES}</style>
    <RotateCw size={28} style={{ color: theme.text_secondary, animation: 'pv-crash-spin 1s linear infinite' }} />
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, maxWidth: 440, textAlign: 'center', padding: '0 24px' }}>
      <div style={{ color: theme.text_default, fontSize: 15, fontWeight: 600 }}>
        Loading…
      </div>
      <div style={{ color: theme.text_tertiary, fontSize: 13, lineHeight: 1.5 }}>
        This usually means your AI agent is working on the code — but it could also be an error.
        If your last change caused this, you can undo it.
      </div>
    </div>
    <CoverActions onRefresh={onRefresh} onUndo={onUndo} />
  </div>
);

// Final error state for a crash that leaves the canvas blank: a document that
// loads while the server has a compile error gets no vite-error-overlay, so the
// shell shows the captured error (or a generic message) itself.
export const CrashErrorOverlay: React.FC<{ detail: string | null; onRefresh: () => void; onUndo: () => void }> = ({ detail, onRefresh, onUndo }) => (
  <div style={containerStyle}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, maxWidth: 640, textAlign: 'center', padding: '0 24px' }}>
      <div style={{ color: theme.destructive_default, fontSize: 15, fontWeight: 600 }}>
        The app failed to load
      </div>
      <div style={{ color: theme.text_tertiary, fontSize: 13, lineHeight: 1.5 }}>
        {detail
          ? 'Fix the error below, undo your last change, or ask your coding agent for help.'
          : 'There is an error in the code. Undo your last change or ask your coding agent for help.'}
      </div>
    </div>
    {detail && (
      <pre style={{
        margin: 0,
        maxWidth: 'min(640px, calc(100% - 48px))',
        maxHeight: '40%',
        overflow: 'auto',
        textAlign: 'left',
        background: theme.bg_strong,
        border: `1px solid ${theme.border_default}`,
        borderRadius: 6,
        padding: '12px 16px',
        fontSize: 12,
        lineHeight: 1.5,
        color: theme.destructive_default,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {detail}
      </pre>
    )}
    <CoverActions onRefresh={onRefresh} onUndo={onUndo} />
  </div>
);
