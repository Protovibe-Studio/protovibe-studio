// plugins/protovibe/src/ui/components/visual/Layout.tsx
import React, { useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MoveRight, ChevronDown, ChevronUp, MoreHorizontal, Check } from 'lucide-react';
import { useProtovibe } from '../../context/ProtovibeContext';
import { takeSnapshot, updateSource } from '../../api/client';
import { buildContextPrefix, cleanVal } from '../../utils/tailwind';
import { VisualSection } from './VisualSection';
import { VisualControl } from './VisualControl';
import { useFloatingDropdownPosition } from '../../hooks/useFloatingDropdownPosition';
import { theme } from '../../theme';

// ─── Icon color constants ──────────────────────────────────────────────────────

const ITEM_1 = theme.accent_default;
const ITEM_2 = '#5b7cf8';
const ICON_BG = theme.bg_tertiary;
const ICON_BORDER = theme.border_default;
const ICON_BORDER_HI = theme.text_secondary;

// ─── FlexIcon ──────────────────────────────────────────────────────────────────

interface FlexIconProps {
  prop: string;
  value: string;
  direction: string;
  alignItems?: string;
  justifyContent?: string;
}

const FlexIcon: React.FC<FlexIconProps> = ({ prop, value, direction, alignItems, justifyContent }) => {
  const isCol = direction.includes('col');

  // Strip prefix so 'items-start' → 'start', 'justify-between' → 'between', 'flex-row' → 'row'
  const suffix = value.replace(/^items-/, '').replace(/^justify-/, '').replace(/^flex-/, '');

  const isXAxis = (prop === 'justify' && !isCol) || (prop === 'align' && isCol);
  const isYAxis = (prop === 'justify' && isCol) || (prop === 'align' && !isCol);
  const isReverseX = prop === 'justify' && direction === 'flex-row-reverse';
  const isReverseY = prop === 'justify' && direction === 'flex-col-reverse';

  let hiTop = false, hiRight = false, hiBottom = false, hiLeft = false, hiCH = false, hiCV = false;
  if (isXAxis) {
    if (suffix === 'start') { if (isReverseX) hiRight = true; else hiLeft = true; }
    if (suffix === 'end') { if (isReverseX) hiLeft = true; else hiRight = true; }
    if (suffix === 'center') hiCV = true;
    if (['between', 'around', 'evenly', 'stretch'].includes(suffix)) { hiLeft = true; hiRight = true; }
  }
  if (isYAxis) {
    if (suffix === 'start') { if (isReverseY) hiBottom = true; else hiTop = true; }
    if (suffix === 'end') { if (isReverseY) hiTop = true; else hiBottom = true; }
    if (suffix === 'center') hiCH = true;
    if (['between', 'around', 'evenly', 'stretch'].includes(suffix)) { hiTop = true; hiBottom = true; }
  }

  if (prop === 'direction') {
    const flexDirMap: Record<string, React.CSSProperties['flexDirection']> = {
      'flex-row': 'row', 'flex-col': 'column', 'flex-row-reverse': 'row-reverse', 'flex-col-reverse': 'column-reverse',
    };
    const rotMap: Record<string, string> = {
      'flex-row': 'rotate(0deg)', 'flex-col': 'rotate(90deg)', 'flex-row-reverse': 'rotate(180deg)', 'flex-col-reverse': 'rotate(-90deg)',
    };
    return (
      <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: flexDirMap[value] || 'row', gap: '3px', position: 'relative', backgroundColor: ICON_BG, border: `1px solid ${ICON_BORDER}`, borderRadius: '3px' }}>
        <div style={{ width: '11px', height: '7px', backgroundColor: ITEM_1, borderRadius: '1px', zIndex: 1 }} />
        <div style={{ width: '9px', height: '5px', backgroundColor: ITEM_2, borderRadius: '1px', zIndex: 1 }} />
        <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.text_tertiary, opacity: 0.45, transform: rotMap[value] || 'rotate(0deg)' }}>
          <MoveRight size={10} />
        </div>
      </div>
    );
  }

  const flexDirMap2: Record<string, React.CSSProperties['flexDirection']> = {
    'flex-row': 'row', 'flex-col': 'column', 'flex-row-reverse': 'row-reverse', 'flex-col-reverse': 'column-reverse',
  };
  const justifyMap: Record<string, string> = {
    'justify-start': 'flex-start', 'justify-end': 'flex-end', 'justify-center': 'center',
    'justify-between': 'space-between', 'justify-around': 'space-around', 'justify-evenly': 'space-evenly',
  };
  const alignMap: Record<string, string> = {
    'items-start': 'flex-start', 'items-end': 'flex-end', 'items-center': 'center',
    'items-stretch': 'stretch', 'items-baseline': 'baseline',
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    width: '100%',
    height: '100%',
    padding: '2px',
    gap: '2px',
    backgroundColor: ICON_BG,
    borderStyle: 'solid',
    borderWidth: '1px',
    borderTopColor: hiTop ? ICON_BORDER_HI : ICON_BORDER,
    borderRightColor: hiRight ? ICON_BORDER_HI : ICON_BORDER,
    borderBottomColor: hiBottom ? ICON_BORDER_HI : ICON_BORDER,
    borderLeftColor: hiLeft ? ICON_BORDER_HI : ICON_BORDER,
    borderRadius: '3px',
    flexDirection: flexDirMap2[direction] || 'row',
    position: 'relative',
    overflow: 'hidden',
  };

  if (alignItems) containerStyle.alignItems = alignMap[alignItems] || 'stretch';
  if (justifyContent) containerStyle.justifyContent = justifyMap[justifyContent] || 'flex-start';

  if (prop === 'justify') containerStyle.justifyContent = justifyMap[value] || 'flex-start';
  if (prop === 'align') containerStyle.alignItems = alignMap[value] || 'stretch';
  if (prop === 'wrap') {
    containerStyle.flexWrap = value === 'flex-wrap' ? 'wrap' : value === 'flex-wrap-reverse' ? 'wrap-reverse' : 'nowrap';
    if (value !== 'flex-nowrap') containerStyle.alignContent = 'flex-start';
  }

  const isStretch = (prop === 'align' && value === 'items-stretch') || alignItems === 'items-stretch';
  const itemCount = prop === 'wrap' ? 3 : 2;

  const getItemStyle = (i: number): React.CSSProperties => {
    const dims = [[11, 7], [9, 5], [12, 12]][i];
    const s: React.CSSProperties = {
      backgroundColor: i === 0 ? ITEM_1 : i === 1 ? ITEM_2 : 'transparent',
      borderRadius: '1px',
      zIndex: 1,
      flexShrink: 0,
      width: dims[0] + 'px',
      height: dims[1] + 'px',
    };
    if (i === 2) { s.border = `1px dashed ${ITEM_1}`; s.backgroundColor = theme.bg_default; }
    if (isStretch) {
      if (isCol) { s.minWidth = s.width; s.width = undefined; s.alignSelf = 'stretch'; }
      else { s.minHeight = s.height; s.height = undefined; s.alignSelf = 'stretch'; }
    }
    return s;
  };

  return (
    <div style={containerStyle}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <line x1="0" y1="50%" x2="100%" y2="50%" stroke={hiCH ? ICON_BORDER_HI : 'rgba(255,255,255,0.05)'} strokeWidth="1" />
        <line x1="50%" y1="0" x2="50%" y2="100%" stroke={hiCV ? ICON_BORDER_HI : 'rgba(255,255,255,0.05)'} strokeWidth="1" />
      </svg>
      {Array.from({ length: itemCount }).map((_, i) => <div key={i} style={getItemStyle(i)} />)}
    </div>
  );
};

