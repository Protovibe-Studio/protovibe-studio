import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
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
  onCommit: (val: string, prevVal?: string) => void;
  placeholder?: string;
  containerStyle?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  inputContainerStyle?: React.CSSProperties;
  dropdownStyle?: React.CSSProperties;
  noneLabel?: string;
  showNoneOption?: boolean;
  zIndex?: number;
  renderOption?: (option: AutocompleteOption, colorMode?: ColorMode) => React.ReactNode;
  showColorModeToggle?: boolean;
  onInputFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onInputBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onInputMouseEnter?: (e: React.MouseEvent<HTMLElement>) => void;
  onInputMouseLeave?: (e: React.MouseEvent<HTMLElement>) => void;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  strictOptions?: boolean;
}

export const AutocompleteDropdown: React.FC<AutocompleteDropdownProps> = ({
  value,
  options,
  onCommit,
  placeholder,
  containerStyle,
  inputStyle,
  inputContainerStyle,
  dropdownStyle,
  noneLabel = 'Unset',
  showNoneOption = true,
  zIndex = 9999999,
  renderOption,
  showColorModeToggle = false,
  onInputFocus,
  onInputBlur,
  onInputMouseEnter,
  onInputMouseLeave,
  prefix,
  suffix,
  strictOptions = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value === '-' ? '' : value);
  const [colorMode, setColorMode] = useState<ColorMode>('light');
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputElRef = useRef<HTMLInputElement | null>(null);
  const dropdownElRef = useRef<HTMLDivElement | null>(null);
  const pendingBlurValueRef = useRef<string | null>(null);
  const lastCommittedValueRef = useRef(value === '-' ? '' : value);
  const canUseDOM = typeof document !== 'undefined';

  const safeDropdownStyle = useMemo(() => {
    if (!dropdownStyle) return undefined;
    const disallowedKeys = new Set(['top', 'left', 'right', 'bottom', 'position', 'transform', 'maxHeight', 'minWidth', 'maxWidth']);
    const entries = Object.entries(dropdownStyle).filter(([key]) => !disallowedKeys.has(key));
    return Object.fromEntries(entries) as React.CSSProperties;
  }, [dropdownStyle]);

  useEffect(() => {
    const cleanValue = value === '-' ? '' : value;
    setLocalValue(cleanValue);
    lastCommittedValueRef.current = cleanValue;
  }, [value]);

  // Split into semantic and palette for color mode toggle processing
  const { semanticOptions, paletteOptions, hasColorGroups } = useMemo(() => {
    if (!showColorModeToggle) return { semanticOptions: [], paletteOptions: [], hasColorGroups: false };
    const semantic = options.filter(o => o.lightValue !== undefined || o.darkValue !== undefined);
    const palette = options.filter(o => o.lightValue === undefined && o.darkValue === undefined);
    return { semanticOptions: semantic, paletteOptions: palette, hasColorGroups: semantic.length > 0 };
  }, [showColorModeToggle, options]);

  // Unified list that dynamically injects Custom values at the best semantic/numeric index
  const renderableOptions = useMemo(() => {
    const baseOpts = showColorModeToggle && hasColorGroups ? [...semanticOptions, ...paletteOptions] : [...options];

    if (localValue) {
      const query = localValue.toLowerCase().trim();
      const exactMatch = baseOpts.some(o => o.val.toLowerCase() === query);

      if (!exactMatch) {
        const customOpt = { val: localValue, desc: 'Custom' };

        // 1. Try to find the exact alphabetical or string match first
        let insertIdx = baseOpts.findIndex(o => o.val.toLowerCase().startsWith(query));

        // 2. If it's a number, place it in numeric order (e.g., between 10 and 12)
        if (insertIdx === -1) {
          const num = parseFloat(query);
          if (!isNaN(num) && /^[0-9.-]+(px|rem|em|%)?$/.test(query)) {
            insertIdx = baseOpts.findIndex(o => {
              const oNum = parseFloat(o.val);
              return !isNaN(oNum) && oNum > num;
            });
          }
        }

        // 3. Fallback to includes
        if (insertIdx === -1) {
          insertIdx = baseOpts.findIndex(o => o.val.toLowerCase().includes(query));
        }

        // 4. Default to top
        if (insertIdx === -1) insertIdx = 0;

        baseOpts.splice(insertIdx, 0, customOpt);
      }
    }
    return baseOpts;
  }, [options, localValue, showColorModeToggle, hasColorGroups, semanticOptions, paletteOptions]);

  // Sync activeIndex
  useEffect(() => {
    if (!isOpen) {
      setActiveIndex(-1);
      return;
    }
    if (localValue) {
      const query = localValue.toLowerCase().trim();
      const exactIdx = renderableOptions.findIndex(o => o.val.toLowerCase() === query);
      if (exactIdx !== -1) {
        setActiveIndex(exactIdx);
      }
    } else {
      setActiveIndex(-1);
    }
  }, [localValue, isOpen, renderableOptions]);

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
    updateDeps: [renderableOptions.length, localValue, showNoneOption],
  });

  const triggerCommit = (val: string) => {
    if (val !== lastCommittedValueRef.current) {
      const prev = lastCommittedValueRef.current;
      lastCommittedValueRef.current = val;
      onCommit(val, prev);
    }
  };

  const selectValue = (val: string, blurTarget?: HTMLInputElement | null) => {
    pendingBlurValueRef.current = val;
    setLocalValue(val);
    setIsOpen(false);
    triggerCommit(val);
    setTimeout(() => (blurTarget ?? inputElRef.current)?.blur(), 0);
  };

  // Scroll to active index
  useEffect(() => {
    if (activeIndex >= 0 && dropdownElRef.current) {
      const activeEl = dropdownElRef.current.querySelector(`[data-index="${activeIndex}"]`) as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < renderableOptions.length) {
        selectValue(renderableOptions[activeIndex].val, e.currentTarget);
      } else {
        selectValue(localValue, e.currentTarget);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.currentTarget.blur();
      setIsOpen(false);
      setLocalValue(lastCommittedValueRef.current);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      const next = activeIndex === -1 ? 0 : Math.min(activeIndex + 1, renderableOptions.length - 1);
      setLocalValue(renderableOptions[next].val);
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      const prev = activeIndex === -1 ? 0 : Math.max(activeIndex - 1, 0);
      setLocalValue(renderableOptions[prev].val);
    }
  };

  const renderRow = (opt: AutocompleteOption, index: number) => {
    const isActive = index === activeIndex;
    return (
      <div
        key={opt.val + index}
        data-index={index}
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
          background: isActive ? theme.accent_default : 'transparent',
        }}
        onMouseEnter={() => setActiveIndex(index)}
        onMouseLeave={() => setActiveIndex(-1)}
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
  };

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
        }}
        onKeyDown={handleKeyDown}
        onFocus={(e) => {
          inputElRef.current = e.currentTarget;
          setIsOpen(true);
          onInputFocus?.(e);
        }}
        onBlur={(e) => {
          let commitValue = pendingBlurValueRef.current ?? localValue;
          pendingBlurValueRef.current = null;
          if (strictOptions && commitValue && !options.some(o => o.val === commitValue)) {
            commitValue = lastCommittedValueRef.current;
            setLocalValue(commitValue);
          }
          setTimeout(() => setIsOpen(false), 200);
          triggerCommit(commitValue);
          onInputBlur?.(e);
        }}
        onMouseEnter={(e) => onInputMouseEnter?.(e)}
        onMouseLeave={(e) => onInputMouseLeave?.(e)}
        placeholder={placeholder}
        style={inputStyle}
        containerStyle={inputContainerStyle}
        prefix={currentSwatchColor
          ? <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: currentSwatchColor, border: `1px solid rgba(255,255,255,0.15)`, flexShrink: 0 }} />
          : prefix}
        suffix={suffix}
      />

      {isOpen && canUseDOM && renderableOptions.length > 0 && createPortal(
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

          {strictOptions && localValue && !options.some(o => o.val === localValue) && (
            <div
              style={{
                padding: '5px 10px',
                fontSize: '10px',
                color: theme.warning_primary,
                borderBottom: `1px solid ${theme.border_secondary}`,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'sans-serif',
              }}
            >
              ⚠ Invalid value — will be discarded
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
                borderBottom: `1px solid ${theme.border_secondary}`,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <X size={10} strokeWidth={2.5} />
              {noneLabel}
            </div>
          )}

          {(() => {
            let currentGroup = '';

            return renderableOptions.map((opt, i) => {
              let group = '';
              if (showColorModeToggle && hasColorGroups) {
                const isSemantic = semanticOptions.some(so => so.val === opt.val) || opt.lightValue !== undefined || opt.darkValue !== undefined;
                const isPalette = paletteOptions.some(po => po.val === opt.val) || (!isSemantic && opt.desc !== 'Custom');

                if (isSemantic) group = 'Semantic';
                else if (isPalette) group = 'Palette';
                else group = currentGroup || 'Semantic'; // Custom inherits surrounding group
              }

              const showHeader = group && group !== currentGroup;
              if (showHeader) currentGroup = group;

              return (
                <React.Fragment key={opt.val + i}>
                  {showHeader && (
                    <div
                      style={{
                        padding: '4px 10px 2px',
                        fontSize: '9px',
                        fontFamily: 'sans-serif',
                        color: theme.text_tertiary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        background: theme.bg_secondary,
                        borderTop: i > 0 ? `1px solid ${theme.border_default}` : 'none',
                        borderBottom: `1px solid ${theme.border_secondary}`,
                      }}
                    >
                      {group}
                    </div>
                  )}
                  {renderRow(opt, i)}
                </React.Fragment>
              );
            });
          })()}
        </div>,
        document.body
      )}
    </div>
  );
};