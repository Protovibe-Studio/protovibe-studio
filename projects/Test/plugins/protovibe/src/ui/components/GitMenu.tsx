// plugins/protovibe/src/ui/components/GitMenu.tsx
// Bottom-bar Git dropdown: current branch, one-click "Sync changes", and an
// Advanced section (commit / pull / push). Mirrors the "More" menu mechanics in
// ProtovibeApp.tsx (floating position + createPortal + mousedown click-outside).

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GitBranch, RotateCw, ChevronDown, Download, Upload, GitCommit, AlertTriangle, RefreshCw, Copy } from 'lucide-react';
import { useFloatingDropdownPosition } from '../hooks/useFloatingDropdownPosition';
import { theme, primarySolidHover } from '../theme';
import type { UseGitSync } from '../hooks/useGitSync';

const SPIN_KEYFRAMES = '@keyframes pv-git-spin { to { transform: rotate(360deg); } }';

type Platform = 'mac' | 'windows' | 'linux';

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/Mac/i.test(ua)) return 'mac';
  if (/Win/i.test(ua)) return 'windows';
  return 'linux';
}

const INSTALL_HINTS: Record<Platform, { command: string; steps: string }> = {
  mac: {
    command: 'xcode-select --install',
    steps: 'Open the Terminal app, paste this command, press Enter, then click “Install”. Reopen Protovibe when it finishes.',
  },
  windows: {
    command: 'winget install --id Git.Git -e',
    steps: 'Open PowerShell, paste this command and press Enter (or download from git-scm.com). Restart Protovibe afterwards.',
  },
  linux: {
    command: 'sudo apt install git',
    steps: 'Install Git with your package manager, then restart Protovibe.',
  },
};

function statusLine(s: { changedCount: number; ahead: number; behind: number }): string {
  const parts: string[] = [];
  if (s.changedCount > 0) parts.push(`${s.changedCount} unsaved change${s.changedCount === 1 ? '' : 's'}`);
  if (s.ahead > 0) parts.push(`${s.ahead} to push`);
  if (s.behind > 0) parts.push(`${s.behind} to pull`);
  return parts.length ? parts.join(' · ') : 'Up to date';
}

const menuItemStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  border: 'none',
  background: 'transparent',
  color: theme.text_default,
  fontSize: 12,
  cursor: 'pointer',
  textAlign: 'left',
  boxSizing: 'border-box',
};

