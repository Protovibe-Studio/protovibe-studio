import React, { useRef, useState, useEffect } from 'react';
import { theme } from '../theme';

interface InspectorInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'onMouseEnter' | 'onMouseLeave'> {
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  containerStyle?: React.CSSProperties;
  onMouseEnter?: React.MouseEventHandler<HTMLElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLElement>;
}

export const InspectorInput: React.FC<InspectorInputProps> = ({
  onFocus,
  onBlur,
  onMouseEnter,
  onMouseLeave,
  style,
  prefix,
  suffix,
  containerStyle,
  ...props
}) => {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Sync focused state with actual DOM focus to avoid stale visual state
  useEffect(() => {
    if (focused && inputRef.current && document.activeElement !== inputRef.current) {
      setFocused(false);
    }
  });

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
    setFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    if (onBlur) onBlur(e);
  };

  const valStr = String(props.value || '').trim();
  const hasValue = valStr !== '' && valStr !== '-';

  const inputStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: hasValue ? theme.accent_default : theme.text_tertiary,
    // Dynamically adjust inner padding if there are no adornments
    padding: !prefix && !suffix ? '4px 8px' : '4px 4px',
    fontSize: '11px',
    outline: 'none',
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    ...style,
  };

  return (
    <div
      onMouseEnter={(e) => {
        setHovered(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setHovered(false);
        onMouseLeave?.(e);
      }}
      style={{
        background: theme.bg_secondary,
        border: `1px solid ${focused ? theme.accent_default : hovered ? theme.border_strong : theme.border_default}`,
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        minHeight: '24px',
        overflow: 'hidden',
        transition: 'border-color 0.15s',
        width: '100%',
        boxSizing: 'border-box',
        ...containerStyle,
      }}
    >
      {prefix && (
        <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '6px', paddingRight: '2px', flexShrink: 0, color: theme.text_tertiary }}>
          {prefix}
        </div>
      )}
      <input
        ref={inputRef}
        {...props}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={inputStyle}
      />
      {suffix && (
        <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '2px', paddingRight: '6px', flexShrink: 0, color: theme.text_tertiary }}>
          {suffix}
        </div>
      )}
    </div>
  );
};