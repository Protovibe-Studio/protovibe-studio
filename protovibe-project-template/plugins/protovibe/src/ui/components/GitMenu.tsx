// plugins/protovibe/src/ui/components/GitMenu.tsx
// Bottom-bar Git dropdown: current branch, one-click "Sync changes", and an
// Advanced section (commit / pull / push). Mirrors the "More" menu mechanics in
// ProtovibeApp.tsx (floating position + createPortal + mousedown click-outside).
//
// When Git isn't ready (not installed, no repo, no remote, or not authenticated)
// we don't show warnings — we explain the situation in plain language and offer a
// ready-to-paste prompt the user can hand to their coding agent to fix it.

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GitBranch, RotateCw, ChevronDown, Download, Upload, GitCommit, RefreshCw, Copy, Check } from 'lucide-react';
import { useFloatingDropdownPosition } from '../hooks/useFloatingDropdownPosition';
import { theme, primarySolidHover } from '../theme';
import type { UseGitSync } from '../hooks/useGitSync';

const SPIN_KEYFRAMES = '@keyframes pv-git-spin { to { transform: rotate(360deg); } }';

function osName(): string {
  const ua = navigator.userAgent;
  if (/Mac/i.test(ua)) return 'macOS';
  if (/Win/i.test(ua)) return 'Windows';
  return 'Linux';
}

// --- Prompts the user can paste into their coding agent (Claude Code, etc.) ---

const projectLine = (root: string) => (root ? `\n\nThe project folder is at: ${root}` : '');

const installPrompt = (root: string) =>
  `I'm using Protovibe to design an app on ${osName()}, and Git isn't installed on this computer. ` +
  `Please install Git, verify it works by running \`git --version\`, and let me know when it's ready so I can sync my work with my team.` +
  projectLine(root);

const setupRepoPrompt = (root: string) =>
  `I'm using Protovibe and want to sync my work with my team, but this project isn't set up with Git version control yet. ` +
  `Please set it up: initialize a Git repository here, connect it to a remote (create a new GitHub repository if I don't have one), ` +
  `make an initial commit, set the upstream for my branch, and push. Then tell me I can sync from Protovibe.` +
  projectLine(root);

const connectRemotePrompt = (root: string) =>
  `I'm using Protovibe. This project has Git, but my current branch isn't connected to a shared remote yet, so I can't sync with my team. ` +
  `Please connect it to a remote (create or use a GitHub repository), set the upstream tracking branch for my current branch, and push. ` +
  `Then confirm I can sync from Protovibe.` +
  projectLine(root);

const authPrompt = (root: string, error?: string) =>
  `I'm using Protovibe and tried to sync my work with Git, but it failed. ` +
  `I think Git access isn't set up on this computer. Please fix my Git authentication for this project's remote ` +
  `(set up an SSH key or a credential helper / sign me in), verify it works by running \`git push\`, and confirm I can sync from Protovibe.` +
  projectLine(root) +
  (error ? `\n\nThe exact error was:\n${error.trim()}` : '');

// git failures that mean "access/credentials aren't set up" rather than a real problem.
function isAuthOrAccessError(text: string): boolean {
  return /permission denied|authentication failed|could not read (username|password|from remote)|terminal prompts disabled|invalid username or password|support for password authentication|publickey|access denied|access rights|repository not found|unable to access|host key verification failed|forbidden|please tell me who you are/i.test(text);
}

