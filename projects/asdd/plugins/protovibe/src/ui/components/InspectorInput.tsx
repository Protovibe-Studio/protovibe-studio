import React from 'react';
import { theme } from '../theme';

export const InspectorInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ onFocus, style, ...props }) => {
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Automatically highlight all text when focused
    e.target.select();

    // Bubble up any custom onFocus logic passed from parents
    if (onFocus) onFocus(e);
  };

  const valStr = String(props.value || '').trim();
  const hasValue = valStr !== '' && valStr !== '-';

  const defaultStyle: React.CSSProperties = {
    background: theme.bg_secondary,
    border: `1px solid ${theme.border_default}`,
    color: hasValue ? theme.accent_default : theme.text_tertiary,
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    outline: 'none',
    width: '100%',
    transition: 'all 0.2s',
    ...style
  };

  return <input {...props} onFocus={handleFocus} style={defaultStyle} />;
};