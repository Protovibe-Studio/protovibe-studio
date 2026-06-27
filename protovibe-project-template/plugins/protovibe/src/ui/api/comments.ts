// plugins/protovibe/src/ui/api/comments.ts
import type { CommentThread, CommentItem, CommentStatus } from '../../shared/comments';

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any).error || `Request to ${url} failed`);
  }
  return res.json() as Promise<T>;
}

export async function fetchCommentThreads(ids?: string[]): Promise<CommentThread[]> {
  const data = await postJson<{ threads: CommentThread[] }>('/__comments-list', ids ? { ids } : {});
  return data.threads || [];
}

export async function createCommentThread(params: {
  file: string;
  nameEnd: number[];
  thread: CommentThread;
}): Promise<CommentThread> {
  const data = await postJson<{ thread: CommentThread }>('/__comments-create-thread', params);
  return data.thread;
}

export async function replyToThread(threadId: string, comment: CommentItem): Promise<CommentThread> {
  const data = await postJson<{ thread: CommentThread }>('/__comments-reply', { threadId, comment });
  return data.thread;
}

export async function editComment(threadId: string, commentId: string, content: string): Promise<CommentThread> {
  const data = await postJson<{ thread: CommentThread }>('/__comments-edit', { threadId, commentId, content });
  return data.thread;
}

export async function deleteComment(threadId: string, commentId: string): Promise<CommentThread> {
  const data = await postJson<{ thread: CommentThread }>('/__comments-delete', { threadId, commentId });
  return data.thread;
}

// Pass `null` to clear the status (back to "No status" / untriaged).
export async function updateThreadStatus(threadId: string, status: CommentStatus | null): Promise<CommentThread> {
  const data = await postJson<{ thread: CommentThread }>('/__comments-update-status', { threadId, status });
  return data.thread;
}

export async function deleteThread(threadId: string): Promise<void> {
  await postJson<{ success: boolean }>('/__comments-delete-thread', { threadId });
}
