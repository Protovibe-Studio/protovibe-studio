// plugins/protovibe/src/ui/components/GradientPicker.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { theme } from '../theme';
import { cssColorToHex } from '../utils/colorConversion';

// ─── Easing ───────────────────────────────────────────────────────────────────

type Smoothing = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
const easeInSine = (t: number) => 1 - Math.cos((t * Math.PI) / 2);
const easeOutSine = (t: number) => Math.sin((t * Math.PI) / 2);
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

// ─── Types ────────────────────────────────────────────────────────────────────

type GradientType = 'linear' | 'radial';
interface Stop { color: string; position: number; }
interface ParsedGradient {
  type: GradientType;
  angle: number;
  radialPos: { x: number; y: number };
  stops: Stop[];
}

// ─── CSS generation ───────────────────────────────────────────────────────────

function generateGradientCSS(
  type: GradientType,
  angle: number,
  radialPos: { x: number; y: number },
  stops: Stop[],
  smoothing: Smoothing,
): string {
  let finalStops = [...stops].sort((a, b) => a.position - b.position);

  if (smoothing !== 'linear' && finalStops.length > 1) {
    const next: Stop[] = [];
    const STEPS = 8;
    for (let i = 0; i < finalStops.length - 1; i++) {
      const a = finalStops[i];
      const b = finalStops[i + 1];
      next.push(a);
      for (let j = 1; j <= STEPS; j++) {
        const t = j / (STEPS + 1);
        let eased = t;
        if (smoothing === 'ease-in') eased = easeInSine(t);
        else if (smoothing === 'ease-out') eased = easeOutSine(t);
        else if (smoothing === 'ease-in-out') eased = easeInOutSine(t);
        const mix = +(eased * 100).toFixed(1);
        const pos = Math.round(a.position + (b.position - a.position) * t);
        next.push({ color: `color-mix(in oklch, ${b.color} ${mix}%, ${a.color})`, position: pos });
      }
    }
    next.push(finalStops[finalStops.length - 1]);
    finalStops = next;
  }

  const stopsString = finalStops.map(s => `${s.color} ${s.position}%`).join(', ');

  if (type === 'linear') {
    return `linear-gradient(${angle}deg, ${stopsString})`;
  }
  const x = Math.max(0, Math.min(100, radialPos.x));
  const y = Math.max(0, Math.min(100, radialPos.y));
  return `radial-gradient(circle at ${x}% ${y}%, ${stopsString})`;
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

function splitTopLevel(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === sep && depth === 0) {
      out.push(s.slice(start, i).trim());
      start = i + 1;
    }
  }
  out.push(s.slice(start).trim());
  return out.filter(p => p.length > 0);
}

