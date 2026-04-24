// plugins/protovibe/src/ui/components/ColorPicker.tsx
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { theme } from '../theme';
import { cssColorToOklch, oklchToHex, parseOklch, formatOklch } from '../utils/colorConversion';

// ─── Validation helpers ───────────────────────────────────────────────────────

const L_MIN = 0, L_MAX = 100;   // user enters 0–100 (%), stored as 0–1
const C_MIN = 0, C_MAX = 0.4;
const H_MIN = 0, H_MAX = 360;

function parseL(raw: string): number | null {
  const n = parseFloat(raw);
  return isNaN(n) || n < L_MIN || n > L_MAX ? null : n / 100;
}
function parseC(raw: string): number | null {
  const n = parseFloat(raw);
  return isNaN(n) || n < C_MIN || n > C_MAX ? null : n;
}
function parseH(raw: string): number | null {
  const n = parseFloat(raw);
  return isNaN(n) || n < H_MIN || n > H_MAX ? null : n;
}

// ─── SliderWithInput ──────────────────────────────────────────────────────────

interface SliderWithInputProps {
  label: string;
  description: string;
  sliderMin: number;
  sliderMax: number;
  sliderStep: number;
  sliderValue: number;
  onSliderChange: (v: number) => void;
  trackGradient: string;
  thumbColor: string;
  inputRaw: string;
  inputError: boolean;
  inputSuffix?: string;
  /** Step used by +/− buttons and arrow keys (in display units). */
  inputStep: number;
  /** Clamp bounds in display units. */
  inputMin: number;
  inputMax: number;
  /** Decimal places to show after increment/decrement. */
  inputDecimals: number;
  onInputChange: (raw: string) => void;
  onInputFocus: () => void;
  onInputBlur: () => void;
}

function StepButton({ children, onActivate }: { children: React.ReactNode; onActivate: () => void }) {
  return (
    <button
      tabIndex={-1}
      // preventDefault keeps input focused when button is clicked
      onMouseDown={e => e.preventDefault()}
      onClick={onActivate}
      style={{
        width: 26, height: 26, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: theme.bg_tertiary,
        border: `1px solid ${theme.border_default}`,
        borderRadius: 4,
        color: theme.text_secondary,
        fontFamily: 'monospace', fontSize: 13, lineHeight: 1,
        cursor: 'pointer', padding: 0,
      }}
    >
      {children}
    </button>
  );
}

function SliderWithInput({
  label, description,
  sliderMin, sliderMax, sliderStep, sliderValue, onSliderChange,
  trackGradient, thumbColor,
  inputRaw, inputError, inputSuffix,
  inputStep, inputMin, inputMax, inputDecimals,
  onInputChange, onInputFocus, onInputBlur,
}: SliderWithInputProps) {
  const pct = ((sliderValue - sliderMin) / (sliderMax - sliderMin)) * 100;

  function nudge(delta: number) {
    const current = parseFloat(inputRaw);
    const base = isNaN(current) ? sliderValue : current;
    const next = Math.min(inputMax, Math.max(inputMin, Math.round((base + delta) * 1e6) / 1e6));
    onInputChange(next.toFixed(inputDecimals));
  }

  const BTN_SIZE = 26;
  const inputStyle: React.CSSProperties = {
    width: 58, height: BTN_SIZE, padding: '0 5px',
    background: inputError ? 'rgba(242,72,34,0.14)' : theme.bg_tertiary,
    border: `1px solid ${inputError ? theme.destructive_default : theme.border_default}`,
    borderRadius: 5, color: inputError ? theme.destructive_default : theme.text_default,
    fontFamily: 'monospace', fontSize: 11,
    outline: 'none', textAlign: 'right' as const, boxSizing: 'border-box' as const,
  };

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5, gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: theme.accent_default }}>
            {label}
          </span>
          <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: theme.text_tertiary }}>
            {description}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <StepButton onActivate={() => nudge(-inputStep)}>−</StepButton>
          <input
            type="text"
            value={inputRaw}
            onChange={e => onInputChange(e.target.value)}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
            onKeyDown={e => {
              if (e.key === 'ArrowUp')   { e.preventDefault(); nudge(+inputStep); }
              if (e.key === 'ArrowDown') { e.preventDefault(); nudge(-inputStep); }
            }}
            spellCheck={false}
            style={inputStyle}
          />
          <StepButton onActivate={() => nudge(+inputStep)}>+</StepButton>
        </div>
      </div>

      {/* Slider track */}
      <div style={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 8, borderRadius: 4,
          background: trackGradient,
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
        }} />
        <div style={{
          position: 'absolute',
          left: `calc(${pct}% - 10px)`,
          width: 20, height: 20, borderRadius: '50%',
          background: thumbColor,
          border: '2.5px solid #fff',
          boxShadow: '0 1px 6px rgba(0,0,0,0.55)',
          pointerEvents: 'none',
        }} />
        <input
          type="range"
          min={sliderMin} max={sliderMax} step={sliderStep}
          value={sliderValue}
          onChange={e => onSliderChange(parseFloat(e.target.value))}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
        />
      </div>
    </div>
  );
}

