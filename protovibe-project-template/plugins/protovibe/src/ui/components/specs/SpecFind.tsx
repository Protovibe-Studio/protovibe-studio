import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { SpecHeading } from '../../../shared/specs';
import { theme } from '../../theme';

export interface SpecFindHighlight {
  query: string;
  active: boolean;
}

/** Lowercasing can expand a character (İ → i + combining dot). Map the
 * matched range back to the original text before slicing it for display. */
function findTextRange(text: string, needle: string): { start: number; end: number } | null {
  const matchStart = needle ? text.toLowerCase().indexOf(needle) : -1;
  if (matchStart < 0) return null;
  const matchEnd = matchStart + needle.length;
  let offset = 0, foldedOffset = 0, start = 0;
  for (const char of text) {
    const foldedEnd = foldedOffset + char.toLowerCase().length;
    if (foldedOffset <= matchStart && matchStart < foldedEnd) start = offset;
    offset += char.length;
    if (foldedEnd >= matchEnd) return { start, end: offset };
    foldedOffset = foldedEnd;
  }
  return null;
}

/** Find visits the first occurrence in each item, without changing the list or canvas selection. */
export function useSpecFind(entries: { id: string; text: string }[], query: string, scope = '') {
  const listRef = useRef<HTMLDivElement | null>(null);
  const needle = query.trim().toLowerCase();
  const matches = needle ? entries.filter(({ text }) => text.toLowerCase().includes(needle)).map(({ id }) => id) : [];
  const [selection, setSelection] = useState({ query: '', scope: '', id: '' });
  const selectedIndex = selection.query === query && selection.scope === scope ? matches.indexOf(selection.id) : -1;
  const index = matches.length ? Math.max(0, selectedIndex) : -1;
  const activeId = matches[index];
  const activeText = entries.find(({ id }) => id === activeId)?.text;
  const matchKey = JSON.stringify(matches);
  const [navigationVersion, setNavigationVersion] = useState(0);

  useEffect(() => {
    setSelection({ query, scope, id: activeId ?? '' });
  }, [query, scope, activeId, matchKey]);

  useEffect(() => {
    // Inline editors synchronise external text in an effect. Wait for their
    // highlight to render before looking for the active match.
    const frame = requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLElement>('[data-spec-find-active="true"]')
        ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeId, activeText, query, scope, navigationVersion]);

  return {
    listRef,
    count: matches.length,
    index,
    step: (delta: number) => {
      if (matches.length) {
        setSelection({ query, scope, id: matches[(index + delta + matches.length) % matches.length] });
        // A one-match search still needs to reveal that match on every step.
        setNavigationVersion((version) => version + 1);
      }
    },
    highlight: (id: string): SpecFindHighlight => ({ query, active: id === activeId }),
  };
}

export const SpecFindText: React.FC<{ text: string; highlight?: SpecFindHighlight }> = ({ text, highlight }) => {
  const needle = highlight?.query.trim().toLowerCase();
  const range = needle ? findTextRange(text, needle) : null;
  if (!range) return <>{text}</>;
  const { start, end } = range;
  return <>
    {text.slice(0, start)}
    <mark data-spec-find-active={highlight?.active ?? false} style={{
      background: highlight?.active ? theme.warning_primary : theme.warning_low,
      color: highlight?.active ? theme.bg_strong : 'inherit',
      outline: highlight?.active ? `1px solid ${theme.warning_secondary}` : undefined,
      borderRadius: 2, scrollMarginBlock: 24,
    }}>{text.slice(start, end)}</mark>
    {text.slice(end)}
  </>;
};