/** Split a stop segment like "rgba(0,0,0,0.5) 50%" into [color, "50%"]. */
function splitStop(seg: string): { color: string; position: number | null } {
  // Find last whitespace at depth 0
  let depth = 0;
  let lastSpace = -1;
  for (let i = 0; i < seg.length; i++) {
    const ch = seg[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (depth === 0 && /\s/.test(ch)) lastSpace = i;
  }
  if (lastSpace < 0) return { color: seg, position: null };
  const tail = seg.slice(lastSpace + 1).trim();
  const m = tail.match(/^(-?[\d.]+)%$/);
  if (!m) return { color: seg, position: null };
  return { color: seg.slice(0, lastSpace).trim(), position: parseFloat(m[1]) };
}

function parseGradient(raw: string): ParsedGradient | null {
  const v = raw.trim();
  const linear = v.match(/^linear-gradient\(\s*([\s\S]+)\s*\)$/);
  const radial = v.match(/^radial-gradient\(\s*([\s\S]+)\s*\)$/);
  if (!linear && !radial) return null;

  const type: GradientType = linear ? 'linear' : 'radial';
  const inner = (linear ?? radial)![1];
  const parts = splitTopLevel(inner, ',');
  if (parts.length === 0) return null;

  let angle = 180;
  let radialPos = { x: 50, y: 50 };
  let stopsStart = 0;

  if (type === 'linear') {
    const angleMatch = parts[0].match(/^(-?[\d.]+)deg$/);
    if (angleMatch) {
      angle = parseFloat(angleMatch[1]);
      stopsStart = 1;
    } else if (/^to\s+/.test(parts[0])) {
      const dir = parts[0].replace(/^to\s+/, '').trim();
      const dirMap: Record<string, number> = {
        'top': 0, 'right': 90, 'bottom': 180, 'left': 270,
        'top right': 45, 'right top': 45,
        'bottom right': 135, 'right bottom': 135,
        'bottom left': 225, 'left bottom': 225,
        'top left': 315, 'left top': 315,
      };
      angle = dirMap[dir] ?? 180;
      stopsStart = 1;
    }
  } else {
    // Look for "at X% Y%" anywhere in the first segment
    const posMatch = parts[0].match(/at\s+(-?[\d.]+)%\s+(-?[\d.]+)%/);
    if (posMatch) {
      radialPos = { x: parseFloat(posMatch[1]), y: parseFloat(posMatch[2]) };
      stopsStart = 1;
    } else if (/^(circle|ellipse)/i.test(parts[0])) {
      stopsStart = 1;
    }
  }

  const stops: Stop[] = [];
  for (let i = stopsStart; i < parts.length; i++) {
    const { color, position } = splitStop(parts[i]);
    if (!color) continue;
    stops.push({ color, position: position ?? Math.round(((i - stopsStart) / Math.max(1, parts.length - stopsStart - 1)) * 100) });
  }
  if (stops.length < 2) return null;

  return { type, angle, radialPos, stops };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}

function SliderControl({ label, value, min, max, step = 1, suffix = '', onChange }: SliderControlProps) {
  const pct = ((value - min) / (max - min)) * 100;
  const decimals = step < 1 ? (step < 0.1 ? 2 : 1) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontFamily: theme.font_ui, fontWeight: 500, color: theme.text_secondary, fontSize: 12 }}>
          {label}
        </label>
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: theme.text_tertiary }}>
          {value.toFixed(decimals)}{suffix}
        </span>
      </div>
      <div style={{ position: 'relative', height: 16, display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2, background: theme.bg_tertiary }} />
        <div style={{ position: 'absolute', left: 0, height: 4, borderRadius: 2, background: theme.accent_default, width: `${pct}%` }} />
        <div style={{
          position: 'absolute', left: `calc(${pct}% - 7px)`,
          width: 14, height: 14, borderRadius: '50%',
          background: '#fff', border: `2px solid ${theme.accent_default}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)', pointerEvents: 'none',
        }} />
        <input
          type="range"
          min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
        />
      </div>
    </div>
  );
}

interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <div style={{
      display: 'flex', padding: 2, borderRadius: 6,
      background: theme.bg_secondary, border: `1px solid ${theme.border_default}`,
    }}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1, padding: '5px 8px',
              background: active ? theme.bg_tertiary : 'transparent',
              color: active ? theme.text_default : theme.text_tertiary,
              border: 'none', borderRadius: 4, cursor: 'pointer',
              fontFamily: theme.font_ui, fontSize: 11, fontWeight: 500,
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Interactive preview (drag to set radial center) ─────────────────────────

interface PreviewProps {
  type: GradientType;
  radialPos: { x: number; y: number };
  onRadialPosChange: (p: { x: number; y: number }) => void;
  gradientCSS: string;
}

function Preview({ type, radialPos, onRadialPosChange, gradientCSS }: PreviewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);

  function update(e: React.PointerEvent) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    onRadialPosChange({ x: Math.round(x), y: Math.round(y) });
  }

  return (
    <div
      ref={ref}
      onPointerDown={e => { if (type !== 'radial') return; setDragging(true); update(e); e.currentTarget.setPointerCapture(e.pointerId); }}
      onPointerMove={e => { if (dragging && type === 'radial') update(e); }}
      onPointerUp={e => { if (type !== 'radial') return; setDragging(false); e.currentTarget.releasePointerCapture(e.pointerId); }}
      onPointerCancel={() => setDragging(false)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', width: '100%', height: 120, flexShrink: 0,
        borderRadius: 8, overflow: 'hidden',
        border: `1px solid ${theme.border_default}`,
        background: gradientCSS,
        cursor: type === 'radial' ? 'crosshair' : 'default',
        touchAction: 'none',
      }}
    >
      {type === 'radial' && (
        <div style={{
          position: 'absolute', width: 18, height: 18, borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.85)',
          boxShadow: '0 0 8px rgba(0,0,0,0.5)',
          left: `${radialPos.x}%`, top: `${radialPos.y}%`,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          opacity: hovered || dragging ? 1 : 0.6,
          transition: 'opacity 0.15s',
        }} />
      )}
    </div>
  );
}

// ─── Main GradientPicker ─────────────────────────────────────────────────────

export interface GradientPickerProps {
  tokenName: string;
  themeMode: 'light' | 'dark';
  initialValue: string;
  anchorRect: DOMRect;
  onSave: (cssValue: string) => void;
  onCancel: () => void;
}

export function GradientPicker({ tokenName, themeMode, initialValue, anchorRect, onSave, onCancel }: GradientPickerProps) {
  const parsed = useMemo(() => parseGradient(initialValue), [initialValue]);
  const [type, setType] = useState<GradientType>(parsed?.type ?? 'linear');
  const [angle, setAngle] = useState<number>(parsed?.angle ?? 180);
  const [radialPos, setRadialPos] = useState<{ x: number; y: number }>(parsed?.radialPos ?? { x: 50, y: 50 });
  const [stops, setStops] = useState<Stop[]>(parsed?.stops ?? [
    { color: '#ec4899', position: 0 },
    { color: '#8b5cf6', position: 100 },
  ]);
  const [smoothing, setSmoothing] = useState<Smoothing>('linear');
  const [customCSS, setCustomCSS] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);

  const generatedCSS = useMemo(
    () => generateGradientCSS(type, angle, radialPos, stops, smoothing),
    [type, angle, radialPos, stops, smoothing],
  );
  const finalCSS = customCSS !== null ? customCSS : generatedCSS;

  function updateStop(i: number, patch: Partial<Stop>) {
    setStops(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));
    setCustomCSS(null);
  }
  function addStop() {
    setStops(prev => [...prev, { color: '#ffffff', position: 50 }]);
    setCustomCSS(null);
  }
  function removeStop(i: number) {
    if (stops.length <= 2) return;
    setStops(prev => prev.filter((_, idx) => idx !== i));
    setCustomCSS(null);
  }

  // ── Positioning (floating, independent of trigger) ──
  const PICKER_W = 320;
  const TOP_OFFSET = 60;
  const SIDE_PAD = 16;
  const BOTTOM_PAD = 16;
  const top = TOP_OFFSET;
  const left = Math.max(SIDE_PAD, window.innerWidth - PICKER_W - SIDE_PAD);
  const maxHeight = window.innerHeight - top - BOTTOM_PAD;

  // ── Outside click / Escape ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (editorRef.current && !editorRef.current.contains(e.target as Node)) onCancel();
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [onCancel]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  const modeLabel = themeMode === 'light' ? '☀ Light' : '🌙 Dark';

  return createPortal(
    <div
      ref={editorRef}
      style={{
        position: 'fixed', top, left, width: PICKER_W, maxHeight,
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
          fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: theme.text_default,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          --{tokenName}
        </div>
        <div style={{ fontFamily: theme.font_ui, fontSize: 10, color: theme.text_tertiary, marginTop: 2 }}>
          {modeLabel} theme · {type} gradient · {stops.length} stops
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Preview
          type={type}
          radialPos={radialPos}
          onRadialPosChange={p => { setRadialPos(p); setCustomCSS(null); }}
          gradientCSS={finalCSS}
        />

        <Segmented<GradientType>
          options={[{ value: 'linear', label: 'Linear' }, { value: 'radial', label: 'Radial' }]}
          value={type}
          onChange={v => { setType(v); setCustomCSS(null); }}
        />

        {type === 'linear' ? (
          <SliderControl
            label="Angle" value={angle} min={0} max={360} suffix="°"
            onChange={v => { setAngle(v); setCustomCSS(null); }}
          />
        ) : (
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <SliderControl
                label="Center X" value={radialPos.x} min={0} max={100} suffix="%"
                onChange={v => { setRadialPos({ ...radialPos, x: v }); setCustomCSS(null); }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <SliderControl
                label="Center Y" value={radialPos.y} min={0} max={100} suffix="%"
                onChange={v => { setRadialPos({ ...radialPos, y: v }); setCustomCSS(null); }}
              />
            </div>
          </div>
        )}

        {/* Stops */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingBottom: 6, borderBottom: `1px solid ${theme.border_secondary}`,
          }}>
            <span style={{ fontFamily: theme.font_ui, fontWeight: 500, color: theme.text_secondary, fontSize: 12 }}>
              Color stops
            </span>
            <button
              onClick={addStop}
              style={{
                padding: '3px 8px', background: theme.bg_secondary,
                border: `1px solid ${theme.border_default}`, borderRadius: 4,
                cursor: 'pointer', color: theme.text_secondary,
                fontFamily: theme.font_ui, fontSize: 11,
              }}
            >
              + Add
            </button>
          </div>

          {stops.map((stop, i) => (
            <StopRow
              key={i}
              index={i}
              stop={stop}
              canRemove={stops.length > 2}
              onChange={patch => updateStop(i, patch)}
              onRemove={() => removeStop(i)}
            />
          ))}
        </div>

        {/* Smoothing */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontFamily: theme.font_ui, fontWeight: 500, color: theme.text_secondary, fontSize: 12 }}>
            Smoothing curve
          </span>
          <Segmented<Smoothing>
            options={[
              { value: 'linear', label: 'Linear' },
              { value: 'ease-in', label: 'Ease in' },
              { value: 'ease-out', label: 'Ease out' },
              { value: 'ease-in-out', label: 'In-out' },
            ]}
            value={smoothing}
            onChange={v => { setSmoothing(v); setCustomCSS(null); }}
          />
        </div>

        {/* Custom CSS */}
        <div style={{ paddingTop: 6, borderTop: `1px solid ${theme.border_secondary}` }}>
          <div style={{ fontFamily: theme.font_ui, fontSize: 11, fontWeight: 500, color: theme.text_tertiary, marginBottom: 6 }}>
            Custom CSS
          </div>
          <textarea
            value={finalCSS}
            onChange={e => setCustomCSS(e.target.value)}
            spellCheck={false}
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              fontFamily: 'monospace', fontSize: 10, lineHeight: 1.6,
              color: customCSS !== null ? theme.text_default : theme.text_secondary,
              background: theme.bg_secondary,
              border: `1px solid ${customCSS !== null ? theme.border_accent : theme.border_default}`,
              borderRadius: 6, padding: '8px 10px',
              resize: 'vertical', maxHeight: 120, outline: 'none', margin: 0,
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
            fontFamily: theme.font_ui, fontSize: 12,
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(finalCSS)}
          style={{
            padding: '6px 16px', background: theme.accent_default,
            border: 'none', borderRadius: 6,
            cursor: 'pointer', color: '#fff',
            fontFamily: theme.font_ui, fontSize: 12, fontWeight: 600,
          }}
        >
          Save
        </button>
      </div>
    </div>,
    document.body,
  );
}

// ─── StopRow ──────────────────────────────────────────────────────────────────

interface StopRowProps {
  index: number;
  stop: Stop;
  canRemove: boolean;
  onChange: (patch: Partial<Stop>) => void;
  onRemove: () => void;
}

function StopRow({ index, stop, canRemove, onChange, onRemove }: StopRowProps) {
  const swatchHex = useMemo(() => cssColorToHex(stop.color) || '#000000', [stop.color]);
  const isHexInput = /^#[0-9a-fA-F]{6,8}$/.test(stop.color.trim());

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 8,
      padding: 8, borderRadius: 6,
      background: theme.bg_default, border: `1px solid ${theme.border_default}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: theme.font_ui, fontSize: 11, color: theme.text_tertiary, minWidth: 36 }}>
          Stop {index + 1}
        </span>
        <div style={{
          width: 22, height: 22, borderRadius: 4,
          background: stop.color,
          border: `1px solid ${theme.border_default}`,
          flexShrink: 0, overflow: 'hidden', position: 'relative',
        }}>
          <input
            type="color"
            value={isHexInput ? swatchHex : swatchHex}
            onChange={e => onChange({ color: e.target.value })}
            style={{
              position: 'absolute', top: -4, left: -4, width: 30, height: 30,
              cursor: 'pointer', border: 'none', padding: 0, opacity: 0,
            }}
            data-tooltip="Pick color"
          />
        </div>
        <input
          type="text"
          value={stop.color}
          onChange={e => onChange({ color: e.target.value })}
          spellCheck={false}
          style={{
            flex: 1, minWidth: 0,
            background: theme.bg_secondary, color: theme.text_default,
            border: `1px solid ${theme.border_default}`, borderRadius: 4,
            padding: '3px 6px', fontFamily: 'monospace', fontSize: 11, outline: 'none',
          }}
        />
        {canRemove && (
          <button
            onClick={onRemove}
            data-tooltip="Remove stop"
            style={{
              width: 22, height: 22, padding: 0, flexShrink: 0,
              background: 'transparent', border: `1px solid ${theme.border_default}`,
              borderRadius: 4, cursor: 'pointer',
              color: theme.text_tertiary, fontFamily: theme.font_ui, fontSize: 12, lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>
      <SliderControl
        label="Position" value={stop.position} min={0} max={100} suffix="%"
        onChange={v => onChange({ position: Math.round(v) })}
      />
    </div>
  );
}
