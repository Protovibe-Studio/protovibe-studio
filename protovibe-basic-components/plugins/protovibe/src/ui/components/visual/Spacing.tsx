// plugins/protovibe/src/ui/components/visual/Spacing.tsx
import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { VisualSection } from './VisualSection';
import { VisualControl } from './VisualControl';
import { AutocompleteDropdown } from './AutocompleteDropdown';
import { SpacingBoxSVG } from './SpacingBoxSVG';
import { useProtovibe } from '../../context/ProtovibeContext';
import { takeSnapshot, updateSource } from '../../api/client';
import { buildContextPrefix, makeSafe, computeOptimalSpacing, computeOptimalBorder, cleanVal } from '../../utils/tailwind';
import { SCALES, prioritizeColors } from '../../constants/tailwind';
import { useScales } from '../../hooks/useScales';
import { theme } from '../../theme';

// ─── Corner icons ──────────────────────────────────────────────────────────────

const CornerAllIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4.22705 0.661438H2.65527C1.55071 0.661438 0.655273 1.55687 0.655273 2.66144V4.23322" stroke="currentColor"/>
    <path d="M11.5873 4.29972L11.5873 2.72794C11.5873 1.62337 10.6918 0.727936 9.58728 0.727936L8.0155 0.727936" stroke="currentColor"/>
    <path d="M7.94897 11.6956L9.52075 11.6956C10.6253 11.6956 11.5208 10.8001 11.5208 9.69556L11.5208 8.12378" stroke="currentColor"/>
    <path d="M0.655273 8.05728L0.655273 9.62906C0.655273 10.7336 1.5507 11.6291 2.65527 11.6291L4.22705 11.6291" stroke="currentColor"/>
  </svg>
);

const CornerTLIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M10 2H4.5C3 2 2 3 2 4.5V10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const CornerTRIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M2 2H7.5C9 2 10 3 10 4.5V10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const CornerBRIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M2 10H7.5C9 10 10 9 10 7.5V2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const CornerBLIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M10 10H4.5C3 10 2 9 2 7.5V2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

// ─── SpacingAutocomplete ───────────────────────────────────────────────────────
// Small absolute-positioned input for the box-model overlay.

const SpacingAutocomplete: React.FC<{
  value: string;
  onChange: (val: string, prevVal?: string) => void;
  placeholder: string;
  posStyle: React.CSSProperties;
  inheritedPlaceholder?: string;
  options?: typeof SCALES.spacing;
}> = ({ value, onChange, placeholder, posStyle, inheritedPlaceholder, options }) => {
  const scales = useScales();
  const resolvedOptions = options ?? scales.spacing;
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
  <AutocompleteDropdown
    value={value === '-' ? '' : value}
    options={resolvedOptions}
    onCommit={onChange}
    placeholder={
      inheritedPlaceholder && !(value && value !== '-') ? inheritedPlaceholder : placeholder
    }
    zIndex={999999}
    containerStyle={{ ...posStyle, position: 'absolute', width: '36px', height: '16px' }}
    inputStyle={{
      width: '100%',
      height: '100%',
      background: focused ? theme.bg_secondary : hovered ? 'rgba(255,255,255,0.1)' : 'transparent',
      border: `1px solid ${focused ? theme.accent_default : hovered ? theme.border_strong : 'transparent'}`,
      fontWeight: 'bold',
      fontSize: '10px',
      textAlign: 'center',
      outline: 'none',
      borderRadius: '4px',
      display: 'block',
      transition: 'all 0.1s',
    }}
    dropdownStyle={{ minWidth: '100px', maxHeight: '200px' }}
    filterOptions={(opts, query, hasTyped) => {
      if (!hasTyped) return opts;
      return opts.filter((opt) => opt.val.toLowerCase().startsWith(query));
    }}
    renderOption={(opt) => (
      <>
        <span style={{ fontWeight: 'bold' }}>{opt.val}</span>
        <span style={{ color: theme.text_tertiary, fontSize: '9px', marginLeft: '12px' }}>{opt.desc}</span>
      </>
    )}
    onInputFocus={() => setFocused(true)}
    onInputBlur={() => { setFocused(false); setHovered(false); }}
    onInputMouseEnter={() => setHovered(true)}
    onInputMouseLeave={() => setHovered(false)}
  />
  );
};

