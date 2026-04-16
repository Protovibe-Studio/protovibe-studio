// plugins/protovibe/src/ui/components/FontFamilyPicker.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { theme } from '../theme';
import { useFloatingDropdownPosition } from '../hooks/useFloatingDropdownPosition';
import {
  GOOGLE_FONTS,
  SYSTEM_FONTS,
  FONT_SLOT_FALLBACKS,
  buildGoogleFontsPreviewUrl,
  buildGoogleFontImportUrl,
} from '../constants/googleFonts';

const PREVIEW_LINK_ID = 'pv-google-fonts-preview';

/** Inject a single <link> tag that loads all curated fonts for the picker UI. */
function ensurePreviewFontsLoaded() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(PREVIEW_LINK_ID)) return;
  const link = document.createElement('link');
  link.id = PREVIEW_LINK_ID;
  link.rel = 'stylesheet';
  link.href = buildGoogleFontsPreviewUrl();
  document.head.appendChild(link);
}

interface FontFamilyPickerProps {
  tokenName: string;
  value: string;
  onSave: (value: string, googleFontName?: string) => void;
}

/** Extract the first quoted or unquoted font name from a CSS font-family string. */
function extractLeadingFontName(value: string): string {
  const quoted = value.match(/^["']([^"']+)["']/);
  if (quoted) return quoted[1];
  const plain = value.split(',')[0].trim();
  return plain;
}

type Section = 'system' | 'google';

