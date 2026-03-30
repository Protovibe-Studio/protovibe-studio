// plugins/protovibe/src/ui/components/TokensTab.tsx
import React, { useMemo, useState, useCallback } from 'react';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { useProtovibe } from '../context/ProtovibeContext';
import { type ThemeColor, type ThemeToken, updateThemeColor, updateThemeToken } from '../api/client';
import { theme } from '../theme';
import { ColorPicker } from './ColorPicker';
import { cssColorToHex } from '../utils/colorConversion';


// Module-level cache to avoid redundant canvas calls on every render
const hexCache = new Map<string, string>();
function cachedCssToHex(cssColor: string): string {
  if (!cssColor || cssColor.startsWith('var(')) return '';
  if (hexCache.has(cssColor)) return hexCache.get(cssColor)!;
  const hex = cssColorToHex(cssColor);
  if (hex) hexCache.set(cssColor, hex);
  return hex;
}

interface EditingState {
  token: ThemeColor;
  themeMode: 'light' | 'dark';
  anchorRect: DOMRect;
}

interface TokenCellProps {
  color: string;
  name: string;
  bg: 'light' | 'dark';
  onEdit: (rect: DOMRect) => void;
}

function TokenCell({ color, name, bg, onEdit }: TokenCellProps) {
  const [isHovered, setIsHovered] = useState(false);
  const hex = useMemo(() => cachedCssToHex(color), [color]);
  const isLight = bg === 'light';
  const textPrimary = isLight ? '#111111' : '#eeeeee';
  const textSecondary = isLight ? '#555555' : '#999999';
  const textTertiary = isLight ? '#888888' : '#666666';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onEdit(e.currentTarget.getBoundingClientRect());
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={`--color-${name} (${isLight ? 'light' : 'dark'})\n${color}${hex ? '\n' + hex : ''}\nClick to edit`}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 16px',
        gap: 4,
        background: isHovered ? (isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)') : 'transparent',
        border: 'none',
        cursor: 'pointer',
        transition: 'background 0.15s ease',
      }}
    >
      {/* Rectangle Swatch */}
      <div
        style={{
          width: '100%',
          height: 48,
          borderRadius: 6,
          background: color,
          boxShadow: isLight
            ? '0 2px 5px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(0,0,0,0.05)'
            : '0 2px 5px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.1)',
          flexShrink: 0,
          position: 'relative',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          transform: isHovered ? 'scale(1.03)' : 'none',
        }}
      >
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, opacity: isHovered ? 1 : 0,
          color: isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)',
          background: isHovered ? (isLight ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)') : 'transparent',
          transition: 'opacity 0.15s ease, background 0.15s ease',
        }}
        >✎</div>
      </div>
      {/* Token name */}
      <div style={{
        fontFamily: 'sans-serif', fontSize: 10, fontWeight: 600,
        color: textPrimary,
        textAlign: 'center', lineHeight: 1.1, wordBreak: 'break-word', maxWidth: '100%',
        marginTop: 4,
      }}>
        {name}
      </div>
      {/* oklch */}
      <div style={{
        fontFamily: 'monospace', fontSize: 9,
        color: textSecondary, textAlign: 'center', lineHeight: 1.1,
        wordBreak: 'break-all', maxWidth: '100%',
      }}>
        {color}
      </div>
      {/* hex */}
      {hex && (
        <div style={{
          fontFamily: 'monospace', fontSize: 9,
          color: textTertiary, textAlign: 'center', lineHeight: 1.1,
        }}>
          {hex}
        </div>
      )}
    </button>
  );
}

function groupTokens(colors: ThemeColor[]): Record<string, ThemeColor[]> {
  const groups: Record<string, ThemeColor[]> = {};
  for (const c of colors) {
    const dash = c.val.indexOf('-');
    const group = dash >= 0 ? c.val.slice(0, dash) : c.val;
    if (!groups[group]) groups[group] = [];
    groups[group].push(c);
  }
  return groups;
}

// ─── Predefined Taxonomy ──────────────────────────────────────────────────────

