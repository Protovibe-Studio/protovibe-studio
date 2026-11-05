import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import { InspectorInput } from './InspectorInput';
import { theme } from '../theme';
import { useFloatingDropdownPosition } from '../hooks/useFloatingDropdownPosition';

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

// Long enough that typing a query doesn't fire a search (and 32 thumb fetches) per keystroke.
const DEBOUNCE_MS = 900;

const ICONIFY_API = 'https://api.iconify.design';

const SPIN_KEYFRAMES = '@keyframes pv-icon-search-spin { to { transform: rotate(360deg); } }';

// Session-wide thumbnail cache (iconId → SVG data URI). The Iconify API sits behind a
// Cloudflare rate limit, and the Electron shell runs with the HTTP cache disabled, so
// each SVG is fetched once and reused across searches and re-renders. Failed fetches
// (e.g. 429) aren't cached, so they retry the next time the thumb is shown.
const thumbCache = new Map<string, string>();
const thumbRequests = new Map<string, Promise<string>>();

function loadThumb(iconId: string): Promise<string> {
  let request = thumbRequests.get(iconId);
  if (!request) {
    const [prefix, ...rest] = iconId.split(':');
    request = fetch(`${ICONIFY_API}/${prefix}/${rest.join(':')}.svg?color=white`)
      .then((res) => {
        if (!res.ok) throw new Error(`Iconify ${res.status} for ${iconId}`);
        return res.text();
      })
      .then((svg) => {
        const uri = `data:image/svg+xml,${encodeURIComponent(svg)}`;
        thumbCache.set(iconId, uri);
        return uri;
      })
      .finally(() => thumbRequests.delete(iconId));
    thumbRequests.set(iconId, request);
  }
  return request;
}

