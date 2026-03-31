// plugins/protovibe/src/ui/components/visual/Layout.tsx
import React, { useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MoveRight, ChevronDown, ChevronUp, MoreHorizontal, Check } from 'lucide-react';
import { useProtovibe } from '../../context/ProtovibeContext';
import { takeSnapshot, updateSource } from '../../api/client';
import { buildContextPrefix } from '../../utils/tailwind';
import { VisualSection } from './VisualSection';
import { SegmentedControl } from './SegmentedControl';
import { InspectorSlider } from './InspectorSlider';
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
  // Normalise to bare suffix for highlight comparisons
  const suffix = value
    .replace(/^items-/, '')
    .replace(/^justify-items-/, '')
    .replace(/^justify-/, '')
    .replace(/^content-/, '')
    .replace(/^grid-flow-/, '');

  // ── gridFlow: show fill order with colored cells ──────────────────────────
  if (prop === 'gridFlow') {
    const isCol = value === 'grid-flow-col' || value === 'grid-flow-col-dense';
    const isDense = value.includes('dense');
    return (
      <div style={{
        display: 'grid',
        width: '100%', height: '100%',
        padding: '2px', gap: '2px',
        backgroundColor: ICON_BG,
        border: `1px solid ${ICON_BORDER}`,
        borderRadius: '3px',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        gridAutoFlow: isCol ? 'column' : 'row',
        overflow: 'hidden',
      }}>
        {[ITEM_1, ITEM_2, theme.success_default].map((color, i) => (
          <div key={i} style={{
            backgroundColor: color,
            borderRadius: '1px',
            zIndex: 1,
            ...(isDense && i === 0 ? { gridColumn: 'span 2' } : {}),
          }} />
        ))}
      </div>
    );
  }

  // ── Border-highlight logic for all other props ────────────────────────────
  const isXAxis = prop === 'justify' || prop === 'justifyItems';
  const isYAxis = prop === 'align'   || prop === 'content';

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

  const containerStyle: React.CSSProperties = {
    display: 'grid',
    width: '100%', height: '100%',
    padding: '2px', gap: '2px',
    backgroundColor: ICON_BG,
    borderStyle: 'solid', borderWidth: '1px',
    borderTopColor:    hiTop    ? ICON_BORDER_HI : ICON_BORDER,
    borderRightColor:  hiRight  ? ICON_BORDER_HI : ICON_BORDER,
    borderBottomColor: hiBottom ? ICON_BORDER_HI : ICON_BORDER,
    borderLeftColor:   hiLeft   ? ICON_BORDER_HI : ICON_BORDER,
    borderRadius: '3px',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gridTemplateRows: 'repeat(2, 1fr)',
    position: 'relative',
    overflow: 'hidden',
  };

  const alignItemsMap:   Record<string, string> = { 'items-start': 'start', 'items-end': 'end', 'items-center': 'center', 'items-stretch': 'stretch' };
  const justifyItemsMap: Record<string, string> = { 'justify-items-start': 'start', 'justify-items-end': 'end', 'justify-items-center': 'center', 'justify-items-stretch': 'stretch' };
  const justifyMap:      Record<string, string> = { 'justify-start': 'start', 'justify-end': 'end', 'justify-center': 'center', 'justify-between': 'space-between', 'justify-around': 'space-around', 'justify-evenly': 'space-evenly' };
  const contentMap:      Record<string, string> = { 'content-start': 'start', 'content-end': 'end', 'content-center': 'center', 'content-between': 'space-between', 'content-around': 'space-around', 'content-evenly': 'space-evenly', 'content-stretch': 'stretch' };

  if (prop === 'align')        containerStyle.alignItems    = alignItemsMap[value]   || 'stretch';
  if (prop === 'justifyItems') containerStyle.justifyItems  = justifyItemsMap[value] || 'stretch';
  if (prop === 'justify')      { containerStyle.justifyContent = justifyMap[value] || 'start'; containerStyle.gridTemplateColumns = 'repeat(2, 7px)'; }
  if (prop === 'content')      { containerStyle.alignContent   = contentMap[value]  || 'start'; containerStyle.gridTemplateRows    = 'repeat(2, 6px)'; }

  const getItemStyle = (i: number): React.CSSProperties => {
    const s: React.CSSProperties = { backgroundColor: [ITEM_1, ITEM_2, theme.success_default][i % 3], borderRadius: '1px', zIndex: 1 };
    if (prop === 'justifyItems' && suffix !== 'stretch') s.width  = [11, 9, 6][i] + 'px';
    if (prop === 'align'        && suffix !== 'stretch') s.height = [7,  5, 4][i] + 'px';
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
  inheritedValue?: string;
  onSelect: (val: string) => void;
  renderIcon: (val: string) => React.ReactNode;
  cols?: number;
}

