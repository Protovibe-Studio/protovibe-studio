// plugins/protovibe/src/ui/components/comments/CommentAvatar.tsx
import React from 'react';
import { getInitials } from '../../hooks/useCommentUser';

// Identity-based colouring: the local user's own avatar is a solid blue with
// white text; everyone else gets a neutral white chip with dark text. This makes
// "which comments are mine" readable at a glance without a legend.
const MINE_BG = '#386ad1';
const MINE_FG = '#ffffff';
const OTHER_BG = '#f1f1f1';
const OTHER_FG = '#0d0d0d';

export const CommentAvatar: React.FC<{
  name: string;
  email?: string;
  size?: number;
  mine?: boolean;
}> = ({
  name,
  email: _email,
  size = 24,
  mine = false,
}) => {
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '50%',
        background: mine ? MINE_BG : OTHER_BG,
        color: mine ? MINE_FG : OTHER_FG,
        boxShadow: mine ? 'none' : 'inset 0 0 0 1px rgba(0,0,0,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.42),
        fontWeight: 700,
        letterSpacing: '-0.2px',
        userSelect: 'none',
      }}
    >
      {getInitials(name)}
    </div>
  );
};
