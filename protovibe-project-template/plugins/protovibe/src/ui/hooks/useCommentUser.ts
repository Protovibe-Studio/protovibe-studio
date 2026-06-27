// plugins/protovibe/src/ui/hooks/useCommentUser.ts
import { useState, useCallback } from 'react';
import type { CommentAuthor } from '../../shared/comments';

const STORAGE_KEY = 'pv-comment-user';

/**
 * Local-only author identity for comment attribution. This is deliberately NOT
 * a signup — it lives in localStorage so a teammate can tell who left a note.
 */
export function useCommentUser() {
  const [user, setUser] = useState<CommentAuthor | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as CommentAuthor) : null;
    } catch {
      return null;
    }
  });

  const saveUser = useCallback((name: string, email: string) => {
    const next: CommentAuthor = { name: name.trim(), email: email.trim() };
    setUser(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      console.warn('Failed to persist comment user', err);
    }
    return next;
  }, []);

  return { user, saveUser };
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

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
