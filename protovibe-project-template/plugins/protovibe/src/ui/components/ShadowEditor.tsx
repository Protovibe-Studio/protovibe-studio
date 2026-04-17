// plugins/protovibe/src/ui/components/ShadowEditor.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Sun } from 'lucide-react';
import { theme } from '../theme';

// ─── Color helpers ───────────────────────────────────────────────────────────

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

// ─── Shadow CSS generation ───────────────────────────────────────────────────

const SHADOW_RATIO = -0.25;

function generateShadowCSS(
  x: number, y: number, blur: number, spread: number,
  color: string, opacity: number, layersCount: number,
  inset: boolean,
): string {
  const { r, g, b } = hexToRgb(color);
  const prefix = inset ? 'inset ' : '';

  if (layersCount === 1) {
    return `${prefix}${fmtNum(x)}px ${fmtNum(y)}px ${fmtNum(blur)}px ${fmtNum(spread)}px rgba(${r}, ${g}, ${b}, ${fmtNum(opacity)})`;
  }

  const shadows: string[] = [];
  for (let i = 1; i <= layersCount; i++) {
    const progress = i / layersCount;
    const ease = Math.pow(progress, 2.5);
    const lx = fmtNum(x * ease);
    const ly = fmtNum(y * ease);
    const lb = fmtNum(blur * ease);
    const ls = fmtNum(spread * ease);
    const lo = fmtNum(opacity * (1 - progress * 0.5) / 1.5);
    shadows.push(`${prefix}${lx}px ${ly}px ${lb}px ${ls}px rgba(${r}, ${g}, ${b}, ${lo})`);
  }
  return shadows.reverse().join(', ');
}

/** Format number: strip trailing zeros after decimal */
function fmtNum(n: number): string {
  return parseFloat(n.toFixed(3)).toString();
}

// ─── Shadow CSS parsing ──────────────────────────────────────────────────────

function splitShadowLayers(raw: string): string[] {
  const layers: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '(') depth++;
    else if (raw[i] === ')') depth--;
    else if (raw[i] === ',' && depth === 0) {
      layers.push(raw.slice(start, i).trim());
      start = i + 1;
    }
  }
  layers.push(raw.slice(start).trim());
  return layers.filter(l => l.length > 0);
}

interface ParsedLayer {
  x: number; y: number; blur: number; spread: number;
  r: number; g: number; b: number; opacity: number;
  inset: boolean;
}

function parseSingleLayer(layer: string): ParsedLayer | null {
  let s = layer.trim();
  const inset = /^inset\s/i.test(s);
  if (inset) s = s.replace(/^inset\s+/i, '');

  let r = 0, g = 0, b = 0, opacity = 0.4;

  // rgba(r, g, b, a) or rgb(r g b / a)
  const rgbaMatch = s.match(/rgba?\([^)]+\)/i);
  if (rgbaMatch) {
    const colorStr = rgbaMatch[0];
    s = s.replace(colorStr, '').trim();
    const commaMatch = colorStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+%?))?\s*\)/);
    const spaceMatch = colorStr.match(/rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*([\d.]+%?))?\s*\)/);
    const m = commaMatch || spaceMatch;
    if (m) {
      r = parseInt(m[1]); g = parseInt(m[2]); b = parseInt(m[3]);
      if (m[4]) {
        opacity = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      } else {
        opacity = 1;
      }
    }
  } else {
    const hexMatch = s.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
    if (hexMatch) {
      s = s.replace(hexMatch[0], '').trim();
      const rgb = hexToRgb(hexMatch[0]);
      r = rgb.r; g = rgb.g; b = rgb.b; opacity = 1;
    }
  }

  const nums = s.match(/-?[\d.]+/g);
  if (!nums || nums.length < 2) return null;

  return {
    x: parseFloat(nums[0]),
    y: parseFloat(nums[1]),
    blur: nums.length > 2 ? Math.abs(parseFloat(nums[2])) : 0,
    spread: nums.length > 3 ? parseFloat(nums[3]) : 0,
    r, g, b, opacity, inset,
  };
}

interface ShadowParams {
  lightX: number; lightY: number;
  blur: number; spread: number;
  color: string; opacity: number;
  layersCount: number;
  inset: boolean;
}

