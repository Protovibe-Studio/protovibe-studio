// plugins/protovibe/src/ui/hooks/useGitSync.ts
// Single source of truth for the bottom-bar Git menu + the bottom-right "new
// changes" banner. Called once in ProtovibeApp and passed to both consumers.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchGitStatus,
  fetchGitOpStatus,
  startGitOp,
  type GitStatus,
  type GitOp,
  type GitOpState,
} from '../api/client';
import { emitToast } from '../events/toast';

const POLL_INTERVAL_MS = 120_000; // background remote check — every 2 minutes
const OP_POLL_MS = 1_000;

const IDLE_OP: GitOpState = { status: 'idle', message: '' };

export interface UseGitSync {
  status: GitStatus | null;
  op: GitOpState;
  busy: boolean;
  bannerVisible: boolean;
  refresh: (withFetch?: boolean) => Promise<void>;
  runOp: (op: GitOp, message?: string) => Promise<void>;
  dismissBanner: () => void;
}

function isBusy(op: GitOpState): boolean {
  return op.status === 'committing' || op.status === 'pulling' || op.status === 'pushing';
}

export function useGitSync(): UseGitSync {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [op, setOp] = useState<GitOpState>(IDLE_OP);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const mounted = useRef(true);
  const lastBehind = useRef(0);
  const opRunning = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
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
      } else if (latest.status === 'error') {
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

  return { status, op, busy: isBusy(op), bannerVisible, refresh, runOp, dismissBanner };
}
