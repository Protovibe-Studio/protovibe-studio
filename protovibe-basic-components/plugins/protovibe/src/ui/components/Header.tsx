// plugins/protovibe/src/ui/components/Header.tsx
import React, { useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useProtovibe } from '../context/ProtovibeContext';
import { theme } from '../theme';

export const Header: React.FC = () => {
  const { currentBaseTarget, setCurrentBaseTarget, setHighlightedElement, setActiveSourceId, setActiveModifiers, setSources } = useProtovibe();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  if (!currentBaseTarget) return null;

  const nodeName = currentBaseTarget.nodeName.toLowerCase();
  const hasParent = currentBaseTarget.parentElement && currentBaseTarget.parentElement !== document.documentElement;
  const hasChild = !!currentBaseTarget.firstElementChild;
  const hasPrev = !!currentBaseTarget.previousElementSibling;
  const hasNext = !!currentBaseTarget.nextElementSibling;

  const handleNavigate = (newTarget: HTMLElement | null) => {
    if (newTarget) {
      setActiveModifiers({ interaction: [], breakpoint: null, dataAttrs: {} });
      setActiveSourceId(null); // Force reset to first tab
      setCurrentBaseTarget(newTarget);
      setHighlightedElement(newTarget);
      
      // We need to find the pv-loc on the new target too
      let target = newTarget;
      let matchedIds = new Set<string>();
      while (target && target !== document.documentElement) {
        if (target.attributes) {
          for (let i = 0; i < target.attributes.length; i++) {
            if (target.attributes[i].name.startsWith('data-pv-loc-')) {
              matchedIds.add(target.attributes[i].name.replace('data-pv-loc-', ''));
            }
          }
        }
        if (matchedIds.size > 0) break;
        target = target.parentElement as HTMLElement;
      }
      if (matchedIds.size > 0) {
        const ids = Array.from(matchedIds);
        setSources(ids);
      }
    }
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
          <button style={{ ...btnStyle, gridColumn: 2, gridRow: 1, padding: 0, width: '18px', height: '18px', opacity: hasParent ? 1 : 0.3 }} disabled={!hasParent} onClick={() => handleNavigate(currentBaseTarget.parentElement)} title="Parent (↑)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
          </button>
          <button style={{ ...btnStyle, gridColumn: 1, gridRow: 2, padding: 0, width: '18px', height: '18px', opacity: hasPrev ? 1 : 0.3 }} disabled={!hasPrev} onClick={() => handleNavigate(currentBaseTarget.previousElementSibling as HTMLElement)} title="Previous (←)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          </button>
          <button style={{ ...btnStyle, gridColumn: 2, gridRow: 2, padding: 0, width: '18px', height: '18px', opacity: hasChild ? 1 : 0.3 }} disabled={!hasChild} onClick={() => handleNavigate(currentBaseTarget.firstElementChild as HTMLElement)} title="First Child (↓)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
          </button>
          <button style={{ ...btnStyle, gridColumn: 3, gridRow: 2, padding: 0, width: '18px', height: '18px', opacity: hasNext ? 1 : 0.3 }} disabled={!hasNext} onClick={() => handleNavigate(currentBaseTarget.nextElementSibling as HTMLElement)} title="Next (→)">
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
