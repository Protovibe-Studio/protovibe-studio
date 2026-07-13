// plugins/protovibe/src/ui/components/GitMenu.tsx
// Bottom-bar Git dropdown: current branch, one-click "Sync changes", and an
// Advanced section (commit / pull / push). Mirrors the "More" menu mechanics in
// ProtovibeApp.tsx (floating position + createPortal + mousedown click-outside).
//
// When Git isn't ready we explain the situation in plain language. Projects
// without a repo/remote get an intro to GitHub (what it is, why a designer would
// want it) and a one-click flow: connect via the Protovibe manager app, then
// init + private repo + push. The old paste-to-your-coding-agent prompts remain
// as a collapsed escape hatch.

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GitBranch, RotateCw, ChevronDown, Download, Upload, GitCommit, RefreshCw, Copy, Check, ExternalLink, Users, MessageSquare, Cloud } from 'lucide-react';
import { useFloatingDropdownPosition } from '../hooks/useFloatingDropdownPosition';
import { theme, primarySolidHover } from '../theme';
import { openInBrowser } from '../utils/openExternal';
import type { UseGitSync } from '../hooks/useGitSync';

const SPIN_KEYFRAMES = '@keyframes pv-git-spin { to { transform: rotate(360deg); } }';

// lucide dropped brand icons — inline GitHub mark instead.
const GithubMark: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
  </svg>
);

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

const primaryButtonStyle = (enabled: boolean): React.CSSProperties => ({
  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  padding: '9px 12px', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600,
  color: '#fff',
  background: enabled ? theme.primary_solid : theme.bg_tertiary,
  cursor: enabled ? 'pointer' : 'default',
});