const OptionGroup: React.FC<OptionGroupProps> = ({ label, options, activeValue, inheritedValue, onSelect, renderIcon, cols = 3 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <span style={{ fontSize: '9px', color: theme.text_tertiary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '4px' }}>
      {options.map(opt => {
        const isSource = activeValue === opt.value;
        // inherited only shows when no source override exists at all
        const isInherited = !activeValue && inheritedValue === opt.value;
        const borderColor = isSource ? theme.accent_default : isInherited ? theme.text_secondary : theme.border_default;
        const bgColor = isSource ? theme.accent_low : isInherited ? theme.bg_low : 'transparent';
        const textColor = isSource ? theme.accent_default : isInherited ? theme.text_default : theme.text_tertiary;
        return (
          <button
            key={opt.value}
            onClick={() => onSelect(isSource ? '' : opt.value)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '6px 4px',
              borderRadius: '4px',
              border: `1px solid ${borderColor}`,
              background: bgColor,
              color: textColor,
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
const GRID_ALIGN_ITEMS_OPTIONS: OptionItem[] = [
  { value: 'items-stretch', label: 'Stretch' },
  { value: 'items-start', label: 'Start' },
  { value: 'items-center', label: 'Center' },
  { value: 'items-end', label: 'End' },
];
const GRID_JUSTIFY_ITEMS_OPTIONS: OptionItem[] = [
  { value: 'justify-items-stretch', label: 'Stretch' },
  { value: 'justify-items-start', label: 'Start' },
  { value: 'justify-items-center', label: 'Center' },
  { value: 'justify-items-end', label: 'End' },
];
const GRID_AUTO_FLOW_OPTIONS: OptionItem[] = [
  { value: 'grid-flow-row', label: 'Row' },
  { value: 'grid-flow-col', label: 'Col' },
  { value: 'grid-flow-dense', label: 'Dense' },
  { value: 'grid-flow-row-dense', label: 'Row D.' },
  { value: 'grid-flow-col-dense', label: 'Col D.' },
];
const GRID_JUSTIFY_CONTENT_OPTIONS: OptionItem[] = [
  { value: 'justify-start', label: 'Start' },
  { value: 'justify-center', label: 'Center' },
  { value: 'justify-end', label: 'End' },
  { value: 'justify-between', label: 'Between' },
];
const GRID_ALIGN_CONTENT_OPTIONS: OptionItem[] = [
  { value: 'content-start', label: 'Start' },
  { value: 'content-center', label: 'Center' },
  { value: 'content-end', label: 'End' },
  { value: 'content-between', label: 'Between' },
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

  // Three-state derivation: source (v.*) > inherited (domV.*) > unset
  const display = v.display || domV?.display || '';
  const direction = v.direction || domV?.direction || 'flex-row';
  const align = v.align || domV?.align || '';
  const justify = v.justify || domV?.justify || '';

  const hasSourceDisplay = !!v.display;
  const hasInheritedDisplay = !v.display && !!domV?.display;
  const hasAnySourceOverride = !!(
    v.display || v.direction || v.align || v.justify || v.wrap ||
    v.spaceX || v.spaceY ||
    v.gridCols || v.gridRows || v.gridFlow || v.justifyItems || v.alignContent
  );

  // For OptionGroups: pass domV value as inheritedValue only when no source override exists
  const inheritedDirection = !v.direction ? (domV?.direction || '') : '';
  const inheritedAlign = !v.align ? (domV?.align || '') : '';
  const inheritedJustify = !v.justify ? (domV?.justify || '') : '';

  const isFlexLike = display === 'flex' || display === 'inline-flex';
  const isGrid = display === 'grid' || display === 'inline-grid';
  const isCol = direction.includes('col');

  const DISPLAY_LABELS: Record<string, string> = {
    flex: 'Flexbox', 'inline-flex': 'Inline Flex',
    grid: 'Grid', 'inline-grid': 'Inline Grid',
    block: 'Block', hidden: 'None',
  };

  const triggerLabelText = display ? (DISPLAY_LABELS[display] || display) : 'Unset';
  const triggerLabelColor = hasAnySourceOverride
    ? theme.accent_default
    : hasInheritedDisplay
    ? theme.text_secondary
    : theme.text_tertiary;
  const triggerBorderColor = hasAnySourceOverride ? theme.border_accent : theme.border_default;

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

    // Wrap: source > inherited > unset
    const isWrapSource = v.wrap === 'flex-wrap';
    const isWrapInherited = !v.wrap && domV?.wrap === 'flex-wrap';
    const wrapBorder = isWrapSource ? theme.accent_default : isWrapInherited ? theme.text_secondary : theme.border_default;
    const wrapBg = isWrapSource ? theme.accent_low : isWrapInherited ? theme.bg_low : 'transparent';
    const wrapColor = isWrapSource ? theme.accent_default : isWrapInherited ? theme.text_default : theme.text_secondary;
    const checkboxBg = isWrapSource ? theme.accent_default : isWrapInherited ? theme.text_default : 'transparent';
    const checkboxBorder = isWrapSource || isWrapInherited ? checkboxBg : theme.border_default;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <OptionGroup
          label="Direction"
          options={dirOptions}
          activeValue={v.direction || ''}
          inheritedValue={inheritedDirection}
          onSelect={(val) => handleSetClass(v.direction_original, val)}
          renderIcon={(val) => <FlexIcon prop="direction" value={val} direction={val} />}
          cols={dirOptions.length}
        />
        <OptionGroup
          label={isCol ? 'Align horizontally' : 'Align vertically'}
          options={alignOptions}
          activeValue={v.align || ''}
          inheritedValue={inheritedAlign}
          onSelect={(val) => handleSetClass(v.align_original, val)}
          renderIcon={(val) => <FlexIcon prop="align" value={val} direction={direction} />}
          cols={alignOptions.length}
        />
        <OptionGroup
          label={isCol ? 'Justify vertically' : 'Justify horizontally'}
          options={justifyOptions}
          activeValue={v.justify || ''}
          inheritedValue={inheritedJustify}
          onSelect={(val) => handleSetClass(v.justify_original, val)}
          renderIcon={(val) => <FlexIcon prop="justify" value={val} direction={direction} alignItems={align || 'items-stretch'} />}
          cols={justifyOptions.length > 4 ? 3 : justifyOptions.length}
        />
        {!isCol && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '9px', color: theme.text_tertiary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Wrap</span>
            <button
              onClick={() => handleSetClass(v.wrap_original, isWrapSource ? '' : 'flex-wrap')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px',
                borderRadius: '6px',
                border: `1px solid ${wrapBorder}`,
                background: wrapBg,
                color: wrapColor,
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
                backgroundColor: checkboxBg,
                border: `1px solid ${checkboxBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {(isWrapSource || isWrapInherited) && <Check size={9} color={theme.bg_default} />}
              </div>
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderGridControls = () => {
    const colsNum = parseInt((v.gridCols || '').replace('grid-cols-', '') || '0');
    const rowsNum = parseInt((v.gridRows || '').replace('grid-rows-', '') || '0');
    const inheritedColsNum = parseInt((domV?.gridCols || '').replace('grid-cols-', '') || '0');
    const inheritedRowsNum = parseInt((domV?.gridRows || '').replace('grid-rows-', '') || '0');
    const inheritedJustifyItems = !v.justifyItems ? (domV?.justifyItems || '') : '';
    const inheritedAlignContent = !v.alignContent ? (domV?.alignContent || '') : '';
    const inheritedGridFlow = !v.gridFlow ? (domV?.gridFlow || '') : '';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        <InspectorSlider
          label="Columns"
          value={colsNum}
          inheritedValue={inheritedColsNum}
          originalClass={v.gridCols_original}
          min={1}
          max={12}
          onCommit={(n) => handleSetClass(v.gridCols_original, n >= 1 ? `grid-cols-${n}` : '')}
        />

        {showAdvanced && (
          <InspectorSlider
            label="Rows"
            value={rowsNum}
            inheritedValue={inheritedRowsNum}
            originalClass={v.gridRows_original}
            min={0}
            max={12}
            onCommit={(n) => handleSetClass(v.gridRows_original, n > 0 ? `grid-rows-${n}` : '')}
            zeroLabel="Auto"
          />
        )}

        <OptionGroup
          label="Justify items"
          options={GRID_JUSTIFY_ITEMS_OPTIONS}
          activeValue={v.justifyItems || ''}
          inheritedValue={inheritedJustifyItems}
          onSelect={(val) => handleSetClass(v.justifyItems_original, val)}
          renderIcon={(val) => <GridIcon prop="justifyItems" value={val} />}
          cols={4}
        />

        <OptionGroup
          label="Align items"
          options={GRID_ALIGN_ITEMS_OPTIONS}
          activeValue={v.align || ''}
          inheritedValue={inheritedAlign}
          onSelect={(val) => handleSetClass(v.align_original, val)}
          renderIcon={(val) => <GridIcon prop="align" value={val} />}
          cols={4}
        />

        {showAdvanced && (
          <>
            <OptionGroup
              label="Auto flow"
              options={GRID_AUTO_FLOW_OPTIONS}
              activeValue={v.gridFlow || ''}
              inheritedValue={inheritedGridFlow}
              onSelect={(val) => handleSetClass(v.gridFlow_original, val)}
              renderIcon={(val) => <GridIcon prop="gridFlow" value={val} />}
              cols={3}
            />
            <OptionGroup
              label="Justify content"
              options={GRID_JUSTIFY_CONTENT_OPTIONS}
              activeValue={v.justify || ''}
              inheritedValue={inheritedJustify}
              onSelect={(val) => handleSetClass(v.justify_original, val)}
              renderIcon={(val) => <GridIcon prop="justify" value={val} />}
              cols={4}
            />
            <OptionGroup
              label="Align content"
              options={GRID_ALIGN_CONTENT_OPTIONS}
              activeValue={v.alignContent || ''}
              inheritedValue={inheritedAlignContent}
              onSelect={(val) => handleSetClass(v.alignContent_original, val)}
              renderIcon={(val) => <GridIcon prop="content" value={val} />}
              cols={4}
            />
          </>
        )}
      </div>
    );
  };

  const moreMenuButton = (
    <button
      ref={moreRef}
      onClick={() => setIsMoreOpen(o => !o)}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '3px', border: 'none', background: 'transparent', color: theme.text_tertiary, cursor: 'pointer', padding: 0 }}
    >
      <MoreHorizontal size={13} />
    </button>
  );

  return (
    <VisualSection title="Display and Layout" headerAction={moreMenuButton}>
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
            border: `1px solid ${triggerBorderColor}`,
            background: theme.bg_secondary,
            color: theme.text_default,
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', flexShrink: 0, filter: hasAnySourceOverride ? 'none' : 'saturate(0)' }}>
              {renderTriggerIcon()}
            </div>
            <span style={{ fontSize: '12px', fontWeight: 500, color: triggerLabelColor }}>
              {triggerLabelText}
            </span>
          </div>
          {isOpen
            ? <ChevronUp size={13} color={theme.text_tertiary} />
            : <ChevronDown size={13} color={theme.text_tertiary} />
          }
        </button>

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
              boxShadow: '0 8px 16px rgba(0,0,0,0.8)',
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
              background: theme.bg_default,
              border: `1px solid ${theme.border_strong}`,
              borderRadius: '8px',
              zIndex: 9999999,
              boxShadow: '0 8px 12px rgba(0,0,0,0.9)',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              ...popoverStyle,
            }}
          >
            {/* Display type — reuse SegmentedControl for correct source/inherited/unset colours */}
            <div style={{ padding: '12px 12px 0' }}>
              <span style={{ display: 'block', fontSize: '9px', color: theme.text_tertiary, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Display</span>
              <SegmentedControl
                label=""
                value={v.display}
                originalClass={v.display_original}
                inheritedValue={domV?.display}
                width="100%"
                segments={[
                  { label: 'Block', val: 'block' },
                  { label: 'Flex',  val: 'flex'  },
                  { label: 'Grid',  val: 'grid'  },
                  { label: 'None',  val: 'hidden' },
                ]}
              />
            </div>

            {/* Flex / Grid controls */}
            {(isFlexLike || isGrid) && (
              <div style={{ padding: '12px' }}>
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