export const SpecFindBar: React.FC<{
  query: string;
  onQueryChange: (query: string) => void;
  find: ReturnType<typeof useSpecFind>;
  headings?: SpecHeading[];
  placeholder?: string;
  testId?: string;
}> = ({ query, onQueryChange, find, headings = [], placeholder = 'Find in spec…', testId = 'spec-find-input' }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 0 });
  const showOverview = open && !query && headings.length > 0;
  useLayoutEffect(() => {
    if (!showOverview) return;
    const reposition = () => {
      const rect = inputRef.current?.getBoundingClientRect();
      if (rect) setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width,
        maxHeight: Math.max(0, Math.min(window.innerHeight * 0.7, window.innerHeight - rect.bottom - 12)) });
    };
    reposition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    const dismiss = (e: Event) => {
      if (!inputRef.current?.contains(e.target as Node) && !menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const blur = () => setOpen(false);
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('focusin', dismiss);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('focusin', dismiss);
      window.removeEventListener('blur', blur);
    };
  }, [showOverview]);
  const jump = (id: string) => {
    inputRef.current?.focus();
    setOpen(false);
    find.listRef.current?.querySelector<HTMLElement>(`[data-spec-section="${CSS.escape(id)}"]`)
      ?.scrollIntoView({ block: 'start', inline: 'nearest' });
  };
  const buttonStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    width: 20, height: 24, padding: 0, border: 'none', borderRadius: 4,
    background: 'transparent', color: theme.text_secondary, cursor: 'pointer',
  };
  return (
    <div role="search" style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        <Search size={13} style={{ position: 'absolute', left: 9, top: 7, color: theme.text_tertiary, pointerEvents: 'none' }} />
        <input
          ref={inputRef}
          data-testid={testId}
          aria-label={placeholder.replace('…', '')}
          aria-expanded={headings.length ? showOverview : undefined}
          aria-controls={showOverview ? menuId : undefined}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.nativeEvent.isComposing) return;
            if (e.key === 'Enter') { e.preventDefault(); find.step(e.shiftKey ? -1 : 1); }
            if (e.key === 'Escape') { e.preventDefault(); setOpen(false); onQueryChange(''); }
            if (e.key === 'ArrowDown' && showOverview) { e.preventDefault(); menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus(); }
          }}
          placeholder={placeholder}
          style={{
            width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '5px 28px',
            background: theme.bg_secondary, border: `1px solid ${theme.border_default}`, borderRadius: 6,
            color: theme.text_default, fontSize: 11, outline: 'none', fontFamily: theme.font_ui,
          }}
        />
        {query && <button type="button" data-testid="spec-find-clear" aria-label="Clear find" title="Clear find (Escape)"
          onClick={() => { onQueryChange(''); inputRef.current?.focus(); }}
          style={{ ...buttonStyle, position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: theme.text_tertiary }}><X size={12} /></button>}
      </div>
      {showOverview && createPortal(
        <div ref={menuRef} id={menuId} data-testid="spec-heading-overview" role="navigation" aria-label="Jump to heading"
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape') { e.preventDefault(); inputRef.current?.focus(); setOpen(false); }
            const buttons = Array.from(menuRef.current?.querySelectorAll('button') ?? []);
            const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault(); buttons[(index + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
            }
          }}
          style={{ position: 'fixed', ...position, zIndex: 10000, boxSizing: 'border-box', overflowY: 'auto',
            overscrollBehavior: 'contain', padding: 4, borderRadius: 6, border: `1px solid ${theme.border_default}`,
            background: theme.bg_strong, boxShadow: '0 6px 24px rgba(0,0,0,0.2)', fontFamily: theme.font_ui }}>
          <div style={{ padding: '5px 8px', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: theme.text_tertiary }}>JUMP TO</div>
          {headings.map(heading => <button key={heading.id} type="button" data-testid="spec-heading-jump"
            data-level={heading.level} onClick={() => jump(heading.id)}
            onMouseEnter={e => { e.currentTarget.style.background = theme.bg_low; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            style={{ display: 'block', width: '100%', border: 'none', borderRadius: 4, background: 'transparent',
              padding: '4px 8px', paddingLeft: heading.level === 'big' ? 8 : 24, textAlign: 'left',
              fontFamily: 'inherit', fontSize: 12, fontWeight: heading.level === 'big' ? 600 : 400,
              color: heading.level === 'big' ? theme.text_default : theme.text_secondary,
              overflowWrap: 'anywhere', cursor: 'pointer', transition: 'background 120ms' }}>
            {heading.title || 'Untitled heading'}
          </button>)}
        </div>, document.body)}
      {query && <>
        <span role="status" aria-live="polite" data-testid="spec-find-count" style={{ fontSize: 10, color: theme.text_secondary, whiteSpace: 'nowrap' }}>
          {find.count ? `${find.index + 1} of ${find.count}` : 'No matches'}
        </span>
        {([-1, 1] as const).map((delta) => (
          <button key={delta} type="button" data-testid={delta < 0 ? 'spec-find-prev' : 'spec-find-next'}
            aria-label={delta < 0 ? 'Previous match' : 'Next match'} title={delta < 0 ? 'Previous match (Shift+Enter)' : 'Next match (Enter)'}
            disabled={!find.count} onClick={() => { find.step(delta); inputRef.current?.focus(); }}
            style={{ ...buttonStyle, opacity: find.count ? 1 : 0.35 }}>
            {delta < 0 ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        ))}
      </>}
    </div>
  );
};