// ─── GridIcon ──────────────────────────────────────────────────────────────────

interface GridIconProps {
  prop: string;
  value: string;
}

const GridIcon: React.FC<GridIconProps> = ({ prop, value }) => {
  const suffix = value.replace(/^items-/, '').replace(/^justify-/, '');

  const isXAxis = prop === 'justify';
  const isYAxis = prop === 'align';

  let hiTop = false, hiRight = false, hiBottom = false, hiLeft = false, hiCH = false, hiCV = false;
  if (isXAxis) {
    if (suffix === 'start') hiLeft = true;
    if (suffix === 'end') hiRight = true;
    if (suffix === 'center') hiCV = true;
    if (['between', 'around', 'evenly', 'stretch'].includes(suffix)) { hiLeft = true; hiRight = true; }
  }
  if (isYAxis) {
    if (suffix === 'start') hiTop = true;
    if (suffix === 'end') hiBottom = true;
    if (suffix === 'center') hiCH = true;
    if (['between', 'around', 'evenly', 'stretch'].includes(suffix)) { hiTop = true; hiBottom = true; }
  }

  const alignMap: Record<string, string> = { 'items-start': 'start', 'items-end': 'end', 'items-center': 'center', 'items-stretch': 'stretch' };

  const containerStyle: React.CSSProperties = {
    display: 'grid',
    width: '100%',
    height: '100%',
    padding: '2px',
    gap: '2px',
    backgroundColor: ICON_BG,
    borderStyle: 'solid',
    borderWidth: '1px',
    borderTopColor: hiTop ? ICON_BORDER_HI : ICON_BORDER,
    borderRightColor: hiRight ? ICON_BORDER_HI : ICON_BORDER,
    borderBottomColor: hiBottom ? ICON_BORDER_HI : ICON_BORDER,
    borderLeftColor: hiLeft ? ICON_BORDER_HI : ICON_BORDER,
    borderRadius: '3px',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gridTemplateRows: 'repeat(2, 1fr)',
    position: 'relative',
    overflow: 'hidden',
  };

  if (prop === 'align') containerStyle.alignItems = alignMap[value] || 'stretch';

  const getItemStyle = (i: number): React.CSSProperties => {
    const s: React.CSSProperties = {
      backgroundColor: [ITEM_1, ITEM_2, theme.success_default][i % 3],
      borderRadius: '1px',
      zIndex: 1,
    };
    if (prop === 'align' && suffix !== 'stretch') s.height = [7, 5, 4][i] + 'px';
    return s;
  };

  return (
    <div style={containerStyle}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <line x1="0" y1="50%" x2="100%" y2="50%" stroke={hiCH ? ICON_BORDER_HI : 'rgba(255,255,255,0.05)'} strokeWidth="1" />
        <line x1="50%" y1="0" x2="50%" y2="100%" stroke={hiCV ? ICON_BORDER_HI : 'rgba(255,255,255,0.05)'} strokeWidth="1" />
      </svg>
      {Array.from({ length: 3 }).map((_, i) => <div key={i} style={getItemStyle(i)} />)}
    </div>
  );
};