function parseShadowValue(value: string): ShadowParams {
  const defaults: ShadowParams = {
    lightX: -60, lightY: -60, blur: 40, spread: 0,
    color: '#000000', opacity: 0.4, layersCount: 6, inset: false,
  };
  if (!value || !value.trim()) return defaults;

  const layers = splitShadowLayers(value);
  const layersCount = layers.length;
  // First layer in reversed output = outermost (largest values = base)
  const parsed = parseSingleLayer(layers[0]);
  if (!parsed) return defaults;

  // Reverse the multi-layer opacity scaling
  let baseOpacity: number;
  if (layersCount === 1) {
    baseOpacity = parsed.opacity;
  } else {
    // First layer in output (i=layersCount, progress=1): lo = opacity * 0.5 / 1.5 = opacity / 3
    baseOpacity = Math.min(1, parsed.opacity * 3);
  }

  return {
    lightX: parsed.x / SHADOW_RATIO,
    lightY: parsed.y / SHADOW_RATIO,
    blur: parsed.blur,
    spread: parsed.spread,
    color: rgbToHex(parsed.r, parsed.g, parsed.b),
    opacity: Math.round(baseOpacity * 100) / 100,
    layersCount,
    inset: parsed.inset,
  };
}

// ─── Interactive Preview ─────────────────────────────────────────────────────

interface PreviewProps {
  lightPos: { x: number; y: number };
  onLightChange: (pos: { x: number; y: number }) => void;
  shadowCSS: string;
}

function InteractivePreview({ lightPos, onLightChange, shadowCSS }: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const updatePosition = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    onLightChange({ x: e.clientX - rect.left - cx, y: e.clientY - rect.top - cy });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    updatePosition(e);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) updatePosition(e);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '1',
        borderRadius: 12,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `1px solid ${theme.border_default}`,
        touchAction: 'none',
        background: '#ffffff',
        cursor: 'crosshair',
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      {/* Shadow card */}
      <div style={{
        width: 56,
        height: 56,
        background: '#ffffff',
        borderRadius: 10,
        position: 'relative',
        zIndex: 1,
        pointerEvents: 'none',
        boxShadow: shadowCSS,
      }} />

      {/* Sun / light source indicator */}
      <div style={{
        position: 'absolute',
        width: 22,
        height: 22,
        borderRadius: '50%',
        background: '#ffffff',
        border: '1px solid #fef9c3',
        boxShadow: '0 0 12px rgba(255,255,255,1), inset 0 0 6px rgba(250,204,21,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
        pointerEvents: 'none',
        left: '50%',
        top: '50%',
        transform: `translate(calc(-50% + ${lightPos.x}px), calc(-50% + ${lightPos.y}px))`,
      }}>
        <Sun size={11} color="#ca8a04" />
      </div>

      {/* Guide text */}
      <div style={{
        position: 'absolute',
        bottom: 8,
        fontSize: 10,
        fontFamily: 'sans-serif',
        fontWeight: 500,
        color: '#999',
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(4px)',
        padding: '3px 8px',
        borderRadius: 10,
        pointerEvents: 'none',
        opacity: isHovered ? 1 : 0,
        transition: 'opacity 0.15s',
      }}>
        Drag to move light
      </div>
    </div>
  );
}

// ─── Slider Control ──────────────────────────────────────────────────────────

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}

function SliderControl({ label, value, min, max, step = 1, onChange }: SliderControlProps) {
  const pct = ((value - min) / (max - min)) * 100;
  const decimals = step < 1 ? (step < 0.1 ? 2 : 1) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 12,
      }}>
        <label style={{ fontFamily: 'sans-serif', fontWeight: 500, color: theme.text_secondary, fontSize: 12 }}>
          {label}
        </label>
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: theme.text_tertiary }}>
          {value.toFixed(decimals)}
        </span>
      </div>
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
          min={min} max={max} step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            opacity: 0, cursor: 'pointer', margin: 0,
          }}
        />
      </div>
    </div>
  );
}

// ─── Main ShadowEditor ──────────────────────────────────────────────────────

export interface ShadowEditorProps {
  tokenName: string;
  initialValue: string;
  anchorRect: DOMRect;
  onSave: (cssValue: string) => void;
  onCancel: () => void;
}