export const FontFamilyPicker: React.FC<FontFamilyPickerProps> = ({ tokenName, value, onSave }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [section, setSection] = useState<Section>('google');
  const [search, setSearch] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const { style: floatingStyle } = useFloatingDropdownPosition({
    isOpen,
    anchorRef,
    dropdownRef,
    preferredPlacement: 'bottom',
    updateDeps: [section, search],
  });

  useEffect(() => {
    if (isOpen) {
      ensurePreviewFontsLoaded();
      // Auto-focus search when Google Fonts section opens
      if (section === 'google') {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }
  }, [isOpen, section]);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setCustomMode(false);
      setCustomValue('');
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        anchorRef.current && !anchorRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const leadingFont = extractLeadingFontName(value);
  const activeGoogleFont = GOOGLE_FONTS.find(f => f.name.toLowerCase() === leadingFont.toLowerCase());
  const isSystemFont = !activeGoogleFont;

  const filteredFonts = useMemo(() => {
    if (!search.trim()) return GOOGLE_FONTS;
    const q = search.toLowerCase();
    return GOOGLE_FONTS.filter(f => f.name.toLowerCase().includes(q));
  }, [search]);

  const handleSelectSystemFont = (fontValue: string) => {
    onSave(fontValue, undefined);
    setIsOpen(false);
  };

  const handleSelectGoogleFont = (fontName: string) => {
    const fallback = FONT_SLOT_FALLBACKS[tokenName] ?? 'sans-serif';
    const cssValue = `"${fontName}", ${fallback}`;
    onSave(cssValue, fontName);
    setIsOpen(false);
  };

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      onSave(customValue.trim(), undefined);
      setIsOpen(false);
    }
  };

  // Truncate displayed value for the trigger button
  const displayLabel = leadingFont.length > 22 ? leadingFont.slice(0, 22) + '…' : leadingFont;

  const sectionTabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '5px 8px',
    background: active ? theme.bg_tertiary : 'transparent',
    border: 'none',
    color: active ? theme.text_default : theme.text_tertiary,
    fontSize: '10px',
    fontFamily: 'sans-serif',
    cursor: 'pointer',
    fontWeight: active ? 600 : 400,
    transition: 'color 0.1s, background 0.1s',
  });

  return (
    <div style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        ref={anchorRef}
        onClick={() => setIsOpen(v => !v)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          padding: '4px 8px',
          background: isOpen ? theme.bg_tertiary : theme.bg_secondary,
          border: `1px solid ${isOpen ? theme.accent_default : theme.border_default}`,
          borderRadius: 4,
          cursor: 'pointer',
          outline: 'none',
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        <span
          style={{
            fontFamily: activeGoogleFont ? `"${activeGoogleFont.name}", sans-serif` : 'sans-serif',
            fontSize: '12px',
            color: theme.text_default,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            textAlign: 'left',
          }}
        >
          {displayLabel}
        </span>
        <span style={{ color: theme.text_tertiary, fontSize: '9px', flexShrink: 0, fontFamily: 'sans-serif' }}>
          {activeGoogleFont ? 'Google' : 'System'}
        </span>
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
          <path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          data-pv-overlay="true"
          data-pv-ui="true"
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            width: 260,
            background: theme.bg_secondary,
            border: `1px solid ${theme.border_default}`,
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
            zIndex: 9999999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            ...floatingStyle,
          }}
        >
          {/* Section tabs */}
          <div
            style={{
              display: 'flex',
              background: theme.bg_strong,
              borderBottom: `1px solid ${theme.border_default}`,
              flexShrink: 0,
            }}
          >
            <button style={sectionTabStyle(section === 'system')} onClick={() => { setSection('system'); setSearch(''); }}>
              System fonts
            </button>
            <div style={{ width: 1, background: theme.border_default }} />
            <button style={sectionTabStyle(section === 'google')} onClick={() => setSection('google')}>
              Google Fonts
            </button>
          </div>

          {/* System fonts section */}
          {section === 'system' && (
            <div style={{ padding: '6px 0' }}>
              {SYSTEM_FONTS.map(sf => {
                const isActive = !activeGoogleFont && value.startsWith(sf.value.split(',')[0]);
                return (
                  <button
                    key={sf.value}
                    onClick={() => handleSelectSystemFont(sf.value)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '7px 12px',
                      background: isActive ? theme.accent_low : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: isActive ? theme.accent_default : 'transparent',
                      border: `1.5px solid ${isActive ? theme.accent_default : theme.border_default}`,
                    }} />
                    <span style={{ fontFamily: 'sans-serif', fontSize: '12px', color: theme.text_default, flex: 1 }}>
                      {sf.label}
                    </span>
                  </button>
                );
              })}

              <div style={{ height: 1, background: theme.border_default, margin: '4px 0' }} />

              {/* Custom */}
              {!customMode ? (
                <button
                  onClick={() => { setCustomMode(true); setCustomValue(value); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 12px', background: 'transparent', border: 'none',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: 'transparent', border: `1.5px solid ${theme.border_default}`,
                  }} />
                  <span style={{ fontFamily: 'sans-serif', fontSize: '12px', color: theme.text_tertiary }}>
                    Custom value…
                  </span>
                </button>
              ) : (
                <div style={{ padding: '6px 12px', display: 'flex', gap: 6 }}>
                  <input
                    autoFocus
                    value={customValue}
                    onChange={e => setCustomValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleCustomSubmit();
                      if (e.key === 'Escape') setCustomMode(false);
                    }}
                    placeholder="e.g. Arial, Helvetica"
                    style={{
                      flex: 1, fontFamily: 'monospace', fontSize: '11px',
                      background: theme.bg_default, color: theme.text_default,
                      border: `1px solid ${theme.border_default}`, borderRadius: 4,
                      padding: '3px 6px', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                  <button
                    onClick={handleCustomSubmit}
                    style={{
                      padding: '3px 8px', background: theme.accent_default, color: '#fff',
                      border: 'none', borderRadius: 4, cursor: 'pointer',
                      fontFamily: 'sans-serif', fontSize: '11px',
                    }}
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Google Fonts section */}
          {section === 'google' && (
            <>
              {/* Search */}
              <div style={{ padding: '8px 10px', borderBottom: `1px solid ${theme.border_default}`, flexShrink: 0 }}>
                <input
                  ref={searchInputRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search fonts…"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    fontFamily: 'sans-serif', fontSize: '11px',
                    background: theme.bg_default, color: theme.text_default,
                    border: `1px solid ${theme.border_default}`, borderRadius: 4,
                    padding: '4px 8px', outline: 'none',
                  }}
                />
              </div>

              {/* Font list */}
              <div style={{ overflowY: 'auto', maxHeight: 320, flex: 1 }}>
                {filteredFonts.length === 0 && (
                  <div style={{
                    padding: '24px 12px', textAlign: 'center',
                    fontFamily: 'sans-serif', fontSize: '12px', color: theme.text_tertiary,
                  }}>
                    No fonts found
                  </div>
                )}
                {filteredFonts.map(font => {
                  const isActive = activeGoogleFont?.name === font.name;
                  return (
                    <button
                      key={font.name}
                      onClick={() => handleSelectGoogleFont(font.name)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                        padding: '7px 12px',
                        background: isActive ? theme.accent_low : 'transparent',
                        border: 'none', cursor: 'pointer', textAlign: 'left',
                        borderBottom: `1px solid ${theme.border_secondary}`,
                      }}
                    >
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: isActive ? theme.accent_default : 'transparent',
                        border: `1.5px solid ${isActive ? theme.accent_default : theme.border_default}`,
                      }} />
                      <span style={{
                        fontFamily: `"${font.name}", sans-serif`,
                        fontSize: '13px',
                        color: theme.text_default,
                        flex: 1,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {font.name}
                      </span>
                      <span style={{
                        fontFamily: 'sans-serif', fontSize: '9px',
                        color: theme.text_tertiary, flexShrink: 0,
                        textTransform: 'capitalize',
                      }}>
                        {font.category}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};