// ─── OptionGroup ───────────────────────────────────────────────────────────────

interface OptionItem { value: string; label: string; }

interface OptionGroupProps {
  label: string;
  options: OptionItem[];
  activeValue: string;
  onSelect: (val: string) => void;
  renderIcon: (val: string) => React.ReactNode;
  cols?: number;
}

const OptionGroup: React.FC<OptionGroupProps> = ({ label, options, activeValue, onSelect, renderIcon, cols = 3 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <span style={{ fontSize: '9px', color: theme.text_tertiary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '4px' }}>
      {options.map(opt => {
        const isActive = activeValue === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onSelect(isActive ? '' : opt.value)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '6px 4px',
              borderRadius: '4px',
              border: `1px solid ${isActive ? theme.accent_default : theme.border_default}`,
              background: isActive ? theme.accent_low : 'transparent',
              color: isActive ? theme.accent_default : theme.text_secondary,
              fontSize: '9px',
              cursor: 'pointer',
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            <div style={{ width: '28px', height: '28px' }}>
              {renderIcon(opt.value)}
            </div>
            {opt.label}
          </button>
        );
      })}
    </div>
  </div>
);

// ─── Option constants ─────────────────────────────────────────────────────────

const FLEX_DIRECTION_SIMPLE: OptionItem[] = [
  { value: 'flex-row', label: 'Row →' },
  { value: 'flex-col', label: 'Col ↓' },
];
const FLEX_DIRECTION_ADVANCED: OptionItem[] = [
  { value: 'flex-row', label: 'Row →' },
  { value: 'flex-col', label: 'Col ↓' },
  { value: 'flex-row-reverse', label: 'Row ←' },
  { value: 'flex-col-reverse', label: 'Col ↑' },
];
const FLEX_ALIGN_SIMPLE: OptionItem[] = [
  { value: 'items-stretch', label: 'Stretch' },
  { value: 'items-start', label: 'Start' },
  { value: 'items-center', label: 'Center' },
  { value: 'items-end', label: 'End' },
];
const FLEX_ALIGN_ADVANCED: OptionItem[] = [
  ...FLEX_ALIGN_SIMPLE,
  { value: 'items-baseline', label: 'Baseline' },
];
const FLEX_JUSTIFY_SIMPLE: OptionItem[] = [
  { value: 'justify-start', label: 'Start' },
  { value: 'justify-center', label: 'Center' },
  { value: 'justify-end', label: 'End' },
  { value: 'justify-between', label: 'Between' },
];
const FLEX_JUSTIFY_ADVANCED: OptionItem[] = [
  ...FLEX_JUSTIFY_SIMPLE,
  { value: 'justify-around', label: 'Around' },
  { value: 'justify-evenly', label: 'Evenly' },
];
const GRID_ALIGN_OPTIONS: OptionItem[] = [
  { value: 'items-stretch', label: 'Stretch' },
  { value: 'items-start', label: 'Start' },
  { value: 'items-center', label: 'Center' },
  { value: 'items-end', label: 'End' },
];