export const GitMenu: React.FC<{ git: UseGitSync }> = ({ git }) => {
  const { status, op, busy, runOp, refresh } = git;
  const [open, setOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { style: menuStyle } = useFloatingDropdownPosition({
    isOpen: open,
    anchorRef: buttonRef,
    dropdownRef: menuRef,
    preferredPlacement: 'top',
    offset: 6,
    updateDeps: [advancedOpen, status?.gitInstalled, status?.hasUpstream],
  });

  // Refresh status whenever the menu opens so it's current when they look.
  useEffect(() => {
    if (open) void refresh(false);
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (buttonRef.current?.contains(e.target as Node) || menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  // Nothing to show until we know the state; hide entirely for a plain non-repo
  // folder (git installed but no repo) — there's nothing to sync.
  if (!status) return null;
  if (status.gitInstalled && !status.isRepo) return null;

  const hasChanges = status.changedCount > 0 || status.ahead > 0 || status.behind > 0;
  const branchLabel = status.gitInstalled ? (status.branch || 'Git') : 'Git';
  const showDot = status.gitInstalled && status.isRepo && hasChanges;

  const copyCommand = (cmd: string) => {
    navigator.clipboard?.writeText(cmd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        data-tooltip="Git"
        style={{
          height: 24,
          padding: '0 8px',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          maxWidth: 160,
          background: open ? theme.bg_tertiary : 'transparent',
          color: open ? theme.text_default : theme.text_tertiary,
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => { if (!open) { e.currentTarget.style.background = theme.bg_low; e.currentTarget.style.color = theme.text_secondary; } }}
        onMouseLeave={(e) => { if (!open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.text_tertiary; } }}
      >
        {status.gitInstalled ? <GitBranch size={14} /> : <AlertTriangle size={14} color={theme.warning_primary} />}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{branchLabel}</span>
        {showDot && (
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.accent_default, flexShrink: 0 }} />
        )}
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          style={{
            ...menuStyle,
            background: theme.bg_secondary,
            border: `1px solid ${theme.border_default}`,
            borderRadius: 6,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            padding: 0,
            zIndex: 9999,
            width: 260,
            overflow: 'hidden',
          }}
        >
          <style>{SPIN_KEYFRAMES}</style>

          {/* --- git not installed --- */}
          {!status.gitInstalled ? (
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: theme.text_default, fontSize: 12, fontWeight: 600 }}>
                <AlertTriangle size={14} color={theme.warning_primary} /> Git isn’t installed
              </div>
              <div style={{ color: theme.text_secondary, fontSize: 12, lineHeight: 1.5 }}>
                {INSTALL_HINTS[detectPlatform()].steps}
              </div>
              <button
                onClick={() => copyCommand(INSTALL_HINTS[detectPlatform()].command)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  padding: '8px 10px', border: `1px solid ${theme.border_default}`, borderRadius: 4,
                  background: theme.bg_strong, color: theme.text_default, fontSize: 12, cursor: 'pointer',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', textAlign: 'left',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{INSTALL_HINTS[detectPlatform()].command}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: theme.text_tertiary, flexShrink: 0 }}>
                  <Copy size={12} /> {copied ? 'Copied' : 'Copy'}
                </span>
              </button>
              <button
                onClick={() => void refresh(false)}
                style={{ ...menuItemStyle, padding: '6px 0', color: theme.text_tertiary, justifyContent: 'center' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = theme.text_secondary)}
                onMouseLeave={(e) => (e.currentTarget.style.color = theme.text_tertiary)}
              >
                <RefreshCw size={12} /> I’ve installed it — check again
              </button>
            </div>
          ) : (
            <>
              {/* --- branch header --- */}
              <div style={{ padding: '10px 12px', borderBottom: `1px solid ${theme.border_default}`, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: theme.text_default, fontSize: 12, fontWeight: 600 }}>
                  <GitBranch size={13} /> {status.branch || 'detached'}
                </div>
                <div style={{ color: theme.text_tertiary, fontSize: 11 }}>
                  {op.status !== 'idle' ? op.message : statusLine(status)}
                </div>
              </div>

              {/* --- sync --- */}
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {!status.hasUpstream && (
                  <div style={{ color: theme.warning_primary, fontSize: 11, lineHeight: 1.4 }}>
                    No remote configured — set an upstream branch to sync.
                  </div>
                )}
                <button
                  disabled={busy || !status.hasUpstream}
                  onClick={() => void runOp('sync')}
                  {...primarySolidHover(!busy && status.hasUpstream)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '9px 12px', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600,
                    color: '#fff',
                    background: busy || !status.hasUpstream ? theme.bg_tertiary : theme.primary_solid,
                    cursor: busy || !status.hasUpstream ? 'default' : 'pointer',
                    opacity: !status.hasUpstream ? 0.6 : 1,
                  }}
                >
                  {busy
                    ? <RotateCw size={14} style={{ animation: 'pv-git-spin 1s linear infinite' }} />
                    : <RefreshCw size={14} />}
                  {busy ? (op.message || 'Syncing…') : 'Sync changes'}
                </button>
              </div>

              {/* --- advanced --- */}
              <div style={{ borderTop: `1px solid ${theme.border_default}` }}>
                <button
                  onClick={() => setAdvancedOpen((v) => !v)}
                  style={{ ...menuItemStyle, color: theme.text_secondary, justifyContent: 'space-between' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = theme.bg_tertiary)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span>Advanced</span>
                  <ChevronDown size={14} style={{ transform: advancedOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                </button>

                {advancedOpen && (
                  <div style={{ padding: '4px 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      placeholder="Commit message (optional)"
                      disabled={busy}
                      style={{
                        width: '100%', boxSizing: 'border-box', padding: '7px 9px',
                        border: `1px solid ${theme.border_default}`, borderRadius: 4,
                        background: theme.bg_strong, color: theme.text_default, fontSize: 12, outline: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <AdvBtn label="Commit" icon={<GitCommit size={13} />} disabled={busy} onClick={() => runOp('commit', commitMessage)} />
                      <AdvBtn label="Pull" icon={<Download size={13} />} disabled={busy || !status.hasUpstream} onClick={() => runOp('pull')} />
                      <AdvBtn label="Push" icon={<Upload size={13} />} disabled={busy || !status.hasUpstream} onClick={() => runOp('push')} />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>,
        document.body,
      )}
    </>
  );
};

const AdvBtn: React.FC<{ label: string; icon: React.ReactNode; disabled: boolean; onClick: () => void }> = ({ label, icon, disabled, onClick }) => (
  <button
    disabled={disabled}
    onClick={onClick}
    style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
      padding: '7px 6px', border: `1px solid ${theme.border_default}`, borderRadius: 4,
      background: theme.bg_strong, color: disabled ? theme.text_tertiary : theme.text_default,
      fontSize: 11, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1,
    }}
    onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = theme.bg_tertiary; }}
    onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.background = theme.bg_strong; }}
  >
    {icon} {label}
  </button>
);
