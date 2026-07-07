// plugins/protovibe/src/ui/components/GitSyncBanner.tsx
// Passive bottom-right notification shown when a teammate has pushed new work to
// the shared branch. The existing ToastViewport is bottom-center and
// non-interactive (pointerEvents:none), so this is a dedicated interactive
// element with its own Sync action.

import React from 'react';
import { createPortal } from 'react-dom';
import { Download, X } from 'lucide-react';
import { theme, primarySolidHover } from '../theme';
import type { UseGitSync } from '../hooks/useGitSync';

export const GitSyncBanner: React.FC<{ git: UseGitSync }> = ({ git }) => {
  const { status, bannerVisible, runOp, dismissBanner } = git;
  if (!bannerVisible || !status) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        right: 16,
        bottom: 48, // clear the 32px bottom bar
        zIndex: 9999999,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        maxWidth: 340,
        padding: '10px 10px 10px 12px',
        borderRadius: 8,
        border: `1px solid ${theme.border_default}`,
        background: theme.bg_secondary,
        boxShadow: '0 6px 20px rgba(0,0,0,0.45)',
      }}
    >
      <Download size={16} color={theme.accent_default} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, color: theme.text_default, fontSize: 12, lineHeight: 1.4 }}>
        Someone made an update
      </span>
      <button
        onClick={() => void runOp('sync')}
        {...primarySolidHover(true)}
        style={{
          padding: '6px 12px', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600,
          color: '#fff', background: theme.primary_solid, cursor: 'pointer', flexShrink: 0,
        }}
      >
        Sync changes
      </button>
      <button
        onClick={dismissBanner}
        aria-label="Dismiss"
        style={{
          width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', borderRadius: 4, background: 'transparent', color: theme.text_tertiary,
          cursor: 'pointer', flexShrink: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = theme.bg_tertiary; e.currentTarget.style.color = theme.text_default; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.text_tertiary; }}
      >
        <X size={14} />
      </button>
    </div>,
    document.body,
  );
};
