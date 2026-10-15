import { useCallback, useEffect, useRef, useState } from 'react';
import type { CommentThread, CommentThreadsSnapshot } from '../../shared/comments';
import { readCommentThreadsSnapshot } from '../api/comments';

const POLL_MS = 2000;
const SUSPECT_READS_TO_ACCEPT = 3;
const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function mergeThreads(prev: CommentThread[], next: CommentThread[]): CommentThread[] {
  const old = new Map(prev.map(t => [t.id, t]));
  const merged = next.map(t => {
    const previous = old.get(t.id);
    return previous && sameJson(previous, t) ? previous : t;
  });
  return merged.length === prev.length && merged.every((t, i) => t === prev[i]) ? prev : merged;
}

/** Poll the entire list, including messages, so both list and open thread stay current. */
export function useCommentThreads(
  isActive: boolean,
  onSnapshot: (threads: CommentThread[]) => void,
  onError: (error: unknown) => void,
) {
  const [threads, setThreads] = useState<CommentThread[]>([]);
  const threadsRef = useRef(threads);
  threadsRef.current = threads;
  const generation = useRef(0);
  const writes = useRef(0);
  const reading = useRef(0);
  const mounted = useRef(false);
  const callbacks = useRef({ onSnapshot, onError });
  callbacks.current = { onSnapshot, onError };
  const suspect = useRef({ key: '', count: 0 });

  const accept = useCallback((snapshot: CommentThreadsSnapshot, explicit: boolean) => {
    const { threads: next, unreadable } = snapshot;
    // Missing messages/threads may be an editor's atomic replacement or a sync
    // in progress. Confirm the same missing set before discarding local state.
    const missing = explicit ? [] : threadsRef.current.flatMap(t => {
      const nextThread = next.find(n => n.id === t.id);
      if (!nextThread) return [t.id];
      return t.comments.filter(c => !nextThread.comments.some(n => n.id === c.id)).map(c => `${t.id}/${c.id}`);
    });
    const key = JSON.stringify([[...unreadable].sort(), missing.sort()]);
    if (unreadable.length || missing.length) {
      suspect.current = { key, count: key === suspect.current.key ? suspect.current.count + 1 : 1 };
      if (suspect.current.count < SUSPECT_READS_TO_ACCEPT) return;
    } else suspect.current = { key: '', count: 0 };
    setThreads(prev => mergeThreads(prev, next));
    callbacks.current.onSnapshot(next);
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; generation.current++; };
  }, []);

  // Every local write (including optimistic receipts) invalidates older reads.
  // Count writes because receipts can overlap a reply/status mutation.
  const beginWrite = useCallback(() => {
    writes.current++;
    generation.current++;
    let finished = false;
    return () => {
      if (finished) return;
      finished = true;
      writes.current--;
      generation.current++;
    };
  }, []);

  const refresh = useCallback(async () => {
    const gen = ++generation.current;
    if (writes.current) return;
    reading.current++;
    try {
      const snapshot = await readCommentThreadsSnapshot();
      if (mounted.current && gen === generation.current && !writes.current) accept(snapshot, true);
    } catch (e) {
      if (mounted.current && gen === generation.current) callbacks.current.onError(e);
    } finally { reading.current--; }
  }, [accept]);

  useEffect(() => {
    if (!isActive) return;
    let cancelled = false;
    let timer = 0;
    const tick = async () => {
      if (!document.hidden && !writes.current && !reading.current) {
        const gen = generation.current;
        try {
          const snapshot = await readCommentThreadsSnapshot();
          if (!cancelled && gen === generation.current && !writes.current) accept(snapshot, false);
        } catch { /* Keep the last snapshot while the dev server is unreachable. */ }
      }
      if (!cancelled) timer = window.setTimeout(tick, POLL_MS);
    };
    timer = window.setTimeout(tick, 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [isActive, accept]);

  return { threads, setThreads, refresh, beginWrite };
}
