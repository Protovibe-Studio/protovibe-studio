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
    color: theme.text_secondary,
    padding: '4px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  return (
    <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border_default}`, background: theme.bg_strong, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '18px 18px 18px', gridTemplateRows: '18px 18px', gap: '2px', alignItems: 'center', justifyItems: 'center' }}>
          <button style={{ ...btnStyle, gridColumn: 2, gridRow: 1, padding: 0, width: '18px', height: '18px', opacity: hasParent ? 1 : 0.3 }} disabled={!hasParent} onClick={() => handleNavigate(parentTarget)} title="Parent (↑)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
          </button>
          <button style={{ ...btnStyle, gridColumn: 1, gridRow: 2, padding: 0, width: '18px', height: '18px', opacity: hasPrev ? 1 : 0.3 }} disabled={!hasPrev} onClick={() => handleNavigate(prevTarget)} title="Previous (←)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          </button>
          <button style={{ ...btnStyle, gridColumn: 2, gridRow: 2, padding: 0, width: '18px', height: '18px', opacity: hasChild ? 1 : 0.3 }} disabled={!hasChild} onClick={() => handleNavigate(childTarget)} title="First Child (↓)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
          </button>
          <button style={{ ...btnStyle, gridColumn: 3, gridRow: 2, padding: 0, width: '18px', height: '18px', opacity: hasNext ? 1 : 0.3 }} disabled={!hasNext} onClick={() => handleNavigate(nextTarget)} title="Next (→)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </button>
        </div>
        <strong style={{ fontSize: '12px', color: theme.text_default, }}>{nodeName}</strong>
      </div>
      <button
        ref={menuBtnRef}
        onClick={() => setMenuOpen(o => !o)}
        title="More options"
        style={{ background: 'transparent', border: 'none', color: theme.text_tertiary, cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}
      >
        <MoreHorizontal size={16} strokeWidth={1.8} />
      </button>
    </div>
  );
};