type CategoryDef = {
  id: string;
  label: string;
  type: 'color_semantic' | 'color_palette' | 'other';
  backendCategories?: string[];
};

type SectionDef = {
  title: string;
  categories: CategoryDef[];
};

const SECTIONS: SectionDef[] = [
  {
    title: 'Colors',
    categories: [
      { id: 'semantic', label: 'Semantic colors', type: 'color_semantic' },
      { id: 'palette', label: 'Static palette', type: 'color_palette' },
    ]
  },
  {
    title: 'Essentials',
    categories: [
      { id: 'border-radius', label: 'Border radius', type: 'other', backendCategories: ['Radius'] },
      { id: 'spacing', label: 'Spacing', type: 'other', backendCategories: ['Spacing'] },
      { id: 'shadow', label: 'Shadow', type: 'other', backendCategories: ['Shadow', 'Inset Shadow', 'Drop Shadow'] },
    ]
  },
  {
    title: 'Typography',
    categories: [
      { id: 'font-family', label: 'Font family', type: 'other', backendCategories: ['Font Family'] },
      { id: 'font-size', label: 'Font size', type: 'other', backendCategories: ['Font Size'] },
      { id: 'font-weight', label: 'Font weight', type: 'other', backendCategories: ['Font Weight'] },
      { id: 'letter-spacing', label: 'Letter spacing', type: 'other', backendCategories: ['Letter Spacing'] },
      { id: 'line-height', label: 'Line height', type: 'other', backendCategories: ['Line Height'] },
      { id: 'text-shadow', label: 'Text shadow', type: 'other', backendCategories: ['Text Shadow'] },
    ]
  },
  {
    title: 'Effects',
    categories: [
      { id: 'animation', label: 'Animation', type: 'other', backendCategories: ['Animation', 'Easing'] },
      { id: 'blur', label: 'Blur', type: 'other', backendCategories: ['Blur'] },
    ]
  },
  {
    title: 'Other',
    categories: [
      { id: 'screen-sizes', label: 'Screen sizes', type: 'other', backendCategories: ['Breakpoint'] },
      { id: 'aspect-ratio', label: 'Aspect ratio', type: 'other', backendCategories: ['Aspect Ratio'] },
      { id: 'container', label: 'Container', type: 'other', backendCategories: ['Container'] },
      { id: 'perspective', label: 'Perspective', type: 'other', backendCategories: ['Perspective'] },
      { id: 'uncategorized', label: 'Uncategorized', type: 'other', backendCategories: ['Other'] },
    ]
  }
];

