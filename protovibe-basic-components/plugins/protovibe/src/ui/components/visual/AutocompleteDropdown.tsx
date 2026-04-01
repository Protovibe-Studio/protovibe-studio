import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { InspectorInput } from '../InspectorInput';
import { theme } from '../../theme';
import { useFloatingDropdownPosition } from '../../hooks/useFloatingDropdownPosition';

export interface AutocompleteOption {
  val: string;
  desc?: string;
  lightValue?: string;
  darkValue?: string;
  [key: string]: unknown;
}

export type ColorMode = 'light' | 'dark';

interface AutocompleteDropdownProps {
  value: string;
  options: AutocompleteOption[];
  onCommit: (val: string) => void;
  placeholder?: string;
  containerStyle?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  dropdownStyle?: React.CSSProperties;
  noneLabel?: string;
  showNoneOption?: boolean;
  zIndex?: number;
  filterOptions?: (options: AutocompleteOption[], query: string, hasTyped: boolean) => AutocompleteOption[];
  /** Called with (option, colorMode) when showColorModeToggle is true, otherwise (option) */
  renderOption?: (option: AutocompleteOption, colorMode?: ColorMode) => React.ReactNode;
  showColorModeToggle?: boolean;
  onInputFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onInputBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onInputMouseEnter?: (e: React.MouseEvent<HTMLInputElement>) => void;
  onInputMouseLeave?: (e: React.MouseEvent<HTMLInputElement>) => void;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const AutocompleteDropdown: React.FC<AutocompleteDropdownProps> = ({
  value,
  options,
  onCommit,
  placeholder,
  containerStyle,
  inputStyle,
  dropdownStyle,
  noneLabel = 'None',
  showNoneOption = true,
  zIndex = 9999999,
  filterOptions,
  renderOption,
  showColorModeToggle = false,
  onInputFocus,
  onInputBlur,
  onInputMouseEnter,
  onInputMouseLeave,
  prefix,
  suffix,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value === '-' ? '' : value);
  const [hasTyped, setHasTyped] = useState(false);
  const [colorMode, setColorMode] = useState<ColorMode>('light');

  const inputElRef = useRef<HTMLInputElement | null>(null);
  const dropdownElRef = useRef<HTMLDivElement | null>(null);
  const pendingBlurValueRef = useRef<string | null>(null);
  const lastCommittedValueRef = useRef(value === '-' ? '' : value);
  const canUseDOM = typeof document !== 'undefined';

  const safeDropdownStyle = useMemo(() => {
    if (!dropdownStyle) return undefined;

    const disallowedKeys = new Set([
      'top',
      'left',
      'right',
      'bottom',
      'position',
      'transform',
      'maxHeight',
      'minWidth',
      'maxWidth',
    ]);

    const entries = Object.entries(dropdownStyle).filter(([key]) => !disallowedKeys.has(key));
    return Object.fromEntries(entries) as React.CSSProperties;
  }, [dropdownStyle]);

  useEffect(() => {
    const cleanValue = value === '-' ? '' : value;
    setLocalValue(cleanValue);
    lastCommittedValueRef.current = cleanValue;
  }, [value]);

  const filteredOptions = useMemo(() => {
    const query = localValue.toLowerCase().trim();

    if (filterOptions) {
      return filterOptions(options, query, hasTyped);
    }

    if (!hasTyped) return options;
    return options.filter((opt) => opt.val.toLowerCase().startsWith(query));
  }, [filterOptions, hasTyped, localValue, options]);

  // Split into semantic (has lightValue/darkValue) and palette for color mode toggle
  const { semanticOptions, paletteOptions, hasColorGroups } = useMemo(() => {
    if (!showColorModeToggle) return { semanticOptions: [], paletteOptions: [], hasColorGroups: false };
    const semantic = filteredOptions.filter(o => o.lightValue !== undefined || o.darkValue !== undefined);
    const palette = filteredOptions.filter(o => o.lightValue === undefined && o.darkValue === undefined);
    return { semanticOptions: semantic, paletteOptions: palette, hasColorGroups: semantic.length > 0 };
  }, [showColorModeToggle, filteredOptions]);

  // Resolve swatch for the currently committed value (uses full options list, not filtered)
  const currentSwatchColor = useMemo(() => {
    if (!showColorModeToggle) return undefined;
    const match = options.find(o => o.val === localValue);
    if (!match) return undefined;
    if (colorMode === 'light' && match.lightValue) return match.lightValue as string;
    if (colorMode === 'dark' && match.darkValue) return match.darkValue as string;
    if (match.lightValue) return match.lightValue as string;
    if ((match as any).hex) return (match as any).hex as string;
    return undefined;
  }, [showColorModeToggle, options, localValue, colorMode]);

  const { style: floatingStyle } = useFloatingDropdownPosition({
    isOpen,
    anchorRef: inputElRef,
    dropdownRef: dropdownElRef,
    preferredPlacement: 'bottom',
    updateDeps: [filteredOptions.length, localValue, showNoneOption],
  });

  const triggerCommit = (val: string) => {
    if (val !== lastCommittedValueRef.current) {
      lastCommittedValueRef.current = val;
      onCommit(val);
    }
  };

  const selectValue = (val: string, blurTarget?: HTMLInputElement | null) => {
    pendingBlurValueRef.current = val;
    setLocalValue(val);
    setIsOpen(false);
    setTimeout(() => (blurTarget ?? inputElRef.current)?.blur(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const top = filteredOptions[0];
      const val = localValue && top ? top.val : localValue;
      selectValue(val, e.currentTarget);
      return;
    }

    if (e.key === 'Escape') {
      e.currentTarget.blur();
      setIsOpen(false);
      setLocalValue(lastCommittedValueRef.current);
    }
  };

  const renderRow = (opt: AutocompleteOption) => (
    <div
      key={opt.val}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => selectValue(opt.val)}
      style={{
        padding: '6px 10px',
        fontSize: '11px',
        color: theme.text_default,
        cursor: 'pointer',
        fontFamily: 'monospace',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: `1px solid ${theme.border_secondary}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = theme.accent_default;
        e.currentTarget.style.color = theme.text_default;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = theme.text_default;
      }}
    >
      {renderOption ? (
        renderOption(opt, showColorModeToggle ? colorMode : undefined)
      ) : (
        <>
          <span style={{ fontWeight: 'bold' }}>{String(opt.val)}</span>
          <span style={{ color: theme.text_tertiary, fontSize: '9px', marginLeft: '12px' }}>{String(opt.desc ?? '')}</span>
        </>
      )}
    </div>
  );

  const modeBtnStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '4px 6px',
    background: isActive ? theme.bg_tertiary : 'transparent',
    border: 'none',
    color: isActive ? theme.text_default : theme.text_tertiary,
    fontSize: '10px',
    fontFamily: 'sans-serif',
    cursor: 'pointer',
  });

  return (
    <div style={{ position: 'relative', ...containerStyle }}>
      <InspectorInput
        type="text"
        value={localValue}
        onChange={(e) => {
          setLocalValue(e.target.value);
          setHasTyped(true);
        }}
        onKeyDown={handleKeyDown}
        onFocus={(e) => {
          inputElRef.current = e.currentTarget;
          setHasTyped(false);
          setIsOpen(true);
          onInputFocus?.(e);
        }}
        onBlur={(e) => {
          const commitValue = pendingBlurValueRef.current ?? localValue;
          pendingBlurValueRef.current = null;
          setTimeout(() => setIsOpen(false), 200);
          triggerCommit(commitValue);
          onInputBlur?.(e);
        }}
        onMouseEnter={(e) => onInputMouseEnter?.(e)}
        onMouseLeave={(e) => onInputMouseLeave?.(e)}
        placeholder={placeholder}
        style={inputStyle}
        prefix={currentSwatchColor
          ? <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: currentSwatchColor, border: `1px solid rgba(255,255,255,0.15)`, flexShrink: 0 }} />
          : prefix}
        suffix={suffix}
      />

      {isOpen && canUseDOM && createPortal(
        <div
          ref={dropdownElRef}
          data-pv-overlay="true"
          data-pv-ui="true"
          style={{
            width: 'max-content',
            overflowY: 'auto',
            background: theme.bg_secondary,
            border: `1px solid ${theme.border_default}`,
            borderRadius: '6px',
            zIndex,
            boxShadow: '0 8px 16px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            ...floatingStyle,
            ...safeDropdownStyle,
          }}
        >
          {/* Light / Dark mode toggle — shown only when color groups are present */}
          {showColorModeToggle && hasColorGroups && (
            <div
              onMouseDown={(e) => e.preventDefault()}
              style={{
                display: 'flex',
                background: theme.bg_strong,
                borderBottom: `1px solid ${theme.border_default}`,
                flexShrink: 0,
              }}
            >
              {(['light', 'dark'] as ColorMode[]).map((mode, idx) => (
                <React.Fragment key={mode}>
                  {idx > 0 && <div style={{ width: '1px', background: theme.border_default }} />}
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setColorMode(mode)}
                    style={modeBtnStyle(colorMode === mode)}
                  >
                    {mode === 'light' ? '☀ Light' : '🌙 Dark'}
                  </button>
                </React.Fragment>
              ))}
            </div>
          )}

          {showNoneOption && (
            <div
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectValue('')}
              style={{
                padding: '6px 10px',
                fontSize: '11px',
                color: theme.text_tertiary,
                cursor: 'pointer',
                fontStyle: 'italic',
                borderBottom: `1px solid ${theme.border_secondary}`,
              }}
            >
              {noneLabel}
            </div>
          )}

          {showColorModeToggle && hasColorGroups ? (
            <>
              {/* Semantic color tokens */}
              {semanticOptions.length > 0 && (
                <>
                  <div
                    style={{
                      padding: '4px 10px 2px',
                      fontSize: '9px',
                      fontFamily: 'sans-serif',
                      color: theme.text_tertiary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      background: theme.bg_secondary,
                      borderBottom: `1px solid ${theme.border_secondary}`,
                    }}
                  >
                    Semantic
                  </div>
                  {semanticOptions.map(renderRow)}
                </>
              )}

              {/* Palette / static color tokens */}
              {paletteOptions.length > 0 && (
                <>
                  <div
                    style={{
                      padding: '4px 10px 2px',
                      fontSize: '9px',
                      fontFamily: 'sans-serif',
                      color: theme.text_tertiary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      background: theme.bg_secondary,
                      borderTop: `1px solid ${theme.border_default}`,
                      borderBottom: `1px solid ${theme.border_secondary}`,
                    }}
                  >
                    Palette
                  </div>
                  {paletteOptions.map(renderRow)}
                </>
              )}
            </>
          ) : (
            filteredOptions.map(renderRow)
          )}
        </div>,
        document.body
      )}
    </div>
  );
};
