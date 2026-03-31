import React, { useState } from 'react';
import { theme } from '../theme';

interface InspectorInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  containerStyle?: React.CSSProperties;
}

export const InspectorInput: React.FC<InspectorInputProps> = ({ onFocus, onBlur, style, prefix, suffix, containerStyle, ...props }) => {
  const [focused, setFocused] = useState(false);

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

  if (!prefix && !suffix) {
    const defaultStyle: React.CSSProperties = {
      background: theme.bg_secondary,
      border: `1px solid ${focused ? theme.accent_default : theme.border_default}`,
      color: hasValue ? theme.accent_default : theme.text_tertiary,
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      outline: 'none',
      width: '100%',
      boxSizing: 'border-box',
      transition: 'border-color 0.15s',
      ...style
    };
    return <input {...props} onFocus={handleFocus} onBlur={handleBlur} style={defaultStyle} />;
  }

  const inputStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: hasValue ? theme.accent_default : theme.text_tertiary,
    padding: '4px 4px',
    fontSize: '11px',
    outline: 'none',
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    ...style,
  };

  return (
    <div
      style={{
        background: theme.bg_secondary,
        border: `1px solid ${focused ? theme.accent_default : theme.border_default}`,
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        transition: 'border-color 0.15s',
        ...containerStyle,
      }}
    >
      {prefix && (
        <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '6px', paddingRight: '2px', flexShrink: 0, color: theme.text_tertiary }}>
          {prefix}
        </div>
      )}
      <input {...props} onFocus={handleFocus} onBlur={handleBlur} style={inputStyle} />
      {suffix && (
        <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '2px', paddingRight: '6px', flexShrink: 0, color: theme.text_tertiary }}>
          {suffix}
        </div>
      )}
    </div>
  );
};