const IconThumb: React.FC<{ iconId: string }> = ({ iconId }) => {
  const [src, setSrc] = useState(() => thumbCache.get(iconId));

  useEffect(() => {
    const cached = thumbCache.get(iconId);
    setSrc(cached);
    if (cached) return;

    let cancelled = false;
    loadThumb(iconId).then(
      (uri) => { if (!cancelled) setSrc(uri); },
      () => {},
    );
    return () => { cancelled = true; };
  }, [iconId]);

  return (
    <span style={{ width: 16, height: 16, flexShrink: 0, display: 'inline-flex' }}>
      {src && <img src={src} alt="" width={16} height={16} style={{ opacity: 0.9 }} />}
    </span>
  );
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
  const keyboardSelectionRef = useRef<IconSearchResult | null>(null);
  const pendingBlurValueRef = useRef<string | null>(null);

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

  const searchIcons = async (query: string) => {
    // Responses can arrive out of order; only the latest search may update state.
    const searchId = ++searchIdRef.current;
    keyboardSelectionRef.current = null;
    setActiveIndex(-1);
    setSearchFailed(false);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${ICONIFY_API}/search?query=${encodeURIComponent(query)}&limit=30`);
      if (!res.ok) throw new Error(`Iconify search ${res.status}`);
      const data = await res.json();
      if (searchId !== searchIdRef.current) return;
      const icons: IconSearchResult[] = (data.icons || []).map((icon: string) => {
        const [prefix, ...rest] = icon.split(':');
        return { prefix, name: rest.join(':') };
      });
      setResults(icons);
    } catch {
      if (searchId !== searchIdRef.current) return;
      setResults([]);
      setSearchFailed(true);
    }
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    keyboardSelectionRef.current = null;
    setActiveIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Clearing the query needs no request, so it skips the debounce.
    if (!val.trim()) {
      searchIcons(val);
      return;
    }
    // Show the pending state for the whole debounce, and drop any in-flight response:
    // it belongs to an older query and would otherwise end the pending state early.
    searchIdRef.current++;
    setSearchFailed(false);
    setLoading(true);
    debounceRef.current = setTimeout(() => searchIcons(val), DEBOUNCE_MS);
  };

  const commitValue = (val: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    ++searchIdRef.current;
    setLoading(false);
    keyboardSelectionRef.current = null;
    pendingBlurValueRef.current = val;
    setLocalValue(val);
    if (val !== lastCommittedRef.current) {
      lastCommittedRef.current = val;
      onCommit(val);
    }
    setIsOpen(false);
    inputElRef.current?.blur();
    pendingBlurValueRef.current = null;
  };

  const selectIcon = (result: IconSearchResult) => {
    if (!loading) commitValue(`${result.prefix}:${result.name}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const selected = keyboardSelectionRef.current;
      if (!loading && selected) selectIcon(selected);
      else commitValue(e.currentTarget.value);
      return;
    }
    if (e.key === 'Escape') {
      pendingBlurValueRef.current = lastCommittedRef.current;
      setLocalValue(lastCommittedRef.current);
      setIsOpen(false);
      e.currentTarget.blur();
      pendingBlurValueRef.current = null;
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (loading || !results.length) return;
      const next = Math.min(activeIndex + 1, results.length - 1);
      keyboardSelectionRef.current = results[next];
      setActiveIndex(next);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (loading || !results.length) return;
      const prev = Math.max(activeIndex - 1, 0);
      keyboardSelectionRef.current = results[prev];
      setActiveIndex(prev);
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
        data-testid="icon-search"
        type="text"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={(e) => {
          inputElRef.current = e.currentTarget;
          setIsOpen(true);
          if (debounceRef.current) clearTimeout(debounceRef.current);
          searchIcons(localValue);
        }}
        onBlur={(e) => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          ++searchIdRef.current;
          setLoading(false);
          setIsOpen(false);
          keyboardSelectionRef.current = null;
          const val = pendingBlurValueRef.current ?? e.currentTarget.value;
          if (val !== lastCommittedRef.current) {
            lastCommittedRef.current = val;
            onCommit(val);
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
          data-testid="icon-results"
          ref={dropdownElRef}
          data-pv-overlay="true"
          data-pv-ui="true"
          style={{
            width: '260px',
            maxHeight: '300px',
            overflow: 'hidden',
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
          <style>{SPIN_KEYFRAMES}</style>

          {/* Unset option */}
          <div
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => commitValue('')}
            style={{
              padding: '6px 10px',
              fontSize: '11px',
              color: theme.text_tertiary,
              cursor: 'pointer',
              borderBottom: `1px solid ${theme.border_secondary}`,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
            }}
          >
            <X size={10} strokeWidth={2.5} />
            Unset
          </div>

          {/* Only the list scrolls, so the pending overlay stays centered on what's visible. */}
          <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                flex: '1 1 auto',
                minHeight: 0,
                overflowY: 'auto',
                opacity: loading && results.length > 0 ? 0.35 : 1,
                transition: 'opacity 120ms ease',
              }}
            >
              {/* Room for the spinner when there are no results to dim yet. */}
              {loading && results.length === 0 && <div style={{ height: 64 }} />}

              {!loading && results.length === 0 && localValue && (
                <div style={{ padding: '12px', fontSize: '11px', color: theme.text_tertiary, textAlign: 'center' }}>
                  {searchFailed ? 'Icon search failed, try again' : localValue.trim() ? 'No icons found' : 'Type to search icons'}
                </div>
              )}

              {/* Results stay mounted while a new search loads, so their thumbs aren't torn down and re-fetched. */}
              {results.map((result, i) => {
                const isActive = i === activeIndex;
                const iconId = `${result.prefix}:${result.name}`;
                return (
                  <div
                    key={iconId}
                    data-testid={`icon-option-${iconId}`}
                    data-index={i}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectIcon(result)}
                    onMouseEnter={() => { if (!loading) setActiveIndex(i); }}
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
            </div>

            {loading && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <Loader2
                  size={16}
                  style={{ color: theme.text_secondary, animation: 'pv-icon-search-spin 1s linear infinite' }}
                />
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
