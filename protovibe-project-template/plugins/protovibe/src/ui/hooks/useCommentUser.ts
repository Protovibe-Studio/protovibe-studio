// plugins/protovibe/src/ui/hooks/useCommentUser.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import type { CommentAuthor, CommentItem, CommentThread } from '../../shared/comments';

const STORAGE_KEY = 'pv-comment-user';

function readCache(): CommentAuthor | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as CommentAuthor) : null;
  } catch {
    return null;
  }
}

function writeCache(user: CommentAuthor): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch (err) {
    console.warn('Failed to cache comment user', err);
  }
}

/**
 * Author identity for comment attribution. This is deliberately NOT a signup.
 *
 * The profile lives in ~/.protovibe/profile.json so it follows the user across
 * every project on this machine — localStorage is keyed by origin, and each
 * project runs on its own dev-server port, so a browser-only profile would have
 * to be re-entered per project. localStorage is still written, but only as a
 * cache: it lets the first render show the right author instead of flashing the
 * "Who are you?" gate while the server responds. The file always wins.
 */
export function useCommentUser() {
  const [user, setUser] = useState<CommentAuthor | null>(readCache);
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/__profile');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        if (data.profile) {
          setUser(data.profile as CommentAuthor);
          writeCache(data.profile as CommentAuthor);
          return;
        }

        // No shared profile yet. A cached one means this browser set an identity
        // before the profile moved to disk — promote it so it survives the next
        // project instead of asking the user again.
        const cached = userRef.current;
        if (cached) void saveProfile(cached);
      } catch {
        // Offline / older dev server: the cached identity still works locally.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const saveUser = useCallback((name: string, email: string) => {
    const next: CommentAuthor = { name: name.trim(), email: email.trim() };
    // Applied optimistically: callers act on the returned author immediately
    // (posting the comment that opened the profile gate), and a failed write
    // should not cost them that comment.
    setUser(next);
    writeCache(next);
    void saveProfile(next);
    return next;
  }, []);

  return { user, saveUser };
}

async function saveProfile(author: CommentAuthor): Promise<void> {
  try {
    await fetch('/__profile-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(author),
    });
  } catch (err) {
    console.warn('Failed to persist comment profile', err);
  }
}

/**
 * Whether a comment author is the locally-stored user. Email is the stable
 * identity when present; otherwise we fall back to the display name. Mirrors
 * the check already used to gate edit/delete buttons.
 */
export function authorIsMe(
  user: CommentAuthor | null,
  author: { name: string; email?: string },
): boolean {
  if (!user) return false;
  if (user.email && author.email) return user.email === author.email;
  return user.name === author.name;
}

/**
 * Whether the current user has already seen a single comment. With no local
 * profile we can't track anything, so everything reads as "seen" (no noisy dots
 * for anonymous users). Once a comment has a `seenBy` array it is authoritative
 * (this lets you mark even your OWN message unread). A comment that was never
 * tracked falls back to "author has seen their own message".
 */
export function commentSeenByMe(user: CommentAuthor | null, comment: CommentItem): boolean {
  if (!user) return true;
  if (!Array.isArray(comment.seenBy)) return authorIsMe(user, comment.author);
  return comment.seenBy.includes(user.name);
}

/** A thread is unread if any of its messages is unseen by the current user. */
export function threadHasUnread(user: CommentAuthor | null, thread: CommentThread): boolean {
  if (!user) return false;
  return thread.comments.some((c) => !commentSeenByMe(user, c));
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
