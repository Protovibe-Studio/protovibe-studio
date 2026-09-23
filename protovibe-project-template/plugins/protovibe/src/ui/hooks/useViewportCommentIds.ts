// plugins/protovibe/src/ui/hooks/useViewportCommentIds.ts
import { useMemo } from 'react';
import { commentIdSelector } from '../../shared/comments';
import type { CommentThread } from '../../shared/comments';
import type { IframeTab } from '../components/ShellNavBar';
import { useViewportAnchorIds } from './useViewportAnchorIds';

/** Thread ids whose anchored element is visible on the active surface (see useViewportAnchorIds). */
export function useViewportCommentIds(
  enabled: boolean,
  activeIframeTab: IframeTab,
  threads: CommentThread[],
): ReadonlySet<string> {
  // Only threads anchored on the active surface can be visible.
  const candidateIds = useMemo(
    () => threads.filter((t) => t.context?.tab === activeIframeTab).map((t) => t.id),
    [threads, activeIframeTab],
  );
  return useViewportAnchorIds(enabled, activeIframeTab, candidateIds, commentIdSelector);
}
