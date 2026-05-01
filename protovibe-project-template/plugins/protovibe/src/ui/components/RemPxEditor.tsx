// plugins/protovibe/src/ui/components/RemPxEditor.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { theme } from '../theme';

// ─── Parsing helpers ─────────────────────────────────────────────────────────

const DEFAULT_ROOT_FONT = 16;

function parseRemValue(value: string): { rem: number; unit: string } | null {
  const match = value.trim().match(/^(-?[\d.]+)\s*(rem|px|em)$/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  const unit = match[2];
  if (isNaN(num)) return null;
  if (unit === 'px') return { rem: num / DEFAULT_ROOT_FONT, unit: 'rem' };
  return { rem: num, unit };
}

function remToPx(rem: number): number {
  return Math.round(rem * DEFAULT_ROOT_FONT * 100) / 100;
}

// ─── Main RemPxEditor ────────────────────────────────────────────────────────

export interface RemPxEditorProps {
  tokenName: string;
  initialValue: string;
  anchorRect: DOMRect;
  onSave: (value: string) => void;
  onCancel: () => void;
}

export function RemPxEditor({ tokenName, initialValue, anchorRect, onSave, onCancel }: RemPxEditorProps) {
  const parsed = useMemo(() => parseRemValue(initialValue), [initialValue]);
  const initRem = parsed?.rem ?? 1;
  const unit = parsed?.unit ?? 'rem';

  const [rem, setRem] = useState(initRem);
  const [rawInput, setRawInput] = useState(initRem.toString());
  const [inputFocused, setInputFocused] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);

  const px = remToPx(rem);
  const outputValue = `${rem}${unit}`;

  // Sync raw input from slider when not focused
  useEffect(() => {
    if (!inputFocused) setRawInput(rem % 1 === 0 ? rem.toString() : rem.toFixed(3).replace(/0+$/, '').replace(/\.$/, ''));
  }, [rem, inputFocused]);

  // ── Positioning ──
  const PICKER_W = 240;
  const PAD = 10;
  let left = anchorRect.left;
  let top = anchorRect.bottom + 8;
  if (left + PICKER_W > window.innerWidth - PAD) left = window.innerWidth - PICKER_W - PAD;
  if (left < PAD) left = PAD;
  const spaceBelow = window.innerHeight - anchorRect.bottom - 8 - PAD;
  const spaceAbove = anchorRect.top - 8 - PAD;
  if (spaceBelow < 200 && spaceAbove > spaceBelow) {
    top = Math.max(PAD, anchorRect.top - 8 - Math.min(spaceAbove, 400));
  }
  const maxHeight = window.innerHeight - top - PAD;

  // ── Outside click ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (editorRef.current && !editorRef.current.contains(e.target as Node)) onCancel();
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [onCancel]);

  // ── Escape ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  // ── Slider bounds ──
  // Determine a reasonable max based on current value
  const sliderMax = Math.max(10, Math.ceil(initRem * 3));

  // ── Input handler ──
  function handleRawInput(raw: string) {
    setRawInput(raw);
    const n = parseFloat(raw);
    if (!isNaN(n) && n >= 0) setRem(Math.round(n * 1000) / 1000);
  }

  function handleInputBlur() {
    setInputFocused(false);
    const n = parseFloat(rawInput);
    if (isNaN(n) || n < 0) {
      setRawInput(rem.toString());
    }
  }

  // Slider pct for custom track
  const pct = Math.min(100, (rem / sliderMax) * 100);

  return createPortal(
    <div
      ref={editorRef}
      style={{
        position: 'fixed', top, left, width: PICKER_W,
        maxHeight,
        zIndex: 9999999,
        background: theme.bg_strong,
        border: `1px solid ${theme.border_default}`,
        borderRadius: 12,
        boxShadow: '0 12px 40px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Header ── */}
      <div style={{
        padding: '12px 14px 10px',
        borderBottom: `1px solid ${theme.border_secondary}`,
        flexShrink: 0,
      }}>
        <div style={{
          fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
          color: theme.text_default,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          --{tokenName}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 16px' }}>

        {/* Large value display */}
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'center',
          gap: 6, marginBottom: 16,
        }}>
          <span style={{
            fontFamily: 'monospace', fontSize: 28, fontWeight: 700,
            color: theme.text_default,
          }}>
            {rem % 1 === 0 ? rem : rem.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}
          </span>
          <span style={{
            fontFamily: theme.font_ui, fontSize: 13, fontWeight: 600,
            color: theme.text_tertiary,
          }}>
            {unit}
          </span>
        </div>

        {/* Pixel conversion with +/- buttons */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 4, marginBottom: 18,
        }}>
          <button
            onClick={() => setRem(v => Math.max(0, Math.round((v - 0.0625) * 10000) / 10000))}
            style={{
              width: 28, height: 28, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: theme.bg_tertiary,
              border: `1px solid ${theme.border_default}`,
              borderRadius: 4,
              color: theme.text_secondary,
              fontFamily: 'monospace', fontSize: 14, lineHeight: 1,
              cursor: 'pointer', padding: 0,
            }}
          >
            −
          </button>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, flex: 1,
            height: 28, boxSizing: 'border-box',
            padding: '0 8px',
            background: theme.bg_secondary,
            borderRadius: 6,
            border: `1px solid ${theme.border_default}`,
          }}>
            <span style={{
              fontFamily: theme.font_ui, fontSize: 11, color: theme.text_tertiary,
            }}>
              =
            </span>
            <span style={{
              fontFamily: 'monospace', fontSize: 13, fontWeight: 600,
              color: theme.accent_default,
            }}>
              {px}px
            </span>
            <span style={{
              fontFamily: theme.font_ui, fontSize: 10, color: theme.text_tertiary,
            }}>
              ({DEFAULT_ROOT_FONT}px base)
            </span>
          </div>
          <button
            onClick={() => setRem(v => Math.round((v + 0.0625) * 10000) / 10000)}
            style={{
              width: 28, height: 28, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: theme.bg_tertiary,
              border: `1px solid ${theme.border_default}`,
              borderRadius: 4,
              color: theme.text_secondary,
              fontFamily: 'monospace', fontSize: 14, lineHeight: 1,
              cursor: 'pointer', padding: 0,
            }}
          >
            +
          </button>
        </div>

        {/* Slider */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ position: 'relative', height: 16, display: 'flex', alignItems: 'center' }}>
            {/* Track background */}
            <div style={{
              position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2,
              background: theme.bg_tertiary,
            }} />
            {/* Track fill */}
            <div style={{
              position: 'absolute', left: 0, height: 4, borderRadius: 2,
              width: `${pct}%`,
              background: theme.accent_default,
              opacity: 0.6,
            }} />
            {/* Thumb */}
            <div style={{
              position: 'absolute',
              left: `calc(${pct}% - 7px)`,
              width: 14, height: 14, borderRadius: '50%',
              background: theme.accent_default,
              border: '2px solid #fff',
              boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
              pointerEvents: 'none',
            }} />
            {/* Invisible range */}
            <input
              type="range"
              min={0} max={sliderMax} step={0.0625}
              value={rem}
              onChange={e => setRem(Math.round(parseFloat(e.target.value) * 1000) / 1000)}
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                opacity: 0, cursor: 'pointer', margin: 0,
              }}
            />
          </div>
        </div>

        {/* Rem input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          overflow: 'hidden',
        }}>
          <label style={{
            fontFamily: theme.font_ui, fontSize: 12, fontWeight: 500,
            color: theme.text_secondary, flexShrink: 0,
          }}>
            Value
          </label>
          <div style={{
            flex: 1, minWidth: 0,
            display: 'flex', alignItems: 'center',
            background: theme.bg_secondary,
            border: `1px solid ${theme.border_default}`, borderRadius: 5,
            overflow: 'hidden',
          }}>
            <input
              type="text"
              value={rawInput}
              onChange={e => handleRawInput(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={handleInputBlur}
              onKeyDown={e => {
                if (e.key === 'ArrowUp') { e.preventDefault(); setRem(v => Math.round((v + 0.0625) * 10000) / 10000); }
                if (e.key === 'ArrowDown') { e.preventDefault(); setRem(v => Math.max(0, Math.round((v - 0.0625) * 10000) / 10000)); }
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              spellCheck={false}
              style={{
                flex: 1, minWidth: 0,
                boxSizing: 'border-box',
                fontFamily: 'monospace', fontSize: 12,
                background: 'transparent', color: theme.text_default,
                border: 'none', borderRadius: 0,
                padding: '5px 4px 5px 8px', outline: 'none',
                textAlign: 'right',
              }}
            />
            <span style={{
              fontFamily: theme.font_ui, fontSize: 11, color: theme.text_tertiary,
              flexShrink: 0, paddingRight: 8,
            }}>
              {unit}
            </span>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: '10px 14px',
        borderTop: `1px solid ${theme.border_secondary}`,
        display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center',
        flexShrink: 0,
      }}>
        <button
          onClick={onCancel}
          style={{
            padding: '6px 16px', background: 'transparent',
            border: `1px solid ${theme.border_default}`, borderRadius: 6,
            cursor: 'pointer', color: theme.text_secondary,
            fontFamily: theme.font_ui, fontSize: 12,
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(outputValue)}
          style={{
            padding: '6px 16px',
            background: theme.accent_default,
            border: 'none', borderRadius: 6,
            cursor: 'pointer',
            color: '#fff',
            fontFamily: theme.font_ui, fontSize: 12, fontWeight: 600,
            transition: 'background 0.15s',
          }}
        >
          Save
        </button>
      </div>
    </div>,
    document.body
  );
}
