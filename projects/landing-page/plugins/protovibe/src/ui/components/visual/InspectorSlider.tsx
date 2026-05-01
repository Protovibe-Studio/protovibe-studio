// plugins/protovibe/src/ui/components/visual/InspectorSlider.tsx
import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { theme } from '../../theme';

interface InspectorSliderProps {
  label: string;
  /** Numeric value from source (0 = no class set). */
  value: number;
  /** Numeric value from DOM / inherited (0 = not inherited). */
  inheritedValue?: number;
  /** Original Tailwind class string in source — presence means source is set. */
  originalClass?: string;
  min: number;
  max: number;
  /** Called with the new numeric value on release; 0 means "remove the class". */
  onCommit: (val: number) => void;
  /** Label shown in the badge when value is 0 (unset). Defaults to "–". */
  zeroLabel?: string;
}

export const InspectorSlider: React.FC<InspectorSliderProps> = ({
  label,
  value,
  inheritedValue = 0,
  originalClass,
  min,
  max,
  onCommit,
  zeroLabel = '–',
}) => {
  const [localValue, setLocalValue] = useState(value);
  const committed = useRef(value);

  useEffect(() => {
    setLocalValue(value);
    committed.current = value;
  }, [value]);

  const isSource = !!originalClass;
  const isInherited = !isSource && inheritedValue > 0;

  const accentColor = isSource
    ? theme.accent_default
    : isInherited
    ? theme.text_default
    : theme.border_strong;

  // Slider thumb position: source value if set, else inherited, else min
  const sliderPos = isSource ? localValue : isInherited ? inheritedValue : min;
  const pct = ((sliderPos - min) / Math.max(max - min, 1)) * 100;

  // Badge text
  const badgeNum = isSource ? localValue : isInherited ? inheritedValue : 0;
  const badgeText = badgeNum === 0 ? zeroLabel : String(badgeNum);

  const handleCommit = () => {
    if (localValue !== committed.current) {
      committed.current = localValue;
      onCommit(localValue);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', lineHeight: '11px', color: theme.text_secondary }}>
          {label}
        </span>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          background: theme.bg_tertiary,
          borderRadius: '3px',
          padding: isSource ? '2px 2px 2px 6px' : '2px 6px',
        }}>
          <span style={{ fontSize: '9px', fontFamily: 'monospace', color: accentColor, minWidth: '16px', textAlign: 'center' }}>
            {badgeText}
          </span>
          {isSource && (
            <button
              onClick={() => onCommit(0)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '14px',
                height: '14px',
                borderRadius: '2px',
                border: 'none',
                background: 'transparent',
                color: theme.text_tertiary,
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = theme.text_secondary)}
              onMouseLeave={e => (e.currentTarget.style.color = theme.text_tertiary)}
            >
              <X size={9} />
            </button>
          )}
        </div>
      </div>

      {/* Track with filled portion behind the native range input */}
      <div style={{ position: 'relative', height: '16px', display: 'flex', alignItems: 'center' }}>
        {/* Custom track */}
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '3px',
          borderRadius: '2px',
          background: theme.bg_tertiary,
          pointerEvents: 'none',
        }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: accentColor,
            borderRadius: '2px',
            transition: 'width 0.05s',
          }} />
        </div>

        {/* Native range input — transparent track, accentColor thumb */}
        <input
          type="range"
          min={min}
          max={max}
          value={isSource ? localValue : isInherited ? inheritedValue : min}
          onChange={(e) => {
            if (isSource || !isInherited) setLocalValue(Number(e.target.value));
            else setLocalValue(Number(e.target.value)); // first drag from inherited → becomes source
          }}
          onMouseUp={handleCommit}
          onTouchEnd={handleCommit}
          style={{
            position: 'relative',
            width: '100%',
            margin: 0,
            cursor: 'pointer',
            accentColor,
            // make the native track transparent so our custom track shows through
            background: 'transparent',
            WebkitAppearance: 'none',
            appearance: 'none',
            height: '16px',
          } as React.CSSProperties}
        />
      </div>
    </div>
  );
};