// ─── Layout ────────────────────────────────────────────────────────────────────

export const Layout: React.FC<{ v: any; domV?: any }> = ({ v, domV }) => {
  const { activeData, activeSourceId, activeModifiers, runLockedMutation } = useProtovibe();
  const [isOpen, setIsOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);

  const { style: popoverStyle } = useFloatingDropdownPosition({
    isOpen,
    anchorRef: triggerRef,
    dropdownRef: popoverRef,
    preferredPlacement: 'bottom',
    updateDeps: [v.display, showAdvanced],
  });

  const { style: moreStyle } = useFloatingDropdownPosition({
    isOpen: isMoreOpen,
    anchorRef: moreRef,
    dropdownRef: moreDropdownRef,
    preferredPlacement: 'bottom',
  });

  const handleSetClass = useCallback(async (originalClass: string | undefined, newVal: string) => {
    if (!activeData?.file) return;
    const ctxPrefix = buildContextPrefix(activeModifiers);
    const newClass = newVal ? `${ctxPrefix}${newVal}` : '';
    if (originalClass === newClass) return;

    await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId!);
      let action: 'add' | 'edit' | 'remove' = 'edit';
      if (!originalClass && newClass) action = 'add';
      if (originalClass && !newClass) action = 'remove';
      await updateSource({ ...activeData, id: activeSourceId!, oldClass: originalClass || '', newClass, action });
    });
  }, [activeData, activeSourceId, activeModifiers, runLockedMutation]);

  const display = v.display || domV?.display || '';
  const direction = v.direction || domV?.direction || 'flex-row';
  const align = v.align || domV?.align || '';
  const justify = v.justify || domV?.justify || '';
  const isFlexLike = display === 'flex' || display === 'inline-flex';
  const isGrid = display === 'grid' || display === 'inline-grid';
  const isCol = direction.includes('col');

  const displayLabel: Record<string, string> = {
    flex: 'Flexbox', 'inline-flex': 'Inline Flex',
    grid: 'Grid', 'inline-grid': 'Inline Grid',
    block: 'Block', hidden: 'None',
  };

  const renderTriggerIcon = () => {
    if (isFlexLike) {
      return <FlexIcon prop="justify" value={justify || 'justify-start'} direction={direction} alignItems={align || 'items-stretch'} />;
    }
    if (isGrid) {
      return <GridIcon prop="align" value={align || 'items-stretch'} />;
    }
    if (display === 'hidden') {
      return (
        <div style={{ width: '100%', height: '100%', backgroundColor: ICON_BG, border: `1px dashed ${ICON_BORDER}`, borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '14px', height: '2px', backgroundColor: theme.text_tertiary, transform: 'rotate(45deg)' }} />
        </div>
      );
    }
    // block / default
    return (
      <div style={{ width: '100%', height: '100%', padding: '3px', backgroundColor: ICON_BG, border: `1px solid ${ICON_BORDER}`, borderRadius: '3px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ width: '100%', height: '8px', backgroundColor: ITEM_1, borderRadius: '1px' }} />
        <div style={{ width: '100%', height: '8px', backgroundColor: ITEM_2, borderRadius: '1px' }} />
      </div>
    );
  };

  const renderFlexControls = () => {
    const dirOptions = showAdvanced ? FLEX_DIRECTION_ADVANCED : FLEX_DIRECTION_SIMPLE;
    const alignOptions = showAdvanced ? FLEX_ALIGN_ADVANCED : FLEX_ALIGN_SIMPLE;
    const justifyOptions = showAdvanced ? FLEX_JUSTIFY_ADVANCED : FLEX_JUSTIFY_SIMPLE;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <OptionGroup
          label="Direction"
          options={dirOptions}
          activeValue={v.direction || ''}
          onSelect={(val) => handleSetClass(v.direction_original, val)}
          renderIcon={(val) => <FlexIcon prop="direction" value={val} direction={val} />}
          cols={dirOptions.length}
        />
        <OptionGroup
          label={isCol ? 'Align horizontally' : 'Align vertically'}
          options={alignOptions}
          activeValue={v.align || ''}
          onSelect={(val) => handleSetClass(v.align_original, val)}
          renderIcon={(val) => <FlexIcon prop="align" value={val} direction={direction} />}
          cols={alignOptions.length}
        />
        <OptionGroup
          label={isCol ? 'Justify vertically' : 'Justify horizontally'}
          options={justifyOptions}
          activeValue={v.justify || ''}
          onSelect={(val) => handleSetClass(v.justify_original, val)}
          renderIcon={(val) => <FlexIcon prop="justify" value={val} direction={direction} alignItems={align || 'items-stretch'} />}
          cols={justifyOptions.length > 4 ? 3 : justifyOptions.length}
        />
        {!isCol && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '9px', color: theme.text_tertiary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Wrap</span>
            <button
              onClick={() => handleSetClass(v.wrap_original, v.wrap === 'flex-wrap' ? '' : 'flex-wrap')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px',
                borderRadius: '6px',
                border: `1px solid ${v.wrap === 'flex-wrap' ? theme.accent_default : theme.border_default}`,
                background: v.wrap === 'flex-wrap' ? theme.accent_low : 'transparent',
                color: v.wrap === 'flex-wrap' ? theme.accent_default : theme.text_secondary,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              <div style={{ width: '28px', height: '28px', flexShrink: 0 }}>
                <FlexIcon prop="wrap" value="flex-wrap" direction={direction} alignItems={align} justifyContent={justify} />
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: '11px', fontWeight: 500 }}>Wrap children</div>
                <div style={{ fontSize: '9px', opacity: 0.65, marginTop: '1px' }}>Allow items to flow to multiple lines</div>
              </div>
              <div style={{
                width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0,
                backgroundColor: v.wrap === 'flex-wrap' ? theme.accent_default : 'transparent',
                border: `1px solid ${v.wrap === 'flex-wrap' ? theme.accent_default : theme.border_default}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {v.wrap === 'flex-wrap' && <Check size={9} color={theme.bg_default} />}
              </div>
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderGridControls = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <OptionGroup
        label="Align items"
        options={GRID_ALIGN_OPTIONS}
        activeValue={v.align || ''}
        onSelect={(val) => handleSetClass(v.align_original, val)}
        renderIcon={(val) => <GridIcon prop="align" value={val} />}
        cols={4}
      />
    </div>
  );

  return (
    <VisualSection title="Layout">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

        {/* Header: label + more menu */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '9px', color: theme.text_tertiary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Display and Layout</span>
          <button
            ref={moreRef}
            onClick={() => setIsMoreOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '3px', border: 'none', background: 'transparent', color: theme.text_tertiary, cursor: 'pointer', padding: 0 }}
          >
            <MoreHorizontal size={13} />
          </button>
        </div>

        {/* Trigger button */}
        <button
          ref={triggerRef}
          onClick={() => setIsOpen(o => !o)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px',
            borderRadius: '6px',
            border: `1px solid ${theme.border_default}`,
            background: theme.bg_secondary,
            color: theme.text_default,
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', flexShrink: 0 }}>
              {renderTriggerIcon()}
            </div>
            <span style={{ fontSize: '12px', fontWeight: 500 }}>
              {displayLabel[display] || display || 'Block'}
            </span>
          </div>
          {isOpen
            ? <ChevronUp size={13} color={theme.text_tertiary} />
            : <ChevronDown size={13} color={theme.text_tertiary} />
          }
        </button>

        {/* Space X / Y */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <VisualControl label="Space X" prefix="space-x-" value={cleanVal(v.spaceX)} originalClass={v.spaceX_original} type="input" inheritedValue={cleanVal(domV?.spaceX)} />
          <VisualControl label="Space Y" prefix="space-y-" value={cleanVal(v.spaceY)} originalClass={v.spaceY_original} type="input" inheritedValue={cleanVal(domV?.spaceY)} />
        </div>
      </div>

      {/* ── More menu portal ────────────────────────────────── */}
      {isMoreOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999997 }} onClick={() => setIsMoreOpen(false)} />
          <div
            ref={moreDropdownRef}
            data-pv-overlay="true"
            data-pv-ui="true"
            style={{
              background: theme.bg_secondary,
              border: `1px solid ${theme.border_default}`,
              borderRadius: '6px',
              zIndex: 9999999,
              boxShadow: '0 8px 16px rgba(0,0,0,0.6)',
              overflow: 'hidden',
              ...moreStyle,
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showAdvanced}
                onChange={(e) => { setShowAdvanced(e.target.checked); setIsMoreOpen(false); }}
                style={{ cursor: 'pointer', accentColor: theme.accent_default }}
              />
              <span style={{ fontSize: '11px', color: theme.text_secondary }}>Show advanced</span>
            </label>
          </div>
        </>,
        document.body
      )}

      {/* ── Main popover portal ─────────────────────────────── */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999997 }} onClick={() => setIsOpen(false)} />
          <div
            ref={popoverRef}
            data-pv-overlay="true"
            data-pv-ui="true"
            style={{
              background: theme.bg_secondary,
              border: `1px solid ${theme.border_default}`,
              borderRadius: '8px',
              zIndex: 9999999,
              boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              ...popoverStyle,
            }}
          >
            {/* Display type segmented tabs */}
            <div style={{ padding: '8px', borderBottom: `1px solid ${theme.border_default}`, background: theme.bg_strong, flexShrink: 0 }}>
              <div style={{ display: 'flex', background: theme.bg_tertiary, borderRadius: '5px', padding: '2px', gap: '1px' }}>
                {(['block', 'flex', 'grid', 'hidden'] as const).map((type, i) => {
                  const labels = ['Block', 'Flex', 'Grid', 'None'];
                  const isActive = display === type;
                  return (
                    <button
                      key={type}
                      onClick={() => handleSetClass(v.display_original, type)}
                      style={{
                        flex: 1,
                        padding: '4px 6px',
                        fontSize: '11px',
                        fontWeight: 500,
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: isActive ? theme.bg_secondary : 'transparent',
                        color: isActive ? theme.text_default : theme.text_tertiary,
                        boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.35)' : 'none',
                        transition: 'background 0.12s, color 0.12s',
                      }}
                    >
                      {labels[i]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Flex / Grid controls */}
            {(isFlexLike || isGrid) && (
              <div style={{ padding: '12px', overflowY: 'auto' }}>
                {isFlexLike ? renderFlexControls() : renderGridControls()}
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </VisualSection>
  );
};
