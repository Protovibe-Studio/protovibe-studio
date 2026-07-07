// plugins/protovibe/src/ui/api/comments.ts
import type { CommentThread, CommentItem, CommentStatus, WordingSuggestion } from '../../shared/comments';

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

// `suggestions` replaces the comment's wording suggestions wholesale (an empty
// array deletes them); omit it to leave the saved suggestions untouched.
export async function editComment(
  threadId: string, commentId: string, content: string, suggestions?: WordingSuggestion[],
): Promise<CommentThread> {
  const data = await postJson<{ thread: CommentThread }>('/__comments-edit', {
    threadId, commentId, content, ...(suggestions ? { suggestions } : {}),
  });
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

// Add (seen=true) or remove (seen=false) `name` from a comment's read receipts.
// Pass commentId=null to apply to every comment in the thread (used on open).
export async function setCommentSeen(
  threadId: string, commentId: string | null, name: string, seen: boolean,
): Promise<CommentThread> {
  const data = await postJson<{ thread: CommentThread }>('/__comments-set-seen', {
    threadId, commentId: commentId ?? undefined, name, seen,
  });
  return data.thread;
}

export async function markAllCommentsRead(name: string): Promise<void> {
  await postJson<{ success: boolean }>('/__comments-mark-all-read', { name });
}

// Upload one image attachment (compressed to ≤70kb server-side) and return its
// stored filename, to be persisted in a comment's `attachments` array. Called on
// comment submit, not on attach, so abandoned drafts never upload anything.
export async function uploadCommentAttachment(file: File): Promise<string> {
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const data = await postJson<{ attachment: string }>('/__comments-upload-attachment', {
    filename: file.name, base64Data,
  });
  return data.attachment;
}
