import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { theme } from '../../theme';

export interface SpecFindHighlight {
  query: string;
  active: boolean;
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
  const matchKey = JSON.stringify(matches);

  useEffect(() => {
    setSelection({ query, scope, id: activeId ?? '' });
  }, [query, scope, activeId, matchKey]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-spec-find-active="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeId, query, scope]);

  return {
    listRef,
    count: matches.length,
    index,
    step: (delta: number) => {
      if (matches.length) setSelection({ query, scope, id: matches[(index + delta + matches.length) % matches.length] });
    },
    highlight: (id: string): SpecFindHighlight => ({ query, active: id === activeId }),
  };
}

export const SpecFindText: React.FC<{ text: string; highlight?: SpecFindHighlight }> = ({ text, highlight }) => {
  const needle = highlight?.query.trim().toLowerCase();
  const start = needle ? text.toLowerCase().indexOf(needle) : -1;
  if (start < 0 || !needle) return <>{text}</>;
  return <>
    {text.slice(0, start)}
    <mark data-spec-find-active={highlight?.active ?? false} style={{
      background: highlight?.active ? theme.warning_primary : theme.warning_low,
      color: highlight?.active ? theme.bg_strong : 'inherit',
      outline: highlight?.active ? `1px solid ${theme.warning_secondary}` : undefined,
      borderRadius: 2, scrollMarginBlock: 24,
    }}>{text.slice(start, start + needle.length)}</mark>
    {text.slice(start + needle.length)}
  </>;
};

export const SpecFindBar: React.FC<{
  query: string;
  onQueryChange: (query: string) => void;
  find: ReturnType<typeof useSpecFind>;
  placeholder?: string;
  testId?: string;
}> = ({ query, onQueryChange, find, placeholder = 'Find in spec…', testId = 'spec-find-input' }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
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
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.nativeEvent.isComposing) return;
            if (e.key === 'Enter') { e.preventDefault(); find.step(e.shiftKey ? -1 : 1); }
            if (e.key === 'Escape') { e.preventDefault(); onQueryChange(''); }
          }}
          placeholder={placeholder}
          style={{
            width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '5px 6px 5px 28px',
            background: theme.bg_secondary, border: `1px solid ${theme.border_default}`, borderRadius: 6,
            color: theme.text_default, fontSize: 11, outline: 'none', fontFamily: theme.font_ui,
          }}
        />
      </div>
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
        <button type="button" data-testid="spec-find-clear" aria-label="Clear find" title="Clear find (Escape)"
          onClick={() => { onQueryChange(''); inputRef.current?.focus(); }} style={buttonStyle}><X size={12} /></button>
      </>}
    </div>
  );
};
