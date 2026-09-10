import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { theme } from '../theme';

type InspectorFieldElement = HTMLInputElement | HTMLTextAreaElement;

interface InspectorInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'onMouseEnter' | 'onMouseLeave'> {
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  containerStyle?: React.CSSProperties;
  onMouseEnter?: React.MouseEventHandler<HTMLElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLElement>;
  /**
   * Render the field as a textarea that starts at the normal single-line height
   * and grows to fit its content, so long values (e.g. a paragraph passed to a
   * text prop) stay fully visible while editing instead of scrolling sideways.
   * It still behaves like a single-line field: Enter commits and newlines never
   * make it into the value.
   */
  autoGrow?: boolean;
}

export const InspectorInput: React.FC<InspectorInputProps> = ({
  onFocus,
  onBlur,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  onMouseUp,
  onKeyDown,
  onChange,
  style,
  prefix,
  suffix,
  containerStyle,
  autoGrow = false,
  type,
  ...props
}) => {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef<InspectorFieldElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const shouldSelectOnMouseUpRef = useRef(false);

  // Sync focused state with actual DOM focus to avoid stale visual state
  useEffect(() => {
    if (focused && inputRef.current && document.activeElement !== inputRef.current) {
      setFocused(false);
    }
  });

  const resizeToContent = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  // Re-measure whenever the value changes, including on mount so an already
  // long value opens at full height.
  useLayoutEffect(() => {
    if (autoGrow) resizeToContent();
  }, [autoGrow, props.value, resizeToContent]);

  // Width changes re-wrap the text, which changes how tall it needs to be. The
  // inspector collapses to 0px while closed, so without this the field would
  // keep the height it measured at that width.
  useEffect(() => {
    const el = containerRef.current;
    if (!autoGrow || !el || typeof ResizeObserver === 'undefined') return;
    let lastWidth = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === lastWidth) return;
      lastWidth = el.clientWidth;
      resizeToContent();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [autoGrow, resizeToContent]);

  const handleFocus = (e: React.FocusEvent<InspectorFieldElement>) => {
    e.target.select();
    setFocused(true);
    if (onFocus) onFocus(e as React.FocusEvent<HTMLInputElement>);
  };

  const handleBlur = (e: React.FocusEvent<InspectorFieldElement>) => {
    setFocused(false);
    shouldSelectOnMouseUpRef.current = false;
    if (onBlur) onBlur(e as React.FocusEvent<HTMLInputElement>);
  };

  const handleMouseDown = (e: React.MouseEvent<InspectorFieldElement>) => {
    shouldSelectOnMouseUpRef.current = document.activeElement !== e.currentTarget;
    onMouseDown?.(e as React.MouseEvent<HTMLInputElement>);
  };

  const handleMouseUp = (e: React.MouseEvent<InspectorFieldElement>) => {
    if (shouldSelectOnMouseUpRef.current) {
      e.currentTarget.select();
      shouldSelectOnMouseUpRef.current = false;
    }
    onMouseUp?.(e as React.MouseEvent<HTMLInputElement>);
  };

  const handleKeyDown = (e: React.KeyboardEvent<InspectorFieldElement>) => {
    // A textarea would insert a newline; keep Enter meaning "commit", exactly as
    // it does for the plain input this replaces.
    if (autoGrow && e.key === 'Enter') e.preventDefault();
    onKeyDown?.(e as React.KeyboardEvent<HTMLInputElement>);
  };

  const handleChange = (e: React.ChangeEvent<InspectorFieldElement>) => {
    // Pasting multi-line text into an input drops the newlines; do the same here
    // so the value stays a single line and only wraps visually.
    if (autoGrow && e.target.value.includes('\n')) {
      e.target.value = e.target.value.replace(/\r?\n/g, ' ');
    }
    onChange?.(e as React.ChangeEvent<HTMLInputElement>);
    // Controlled fields also re-measure from the effect below; this keeps an
    // uncontrolled one growing as it is typed into.
    if (autoGrow) resizeToContent();
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

  // One 16px line plus 6px of vertical padding fills the container's 22px inner
  // height exactly, so a single-line field keeps the same 24px row as the input
  // it replaces and only the wrapped lines add height.
  const autoGrowStyle: React.CSSProperties = {
    display: 'block',
    resize: 'none',
    overflow: 'hidden',
    fontFamily: 'inherit',
    lineHeight: '16px',
    paddingTop: '3px',
    paddingBottom: '3px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  };

  const sharedProps = {
    ...props,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onMouseDown: handleMouseDown,
    onMouseUp: handleMouseUp,
    onKeyDown: handleKeyDown,
    onChange: handleChange,
  };

  return (
    <div
      ref={containerRef}
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
      {autoGrow ? (
        <textarea
          ref={(el) => { inputRef.current = el; }}
          {...(sharedProps as unknown as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          rows={1}
          style={{ ...inputStyle, ...autoGrowStyle }}
        />
      ) : (
        <input
          ref={(el) => { inputRef.current = el; }}
          type={type}
          {...sharedProps}
          style={inputStyle}
        />
      )}
      {suffix && (
        <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '2px', paddingRight: '6px', flexShrink: 0, color: theme.text_tertiary }}>
          {suffix}
        </div>
      )}
    </div>
  );
};