// ─── Border side icons ─────────────────────────────────────────────────────────

const BorderAllIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <rect x="1.5" y="1.5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const BorderTIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <rect x="1.5" y="1.5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" />
    <path d="M1.5 3C1.5 2.17 2.17 1.5 3 1.5H9C9.83 1.5 10.5 2.17 10.5 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const BorderRIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <rect x="1.5" y="1.5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" />
    <path d="M9 1.5C9.83 1.5 10.5 2.17 10.5 3V9C10.5 9.83 9.83 10.5 9 10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const BorderBIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <rect x="1.5" y="1.5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" />
    <path d="M10.5 9C10.5 9.83 9.83 10.5 9 10.5H3C2.17 10.5 1.5 9.83 1.5 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const BorderLIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <rect x="1.5" y="1.5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" />
    <path d="M3 10.5C2.17 10.5 1.5 9.83 1.5 9V3C1.5 2.17 2.17 1.5 3 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

// ─── RadiusAutocomplete ────────────────────────────────────────────────────────
// Full-width autocomplete for border radius with an icon prefix.

const RadiusAutocomplete: React.FC<{
  value: string;
  onChange: (val: string, prevVal?: string) => void;
  placeholder?: string;
  icon: React.ReactNode;
  inheritedValue?: string;
  options?: typeof SCALES.radius;
}> = ({ value, onChange, placeholder, icon, inheritedValue, options }) => {
  const scales = useScales();
  const resolvedOptions = options ?? scales.radius;
  return (
  <AutocompleteDropdown
    value={value === '-' ? '' : value}
    options={resolvedOptions}
    onCommit={onChange}
    placeholder={inheritedValue && !value ? inheritedValue : (placeholder ?? '—')}
    zIndex={999999}
    prefix={icon}
    filterOptions={(opts, query, hasTyped) => {
      if (!hasTyped) return opts;
      return opts.filter((opt) => opt.val.toLowerCase().startsWith(query));
    }}
    renderOption={(opt) => (
      <>
        <span style={{ fontWeight: 'bold' }}>{opt.val}</span>
        <span style={{ color: theme.text_tertiary, fontSize: '9px', marginLeft: '12px' }}>{opt.desc}</span>
      </>
    )}
  />
  );
};

// ─── BorderColorAutocomplete ───────────────────────────────────────────────────

const BorderColorAutocomplete: React.FC<{
  value: string;
  onChange: (val: string, prevVal?: string) => void;
  icon: React.ReactNode;
  inheritedValue?: string;
  colorOptions: any[];
}> = ({ value, onChange, icon, inheritedValue, colorOptions }) => (
  <AutocompleteDropdown
    value={value === '-' ? '' : value}
    options={colorOptions}
    onCommit={onChange}
    placeholder={inheritedValue && !value ? inheritedValue : '—'}
    zIndex={9999999}
    prefix={icon}
    showColorModeToggle={colorOptions.some((o: any) => o.lightValue !== undefined || o.darkValue !== undefined || o.hex !== undefined)}
    filterOptions={(opts, query, hasTyped) => {
      if (!hasTyped) return opts;
      return opts.filter((opt) =>
        opt.val.toLowerCase().startsWith(query) ||
        opt.val.toLowerCase().includes(`-${query}`) ||
        (opt.desc && opt.desc.toLowerCase().includes(query))
      );
    }}
    renderOption={(opt: any, colorMode?: any) => {
      let swatchColor: string | undefined;
      if (colorMode === 'light' && opt.lightValue) swatchColor = opt.lightValue;
      else if (colorMode === 'dark' && opt.darkValue) swatchColor = opt.darkValue;
      else if (opt.hex) swatchColor = opt.hex;

      if (swatchColor) {
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: swatchColor, border: `1px solid ${theme.border_default}`, flexShrink: 0 }} />
            <span style={{ fontWeight: 'bold' }}>{opt.val}</span>
          </div>
        );
      }
      return <span style={{ fontWeight: 'bold' }}>{opt.val}</span>;
    }}
  />
);