// ─── ConversionInput ─────────────────────────────────────────────────────────

interface ConversionInputProps {
  label: string;
  placeholder: string;
  value: string;
  error: boolean;
  onChange: (raw: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}

function ConversionInput({ label, placeholder, value, error, onChange, onFocus, onBlur }: ConversionInputProps) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontFamily: 'sans-serif', fontSize: 10, fontWeight: 600, color: theme.text_tertiary, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </div>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        spellCheck={false}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: error ? 'rgba(242,72,34,0.12)' : theme.bg_secondary,
          border: `1px solid ${error ? theme.destructive_default : theme.border_default}`,
          borderRadius: 6, color: error ? theme.destructive_default : theme.text_default,
          fontFamily: 'monospace', fontSize: 11,
          padding: '6px 10px', outline: 'none',
        }}
      />
    </div>
  );
}

// ─── Main ColorPicker ─────────────────────────────────────────────────────────

export interface ColorPickerProps {
  tokenName: string;
  themeMode: 'light' | 'dark';
  initialValue: string;
  anchorRect: DOMRect;
  onSave: (oklchValue: string) => void;
  onCancel: () => void;
}

export function ColorPicker({ tokenName, themeMode, initialValue, anchorRect, onSave, onCancel }: ColorPickerProps) {
  const parsed = parseOklch(initialValue) ?? cssColorToOklch(initialValue);
  const initL = parsed ? parsed[0] : 0.5;
  const initC = parsed ? parsed[1] : 0.1;
  const initH = parsed ? parsed[2] : 200;

  // Ground-truth values (always valid)
  const [L, setL] = useState(initL);
  const [C, setC] = useState(initC);
  const [H, setH] = useState(initH);

  // Input field raw text + focus tracking for each channel
  const [lRaw, setLRaw] = useState(() => (initL * 100).toFixed(1));
  const [cRaw, setCRaw] = useState(() => initC.toFixed(4));
  const [hRaw, setHRaw] = useState(() => initH.toFixed(1));
  const [lFocused, setLFocused] = useState(false);
  const [cFocused, setCFocused] = useState(false);
  const [hFocused, setHFocused] = useState(false);

  // Hex convenience field
  const [hexRaw, setHexRaw] = useState('');
  const [hexError, setHexError] = useState(false);
  const [hexFocused, setHexFocused] = useState(false);

  // "Any CSS color" convenience field
  const [cssRaw, setCssRaw] = useState('');
  const [cssError, setCssError] = useState(false);
  const [cssFocused, setCssFocused] = useState(false);

  const pickerRef = useRef<HTMLDivElement>(null);

  const currentHex = oklchToHex(L, C, H);
  const currentOklch = formatOklch(L, C, H);

  // ── Sync inputs FROM sliders (only when the input is not focused) ──
  useEffect(() => { if (!lFocused) setLRaw((L * 100).toFixed(1)); }, [L]);      // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!cFocused) setCRaw(C.toFixed(4)); }, [C]);               // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!hFocused) setHRaw(H.toFixed(1)); }, [H]);               // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!hexFocused) { setHexRaw(currentHex); setHexError(false); } }, [currentHex]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived validation ──
  const lError = parseL(lRaw) === null;
  const cError = parseC(cRaw) === null;
  const hError = parseH(hRaw) === null;
  const canSave = !lError && !cError && !hError;

  // ── Handlers for channel inputs ──
  function handleLInput(raw: string) {
    setLRaw(raw);
    const v = parseL(raw);
    if (v !== null) setL(v);
  }
  function handleCInput(raw: string) {
    setCRaw(raw);
    const v = parseC(raw);
    if (v !== null) setC(v);
  }
  function handleHInput(raw: string) {
    setHRaw(raw);
    const v = parseH(raw);
    if (v !== null) setH(v);
  }

  // On blur: reset to last valid value if the field is in error
  function handleLBlur() {
    setLFocused(false);
    if (lError) setLRaw((L * 100).toFixed(1));
  }
  function handleCBlur() {
    setCFocused(false);
    if (cError) setCRaw(C.toFixed(4));
  }
  function handleHBlur() {
    setHFocused(false);
    if (hError) setHRaw(H.toFixed(1));
  }

  // ── Hex handler ──
  function handleHexInput(raw: string) {
    setHexRaw(raw);
    const normalized = raw.startsWith('#') ? raw : '#' + raw;
    const oklch = cssColorToOklch(normalized);
    if (oklch) {
      setL(oklch[0]); setC(oklch[1]); setH(oklch[2]);
      setHexError(false);
    } else {
      setHexError(true);
    }
  }

  // ── Any CSS color handler ──
  function handleCssInput(raw: string) {
    setCssRaw(raw);
    if (!raw.trim()) { setCssError(false); return; }
    const oklch = cssColorToOklch(raw.trim());
    if (oklch) {
      setL(oklch[0]); setC(oklch[1]); setH(oklch[2]);
      setCssError(false);
    } else {
      setCssError(true);
    }
  }

  // ── Positioning ──
  const PICKER_W = 310;
  const PICKER_H = 540;
  const PAD = 10;
  let left = anchorRect.left;
  let top = anchorRect.bottom + 8;
  if (left + PICKER_W > window.innerWidth - PAD) left = window.innerWidth - PICKER_W - PAD;
  if (left < PAD) left = PAD;
  if (top + PICKER_H > window.innerHeight - PAD) top = anchorRect.top - PICKER_H - 8;
  if (top < PAD) top = PAD;

  // ── Outside click / Escape ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) onCancel();
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [onCancel]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  // ── Gradient tracks ──
  const lGrad = `linear-gradient(to right, oklch(0 ${C} ${H}), oklch(1 ${C} ${H}))`;
  const cGrad = `linear-gradient(to right, oklch(${L} 0 ${H}), oklch(${L} 0.37 ${H}))`;
  const hStops = [0, 45, 90, 135, 180, 225, 270, 315, 360]
    .map(deg => `oklch(${L} ${Math.max(C, 0.18)} ${deg})`).join(', ');
  const hGrad = `linear-gradient(to right, ${hStops})`;

  const modeLabel = themeMode === 'light' ? '☀ Light' : '🌙 Dark';

  return createPortal(
    <div
      ref={pickerRef}
      style={{
        position: 'fixed', top, left, width: PICKER_W,
        zIndex: 9999999,
        background: theme.bg_strong,
        border: `1px solid ${theme.border_default}`,
        borderRadius: 12,
        boxShadow: '0 12px 40px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* ── Header ── */}
      <div style={{
        padding: '12px 14px 10px',
        borderBottom: `1px solid ${theme.border_secondary}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: theme.text_default, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            --{tokenName}
          </div>
          <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: theme.text_tertiary, marginTop: 2 }}>
            {modeLabel} theme
          </div>
        </div>
        <div style={{
          width: 48, height: 48, flexShrink: 0, borderRadius: 10,
          background: `oklch(${L} ${C} ${H})`,
          border: `2px solid ${theme.border_strong}`,
          boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
        }} />
      </div>

      {/* ── OKLCH sliders ── */}
      <div style={{ padding: '14px 16px 6px' }}>
        <SliderWithInput
          label="L" description="Lightness"
          sliderMin={0} sliderMax={1} sliderStep={0.001} sliderValue={L}
          onSliderChange={v => { setL(v); }}
          trackGradient={lGrad} thumbColor={currentHex}
          inputRaw={lRaw} inputError={lError} inputSuffix="%"
          inputStep={0.5} inputMin={0} inputMax={100} inputDecimals={1}
          onInputChange={handleLInput}
          onInputFocus={() => setLFocused(true)}
          onInputBlur={handleLBlur}
        />
        <SliderWithInput
          label="C" description="Chroma"
          sliderMin={0} sliderMax={0.37} sliderStep={0.001} sliderValue={C}
          onSliderChange={v => { setC(v); }}
          trackGradient={cGrad} thumbColor={currentHex}
          inputRaw={cRaw} inputError={cError}
          inputStep={0.005} inputMin={0} inputMax={0.4} inputDecimals={4}
          onInputChange={handleCInput}
          onInputFocus={() => setCFocused(true)}
          onInputBlur={handleCBlur}
        />
        <SliderWithInput
          label="H" description="Hue"
          sliderMin={0} sliderMax={360} sliderStep={0.1} sliderValue={H}
          onSliderChange={v => { setH(v); }}
          trackGradient={hGrad} thumbColor={currentHex}
          inputRaw={hRaw} inputError={hError} inputSuffix="°"
          inputStep={0.5} inputMin={0} inputMax={360} inputDecimals={1}
          onInputChange={handleHInput}
          onInputFocus={() => setHFocused(true)}
          onInputBlur={handleHBlur}
        />
      </div>

      {/* ── OKLCH output ── */}
      <div style={{ padding: '0 16px 4px' }}>
        <div style={{
          fontFamily: 'monospace', fontSize: 10, color: theme.text_tertiary,
          padding: '5px 8px', background: theme.bg_secondary, borderRadius: 5,
          border: `1px solid ${theme.border_secondary}`, wordBreak: 'break-all',
        }}>
          {currentOklch}
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ margin: '10px 0 0', borderTop: `1px solid ${theme.border_secondary}` }} />

      {/* ── Conversion inputs ── */}
      <div style={{ padding: '10px 16px 4px' }}>
        <ConversionInput
          label="Hex"
          placeholder="#rrggbb"
          value={hexRaw}
          error={hexError}
          onChange={handleHexInput}
          onFocus={() => setHexFocused(true)}
          onBlur={() => { setHexFocused(false); setHexError(false); setHexRaw(currentHex); }}
        />
        <ConversionInput
          label="Any CSS color"
          placeholder="rgb(…)  hsl(…)  oklch(…)  color(…)"
          value={cssRaw}
          error={cssError}
          onChange={handleCssInput}
          onFocus={() => setCssFocused(true)}
          onBlur={() => { setCssFocused(false); if (!cssError) setCssRaw(''); }}
        />
        {cssFocused && !cssError && cssRaw && (
          <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: theme.success_default, marginTop: -6, marginBottom: 6 }}>
            ✓ converted
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: '10px 14px',
        borderTop: `1px solid ${theme.border_secondary}`,
        display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center',
      }}>
        {!canSave && (
          <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: theme.destructive_default, marginRight: 'auto' }}>
            Fix invalid values to save
          </span>
        )}
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
          disabled={!canSave}
          onClick={() => canSave && onSave(currentOklch)}
          style={{
            padding: '6px 16px',
            background: canSave ? theme.accent_default : theme.bg_tertiary,
            border: 'none', borderRadius: 6,
            cursor: canSave ? 'pointer' : 'not-allowed',
            color: canSave ? '#fff' : theme.text_tertiary,
            fontFamily: 'sans-serif', fontSize: 12, fontWeight: 600,
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          Save
        </button>
      </div>
    </div>,
    document.body
  );
}