export const GitMenu: React.FC<{ git: UseGitSync }> = ({ git }) => {
  const {
    status, op, busy, runOp, refresh,
    github, connecting, repoAccess,
    checkGithub, startConnect, cancelConnect, checkRepoAccess, logout,
  } = git;
  const [open, setOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [otherOptionsOpen, setOtherOptionsOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const gitMissing = !!status && !status.gitInstalled;
  const needsBackupPanel = !!status?.gitInstalled && (!status.isRepo || !status.hasUpstream);
  const authIssue = op.status === 'error' && isAuthOrAccessError(`${op.error ?? ''} ${op.message ?? ''}`);
  const githubAuthIssue = authIssue && status?.remoteKind === 'github-https';

  const { style: menuStyle } = useFloatingDropdownPosition({
    isOpen: open,
    anchorRef: buttonRef,
    dropdownRef: menuRef,
    preferredPlacement: 'top',
    offset: 6,
    updateDeps: [advancedOpen, otherOptionsOpen, status?.gitInstalled, status?.isRepo, status?.hasUpstream, op.status, github?.connected, connecting, repoAccess?.state],
  });

  // Refresh status whenever the menu opens so it's current when they look.
  // GitHub state (cheap token-file read) too — it feeds the account row.
  useEffect(() => {
    if (!open) return;
    void refresh(false);
    void checkGithub(false);
  }, [open, refresh, checkGithub]);

  // The manager probe (slow when the manager is down) locates the Protovibe app
  // so a disconnected panel can decide between "Connect to GitHub" and "open the
  // Protovibe app first". Needed by every disconnected surface now that the
  // normal panel also carries an always-present connect bar.
  useEffect(() => {
    if (open && github && !github.connected && github.managerReachable === undefined) {
      void checkGithub(true);
    }
  }, [open, github, checkGithub]);

  // While git is being provisioned in the background (the manager downloads
  // the embedded distribution on git-less machines), poll so the menu flips
  // to the backup panel by itself the moment git is ready.
  useEffect(() => {
    if (!open || !gitMissing) return;
    const timer = setInterval(() => { void refresh(false); }, 3000);
    return () => clearInterval(timer);
  }, [open, gitMissing, refresh]);

  // A GitHub-remote auth error while connected is usually an app-installation
  // coverage problem — check so we can point at the install page.
  useEffect(() => {
    if (open && githubAuthIssue && github?.connected) void checkRepoAccess();
  }, [open, githubAuthIssue, github?.connected, checkRepoAccess]);

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

  const backupBusy = busy && op.op === 'backup';
  const backupNeedsInstall = op.status === 'error' && op.op === 'backup' && !!op.needsInstall;
  const syncNeedsInstall = githubAuthIssue && !!github?.connected && (repoAccess?.state === 'not-covered' || repoAccess?.state === 'no-push');
  const installUrl = op.installUrl || repoAccess?.installUrl || github?.installUrl || '';

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

          {/* --- git not provisioned yet (manager downloads it in the background) --- */}
          {!status.gitInstalled ? (
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ color: theme.text_default, fontSize: 13, fontWeight: 700 }}>Work on this project together</div>
              <GithubIntro />
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: theme.text_secondary, fontSize: 12, lineHeight: 1.5 }}>
                <RotateCw size={13} style={{ flexShrink: 0, marginTop: 2, animation: 'pv-git-spin 1s linear infinite' }} />
                <span>Protovibe is finishing its one-time setup in the background — usually under a minute. You can already connect your GitHub account.</span>
              </div>
              <ConnectBlock
                github={github}
                connecting={connecting}
                startConnect={startConnect}
                cancelConnect={cancelConnect}
                checkGithub={checkGithub}
              />
              <TroubleFallback prompt={installPrompt(status.root)} />
            </div>
          ) : needsBackupPanel ? (
            /* --- no repo / no remote: intro + one-click connect to GitHub --- */
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ color: theme.text_default, fontSize: 13, fontWeight: 700 }}>Work on this project together</div>

              {/* The pitch, until something goes wrong — then the problem takes the space. */}
              {!(op.status === 'error' && op.op === 'backup') && <GithubIntro />}

              {!github ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: theme.text_secondary, fontSize: 12 }}>
                  <RotateCw size={13} style={{ animation: 'pv-git-spin 1s linear infinite' }} /> Checking your GitHub connection…
                </div>
              ) : github.connected ? (
                backupNeedsInstall ? (
                  <InstallAccessPanel
                    installUrl={installUrl}
                    body="GitHub needs your permission before Protovibe can use this repository. Open GitHub, give Protovibe access, then try again."
                    retryLabel="I’ve done it — try again"
                    onRetry={() => void runOp('backup')}
                    disabled={busy}
                  />
                ) : (
                  <>
                    <div style={{ color: op.status === 'error' && op.op === 'backup' ? theme.destructive_default : theme.text_secondary, fontSize: 12, lineHeight: 1.5 }}>
                      {op.status === 'error' && op.op === 'backup'
                        ? (op.message || 'Couldn’t add this project to GitHub.')
                        : `Protovibe will add this project to your GitHub account (${github.login ?? 'connected'}). It stays private — only you and the people you invite can see it.`}
                    </div>
                    <button disabled={busy} onClick={() => void runOp('backup')} {...primarySolidHover(!busy)} style={primaryButtonStyle(!busy)}>
                      {backupBusy
                        ? <RotateCw size={14} style={{ animation: 'pv-git-spin 1s linear infinite' }} />
                        : <GithubMark size={14} />}
                      {backupBusy ? (op.message || 'Setting up…') : op.status === 'error' && op.op === 'backup' ? 'Try again' : 'Add project to GitHub'}
                    </button>
                  </>
                )
              ) : connecting ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: theme.text_secondary, fontSize: 12, lineHeight: 1.5 }}>
                    <RotateCw size={13} style={{ flexShrink: 0, animation: 'pv-git-spin 1s linear infinite' }} />
                    Waiting for you to finish connecting in the Protovibe app…
                  </div>
                  <button
                    onClick={cancelConnect}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 0', border: 'none', background: 'transparent', color: theme.text_tertiary, fontSize: 12, cursor: 'pointer' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = theme.text_secondary)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = theme.text_tertiary)}
                  >
                    Cancel
                  </button>
                </>
              ) : github.managerReachable === undefined ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: theme.text_secondary, fontSize: 12 }}>
                  <RotateCw size={13} style={{ animation: 'pv-git-spin 1s linear infinite' }} /> Looking for the Protovibe app…
                </div>
              ) : github.managerReachable ? (
                <>
                  <div style={{ color: theme.text_secondary, fontSize: 12, lineHeight: 1.5 }}>
                    Start by connecting your GitHub account — it’s free, and Protovibe sets the rest up for you.
                  </div>
                  <button onClick={startConnect} {...primarySolidHover(true)} style={primaryButtonStyle(true)}>
                    <GithubMark size={14} /> Connect GitHub
                  </button>
                </>
              ) : (
                <>
                  <div style={{ color: theme.text_secondary, fontSize: 12, lineHeight: 1.5 }}>
                    Open the Protovibe app first — that’s where you connect your GitHub account. Then come back here.
                  </div>
                  <button
                    onClick={() => void checkGithub()}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 0', border: 'none', background: 'transparent', color: theme.text_tertiary, fontSize: 12, cursor: 'pointer' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = theme.text_secondary)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = theme.text_tertiary)}
                  >
                    <RefreshCw size={12} /> I’ve opened it — check again
                  </button>
                </>
              )}

              {github?.connected && (
                <div style={{ margin: '0 -12px' }}>
                  <AccountRow login={github.login} avatarUrl={github.avatarUrl} onLogout={() => void logout()} />
                </div>
              )}

              {/* escape hatch: the old agent prompts */}
              <div style={{ borderTop: `1px solid ${theme.border_default}`, margin: '0 -12px' }}>
                <button
                  onClick={() => setOtherOptionsOpen((v) => !v)}
                  style={{ ...menuItemStyle, color: theme.text_secondary, justifyContent: 'space-between' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = theme.bg_tertiary)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span>Other options</span>
                  <ChevronDown size={14} style={{ transform: otherOptionsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                </button>
                {otherOptionsOpen && (
                  <div style={{ padding: '4px 12px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <AgentPrompt prompt={!status.isRepo ? setupRepoPrompt(status.root) : connectRemotePrompt(status.root)} />
                    <button
                      onClick={() => void refresh(true)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '4px 0', border: 'none', background: 'transparent', color: theme.text_tertiary, fontSize: 12, cursor: 'pointer' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = theme.text_secondary)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = theme.text_tertiary)}
                    >
                      <RefreshCw size={12} /> It’s set up now — check again
                    </button>
                  </div>
                )}
              </div>
            </div>
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

              {/* auth / access problem */}
              {authIssue && (
                <div style={{ padding: '12px 12px 4px', display: 'flex', flexDirection: 'column', gap: 8, borderBottom: `1px solid ${theme.border_default}` }}>
                  {githubAuthIssue ? (
                    !github ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: theme.text_secondary, fontSize: 12 }}>
                        <RotateCw size={13} style={{ animation: 'pv-git-spin 1s linear infinite' }} /> Checking your GitHub connection…
                      </div>
                    ) : !github.connected ? (
                      connecting ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: theme.text_secondary, fontSize: 12, lineHeight: 1.5 }}>
                          <RotateCw size={13} style={{ flexShrink: 0, animation: 'pv-git-spin 1s linear infinite' }} />
                          Waiting for you to finish connecting in the Protovibe app…
                        </div>
                      ) : github.managerReachable === undefined ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: theme.text_secondary, fontSize: 12 }}>
                          <RotateCw size={13} style={{ animation: 'pv-git-spin 1s linear infinite' }} /> Looking for the Protovibe app…
                        </div>
                      ) : github.managerReachable ? (
                        <>
                          <div style={{ color: theme.text_secondary, fontSize: 12, lineHeight: 1.45 }}>
                            Syncing needs your GitHub account. Connect it and try again.
                          </div>
                          <button onClick={startConnect} {...primarySolidHover(true)} style={primaryButtonStyle(true)}>
                            <GithubMark size={14} /> Connect GitHub
                          </button>
                        </>
                      ) : (
                        <div style={{ color: theme.text_secondary, fontSize: 12, lineHeight: 1.45 }}>
                          Syncing needs your GitHub account. Open the Protovibe app to connect it, then try sync again.
                        </div>
                      )
                    ) : syncNeedsInstall ? (
                      <InstallAccessPanel
                        installUrl={installUrl}
                        body="GitHub needs your permission before Protovibe can use this repository. Open GitHub, give Protovibe access to it, then sync again."
                        retryLabel="I’ve done it — sync again"
                        onRetry={() => void runOp('sync')}
                        disabled={busy}
                      />
                    ) : (
                      <>
                        <div style={{ color: theme.text_secondary, fontSize: 12, lineHeight: 1.45 }}>
                          Syncing failed even though your GitHub account is connected. Try again — if it keeps failing, your coding agent can help.
                        </div>
                        <AgentPrompt prompt={authPrompt(status.root, op.error)} />
                      </>
                    )
                  ) : (
                    <>
                      <div style={{ color: theme.text_secondary, fontSize: 12, lineHeight: 1.45 }}>
                        Syncing failed because Git access isn’t set up on this computer. Your coding agent can fix this for you.
                      </div>
                      <AgentPrompt prompt={authPrompt(status.root, op.error)} />
                    </>
                  )}
                </div>
              )}

              {/* sync */}
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  disabled={busy}
                  onClick={() => void runOp('sync')}
                  {...primarySolidHover(!busy)}
                  style={primaryButtonStyle(!busy)}
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

              {/* advanced — borderless, sits directly above the GitHub bar */}
              <div>
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

              <GithubStatusBar
                github={github}
                connecting={connecting}
                startConnect={startConnect}
                cancelConnect={cancelConnect}
                checkGithub={checkGithub}
                onLogout={() => void logout()}
              />
            </>
          )}
        </div>,
        document.body,
      )}
    </>
  );
};

