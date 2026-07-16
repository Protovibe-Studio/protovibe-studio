// plugins/protovibe/src/ui/components/CrashLoadingOverlay.tsx
import React from 'react';
import { RotateCw, Undo2 } from 'lucide-react';
import { theme } from '../theme';

const SPIN_KEYFRAMES = '@keyframes pv-crash-spin { to { transform: rotate(360deg); } }';

// Opaque cover shown over the canvas while a Vite crash is inside its grace
// period (see ProtovibeApp). When an AI agent edits code the app routinely
// passes through broken states that the next HMR update clears, so this reads
// as "working" rather than "crashed" — with a small hint that it might be an
// error, and an Undo escape hatch for when the user's own change caused it.
export const CrashLoadingOverlay: React.FC<{ onUndo: () => void }> = ({ onUndo }) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      background: theme.bg_default,
    }}
  >
    <style>{SPIN_KEYFRAMES}</style>
    <RotateCw size={28} style={{ color: theme.text_secondary, animation: 'pv-crash-spin 1s linear infinite' }} />
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, maxWidth: 440, textAlign: 'center', padding: '0 24px' }}>
      <div style={{ color: theme.text_default, fontSize: 15, fontWeight: 600 }}>
        Updating your app…
      </div>
      <div style={{ color: theme.text_tertiary, fontSize: 13, lineHeight: 1.5 }}>
        This usually means your AI agent is working on the code — but it could also be an error.
        If your last change caused this, you can undo it.
      </div>
    </div>
    <button
      onClick={onUndo}
      style={{
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
        gap: '6px',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = theme.bg_low)}
      onMouseLeave={e => (e.currentTarget.style.background = theme.bg_tertiary)}
    >
      <Undo2 size={14} />
      Undo last change
    </button>
  </div>
);
