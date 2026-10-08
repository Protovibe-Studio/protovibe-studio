import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { InspectorInput } from './InspectorInput';
import { theme } from '../theme';
import { useFloatingDropdownPosition } from '../hooks/useFloatingDropdownPosition';
import { getCachedIconSearch, getCachedIconThumb, loadIconThumb, searchIconify } from '../utils/iconifyApi';

interface IconSearchResult {
  prefix: string;
  name: string;
}

interface IconSearchInputProps {
  value: string;
  onCommit: (val: string) => void;
  showRemove?: boolean;
  onRemove?: () => void;
}

const DEBOUNCE_MS = 300;

const toResults = (icons: string[]): IconSearchResult[] =>
  icons.map((icon) => {
    const [prefix, ...rest] = icon.split(':');
    return { prefix, name: rest.join(':') };
  });

const IconThumb: React.FC<{ iconId: string }> = ({ iconId }) => {
  const [src, setSrc] = useState(() => getCachedIconThumb(iconId));

  useEffect(() => {
    let cancelled = false;
    setSrc(getCachedIconThumb(iconId));
    loadIconThumb(iconId).then(
      (uri) => { if (!cancelled) setSrc(uri); },
      () => { /* Not cached on failure, so the next search or reopen retries it. */ },
    );
    return () => { cancelled = true; };
  }, [iconId]);

  if (!src) return <span style={{ width: 16, height: 16, flexShrink: 0 }} />;
  return <img src={src} alt="" width={16} height={16} style={{ flexShrink: 0, opacity: 0.9 }} />;
};

export const IconSearchInput: React.FC<IconSearchInputProps> = ({
  value,
  onCommit,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<IconSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputElRef = useRef<HTMLInputElement | null>(null);
  const dropdownElRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommittedRef = useRef(value);
  const searchIdRef = useRef(0);

  useEffect(() => {
    setLocalValue(value);
    lastCommittedRef.current = value;
  }, [value]);

  const { style: floatingStyle } = useFloatingDropdownPosition({
    isOpen,
    anchorRef: inputElRef,
    dropdownRef: dropdownElRef,
    preferredPlacement: 'bottom',
    updateDeps: [results.length, localValue],
  });

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const searchIcons = (query: string) => {
    // Responses can arrive out of order; only the latest search may update state.
    const searchId = ++searchIdRef.current;
    setSearchFailed(false);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    const cached = getCachedIconSearch(query);
    if (cached) {
      setResults(toResults(cached));
      setLoading(false);
      return;
    }
    setLoading(true);
    searchIconify(query).then(
      (icons) => {
        if (searchId !== searchIdRef.current) return;
        setResults(toResults(icons));
        setLoading(false);
      },
      () => {
        if (searchId !== searchIdRef.current) return;
        setResults([]);
        setSearchFailed(true);
        setLoading(false);
      },
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    setActiveIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchIcons(val), DEBOUNCE_MS);
  };

  const selectIcon = (result: IconSearchResult) => {
    const val = `${result.prefix}:${result.name}`;
    setLocalValue(val);
    lastCommittedRef.current = val;
    onCommit(val);
    setIsOpen(false);
    setTimeout(() => inputElRef.current?.blur(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < results.length) {
        selectIcon(results[activeIndex]);
      } else if (localValue) {
        lastCommittedRef.current = localValue;
        onCommit(localValue);
        setIsOpen(false);
        e.currentTarget.blur();
      }
      return;
    }
    if (e.key === 'Escape') {
      setLocalValue(lastCommittedRef.current);
      setIsOpen(false);
      e.currentTarget.blur();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, results.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    }
  };

  // Scroll to active
  useEffect(() => {
    if (activeIndex >= 0 && dropdownElRef.current) {
      const el = dropdownElRef.current.querySelector(`[data-index="${activeIndex}"]`) as HTMLElement;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const canUseDOM = typeof document !== 'undefined';

  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <InspectorInput
        type="text"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={(e) => {
          inputElRef.current = e.currentTarget;
          setIsOpen(true);
          if (localValue) searchIcons(localValue);
        }}
        onBlur={() => {
          setTimeout(() => setIsOpen(false), 200);
          if (localValue !== lastCommittedRef.current) {
            lastCommittedRef.current = localValue;
            onCommit(localValue);
          }
        }}
        placeholder="Search icons..."
        style={{
          background: 'transparent',
          color: localValue ? theme.accent_default : theme.text_tertiary,
          padding: '4px 8px',
          fontSize: '11px',
          outline: 'none',
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box' as const,
        }}
      />

      {isOpen && canUseDOM && createPortal(
        <div
          ref={dropdownElRef}
          data-pv-overlay="true"
          data-pv-ui="true"
          style={{
            width: '260px',
            maxHeight: '300px',
            overflowY: 'auto',
            background: theme.bg_secondary,
            border: `1px solid ${theme.border_default}`,
            borderRadius: '6px',
            zIndex: 9999999,
            boxShadow: '0 8px 16px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            ...floatingStyle,
          }}
        >
          {/* Unset option */}
          <div
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setLocalValue('');
              lastCommittedRef.current = '';
              onCommit('');
              setIsOpen(false);
              setTimeout(() => inputElRef.current?.blur(), 0);
            }}
            style={{
              padding: '6px 10px',
              fontSize: '11px',
              color: theme.text_tertiary,
              cursor: 'pointer',
              borderBottom: `1px solid ${theme.border_secondary}`,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <X size={10} strokeWidth={2.5} />
            Unset
          </div>

          {loading && (
            <div style={{ padding: '12px', fontSize: '11px', color: theme.text_tertiary, textAlign: 'center' }}>
              Searching...
            </div>
          )}

          {!loading && results.length === 0 && localValue && (
            <div style={{ padding: '12px', fontSize: '11px', color: theme.text_tertiary, textAlign: 'center' }}>
              {searchFailed ? 'Icon search failed, try again' : localValue.trim() ? 'No icons found' : 'Type to search icons'}
            </div>
          )}

          {!loading && results.map((result, i) => {
            const isActive = i === activeIndex;
            const iconId = `${result.prefix}:${result.name}`;
            return (
              <div
                key={iconId}
                data-index={i}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectIcon(result)}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(-1)}
                style={{
                  padding: '5px 10px',
                  fontSize: '11px',
                  color: theme.text_default,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderBottom: `1px solid ${theme.border_secondary}`,
                  background: isActive ? theme.accent_default : 'transparent',
                }}
              >
                <IconThumb iconId={iconId} />
                <span style={{ fontFamily: 'monospace', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {result.name}
                </span>
                <span style={{ color: isActive ? 'rgba(255,255,255,0.7)' : theme.text_tertiary, fontSize: '10px', marginLeft: 'auto', flexShrink: 0 }}>
                  {result.prefix}
                </span>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
};