export const TokensTab: React.FC = () => {
  const { themeColors, refreshComponents, refreshThemeColors, themeTokens, refreshThemeTokens } = useProtovibe();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [saving, setSaving] = useState(false);

  // ─── Colors Classification ───
  const semanticColors = useMemo(
    () => themeColors.filter(c => c.lightValue !== undefined || c.darkValue !== undefined),
    [themeColors]
  );
  const paletteColors = useMemo(
    () => themeColors.filter(c => c.lightValue === undefined && c.darkValue === undefined && c.val !== 'transparent' && c.val !== 'current'),
    [themeColors]
  );
  const utilityColors = useMemo(
    () => themeColors.filter(c => c.val === 'transparent' || c.val === 'current'),
    [themeColors]
  );

  // ─── Structure visibility ───
  const visibleSections = useMemo(() => {
    return SECTIONS.map(section => {
      const visibleCats = section.categories.filter(cat => {
        // Filter by home screen search
        if (search && !cat.label.toLowerCase().includes(search.toLowerCase())) {
          return false;
        }
        // Only show if the category actually has tokens
        if (cat.type === 'color_semantic') return semanticColors.length > 0;
        if (cat.type === 'color_palette') return paletteColors.length > 0 || utilityColors.length > 0;
        if (cat.type === 'other') return themeTokens.some(t => cat.backendCategories?.includes(t.category));
        return false;
      });
      return { ...section, categories: visibleCats };
    }).filter(section => section.categories.length > 0);
  }, [search, semanticColors.length, paletteColors.length, utilityColors.length, themeTokens]);

  const flatCategories = useMemo(() => SECTIONS.flatMap(s => s.categories), []);
  const activeCategoryObj = useMemo(() => flatCategories.find(c => c.id === selectedCategory), [flatCategories, selectedCategory]);

  // ─── Semantic Data Prep ───
  const filteredSemantic = useMemo(() => search ? semanticColors.filter(c => c.val.toLowerCase().includes(search.toLowerCase())) : semanticColors, [semanticColors, search]);
  const semanticGroups = useMemo(() => groupTokens(filteredSemantic), [filteredSemantic]);

  // ─── Palette Data Prep ───
  const activePaletteColors = useMemo(() => [...utilityColors, ...paletteColors], [utilityColors, paletteColors]);
  const filteredPalette = useMemo(() => search ? activePaletteColors.filter(c => c.val.toLowerCase().includes(search.toLowerCase())) : activePaletteColors, [activePaletteColors, search]);
  const paletteGroups = useMemo(() => groupTokens(filteredPalette), [filteredPalette]);

  // ─── Other Tokens Prep ───
  const allCategoryTokens = useMemo(() => {
    if (activeCategoryObj?.type !== 'other') return [];
    return themeTokens.filter(t => activeCategoryObj.backendCategories?.includes(t.category));
  }, [activeCategoryObj, themeTokens]);

  const activeOtherTokens = useMemo(() => {
    if (!search) return allCategoryTokens;
    return allCategoryTokens.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.value.toLowerCase().includes(search.toLowerCase()));
  }, [allCategoryTokens, search]);

  const groupedOtherTokens = useMemo(() => {
    if (activeCategoryObj?.type !== 'other') return {};
    const groups: Record<string, ThemeToken[]> = {};
    for (const t of activeOtherTokens) {
      if (!groups[t.category]) groups[t.category] = [];
      groups[t.category].push(t);
    }
    return groups;
  }, [activeCategoryObj, activeOtherTokens]);

  const handleTokenSave = useCallback(async (tokenName: string, newValue: string) => {
    try {
      await updateThemeToken(tokenName, newValue);
      refreshThemeTokens();
    } catch (err) {
      console.error('[protovibe] Failed to update token:', err);
    }
  }, [refreshThemeTokens]);

  const handleSave = useCallback(async (oklchValue: string) => {
    if (!editing) return;
    setSaving(true);
    try {
      hexCache.delete(editing.themeMode === 'light' ? (editing.token.lightValue ?? '') : (editing.token.darkValue ?? ''));
      await updateThemeColor(editing.token.val, editing.themeMode, oklchValue);
      setEditing(null);
      refreshThemeColors();
    } catch (err) {
      console.error('[protovibe] Failed to update color:', err);
    } finally {
      setSaving(false);
    }
  }, [editing, refreshThemeColors]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: theme.bg_default }}>
      
      {/* ─── Sticky Header ─── */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border_default}`, backgroundColor: theme.bg_strong, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          {selectedCategory ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                onClick={() => { setSelectedCategory(null); setSearch(''); }} 
                style={{ background: 'transparent', border: 'none', color: theme.text_tertiary, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
              >
                <ArrowLeft size={16} />
              </button>
              <span style={{ fontFamily: 'sans-serif', fontSize: '14px', fontWeight: 600, color: theme.text_default }}>
                {activeCategoryObj?.label}
              </span>
            </div>
          ) : (
            <span style={{ fontFamily: 'sans-serif', fontSize: '14px', fontWeight: 600, color: theme.text_default }}>
              Design Tokens
            </span>
          )}
          <button
            onClick={() => { refreshComponents(); refreshThemeColors(); refreshThemeTokens(); }}
            title="Refresh"
            style={{ background: 'transparent', border: 'none', color: theme.text_tertiary, cursor: 'pointer', fontSize: '12px', fontFamily: 'sans-serif', padding: '2px 6px', borderRadius: '4px' }}
          >
            ↻ Refresh
          </button>
        </div>

        <input
          type="text"
          placeholder={selectedCategory ? `Filter ${activeCategoryObj?.label.toLowerCase()}...` : "Find category..."}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: theme.bg_secondary, border: `1px solid ${theme.border_default}`,
            borderRadius: '6px', color: theme.text_default,
            fontFamily: 'sans-serif', fontSize: '12px', padding: '6px 10px', outline: 'none',
          }}
        />
      </div>

      {/* ─── Scrolling Content Area ─── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Home View (Sections & Categories) */}
        {!selectedCategory ? (
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
            {visibleSections.length === 0 && (
              <div style={{ textAlign: 'center', color: theme.text_tertiary, fontFamily: 'sans-serif', fontSize: '13px', paddingTop: '40px' }}>
                No categories found.
              </div>
            )}
            {visibleSections.map(section => (
              <div key={section.title} style={{ marginBottom: '8px' }}>
                <div style={{
                  padding: '16px 16px 8px',
                  fontFamily: 'sans-serif', fontSize: '11px', fontWeight: 700,
                  color: theme.text_tertiary, textTransform: 'uppercase',
                  letterSpacing: '0.08em'
                }}>
                  {section.title}
                </div>
                {section.categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCategory(cat.id); setSearch(''); }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', padding: '12px 16px', background: 'transparent', border: 'none',
                      borderBottom: `1px solid ${theme.border_default}`, cursor: 'pointer',
                      color: theme.text_default, fontFamily: 'sans-serif', fontSize: '13px',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = theme.bg_secondary}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span>{cat.label}</span>
                    <ChevronRight size={16} color={theme.text_tertiary} />
                  </button>
                ))}
              </div>
            ))}
          </div>
        ) : activeCategoryObj?.type === 'color_semantic' ? (
          
          /* Semantic Colors View */
          <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexShrink: 0, position: 'sticky', top: 0, zIndex: 1 }}>
                <div style={{
                  flex: 1, background: '#ffffff', textAlign: 'center', padding: '7px 0',
                  fontFamily: 'sans-serif', fontSize: '10px', fontWeight: 700,
                  color: '#000000', letterSpacing: '0.1em', textTransform: 'uppercase',
                  borderBottom: '1px solid #e5e5e5',
                }}>
                  ☀ Light
                </div>
                <div style={{
                  flex: 1, background: '#111111', textAlign: 'center', padding: '7px 0',
                  fontFamily: 'sans-serif', fontSize: '10px', fontWeight: 700,
                  color: '#ffffff', letterSpacing: '0.1em', textTransform: 'uppercase',
                  borderBottom: '1px solid #222',
                }}>
                  🌙 Dark
                </div>
              </div>

              {filteredSemantic.length === 0 && (
                <div style={{ textAlign: 'center', color: '#999', fontFamily: 'sans-serif', fontSize: '13px', paddingTop: '40px' }}>
                  No tokens found.
                </div>
              )}

              {Object.entries(semanticGroups).map(([group, tokens]) => (
                <div key={group}>
                  {/* Group label spanning both columns */}
                  <div style={{ display: 'flex' }}>
                    <div style={{
                      flex: 1, background: '#f4f4f5', padding: '6px 16px',
                      fontFamily: 'sans-serif', fontSize: '10px', fontWeight: 700,
                      color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em',
                      borderBottom: '1px solid #e5e5e5', overflow: 'hidden',
                    }}>
                      {group}
                    </div>
                    <div style={{
                      flex: 1, background: '#111111', padding: '6px 16px',
                      fontFamily: 'sans-serif', fontSize: '10px', fontWeight: 700,
                      color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em',
                      borderBottom: '1px solid #222', overflow: 'hidden',
                    }}>
                      {group}
                    </div>
                  </div>

                  {tokens.map(t => {
                    const lightColor = t.lightValue ?? t.hex;
                    const darkColor = t.darkValue ?? t.hex;
                    return (
                      <div key={t.val} style={{ display: 'flex' }}>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', background: '#ffffff' }}>
                          <TokenCell
                            color={lightColor}
                            name={t.val}
                            bg="light"
                            onEdit={rect => setEditing({ token: t, themeMode: 'light', anchorRect: rect })}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', background: '#111111' }}>
                          <TokenCell
                            color={darkColor}
                            name={t.val}
                            bg="dark"
                            onEdit={rect => setEditing({ token: t, themeMode: 'dark', anchorRect: rect })}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
        ) : activeCategoryObj?.type === 'color_palette' ? (
          
          /* Palette Colors View */
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
            {filteredPalette.length === 0 && (
              <div style={{ textAlign: 'center', color: theme.text_tertiary, fontFamily: 'sans-serif', fontSize: '13px', paddingTop: '40px' }}>
                No tokens found.
              </div>
            )}
            {Object.entries(paletteGroups).map(([group, tokens]) => (
              <div key={group} style={{ marginBottom: '20px' }}>
                <div style={{
                  fontFamily: 'sans-serif', fontSize: '11px', fontWeight: 700,
                  color: theme.text_tertiary, textTransform: 'uppercase',
                  letterSpacing: '0.08em', marginBottom: '8px',
                }}>
                  {group}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '6px' }}>
                  {tokens.map(t => {
                    const color = t.hex;
                    const isRenderable = color !== 'transparent' && color !== 'currentColor' && !color.startsWith('var(');
                    return (
                      <button
                        key={t.val}
                        title={`--color-${t.val}: ${color}`}
                        style={{
                          display: 'flex', flexDirection: 'column', gap: '5px', padding: '7px',
                          background: theme.bg_secondary,
                          border: `1px solid ${theme.border_default}`,
                          borderRadius: '7px', cursor: 'default', textAlign: 'left',
                        }}
                      >
                        <div style={{
                          width: '100%', height: '32px', borderRadius: '4px',
                          background: isRenderable ? color : 'repeating-linear-gradient(45deg, #333 0px, #333 4px, #2a2a2a 4px, #2a2a2a 8px)',
                        }} />
                        <div style={{
                          fontFamily: 'sans-serif', fontSize: '10px',
                          color: theme.text_secondary,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {t.val}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          
          /* Other Base Tokens View */
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
            {activeOtherTokens.length === 0 && (
              <div style={{ textAlign: 'center', color: theme.text_tertiary, fontFamily: 'sans-serif', fontSize: '13px', paddingTop: '40px' }}>
                No tokens found.
              </div>
            )}
            {Object.entries(groupedOtherTokens).map(([category, tokens]) => (
              <div key={category} style={{ marginBottom: '20px' }}>
                <div style={{
                  fontFamily: 'sans-serif', fontSize: '11px', fontWeight: 700,
                  color: theme.text_tertiary, textTransform: 'uppercase',
                  letterSpacing: '0.08em', marginBottom: '6px',
                }}>
                  {category}
                </div>
                {tokens.map(t => (
                  <div key={t.name} style={{
                    display: 'flex', flexDirection: 'column',
                    padding: '4px 0',
                    gap: 4,
                  }}>
                    <span style={{
                      fontFamily: 'monospace', fontSize: '10px',
                      color: theme.text_secondary,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }} title={`--${t.name}`}>
                      --{t.name}
                    </span>
                    <input
                      defaultValue={t.value}
                      onBlur={e => { if (e.target.value !== t.value) handleTokenSave(t.name, e.target.value); }}
                      onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        fontFamily: 'monospace', fontSize: '11px',
                        background: theme.bg_secondary, color: theme.text_default,
                        border: `1px solid ${theme.border_default}`, borderRadius: 4,
                        padding: '3px 6px', outline: 'none',
                      }}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Color picker portal */}
      {editing && (
        <ColorPicker
          tokenName={editing.token.val}
          themeMode={editing.themeMode}
          initialValue={editing.themeMode === 'light'
            ? (editing.token.lightValue ?? editing.token.hex)
            : (editing.token.darkValue ?? editing.token.hex)}
          anchorRect={editing.anchorRect}
          onSave={saving ? () => {} : handleSave}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
};