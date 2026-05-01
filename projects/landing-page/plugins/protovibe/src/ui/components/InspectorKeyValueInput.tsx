import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { theme } from '../theme';
import { InspectorInput } from './InspectorInput';
import { IconSearchInput } from './IconSearchInput';

export type InspectorKeyValueInputType = 'text' | 'select' | 'boolean' | 'iconSearch';

type InspectorKeyValueInputProps = {
  label: React.ReactNode;
  labelTitle?: string;
  labelColor?: string;
  value: any;
  type: InspectorKeyValueInputType;
  disabled?: boolean;
  selectOptions?: string[];
  unsetLabel?: string;
  showRemove?: boolean;
  onRemove?: () => void;
  onCommit?: (nextValue: string) => void;
  onChange?: (nextValue: string) => void;
  inputStyle?: React.CSSProperties;
};

export const InspectorKeyValueInput: React.FC<InspectorKeyValueInputProps> = ({
  label,
  labelTitle,
  labelColor,
  value,
  type,
  disabled = false,
  selectOptions = [],
  unsetLabel = 'Unset',
  showRemove = false,
  onRemove,
  onCommit,
  onChange,
  inputStyle
}) => {
  const initialTextValue = useMemo(() => {
    if (value === null || value === undefined) return '';
    return String(value);
  }, [value]);

  const [textValue, setTextValue] = useState(initialTextValue);
  const [selectHovered, setSelectHovered] = useState(false);
  const [selectFocused, setSelectFocused] = useState(false);

  useEffect(() => {
    setTextValue(initialTextValue);
  }, [initialTextValue]);

  const baseInputStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    width: '100%',
    backgroundColor: theme.bg_secondary,
    color: theme.text_default,
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    outline: 'none',
    ...inputStyle
  };

  const selectBorder = `1px solid ${selectFocused ? theme.accent_default : selectHovered ? theme.border_strong : theme.border_default}`;

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'stretch',
    gap: '4px',
    minHeight: '24px'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '10px',
    color: labelColor || theme.text_secondary,
    width: '80px',
    flexShrink: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center'
  };

  const actionSlotStyle: React.CSSProperties = {
    width: '20px',
    flexShrink: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'stretch',
    alignSelf: 'stretch'
  };

  const removeButtonStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: theme.text_tertiary,
    cursor: 'pointer',
    padding: 0,
    width: '20px',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const selectValue = value === null || value === undefined ? '' : String(value);
  const isSet = selectValue !== '';

  const commitTextValue = () => {
    if (!onCommit || disabled) return;
    if (textValue !== initialTextValue) onCommit(textValue);
  };

  let inputElement: React.ReactNode;

  if (type === 'select') {
    inputElement = (
      <select
        value={selectValue}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        onMouseEnter={() => setSelectHovered(true)}
        onMouseLeave={() => setSelectHovered(false)}
        onFocus={() => setSelectFocused(true)}
        onBlur={() => setSelectFocused(false)}
        style={{ ...baseInputStyle, border: selectBorder, color: isSet ? theme.accent_default : theme.text_tertiary, transition: 'border-color 0.15s' }}
      >
        <option value="">{unsetLabel}</option>
        {selectOptions.map((opt) => (
          <option key={opt} value={opt}>
            {String(opt)}
          </option>
        ))}
      </select>
    );
  } else if (type === 'boolean') {
    inputElement = (
      <select
        value={selectValue}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        onMouseEnter={() => setSelectHovered(true)}
        onMouseLeave={() => setSelectHovered(false)}
        onFocus={() => setSelectFocused(true)}
        onBlur={() => setSelectFocused(false)}
        style={{ ...baseInputStyle, border: selectBorder, color: isSet ? theme.accent_default : theme.text_tertiary, transition: 'border-color 0.15s' }}
      >
        <option value="">{unsetLabel}</option>
        <option value="true">True</option>
        <option value="false">False</option>
      </select>
    );
  } else if (type === 'iconSearch') {
    inputElement = (
      <IconSearchInput
        value={initialTextValue}
        onCommit={(val) => onCommit?.(val)}
      />
    );
  } else {
    inputElement = (
      <InspectorInput
        type="text"
        value={textValue}
        disabled={disabled}
        onChange={(e) => setTextValue(e.target.value)}
        onBlur={commitTextValue}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        style={baseInputStyle}
      />
    );
  }

  return (
    <div style={rowStyle}>
      <span style={labelStyle} title={labelTitle}>
        {label}
      </span>
      {inputElement}
      <div style={actionSlotStyle}>
        {showRemove && !disabled && (
          <button onClick={onRemove} style={removeButtonStyle} title="Remove Prop">
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
};