// ─── Box-model input positions ─────────────────────────────────────────────────
// Percentages are relative to the 240×240 SVG viewBox (maintained via aspectRatio: '1').
// Band midpoints (derived from label text positions baked into SpacingBoxSVG):
//   Margin  band centre ≈  7 % from each edge
//   Border  band centre ≈ 18 % from each edge
//   Padding band centre ≈ 30 % from each edge
//   Content area centre = 50 %

const centre = (pct: number): React.CSSProperties => ({
  left: `${pct}%`,
  top: '50%',
  transform: 'translate(-50%, -50%)',
});

const centreH = (pct: number): React.CSSProperties => ({
  left: '50%',
  top: `${pct}%`,
  transform: 'translate(-50%, -50%)',
});

// ── Box model input positions (% of container) ──────────────────────────────
// Edit these values to reposition inputs when the SVG background changes.
const pos = {
  margin:  { top:  5, bottom: 90, left:  7, right: 94 },
  border:  { top: 17, bottom: 79, left: 18, right: 82 },
  padding: { top: 28, bottom: 67, left: 30, right: 70 },
};

// ─── Essentials section ────────────────────────────────────────────────────────

export const Spacing: React.FC<{ v: any; domV?: any }> = ({ v, domV }) => {
  const { activeData, activeSourceId, activeModifiers, runLockedMutation, themeColors } = useProtovibe();
  const [radiusExpanded, setRadiusExpanded] = useState(false);
  const [borderColorExpanded, setBorderColorExpanded] = useState(false);
  const [borderColorHovered, setBorderColorHovered] = useState(false);
  const [radiusHovered, setRadiusHovered] = useState(false);

  const uniqueClasses = (classes: string[]) => [...new Set(classes.filter(Boolean))];

  const toBorderWidthClass = (val: string) => {
    const clean = cleanVal(val);
    if (!clean) return '';
    return clean === 'DEFAULT' ? 'border' : `border-${clean}`;
  };

  const toRadiusClass = (corner: 'all' | 'tl' | 'tr' | 'br' | 'bl', val: string) => {
    const clean = cleanVal(val);
    if (!clean) return '';
    if (corner === 'all') {
      return clean === 'DEFAULT' ? 'rounded' : `rounded-${clean}`;
    }
    return `rounded-${corner}-${clean}`;
  };

  const toBorderColorClass = (side: 'all' | 't' | 'r' | 'b' | 'l', val: string) => {
    const clean = cleanVal(val);
    if (!clean) return '';
    return side === 'all' ? `border-${clean}` : `border-${side}-${clean}`;
  };

  // ── Spacing update ──────────────────────────────────────────────────────────

  const handleSpacingUpdate = async (
    type: 'm' | 'p',
    direction: 't' | 'r' | 'b' | 'l',
    newVal: string,
    prevVal?: string,
  ) => {
    if (!activeData?.file) return;
    const safeVal = makeSafe(newVal);

    const vals = {
      t: cleanVal(type === 'm' ? v.mt : v.pt),
      r: cleanVal(type === 'm' ? v.mr : v.pr),
      b: cleanVal(type === 'm' ? v.mb : v.pb),
      l: cleanVal(type === 'm' ? v.ml : v.pl),
    };

    // If no padding/margin is set or inherited on any side, spread the new value to all sides.
    const noSource = !vals.t && !vals.r && !vals.b && !vals.l;
    const domSides = type === 'm'
      ? [domV?.mt, domV?.mr, domV?.mb, domV?.ml]
      : [domV?.pt, domV?.pr, domV?.pb, domV?.pl];
    const noInherited = domSides.every((s) => !cleanVal(s));
    if (noSource && noInherited && safeVal) {
      vals.t = safeVal;
      vals.r = safeVal;
      vals.b = safeVal;
      vals.l = safeVal;
    } else {
      vals[direction] = safeVal || '';
    }

    const newClassesStr = computeOptimalSpacing(type, vals.t, vals.r, vals.b, vals.l);
    const newClasses = newClassesStr.split(' ').filter(Boolean);
    const previousVals = {
      ...vals,
      [direction]: cleanVal(prevVal ?? vals[direction]) || '',
    };
    const reconstructedOrigClasses = computeOptimalSpacing(
      type,
      previousVals.t,
      previousVals.r,
      previousVals.b,
      previousVals.l,
    ).split(' ').filter(Boolean);
    const origClasses = uniqueClasses([
      ...((type === 'm' ? v.origMargin : v.origPadding) ?? []),
      ...reconstructedOrigClasses,
    ]);
    const currentContextPrefix = buildContextPrefix(activeModifiers);

    await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId!);
      const prefixedNewClasses = newClasses
        .map((c: string) => `${currentContextPrefix}${c}`)
        .join(' ');
      await updateSource({
        ...activeData,
        id: activeSourceId!,
        oldClasses: origClasses,
        newClass: prefixedNewClasses,
        action: 'replace-multiple',
      });
    });
  };

  // ── Border-width update ─────────────────────────────────────────────────────

  const handleBorderUpdate = async (newVal: string, prevVal?: string) => {
    if (!activeData?.file) return;
    const safeVal = makeSafe(newVal);
    const currentContextPrefix = buildContextPrefix(activeModifiers);

    let newClass = '';
    if (safeVal && safeVal !== '-') {
      newClass =
        safeVal === 'DEFAULT'
          ? `${currentContextPrefix}border`
          : `${currentContextPrefix}border-${safeVal}`;
    }

    await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId!);
      // Fall back to reconstructing original from current value if _original is missing
      let origClass = v.borderWidth_original || '';
      if (!origClass) {
        origClass = toBorderWidthClass(prevVal ?? v.borderWidth);
      }
      const action = !origClass && newClass ? 'add' : origClass && !newClass ? 'remove' : 'edit';
      if (origClass === newClass) return;
      await updateSource({
        ...activeData,
        id: activeSourceId!,
        oldClass: origClass,
        newClass,
        action,
      });
    });
  };

  // ── Per-side border-width update ────────────────────────────────────────────

  const handleBorderSideUpdate = async (side: 't' | 'r' | 'b' | 'l', newVal: string, prevVal?: string) => {
    if (!activeData?.file) return;
    const safeVal = makeSafe(newVal);
    const currentContextPrefix = buildContextPrefix(activeModifiers);

    // Resolve effective per-side values: explicit side override > all-sides shorthand
    const fallback = cleanVal(v.borderWidth) || '';
    const effectiveT = cleanVal(v.borderT) || fallback;
    const effectiveR = cleanVal(v.borderR) || fallback;
    const effectiveB = cleanVal(v.borderB) || fallback;
    const effectiveL = cleanVal(v.borderL) || fallback;

    const vals = { t: effectiveT, r: effectiveR, b: effectiveB, l: effectiveL };

    const noSource = !effectiveT && !effectiveR && !effectiveB && !effectiveL;
    const noInherited = !domBorderSideVal('borderT') && !domBorderSideVal('borderR') && !domBorderSideVal('borderB') && !domBorderSideVal('borderL');
    if (noSource && noInherited && safeVal) {
      vals.t = safeVal; vals.r = safeVal; vals.b = safeVal; vals.l = safeVal;
    } else {
      vals[side] = safeVal || '';
    }

    const newClassesStr = computeOptimalBorder(vals.t, vals.r, vals.b, vals.l);
    const newClasses = newClassesStr.split(' ').filter(Boolean);
    const prefixedNewClasses = newClasses.map((c: string) => `${currentContextPrefix}${c}`).join(' ');

    const previousVals = {
      t: side === 't' ? cleanVal(prevVal ?? '') || '' : effectiveT,
      r: side === 'r' ? cleanVal(prevVal ?? '') || '' : effectiveR,
      b: side === 'b' ? cleanVal(prevVal ?? '') || '' : effectiveB,
      l: side === 'l' ? cleanVal(prevVal ?? '') || '' : effectiveL,
    };
    const reconstructedOrigClasses = computeOptimalBorder(
      previousVals.t,
      previousVals.r,
      previousVals.b,
      previousVals.l,
    ).split(' ').filter(Boolean);

    // Collect ALL old border-width originals to replace
    const origClasses = uniqueClasses([
      v.borderWidth_original,
      v.borderT_original,
      v.borderR_original,
      v.borderB_original,
      v.borderL_original,
      ...reconstructedOrigClasses,
    ]);

    await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId!);
      await updateSource({
        ...activeData,
        id: activeSourceId!,
        oldClasses: origClasses,
        newClass: prefixedNewClasses,
        action: 'replace-multiple',
      });
    });
  };

  // ── Radius update ───────────────────────────────────────────────────────────

  const handleRadiusUpdate = async (
    corner: 'all' | 'tl' | 'tr' | 'br' | 'bl',
    newVal: string,
    prevVal?: string,
  ) => {
    if (!activeData?.file) return;
    const safeVal = makeSafe(newVal);
    const currentContextPrefix = buildContextPrefix(activeModifiers);

    const isAll = corner === 'all';
    let origClass = isAll
      ? v.radius_original || ''
      : v[`radius${corner.toUpperCase()}_original`] || '';

    // Fall back to reconstructing original from current value if _original is missing
    if (!origClass) {
      const valKey = isAll ? 'radius' : `radius${corner.toUpperCase()}`;
      origClass = toRadiusClass(corner, prevVal ?? v[valKey]);
    }

    let newClass = '';
    if (safeVal && safeVal !== '-') {
      if (isAll && safeVal === 'DEFAULT') {
        newClass = `${currentContextPrefix}rounded`;
      } else {
        const pfx = isAll ? 'rounded-' : `rounded-${corner}-`;
        newClass = `${currentContextPrefix}${pfx}${safeVal}`;
      }
    }

    await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId!);
      const action = !origClass && newClass ? 'add' : origClass && !newClass ? 'remove' : 'edit';
      if (origClass === newClass) return;
      await updateSource({
        ...activeData,
        id: activeSourceId!,
        oldClass: origClass,
        newClass,
        action,
      });
    });
  };

  // ── Border-color update ─────────────────────────────────────────────────────

  const handleBorderColorUpdate = async (
    side: 'all' | 't' | 'r' | 'b' | 'l',
    newVal: string,
    prevVal?: string,
  ) => {
    if (!activeData?.file) return;
    const safeVal = makeSafe(newVal);
    const currentContextPrefix = buildContextPrefix(activeModifiers);

    const isAll = side === 'all';
    const origKey = isAll ? 'borderColor_original' : `borderColor${side.toUpperCase()}_original`;
    const valKey = isAll ? 'borderColor' : `borderColor${side.toUpperCase()}`;
    let origClass = v[origKey] || '';

    // Fall back to reconstructing original from current value if _original is missing
    if (!origClass) {
      origClass = toBorderColorClass(side, prevVal ?? v[valKey]);
    }

    let newClass = '';
    if (safeVal && safeVal !== '-') {
      newClass = isAll
        ? `${currentContextPrefix}border-${safeVal}`
        : `${currentContextPrefix}border-${side}-${safeVal}`;
    }

    await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId!);
      const action = !origClass && newClass ? 'add' : origClass && !newClass ? 'remove' : 'edit';
      if (origClass === newClass) return;
      await updateSource({ ...activeData, id: activeSourceId!, oldClass: origClass, newClass, action });
    });
  };

  // ── Gap update ──────────────────────────────────────────────────────────────

  const handleGapUpdate = async (newVal: string, prevVal?: string) => {
    if (!activeData?.file) return;
    const safeVal = makeSafe(newVal);
    const currentContextPrefix = buildContextPrefix(activeModifiers);

    const newClass = safeVal && safeVal !== '-' ? `${currentContextPrefix}gap-${safeVal}` : '';

    await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId!);
      let origClass = v.gap_original || '';
      if (!origClass) origClass = cleanVal(prevVal ?? v.gap) ? `gap-${cleanVal(prevVal ?? v.gap)}` : '';
      const action = !origClass && newClass ? 'add' : origClass && !newClass ? 'remove' : 'edit';
      if (origClass === newClass) return;
      await updateSource({
        ...activeData,
        id: activeSourceId!,
        oldClass: origClass,
        newClass,
        action,
      });
    });
  };

  // ── Corner radius values ────────────────────────────────────────────────────

  const cornerVal = (key: 'TL' | 'TR' | 'BR' | 'BL') => {
    const raw = v[`radius${key}`];
    return raw && raw !== '-' ? raw : '';
  };

  // ── Border side value helper ────────────────────────────────────────────────

  const borderSideVal = (key: 'borderT' | 'borderR' | 'borderB' | 'borderL') => {
    const raw = v[key];
    if (raw && raw !== '-') return raw;
    // Fall back to all-sides shorthand so the box model always reflects effective value
    return cleanVal(v.borderWidth) || '';
  };

  const domBorderSideVal = (key: 'borderT' | 'borderR' | 'borderB' | 'borderL') => {
    const raw = domV?.[key];
    if (raw && raw !== '-') return raw;
    return cleanVal(domV?.borderWidth) || '';
  };


  return (
    <VisualSection title="Essentials" defaultOpen>
      {/* ── Box model SVG with overlay inputs ── */}
      <div style={{ position: 'relative', width: '240px', aspectRatio: '1', margin: '12px auto' }}>
        <SpacingBoxSVG style={{ width: '100%', height: '100%', display: 'block' }} />

        {/* Margin – top / bottom / left / right */}
        <SpacingAutocomplete
          posStyle={centreH(pos.margin.top)}
          value={v.mt === '-' ? '' : v.mt}
          onChange={(val, prevVal) => handleSpacingUpdate('m', 't', val, prevVal)}
          placeholder="-"
          inheritedPlaceholder={cleanVal(domV?.mt)}
        />
        <SpacingAutocomplete
          posStyle={centreH(pos.margin.bottom)}
          value={v.mb === '-' ? '' : v.mb}
          onChange={(val, prevVal) => handleSpacingUpdate('m', 'b', val, prevVal)}
          placeholder="-"
          inheritedPlaceholder={cleanVal(domV?.mb)}
        />
        <SpacingAutocomplete
          posStyle={centre(pos.margin.left)}
          value={v.ml === '-' ? '' : v.ml}
          onChange={(val, prevVal) => handleSpacingUpdate('m', 'l', val, prevVal)}
          placeholder="-"
          inheritedPlaceholder={cleanVal(domV?.ml)}
        />
        <SpacingAutocomplete
          posStyle={centre(pos.margin.right)}
          value={v.mr === '-' ? '' : v.mr}
          onChange={(val, prevVal) => handleSpacingUpdate('m', 'r', val, prevVal)}
          placeholder="-"
          inheritedPlaceholder={cleanVal(domV?.mr)}
        />

        {/* Border sides – top / bottom / left / right */}
        <SpacingAutocomplete
          posStyle={centreH(pos.border.top)}
          value={borderSideVal('borderT')}
          onChange={(val, prevVal) => handleBorderSideUpdate('t', val, prevVal)}
          placeholder="-"
          options={SCALES.borderWidth}
          inheritedPlaceholder={domBorderSideVal('borderT')}
        />
        <SpacingAutocomplete
          posStyle={centreH(pos.border.bottom)}
          value={borderSideVal('borderB')}
          onChange={(val, prevVal) => handleBorderSideUpdate('b', val, prevVal)}
          placeholder="-"
          options={SCALES.borderWidth}
          inheritedPlaceholder={domBorderSideVal('borderB')}
        />
        <SpacingAutocomplete
          posStyle={centre(pos.border.left)}
          value={borderSideVal('borderL')}
          onChange={(val, prevVal) => handleBorderSideUpdate('l', val, prevVal)}
          placeholder="-"
          options={SCALES.borderWidth}
          inheritedPlaceholder={domBorderSideVal('borderL')}
        />
        <SpacingAutocomplete
          posStyle={centre(pos.border.right)}
          value={borderSideVal('borderR')}
          onChange={(val, prevVal) => handleBorderSideUpdate('r', val, prevVal)}
          placeholder="-"
          options={SCALES.borderWidth}
          inheritedPlaceholder={domBorderSideVal('borderR')}
        />

        {/* Padding – top / bottom / left / right */}
        <SpacingAutocomplete
          posStyle={centreH(pos.padding.top)}
          value={v.pt === '-' ? '' : v.pt}
          onChange={(val, prevVal) => handleSpacingUpdate('p', 't', val, prevVal)}
          placeholder="-"
          inheritedPlaceholder={cleanVal(domV?.pt)}
        />
        <SpacingAutocomplete
          posStyle={centreH(pos.padding.bottom)}
          value={v.pb === '-' ? '' : v.pb}
          onChange={(val, prevVal) => handleSpacingUpdate('p', 'b', val, prevVal)}
          placeholder="-"
          inheritedPlaceholder={cleanVal(domV?.pb)}
        />
        <SpacingAutocomplete
          posStyle={centre(pos.padding.left)}
          value={v.pl === '-' ? '' : v.pl}
          onChange={(val, prevVal) => handleSpacingUpdate('p', 'l', val, prevVal)}
          placeholder="-"
          inheritedPlaceholder={cleanVal(domV?.pl)}
        />
        <SpacingAutocomplete
          posStyle={centre(pos.padding.right)}
          value={v.pr === '-' ? '' : v.pr}
          onChange={(val, prevVal) => handleSpacingUpdate('p', 'r', val, prevVal)}
          placeholder="-"
          inheritedPlaceholder={cleanVal(domV?.pr)}
        />

        {/* Gap – content area centre */}
        <SpacingAutocomplete
          posStyle={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
          value={v.gap === '-' ? '' : v.gap}
          onChange={(val, prevVal) => handleGapUpdate(val, prevVal)}
          placeholder="-"
          inheritedPlaceholder={cleanVal(domV?.gap)}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* ── BG Color ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <VisualControl
          label="BG Color"
          prefix="bg-"
          value={cleanVal(v.bg)}
          options={prioritizeColors(themeColors as any[], 'background-')}
          originalClass={v.bg_original}
          type="input"
          inheritedValue={cleanVal(domV?.bg)}
        />
      </div>

      {/* ── Border color ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <button
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', height: '14px', width: 'fit-content' }}
          onClick={() => setBorderColorExpanded((x) => !x)}
          onMouseEnter={() => setBorderColorHovered(true)}
          onMouseLeave={() => setBorderColorHovered(false)}
          title={borderColorExpanded ? 'Collapse border colors' : 'Expand border colors'}
        >
          <span style={{ fontSize: '9px', color: borderColorHovered ? theme.text_secondary : theme.text_tertiary, textTransform: 'uppercase', transition: 'color 0.15s' }}>Border color</span>
          <span style={{ color: borderColorHovered ? theme.text_secondary : theme.text_tertiary, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}>
            {borderColorExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </span>
        </button>

        <BorderColorAutocomplete
          value={cleanVal(v.borderColor)}
          onChange={(val, prevVal) => handleBorderColorUpdate('all', val, prevVal)}
          icon={<BorderAllIcon />}
          inheritedValue={cleanVal(domV?.borderColor)}
          colorOptions={prioritizeColors(themeColors as any[], 'border-')}
        />

        {borderColorExpanded && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <BorderColorAutocomplete
              value={cleanVal(v.borderColorT)}
              onChange={(val, prevVal) => handleBorderColorUpdate('t', val, prevVal)}
              icon={<BorderTIcon />}
              inheritedValue={cleanVal(domV?.borderColorT)}
              colorOptions={prioritizeColors(themeColors as any[], 'border-')}
            />
            <BorderColorAutocomplete
              value={cleanVal(v.borderColorR)}
              onChange={(val, prevVal) => handleBorderColorUpdate('r', val, prevVal)}
              icon={<BorderRIcon />}
              inheritedValue={cleanVal(domV?.borderColorR)}
              colorOptions={prioritizeColors(themeColors as any[], 'border-')}
            />
            <BorderColorAutocomplete
              value={cleanVal(v.borderColorB)}
              onChange={(val, prevVal) => handleBorderColorUpdate('b', val, prevVal)}
              icon={<BorderBIcon />}
              inheritedValue={cleanVal(domV?.borderColorB)}
              colorOptions={prioritizeColors(themeColors as any[], 'border-')}
            />
            <BorderColorAutocomplete
              value={cleanVal(v.borderColorL)}
              onChange={(val, prevVal) => handleBorderColorUpdate('l', val, prevVal)}
              icon={<BorderLIcon />}
              inheritedValue={cleanVal(domV?.borderColorL)}
              colorOptions={prioritizeColors(themeColors as any[], 'border-')}
            />
          </div>
        )}
      </div>

      {/* ── Border radius ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* Clickable label row – chevron sits right after the text */}
        <button
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            height: '14px',
            width: 'fit-content',
          }}
          onClick={() => setRadiusExpanded((x) => !x)}
          onMouseEnter={() => setRadiusHovered(true)}
          onMouseLeave={() => setRadiusHovered(false)}
          title={radiusExpanded ? 'Collapse corners' : 'Expand corners'}
        >
          <span style={{ fontSize: '9px', color: radiusHovered ? theme.text_secondary : theme.text_tertiary, textTransform: 'uppercase', transition: 'color 0.15s' }}>Border radius</span>
          <span style={{ color: radiusHovered ? theme.text_secondary : theme.text_tertiary, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}>
            {radiusExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </span>
        </button>

        {/* All corners */}
        <RadiusAutocomplete
          value={v.radius === '-' ? '' : v.radius}
          onChange={(val, prevVal) => handleRadiusUpdate('all', val, prevVal)}
          placeholder="—"
          icon={<CornerAllIcon />}
          inheritedValue={cleanVal(domV?.radius)}
        />

        {/* Expanded – 4 individual corners */}
        {radiusExpanded && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <RadiusAutocomplete
              value={cornerVal('TL')}
              onChange={(val, prevVal) => handleRadiusUpdate('tl', val, prevVal)}
              placeholder="—"
              icon={<CornerTLIcon />}
              inheritedValue={cleanVal(domV?.radiusTL)}
            />
            <RadiusAutocomplete
              value={cornerVal('TR')}
              onChange={(val, prevVal) => handleRadiusUpdate('tr', val, prevVal)}
              placeholder="—"
              icon={<CornerTRIcon />}
              inheritedValue={cleanVal(domV?.radiusTR)}
            />
            <RadiusAutocomplete
              value={cornerVal('BL')}
              onChange={(val, prevVal) => handleRadiusUpdate('bl', val, prevVal)}
              placeholder="—"
              icon={<CornerBLIcon />}
              inheritedValue={cleanVal(domV?.radiusBL)}
            />
            <RadiusAutocomplete
              value={cornerVal('BR')}
              onChange={(val, prevVal) => handleRadiusUpdate('br', val, prevVal)}
              placeholder="—"
              icon={<CornerBRIcon />}
              inheritedValue={cleanVal(domV?.radiusBR)}
            />
          </div>
        )}
      </div>

      </div>{/* end fieldsets gap wrapper */}

    </VisualSection>
  );
};
