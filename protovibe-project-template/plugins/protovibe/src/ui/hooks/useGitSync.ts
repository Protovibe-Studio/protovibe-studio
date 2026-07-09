// plugins/protovibe/src/ui/hooks/useGitSync.ts
// Single source of truth for the bottom-bar Git menu + the bottom-right "new
// changes" banner. Called once in ProtovibeApp and passed to both consumers.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchGitStatus,
  fetchGitOpStatus,
  startGitOp,
  fetchGithubStatus,
  fetchGithubRepoAccess,
  type GitStatus,
  type GitOp,
  type GitOpState,
  type GithubStatus,
  type GithubRepoAccess,
} from '../api/client';
import { emitToast } from '../events/toast';

const POLL_INTERVAL_MS = 120_000; // background remote check — every 2 minutes
const OP_POLL_MS = 1_000;
const CONNECT_POLL_MS = 2_000; // token-file poll while the user connects in the manager
const CONNECT_TIMEOUT_MS = 180_000;

const IDLE_OP: GitOpState = { status: 'idle', message: '' };

export interface UseGitSync {
  status: GitStatus | null;
  op: GitOpState;
  busy: boolean;
  bannerVisible: boolean;
  github: GithubStatus | null;
  connecting: boolean;
  repoAccess: GithubRepoAccess | null;
  refresh: (withFetch?: boolean) => Promise<void>;
  runOp: (op: GitOp, message?: string) => Promise<void>;
  dismissBanner: () => void;
  checkGithub: () => Promise<void>;
  startConnect: () => void;
  cancelConnect: () => void;
  checkRepoAccess: () => Promise<GithubRepoAccess | null>;
}

function isBusy(op: GitOpState): boolean {
  return op.status === 'committing' || op.status === 'pulling' || op.status === 'pushing';
}

