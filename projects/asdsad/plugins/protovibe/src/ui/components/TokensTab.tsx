// plugins/protovibe/src/ui/components/TokensTab.tsx
import React, { useMemo, useState, useCallback } from 'react';
import { useProtovibe } from '../context/ProtovibeContext';
import { type ThemeColor, updateThemeColor } from '../api/client';
import { theme } from '../theme';
import { ColorPicker } from './ColorPicker';
import { cssColorToHex } from '../utils/colorConversion';

type TabId = 'semantic' | 'palette';

// Module-level cache to avoid redundant canvas calls on every render
const hexCache = new Map<string, string>();
function cachedCssToHex(cssColor: string): string {
  if (!cssColor || cssColor.startsWith('var(')) return '';
  if (hexCache.has(cssColor)) return hexCache.get(cssColor)!;
  const hex = cssColorToHex(cssColor);
  if (hex) hexCache.set(cssColor, hex);
  return hex;
}

const CIRCLE = 60;

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
      title={`--color-${name} (${isLight ? 'light' : 'dark'})\n${color}${hex ? '\n' + hex : ''}\nClick to edit`}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px 6px 18px',
        gap: 7,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      {/* Circle */}
      <div
        style={{
          width: CIRCLE,
          height: CIRCLE,
          borderRadius: '50%',
          background: color,
          boxShadow: isLight
            ? '0 2px 10px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(0,0,0,0.06)'
            : '0 2px 12px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.08)',
          flexShrink: 0,
          position: 'relative',
          transition: 'transform 0.1s, box-shadow 0.1s',
        }}
      >
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, opacity: 0,
          transition: 'opacity 0.15s',
        }}
          className="edit-icon"
        >✎</div>
      </div>
      {/* Token name */}
      <div style={{
        fontFamily: 'sans-serif', fontSize: 10, fontWeight: 600,
        color: textPrimary,
        textAlign: 'center', lineHeight: 1.3, wordBreak: 'break-word', maxWidth: '100%',
      }}>
        {name}
      </div>
      {/* oklch */}
      <div style={{
        fontFamily: 'monospace', fontSize: 8,
        color: textSecondary, textAlign: 'center', lineHeight: 1.4,
        wordBreak: 'break-all', maxWidth: '100%',
      }}>
        {color}
      </div>
      {/* hex */}
      {hex && (
        <div style={{
          fontFamily: 'monospace', fontSize: 8,
          color: textTertiary, textAlign: 'center',
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

const TAB_LABELS: Record<TabId, string> = { semantic: 'Semantic', palette: 'Palette' };

export const TokensTab: React.FC = () => {
  const { themeColors, refreshComponents, refreshThemeColors } = useProtovibe();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('semantic');
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [saving, setSaving] = useState(false);

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

  const activeColors = activeTab === 'semantic' ? semanticColors : [...utilityColors, ...paletteColors];

  const filtered = useMemo(
    () => search
      ? activeColors.filter(c => c.val.toLowerCase().includes(search.toLowerCase()))
      : activeColors,
    [activeColors, search]
  );

  const groups = useMemo(() => groupTokens(filtered), [filtered]);

  const handleSave = useCallback(async (oklchValue: string) => {
    if (!editing) return;
    setSaving(true);
    try {
      // Invalidate hex cache for the old value so the display refreshes
      hexCache.delete(editing.themeMode === 'light' ? (editing.token.lightValue ?? '') : (editing.token.darkValue ?? ''));
      await updateThemeColor(editing.token.val, editing.themeMode, oklchValue);
      setEditing(null);
      refreshThemeColors();
    } catch (err) {
      console.error('[protovibe] Failed to update color:', err);
    } finally {
      setSaving(false);
    }
  }, [editing, refreshComponents]);

  const segBtnStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '4px 10px',
    background: isActive ? theme.bg_tertiary : 'transparent',
    border: 'none',
    color: isActive ? theme.accent_default : theme.text_tertiary,
    fontSize: '11px',
    fontFamily: 'sans-serif',
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: theme.bg_default }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border_default}`, backgroundColor: theme.bg_strong, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontFamily: 'sans-serif', fontSize: '14px', fontWeight: 600, color: theme.text_default }}>
            Design Tokens
          </span>
          <button
            onClick={refreshComponents}
            title="Refresh"
            style={{ background: 'transparent', border: 'none', color: theme.text_tertiary, cursor: 'pointer', fontSize: '12px', fontFamily: 'sans-serif', padding: '2px 6px', borderRadius: '4px' }}
          >
            ↻ Refresh
          </button>
        </div>

        <div style={{ display: 'flex', background: theme.bg_secondary, borderRadius: '4px', border: `1px solid ${theme.border_default}`, overflow: 'hidden', marginBottom: '8px' }}>
          {(['semantic', 'palette'] as TabId[]).map((tab, idx) => (
            <React.Fragment key={tab}>
              {idx > 0 && <div style={{ width: '1px', background: theme.border_default }} />}
              <button onClick={() => setActiveTab(tab)} style={segBtnStyle(activeTab === tab)}>
                {TAB_LABELS[tab]}
              </button>
            </React.Fragment>
          ))}
        </div>

        <input
          type="text"
          placeholder="Filter tokens…"
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

      {/* Content */}
      {activeTab === 'semantic' ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Sticky column headers */}
          <div style={{ display: 'flex', flexShrink: 0 }}>
            <div style={{
              flex: 1, background: '#ffffff', textAlign: 'center', padding: '7px 0',
              fontFamily: 'sans-serif', fontSize: '10px', fontWeight: 700,
              color: '#000000', letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              ☀ Light
            </div>
            <div style={{
              flex: 1, background: '#000000', textAlign: 'center', padding: '7px 0',
              fontFamily: 'sans-serif', fontSize: '10px', fontWeight: 700,
              color: '#ffffff', letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              🌙 Dark
            </div>
          </div>

          {/* Scrollable tokens on split background */}
          <div style={{ flex: 1, overflowY: 'auto', background: 'linear-gradient(to right, #ffffff 50%, #000000 50%)' }}>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', color: '#999', fontFamily: 'sans-serif', fontSize: '13px', paddingTop: '40px' }}>
                No tokens found.
              </div>
            )}

            {Object.entries(groups).map(([group, tokens]) => (
              <div key={group}>
                {/* Group label spanning both columns */}
                <div style={{
                  background: 'rgba(20, 20, 28, 0.9)',
                  backdropFilter: 'blur(4px)',
                  padding: '5px 14px',
                  fontFamily: 'sans-serif', fontSize: '10px', fontWeight: 700,
                  color: 'rgba(255,255,255,0.55)',
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                }}>
                  {group}
                </div>

                {/* One row per token: light cell | dark cell */}
                {tokens.map(t => {
                  const lightColor = t.lightValue ?? t.hex;
                  const darkColor = t.darkValue ?? t.hex;
                  return (
                    <div key={t.val} style={{ display: 'flex' }}>
                      <TokenCell
                        color={lightColor}
                        name={t.val}
                        bg="light"
                        onEdit={rect => setEditing({ token: t, themeMode: 'light', anchorRect: rect })}
                      />
                      <TokenCell
                        color={darkColor}
                        name={t.val}
                        bg="dark"
                        onEdit={rect => setEditing({ token: t, themeMode: 'dark', anchorRect: rect })}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Palette: card grid */
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', color: theme.text_tertiary, fontFamily: 'sans-serif', fontSize: '13px', paddingTop: '40px' }}>
              No tokens found in <code>src/index.css</code>.
            </div>
          )}
          {Object.entries(groups).map(([group, tokens]) => (
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
                      onClick={() => {/* palette colors are static — no edit */}}
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
      )}

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
