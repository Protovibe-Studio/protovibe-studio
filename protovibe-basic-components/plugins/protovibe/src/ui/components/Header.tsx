// plugins/protovibe/src/ui/components/Header.tsx
import React, { useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useProtovibe } from '../context/ProtovibeContext';
import { theme } from '../theme';
import {
  getAllowedParent,
  getAllowedChild,
  getAllowedSibling,
} from '../utils/traversal';

export const Header: React.FC = () => {
  const { currentBaseTarget, focusElement } = useProtovibe();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  if (!currentBaseTarget) return null;

  const nodeName = currentBaseTarget.nodeName.toLowerCase();
  const parentTarget  = getAllowedParent(currentBaseTarget);
  const childTarget   = getAllowedChild(currentBaseTarget);
  const prevTarget    = getAllowedSibling(currentBaseTarget, 'prev');
  const nextTarget    = getAllowedSibling(currentBaseTarget, 'next');

  const hasParent = !!parentTarget;
  const hasChild  = !!childTarget;
  const hasPrev   = !!prevTarget;
  const hasNext   = !!nextTarget;

  const handleNavigate = (newTarget: HTMLElement | null) => {
    if (newTarget) focusElement(newTarget);
  };

  const btnStyle: React.CSSProperties = {
    background: theme.bg_secondary,
    border: `1px solid ${theme.border_default}`,
    color: theme.text_tertiary, // More subtle
    padding: 0,
    borderRadius: '3px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontFamily: 'monospace'
  };

  return (
    <div style={{ padding: '8px 12px 8px 16px', borderBottom: `1px solid ${theme.border_default}`, background: theme.bg_strong, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, gap: '8px' }}>
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <strong style={{ fontSize: '14px', color: theme.text_default, whiteSpace: 'nowrap', textOverflow: 'ellipsis', display: 'block' }}>{nodeName}</strong>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 16px)', gridTemplateRows: 'repeat(2, 16px)', gap: '2px', flexShrink: 0 }}>
        {/* W */}
        <button style={{ ...btnStyle, gridColumn: 2, gridRow: 1, width: '16px', height: '16px', fontSize: '9px', opacity: hasParent ? 1 : 0.7 }}
          disabled={!hasParent} onClick={() => handleNavigate(parentTarget)} title="Select parent">W</button>
        {/* A */}
        <button style={{ ...btnStyle, gridColumn: 1, gridRow: 2, width: '16px', height: '16px', fontSize: '9px', opacity: hasPrev ? 1 : 0.7 }}
          disabled={!hasPrev} onClick={() => handleNavigate(prevTarget)} title="Previous sibling">A</button>
        {/* S */}
        <button style={{ ...btnStyle, gridColumn: 2, gridRow: 2, width: '16px', height: '16px', fontSize: '9px', opacity: hasChild ? 1 : 0.7 }}
          disabled={!hasChild} onClick={() => handleNavigate(childTarget)} title="Select child">S</button>
        {/* D */}
        <button style={{ ...btnStyle, gridColumn: 3, gridRow: 2, width: '16px', height: '16px', fontSize: '9px', opacity: hasNext ? 1 : 0.7 }}
          disabled={!hasNext} onClick={() => handleNavigate(nextTarget)} title="Next sibling">D</button>
      </div>
    </div>
  );
};
