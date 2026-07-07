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
} from '../constants/googleFonts';

const PREVIEW_LINK_ID = 'pv-google-fonts-preview';

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

function extractLeadingFontName(value: string): string {
  const quoted = value.match(/^["']([^"']+)["']/);
  if (quoted) return quoted[1];
  return value.split(',')[0].trim();
}

export const FontFamilyPicker: React.FC<FontFamilyPickerProps> = ({ tokenName, value, onSave }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customMode, setCustomMode] = useState<'google' | 'css' | false>(false);
  const [customValue, setCustomValue] = useState('');

  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const { style: floatingStyle } = useFloatingDropdownPosition({
    isOpen,
    anchorRef,
    dropdownRef,
    preferredPlacement: 'bottom',
    updateDeps: [search],
  });

  useEffect(() => {
    if (isOpen) {
      ensurePreviewFontsLoaded();
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearch('');
      setCustomMode(false);
      setCustomValue('');
    }
  }, [isOpen]);

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

  const filteredSystemFonts = useMemo(() => {
    if (!search.trim()) return SYSTEM_FONTS;
    const q = search.toLowerCase();
    return SYSTEM_FONTS.filter(sf => sf.label.toLowerCase().includes(q));
  }, [search]);

  const filteredGoogleFonts = useMemo(() => {
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
    onSave(`"${fontName}", ${fallback}`, fontName);
    setIsOpen(false);
  };

  const handleCustomSubmit = () => {
    const trimmed = customValue.trim();
    if (!trimmed) return;
    if (customMode === 'google') {
      const fallback = FONT_SLOT_FALLBACKS[tokenName] ?? 'sans-serif';
      onSave(`"${trimmed}", ${fallback}`, trimmed);
    } else {
      onSave(trimmed, undefined);
    }
    setIsOpen(false);
  };

  const displayLabel = leadingFont.length > 22 ? leadingFont.slice(0, 22) + '…' : leadingFont;

  const sectionLabel = (label: string) => (
    <div style={{
      padding: '5px 12px 3px',
      fontFamily: theme.font_ui, fontSize: '11px', lineHeight: '11px', fontWeight: 700,
      color: theme.text_tertiary, letterSpacing: '0.08em',
      background: theme.bg_strong,
      borderBottom: `1px solid ${theme.border_secondary}`,
    }}>
      {label}
    </div>
  );

  const fontRow = ({
    key, label, fontFamily, isActive, badge, onClick,
  }: {
    key: string;
    label: string;
    fontFamily: string;
    isActive: boolean;
    badge?: string;
    onClick: () => void;
  }) => (
    <button
      key={key}
      onClick={onClick}
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
        fontFamily,
        fontSize: '13px',
        color: theme.text_default,
        flex: 1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      {badge && (
        <span style={{
          fontFamily: theme.font_ui, fontSize: '9px',
          color: theme.text_tertiary, flexShrink: 0,
          textTransform: 'capitalize',
        }}>
          {badge}
        </span>
      )}
    </button>
  );

  const hasResults = filteredSystemFonts.length > 0 || filteredGoogleFonts.length > 0;

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={anchorRef}
        onClick={() => setIsOpen(v => !v)}
        style={{
          width: '100%', boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
          padding: '4px 8px',
          background: isOpen ? theme.bg_tertiary : theme.bg_secondary,
          border: `1px solid ${isOpen ? theme.accent_default : theme.border_default}`,
          borderRadius: 4, cursor: 'pointer', outline: 'none',
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        <span style={{
          fontFamily: activeGoogleFont ? `"${activeGoogleFont.name}", sans-serif` : 'sans-serif',
          fontSize: '12px', color: theme.text_default,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          flex: 1, textAlign: 'left',
        }}>
          {displayLabel}
        </span>
        <span style={{ color: theme.text_tertiary, fontSize: '9px', flexShrink: 0, fontFamily: theme.font_ui }}>
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
          {/* Search */}
          <div style={{ padding: '8px 10px', borderBottom: `1px solid ${theme.border_default}`, flexShrink: 0 }}>
            <input
              ref={searchInputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search fonts…"
              style={{
                width: '100%', boxSizing: 'border-box',
                fontFamily: theme.font_ui, fontSize: '11px',
                background: theme.bg_default, color: theme.text_default,
                border: `1px solid ${theme.border_default}`, borderRadius: 4,
                padding: '4px 8px', outline: 'none',
              }}
            />
          </div>

          {/* Unified list */}
          <div style={{ overflowY: 'auto', flex: 1, maxHeight: 360 }}>
            {!hasResults && (
              <div style={{
                padding: '24px 12px', textAlign: 'center',
                fontFamily: theme.font_ui, fontSize: '12px', color: theme.text_tertiary,
              }}>
                No fonts found
              </div>
            )}

            {/* System section */}
            {filteredSystemFonts.length > 0 && (
              <>
                {sectionLabel('System')}
                {filteredSystemFonts.map(sf => {
                  const isActive = !activeGoogleFont && value.startsWith(sf.value.split(',')[0]);
                  return fontRow({
                    key: sf.value,
                    label: sf.label,
                    fontFamily: theme.font_ui,
                    isActive,
                    onClick: () => handleSelectSystemFont(sf.value),
                  });
                })}
              </>
            )}

            {/* Google Fonts section */}
            {filteredGoogleFonts.length > 0 && (
              <>
                {sectionLabel('Google Fonts')}
                {filteredGoogleFonts.map(font => fontRow({
                  key: font.name,
                  label: font.name,
                  fontFamily: `"${font.name}", sans-serif`,
                  isActive: activeGoogleFont?.name === font.name,
                  badge: font.category,
                  onClick: () => handleSelectGoogleFont(font.name),
                }))}
              </>
            )}

            {/* Custom options */}
            <div style={{ borderTop: `1px solid ${theme.border_default}` }}>
              {!customMode ? (
                <>
                  <button
                    onClick={() => { setCustomMode('google'); setCustomValue(''); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 12px', background: 'transparent', border: 'none',
                      cursor: 'pointer', textAlign: 'left',
                      borderBottom: `1px solid ${theme.border_secondary}`,
                    }}
                  >
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: 'transparent', border: `1.5px solid ${theme.border_default}`,
                    }} />
                    <span style={{ fontFamily: theme.font_ui, fontSize: '12px', color: theme.text_tertiary, flex: 1 }}>
                      Custom Google Font…
                    </span>
                    <span style={{ fontFamily: theme.font_ui, fontSize: '9px', color: theme.text_low }}>
                      Google
                    </span>
                  </button>
                  <button
                    onClick={() => { setCustomMode('css'); setCustomValue(''); }}
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
                    <span style={{ fontFamily: theme.font_ui, fontSize: '12px', color: theme.text_tertiary, flex: 1 }}>
                      Custom CSS value…
                    </span>
                    <span style={{ fontFamily: theme.font_ui, fontSize: '9px', color: theme.text_low }}>
                      Raw
                    </span>
                  </button>
                </>
              ) : (
                <div style={{ padding: '7px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={{ fontFamily: theme.font_ui, fontSize: '10px', color: theme.text_tertiary }}>
                    {customMode === 'google' ? 'Google Font name' : 'CSS font-family value'}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      autoFocus
                      value={customValue}
                      onChange={e => setCustomValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleCustomSubmit();
                        if (e.key === 'Escape') setCustomMode(false);
                      }}
                      placeholder={customMode === 'google' ? 'e.g. Montserrat Alternates' : 'e.g. Arial, Helvetica'}
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
                        fontFamily: theme.font_ui, fontSize: '11px',
                      }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
