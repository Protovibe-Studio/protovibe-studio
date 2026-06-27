// plugins/protovibe/src/ui/components/comments/CommentAvatar.tsx
import React from 'react';
import { getInitials } from '../../hooks/useCommentUser';

// Deterministic accent per author so avatars stay visually stable across renders.
const PALETTE = ['#39a9ff', '#1ABC9C', '#F2C94C', '#F24822', '#9B59B6', '#386ad1'];

function colorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export const CommentAvatar: React.FC<{ name: string; email?: string; size?: number }> = ({
  name,
  email,
  size = 24,
}) => {
  const bg = colorFor(email || name || '?');
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '50%',
        background: bg,
        color: '#0d0d0d',
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