export function ShadowEditor({ tokenName, initialValue, anchorRect, onSave, onCancel }: ShadowEditorProps) {
  const params = useMemo(() => parseShadowValue(initialValue), [initialValue]);

  const [lightPos, setLightPos] = useState({ x: params.lightX, y: params.lightY });
  const [blur, setBlur] = useState(params.blur);
  const [spread, setSpread] = useState(params.spread);
  const [opacity, setOpacity] = useState(params.opacity);
  const [color, setColor] = useState(params.color);
  const [layersCount, setLayersCount] = useState(params.layersCount);
  const inset = params.inset;
  const [customCSS, setCustomCSS] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);

  const shadowX = lightPos.x * SHADOW_RATIO;
  const shadowY = lightPos.y * SHADOW_RATIO;
  const generatedCSS = generateShadowCSS(shadowX, shadowY, blur, spread, color, opacity, layersCount, inset);
  const shadowCSS = customCSS ?? generatedCSS;

  // ── Positioning ──
  const PICKER_W = 240;
  const PAD = 10;
  let left = anchorRect.left;
  let top = anchorRect.bottom + 8;
  if (left + PICKER_W > window.innerWidth - PAD) left = window.innerWidth - PICKER_W - PAD;
  if (left < PAD) left = PAD;
  // If not enough room below, try above the anchor
  const spaceBelow = window.innerHeight - anchorRect.bottom - 8 - PAD;
  const spaceAbove = anchorRect.top - 8 - PAD;
  if (spaceBelow < 300 && spaceAbove > spaceBelow) {
    // Position above — let maxHeight constrain it
    top = Math.max(PAD, anchorRect.top - 8 - Math.min(spaceAbove, 600));
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
        <div style={{
          fontFamily: 'sans-serif', fontSize: 10, color: theme.text_tertiary, marginTop: 2,
        }}>
          {inset ? 'Inset shadow' : 'Shadow'} · {layersCount} layer{layersCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 16px' }}>
        {/* Interactive preview */}
        <InteractivePreview
          lightPos={lightPos}
          onLightChange={pos => { setLightPos(pos); setCustomCSS(null); }}
          shadowCSS={shadowCSS}
        />

        {/* Sliders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
          <SliderControl
            label="Smooth layers"
            value={layersCount}
            min={1} max={6} step={1}
            onChange={v => { setLayersCount(v); setCustomCSS(null); }}
          />
          <SliderControl
            label="Blur"
            value={blur}
            min={0} max={200} step={1}
            onChange={v => { setBlur(v); setCustomCSS(null); }}
          />
          <SliderControl
            label="Spread"
            value={spread}
            min={-50} max={100} step={1}
            onChange={v => { setSpread(v); setCustomCSS(null); }}
          />
          <SliderControl
            label="Opacity"
            value={opacity}
            min={0} max={1} step={0.01}
            onChange={v => { setOpacity(v); setCustomCSS(null); }}
          />

          {/* Color row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
          }}>
            <span style={{ fontFamily: 'sans-serif', fontWeight: 500, color: theme.text_secondary }}>
              Color
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 20, height: 20, borderRadius: 4,
                overflow: 'hidden',
                border: `1px solid ${theme.border_default}`,
                flexShrink: 0,
                position: 'relative',
              }}>
                <input
                  type="color"
                  value={color}
                  onChange={e => { setColor(e.target.value); setCustomCSS(null); }}
                  style={{
                    position: 'absolute', top: -4, left: -4,
                    width: 28, height: 28,
                    cursor: 'pointer', border: 'none', padding: 0,
                  }}
                />
              </div>
              <input
                type="text"
                value={color}
                onChange={e => {
                  const val = e.target.value;
                  if (/^#[0-9a-fA-F]{6}$/.test(val)) { setColor(val); setCustomCSS(null); }
                }}
                onBlur={e => {
                  let val = e.target.value;
                  if (!val.startsWith('#')) val = '#' + val;
                  if (/^#[0-9a-fA-F]{6}$/.test(val)) { setColor(val); setCustomCSS(null); }
                }}
                style={{
                  width: 70,
                  background: theme.bg_secondary,
                  border: `1px solid ${theme.border_default}`,
                  borderRadius: 4,
                  padding: '3px 6px',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: theme.text_secondary,
                  outline: 'none',
                  textTransform: 'uppercase',
                }}
              />
            </div>
          </div>
        </div>

        {/* CSS Output */}
        <div style={{
          marginTop: 16,
          paddingTop: 14,
          borderTop: `1px solid ${theme.border_secondary}`,
        }}>
          <div style={{
            fontFamily: 'sans-serif', fontSize: 11, fontWeight: 500,
            color: theme.text_tertiary, marginBottom: 6,
          }}>
            Custom CSS
          </div>
          <textarea
            value={shadowCSS}
            onChange={e => setCustomCSS(e.target.value)}
            spellCheck={false}
            rows={3}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              fontFamily: 'monospace',
              fontSize: 10,
              lineHeight: 1.6,
              color: customCSS !== null ? theme.text_default : theme.text_secondary,
              background: theme.bg_secondary,
              border: `1px solid ${customCSS !== null ? theme.border_accent : theme.border_default}`,
              borderRadius: 8,
              padding: '8px 10px',
              resize: 'vertical',
              maxHeight: 100,
              outline: 'none',
              margin: 0,
            }}
          />
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
            fontFamily: 'sans-serif', fontSize: 12,
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(shadowCSS)}
          style={{
            padding: '6px 16px',
            background: theme.accent_default,
            border: 'none', borderRadius: 6,
            cursor: 'pointer',
            color: '#fff',
            fontFamily: 'sans-serif', fontSize: 12, fontWeight: 600,
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