// Plain-language description of the working state, aimed at non-technical users.
function plainStatus(s: { changedCount: number; ahead: number; behind: number }): string {
  if (s.changedCount === 0 && s.ahead === 0 && s.behind === 0) {
    return 'Everything is synced with your team.';
  }
  const parts: string[] = [];
  if (s.changedCount > 0) {
    parts.push(`You have ${s.changedCount} file${s.changedCount === 1 ? '' : 's'} changed on your local disk, but not synced with Git yet.`);
  }
  if (s.ahead > 0) {
    parts.push(`${s.ahead} saved change${s.ahead === 1 ? ' is' : 's are'} ready to push to your team.`);
  }
  if (s.behind > 0) {
    parts.push(`Your team pushed ${s.behind} new change${s.behind === 1 ? '' : 's'} you don't have yet.`);
  }
  return parts.join(' ');
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

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { style: menuStyle } = useFloatingDropdownPosition({
    isOpen: open,
    anchorRef: buttonRef,
    dropdownRef: menuRef,
    preferredPlacement: 'top',
    offset: 6,
    updateDeps: [advancedOpen, status?.gitInstalled, status?.isRepo, status?.hasUpstream, op.status],
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

  // Cmd+S (macOS) / Ctrl+S (Windows/Linux) opens the Sync with Git popover
  // instead of the browser's Save dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!status) return null; // still loading initial status

  const hasChanges = status.changedCount > 0 || status.ahead > 0 || status.behind > 0;
  const showDot = status.gitInstalled && status.isRepo && status.hasUpstream && hasChanges;

  const authIssue = op.status === 'error' && isAuthOrAccessError(`${op.error ?? ''} ${op.message ?? ''}`);

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
          fontSize: 13,
          fontWeight: 400,
          maxWidth: 220,
          background: open ? theme.bg_tertiary : 'transparent',
          color: open ? theme.text_default : theme.text_secondary,
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => { if (!open) { e.currentTarget.style.background = theme.bg_low; e.currentTarget.style.color = theme.text_default; } }}
        onMouseLeave={(e) => { if (!open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.text_secondary; } }}
      >
        <GitBranch size={15} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Sync with Git</span>
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
            width: 288,
            overflow: 'hidden',
          }}
        >
          <style>{SPIN_KEYFRAMES}</style>

          {/* --- git not installed --- */}
          {!status.gitInstalled ? (
            <SetupPanel
              title="Git isn’t installed"
              body="Git is the tool that saves your work and shares it with your team. It isn’t installed on this computer yet."
              prompt={installPrompt(status.root)}
              onRecheck={() => void refresh(false)}
              recheckLabel="I’ve installed it — check again"
            />
          ) : !status.isRepo ? (
            /* --- not a git repo --- */
            <SetupPanel
              title="Not connected to Git yet"
              body="This project isn’t set up to sync with your team yet. Your coding agent can connect it in a minute."
              prompt={setupRepoPrompt(status.root)}
              onRecheck={() => void refresh(false)}
              recheckLabel="It’s set up now — check again"
            />
          ) : !status.hasUpstream ? (
            /* --- repo but no remote/upstream --- */
            <SetupPanel
              title="No shared remote yet"
              body={`You’re on branch “${status.branch || 'unknown'}”, but it isn’t connected to a shared remote, so there’s nowhere to sync to yet.`}
              prompt={connectRemotePrompt(status.root)}
              onRecheck={() => void refresh(true)}
              recheckLabel="It’s connected now — check again"
            />
          ) : (
            /* --- normal repo with a remote --- */
            <>
              {/* header */}
              <div style={{ padding: '12px 12px 10px', borderBottom: `1px solid ${theme.border_default}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: theme.text_default, fontSize: 13, fontWeight: 700 }}>
                  <GitBranch size={15} /> Sync with Git
                </div>
                <div style={{ color: op.status === 'error' ? theme.destructive_default : theme.text_secondary, fontSize: 12, lineHeight: 1.45 }}>
                  {op.status !== 'idle' ? op.message : plainStatus(status)}
                </div>
              </div>

              {/* auth / access problem — explain + agent prompt */}
              {authIssue && (
                <div style={{ padding: '12px 12px 4px', display: 'flex', flexDirection: 'column', gap: 8, borderBottom: `1px solid ${theme.border_default}` }}>
                  <div style={{ color: theme.text_secondary, fontSize: 12, lineHeight: 1.45 }}>
                    Syncing failed because Git access isn’t set up on this computer. Your coding agent can fix this for you.
                  </div>
                  <AgentPrompt prompt={authPrompt(status.root, op.error)} />
                </div>
              )}

              {/* sync */}
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  disabled={busy}
                  onClick={() => void runOp('sync')}
                  {...primarySolidHover(!busy)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '9px 12px', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600,
                    color: '#fff',
                    background: busy ? theme.bg_tertiary : theme.primary_solid,
                    cursor: busy ? 'default' : 'pointer',
                  }}
                >
                  {busy
                    ? <RotateCw size={14} style={{ animation: 'pv-git-spin 1s linear infinite' }} />
                    : <RefreshCw size={14} />}
                  {busy ? (op.message || 'Syncing…') : authIssue ? 'Try sync again' : 'Sync changes'}
                </button>
                <div style={{ color: theme.text_secondary, fontSize: 12, textAlign: 'left' }}>
                  You’re on Git branch: <span style={{ color: theme.text_default, fontWeight: 600 }}>{status.branch || 'unknown'}</span>
                </div>
              </div>

              {/* advanced */}
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
                      <AdvBtn label="Pull" icon={<Download size={13} />} disabled={busy} onClick={() => runOp('pull')} />
                      <AdvBtn label="Push" icon={<Upload size={13} />} disabled={busy} onClick={() => runOp('push')} />
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

// A titled setup panel: plain explanation + agent prompt + a "check again" action.
const SetupPanel: React.FC<{
  title: string;
  body: string;
  prompt: string;
  onRecheck: () => void;
  recheckLabel: string;
}> = ({ title, body, prompt, onRecheck, recheckLabel }) => (
  <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
    <div style={{ color: theme.text_default, fontSize: 13, fontWeight: 700 }}>{title}</div>
    <div style={{ color: theme.text_secondary, fontSize: 12, lineHeight: 1.5 }}>{body}</div>
    <AgentPrompt prompt={prompt} />
    <button
      onClick={onRecheck}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 0', border: 'none', background: 'transparent', color: theme.text_tertiary, fontSize: 12, cursor: 'pointer' }}
      onMouseEnter={(e) => (e.currentTarget.style.color = theme.text_secondary)}
      onMouseLeave={(e) => (e.currentTarget.style.color = theme.text_tertiary)}
    >
      <RefreshCw size={12} /> {recheckLabel}
    </button>
  </div>
);

// A ready-to-paste prompt for the user's coding agent, with a Copy button.
const AgentPrompt: React.FC<{ prompt: string }> = ({ prompt }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  };
  return (
    <div style={{ border: `1px solid ${theme.border_default}`, borderRadius: 6, background: theme.bg_strong, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px 6px 10px', borderBottom: `1px solid ${theme.border_default}` }}>
        <span style={{ color: theme.text_tertiary, fontSize: 11, fontWeight: 600 }}>Paste this to your coding agent</span>
        <button
          onClick={copy}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 7px', border: 'none', borderRadius: 4, background: copied ? theme.success_low : theme.bg_tertiary, color: copied ? theme.success_default : theme.text_secondary, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div style={{ padding: 10, color: theme.text_secondary, fontSize: 11.5, lineHeight: 1.5, maxHeight: 132, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
        {prompt}
      </div>
    </div>
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