// What a designer gets out of GitHub, before any of it exists for this project.
// Our users don't know what a repo, a commit or a remote is — so lead with the
// outcome (team, feedback, safety) and never make them learn the vocabulary.
const IntroRow: React.FC<{ icon: React.ReactNode; title: string; body: string }> = ({ icon, title, body }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
    <span style={{ color: theme.accent_default, display: 'flex', flexShrink: 0, marginTop: 2 }}>{icon}</span>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
      <span style={{ color: theme.text_default, fontSize: 12, fontWeight: 600 }}>{title}</span>
      <span style={{ color: theme.text_tertiary, fontSize: 11.5, lineHeight: 1.45 }}>{body}</span>
    </div>
  </div>
);

const GithubIntro: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    <div style={{ color: theme.text_secondary, fontSize: 12, lineHeight: 1.5 }}>
      GitHub is a free service that keeps your project online — think of it as a shared drive made for design and code.
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <IntroRow
        icon={<Users size={13} />}
        title="Work with your team"
        body="Invite people to open this project and design alongside you."
      />
      <IntroRow
        icon={<MessageSquare size={13} />}
        title="Get feedback"
        body="Your team can leave comments right on the screens you built."
      />
      <IntroRow
        icon={<Cloud size={13} />}
        title="Kept safe in the cloud"
        body="Sync your changes with one click — nothing gets lost, and you can carry on from any computer."
      />
    </div>
  </div>
);