export function useGitSync(): UseGitSync {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [op, setOp] = useState<GitOpState>(IDLE_OP);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [github, setGithub] = useState<GithubStatus | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [repoAccess, setRepoAccess] = useState<GithubRepoAccess | null>(null);

  const mounted = useRef(true);
  const lastBehind = useRef(0);
  const opRunning = useRef(false);
  const connectTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectDeadline = useRef(0);

  const stopConnectPolling = useCallback(() => {
    if (connectTimer.current) clearInterval(connectTimer.current);
    connectTimer.current = null;
    setConnecting(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (connectTimer.current) clearInterval(connectTimer.current);
    };
  }, []);

  const refresh = useCallback(async (withFetch = false) => {
    try {
      const next = await fetchGitStatus({ fetch: withFetch });
      if (!mounted.current) return;
      setStatus(next);
      // Re-surface the banner only when the remote has moved further ahead than
      // the last time we showed it (a genuinely new teammate push), so dismiss
      // sticks for a given set of changes.
      if (next.behind > 0 && next.behind !== lastBehind.current) {
        setBannerDismissed(false);
      }
      lastBehind.current = next.behind;
    } catch {
      // transient — leave prior status in place
    }
  }, []);

  // Full GitHub check including the manager probe — run lazily when the menu
  // opens a panel that needs it (backup / auth error), not on every poll.
  const checkGithub = useCallback(async () => {
    try {
      const next = await fetchGithubStatus(true);
      if (mounted.current) setGithub(next);
    } catch {
      // dev server hiccup — leave prior value
    }
  }, []);

  const checkRepoAccess = useCallback(async (): Promise<GithubRepoAccess | null> => {
    try {
      const next = await fetchGithubRepoAccess();
      if (mounted.current) setRepoAccess(next);
      return next;
    } catch {
      return null;
    }
  }, []);

  // Opens the manager's Connect GitHub flow in a new tab and watches the shared
  // token file (via the dev server) until the user finishes there. Only the
  // manager can complete the OAuth flow — its port is the app's callback URL.
  const startConnect = useCallback(() => {
    const managerUrl = github?.managerUrl;
    if (!managerUrl || connectTimer.current) return;
    window.open(`${managerUrl}/?connect-github=1`, '_blank');
    setConnecting(true);
    connectDeadline.current = Date.now() + CONNECT_TIMEOUT_MS;
    connectTimer.current = setInterval(async () => {
      if (Date.now() > connectDeadline.current) {
        stopConnectPolling();
        return;
      }
      try {
        const next = await fetchGithubStatus();
        if (!mounted.current) return;
        if (next.connected) {
          setGithub((prev) => ({ ...(prev ?? next), ...next }));
          stopConnectPolling();
          emitToast({ variant: 'success', message: `Connected to GitHub as ${next.login ?? 'your account'}` });
          void refresh(false);
          void checkRepoAccess();
        }
      } catch {
        // keep polling through transient errors
      }
    }, CONNECT_POLL_MS);
  }, [github?.managerUrl, refresh, checkRepoAccess, stopConnectPolling]);

  // Initial load (no network, just to show the branch fast).
  useEffect(() => { void refresh(false); }, [refresh]);

  // Background poll for remote changes. Gated so we never hit the network when
  // there's no repo / upstream / git binary. Runs one fetch immediately (as soon
  // as we know it's a syncable repo) so incoming changes surface right after load
  // instead of waiting a full interval, then repeats every 2 minutes.
  const canPoll = !!status?.gitInstalled && !!status?.isRepo && !!status?.hasUpstream;
  useEffect(() => {
    if (!canPoll) return;
    void refresh(true);
    const id = setInterval(() => { void refresh(true); }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [canPoll, refresh]);

  const runOp = useCallback(async (opName: GitOp, message?: string) => {
    if (opRunning.current) return;
    opRunning.current = true;
    try {
      setOp({ status: 'committing', message: 'Starting…', op: opName });
      await startGitOp(opName, message);

      // Poll the backend op state until it reaches a terminal status.
      let latest: GitOpState = { status: 'committing', message: 'Starting…', op: opName };
      while (isBusy(latest)) {
        await new Promise((r) => setTimeout(r, OP_POLL_MS));
        try {
          latest = await fetchGitOpStatus();
        } catch {
          // keep polling through transient fetch errors
        }
        if (!mounted.current) return;
        setOp(latest);
      }

      if (latest.status === 'success') {
        emitToast({ variant: 'success', message: latest.message || 'Done' });
        if (latest.resolvedConflict) {
          emitToast({ variant: 'info', message: 'Your changes overrode a conflicting edit', durationMs: 5000 });
        }
        // sync/pull may have pulled new comment files from teammates — tell the
        // Comments tab to re-read them so the list updates without a page reload.
        if (opName === 'sync' || opName === 'pull') {
          window.dispatchEvent(new CustomEvent('pv-comments-refresh'));
        }
      } else if (latest.status === 'error' && !latest.needsInstall) {
        emitToast({ variant: 'error', message: latest.error || latest.message || 'Git operation failed', durationMs: 6000 });
      }

      await refresh(false);

      // Let a success message linger briefly, then return the menu to its normal
      // branch-status line. Errors stay until the next action so they're readable.
      if (latest.status === 'success') {
        setTimeout(() => { if (mounted.current) setOp(IDLE_OP); }, 4000);
      }
    } catch (err) {
      emitToast({ variant: 'error', message: err instanceof Error ? err.message : String(err), durationMs: 6000 });
      setOp({ status: 'error', message: 'Failed to start', op: opName, error: String(err) });
    } finally {
      opRunning.current = false;
    }
  }, [refresh]);

  const dismissBanner = useCallback(() => setBannerDismissed(true), []);

  const bannerVisible =
    !!status?.gitInstalled &&
    !!status?.isRepo &&
    !!status?.hasUpstream &&
    status.behind > 0 &&
    !bannerDismissed &&
    !isBusy(op);

  return {
    status,
    op,
    busy: isBusy(op),
    bannerVisible,
    github,
    connecting,
    repoAccess,
    refresh,
    runOp,
    dismissBanner,
    checkGithub,
    startConnect,
    cancelConnect: stopConnectPolling,
    checkRepoAccess,
  };
}
