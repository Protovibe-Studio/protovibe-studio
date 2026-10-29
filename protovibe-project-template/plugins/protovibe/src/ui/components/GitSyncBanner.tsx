// plugins/protovibe/src/ui/components/GitSyncBanner.tsx
// Passive bottom-right notification shown when a teammate has pushed new work to
// the shared branch. The existing ToastViewport is bottom-center and
// non-interactive (pointerEvents:none), so this is a dedicated interactive
// element with its own Sync action.

import React from 'react';
import { createPortal } from 'react-dom';
import { Check, RotateCw, X } from 'lucide-react';
import { theme, primarySolidHover } from '../theme';
import type { UseGitSync } from '../hooks/useGitSync';

export const GitSyncBanner: React.FC<{ git: UseGitSync }> = ({ git }) => {
  const { status, bannerVisible, bannerFeedback, busy, runOp, dismissBanner } = git;
  if (!bannerVisible || !status) return null;

  const syncing = bannerFeedback?.phase === 'syncing';
  const synced = bannerFeedback?.phase === 'success';
  const disabled = busy || synced;

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
      <style>{'@keyframes pv-banner-sync-spin { to { transform: rotate(360deg); } }'}</style>
      <span role="status" style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere', color: theme.text_default, fontSize: 12, lineHeight: 1.4 }}>
        {synced ? 'Synced' : `${bannerFeedback?.authors || status.incomingAuthors?.join(', ') || 'Your team'} made changes`}
      </span>
      <button
        onClick={() => void runOp('sync', undefined, 'banner')}
        disabled={disabled}
        aria-label={syncing ? 'Syncing' : synced ? 'Synced' : 'Sync'}
        aria-busy={syncing}
        {...primarySolidHover(!disabled)}
        style={{
          padding: '6px 12px', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600,
          color: synced ? theme.success_default : theme.text_default,
          background: synced ? theme.success_low : theme.primary_solid,
          cursor: disabled ? 'default' : 'pointer', flexShrink: 0,
          display: 'grid', placeItems: 'center',
        }}
      >
        <span aria-hidden="true" style={{ gridArea: '1 / 1', visibility: syncing || synced ? 'hidden' : 'visible' }}>Sync</span>
        {syncing && <RotateCw aria-hidden="true" size={14} style={{ gridArea: '1 / 1', animation: 'pv-banner-sync-spin 1s linear infinite' }} />}
        {synced && <Check aria-hidden="true" size={14} style={{ gridArea: '1 / 1' }} />}
      </button>
      <button
        onClick={dismissBanner}
        disabled={!!bannerFeedback}
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