// Who's connected + Log out. Logging out forgets the machine-wide token, so
// the Protovibe app and every other project disconnect too.
const AccountRow: React.FC<{ login: string | null; avatarUrl: string | null; onLogout: () => void }> = ({ login, avatarUrl, onLogout }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: `1px solid ${theme.border_default}` }}>
    {avatarUrl
      ? <img src={avatarUrl} alt="" style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0 }} />
      : <span style={{ color: theme.text_tertiary, display: 'flex' }}><GithubMark size={14} /></span>}
    <span style={{ flex: 1, color: theme.text_secondary, fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      GitHub: <span style={{ color: theme.text_default, fontWeight: 600 }}>{login ?? 'connected'}</span>
    </span>
    <button
      onClick={onLogout}
      style={{ border: 'none', background: 'transparent', color: theme.text_tertiary, fontSize: 11.5, cursor: 'pointer', padding: 0, flexShrink: 0 }}
      onMouseEnter={(e) => (e.currentTarget.style.color = theme.text_secondary)}
      onMouseLeave={(e) => (e.currentTarget.style.color = theme.text_tertiary)}
    >
      Log out
    </button>
  </div>
);

// Always-present bottom bar in the normal sync panel. When connected it's the
// account row; when not, it's a small, plain-language "Connect to GitHub" bar so
// backing up your work is always one click away. Connecting happens in the
// Protovibe app, so we mirror the same states as the backup panel, compacted.
const GithubStatusBar: React.FC<{
  github: UseGitSync['github'];
  connecting: boolean;
  startConnect: () => void;
  cancelConnect: () => void;
  checkGithub: (probe?: boolean) => Promise<void> | void;
  onLogout: () => void;
}> = ({ github, connecting, startConnect, cancelConnect, checkGithub, onLogout }) => {
  if (github?.connected) {
    return <AccountRow login={github.login} avatarUrl={github.avatarUrl} onLogout={onLogout} />;
  }

  const barStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 12px', borderTop: `1px solid ${theme.border_default}`,
  };
  const icon = <span style={{ color: theme.text_tertiary, display: 'flex', flexShrink: 0 }}><GithubMark size={14} /></span>;
  const label = (text: string) => (
    <span style={{ flex: 1, color: theme.text_secondary, fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span>
  );
  const linkBtn = (text: string, onClick: () => void, color = theme.accent_default) => (
    <button
      onClick={onClick}
      style={{ border: 'none', background: 'transparent', color, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', padding: 0, flexShrink: 0 }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
    >
      {text}
    </button>
  );

  // still figuring out where the Protovibe app is
  if (!github || github.managerReachable === undefined) {
    return (
      <div style={barStyle}>
        {icon}
        <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, color: theme.text_tertiary, fontSize: 11.5 }}>
          <RotateCw size={12} style={{ animation: 'pv-git-spin 1s linear infinite' }} /> Checking your GitHub connection…
        </span>
      </div>
    );
  }

  if (connecting) {
    return (
      <div style={barStyle}>
        {icon}
        <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, color: theme.text_secondary, fontSize: 11.5, overflow: 'hidden' }}>
          <RotateCw size={12} style={{ flexShrink: 0, animation: 'pv-git-spin 1s linear infinite' }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Finish connecting in the Protovibe app…</span>
        </span>
        {linkBtn('Cancel', cancelConnect, theme.text_tertiary)}
      </div>
    );
  }

  if (!github.managerReachable) {
    return (
      <div style={barStyle}>
        {icon}
        {label('Open the Protovibe app to connect')}
        {linkBtn('Check again', () => void checkGithub(true), theme.text_tertiary)}
      </div>
    );
  }

  return (
    <div style={barStyle}>
      {icon}
      {linkBtn('Connect to GitHub', startConnect)}
    </div>
  );
};

// "Give Protovibe access on GitHub" guidance — used when the app installation
// doesn't cover the repo (backup push and sync both land here).
const InstallAccessPanel: React.FC<{
  installUrl: string;
  body: string;
  retryLabel: string;
  onRetry: () => void;
  disabled: boolean;
}> = ({ installUrl, body, retryLabel, onRetry, disabled }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div style={{ color: theme.text_secondary, fontSize: 12, lineHeight: 1.5 }}>{body}</div>
    <button
      onClick={() => openInBrowser(installUrl)}
      {...primarySolidHover(true)}
      style={primaryButtonStyle(true)}
    >
      <ExternalLink size={14} /> Open GitHub
    </button>
    <button
      disabled={disabled}
      onClick={onRetry}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 0', border: 'none', background: 'transparent', color: theme.text_tertiary, fontSize: 12, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1 }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.color = theme.text_secondary; }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.color = theme.text_tertiary; }}
    >
      <RefreshCw size={12} /> {retryLabel}
    </button>
  </div>
);

// A titled setup panel: plain explanation + agent prompt + a "check again" action.
// GitHub connect states for the git-provisioning panel — same flow as the
// backup panel: connect happens in the manager app, we poll until it lands.
const ConnectBlock: React.FC<{
  github: UseGitSync['github'];
  connecting: boolean;
  startConnect: () => void;
  cancelConnect: () => void;
  checkGithub: (probeManager?: boolean) => Promise<void> | void;
}> = ({ github, connecting, startConnect, cancelConnect, checkGithub }) => {
  const spinRow = (label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: theme.text_secondary, fontSize: 12 }}>
      <RotateCw size={13} style={{ animation: 'pv-git-spin 1s linear infinite' }} /> {label}
    </div>
  );
  if (!github) return spinRow('Checking your GitHub connection…');
  if (github.connected) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: theme.success_default, fontSize: 12 }}>
        <Check size={13} /> GitHub connected{github.login ? ` as ${github.login}` : ''}
      </div>
    );
  }
  if (connecting) {
    return (
      <>
        {spinRow('Waiting for you to finish connecting in the Protovibe app…')}
        <button
          onClick={cancelConnect}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 0', border: 'none', background: 'transparent', color: theme.text_tertiary, fontSize: 12, cursor: 'pointer' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = theme.text_secondary)}
          onMouseLeave={(e) => (e.currentTarget.style.color = theme.text_tertiary)}
        >
          Cancel
        </button>
      </>
    );
  }
  if (github.managerReachable === undefined) return spinRow('Looking for the Protovibe app…');
  if (github.managerReachable) {
    return (
      <button onClick={startConnect} {...primarySolidHover(true)} style={primaryButtonStyle(true)}>
        <GithubMark size={14} /> Connect GitHub
      </button>
    );
  }
  return (
    <>
      <div style={{ color: theme.text_secondary, fontSize: 12, lineHeight: 1.5 }}>
        Open the Protovibe app first — that’s where you connect your GitHub account. Then come back here.
      </div>
      <button
        onClick={() => void checkGithub()}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 0', border: 'none', background: 'transparent', color: theme.text_tertiary, fontSize: 12, cursor: 'pointer' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = theme.text_secondary)}
        onMouseLeave={(e) => (e.currentTarget.style.color = theme.text_tertiary)}
      >
        <RefreshCw size={12} /> I’ve opened it — check again
      </button>
    </>
  );
};

// Last-resort escape hatch while git provisioning drags on: collapsed by
// default so designers aren't greeted with an agent prompt.
const TroubleFallback: React.FC<{ prompt: string }> = ({ prompt }) => {
  const [expanded, setExpanded] = useState(false);
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px 0', border: 'none', background: 'transparent', color: theme.text_tertiary, fontSize: 11.5, cursor: 'pointer' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = theme.text_secondary)}
        onMouseLeave={(e) => (e.currentTarget.style.color = theme.text_tertiary)}
      >
        Taking too long? Get help
      </button>
    );
  }
  return <AgentPrompt prompt={prompt} />;
};

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
