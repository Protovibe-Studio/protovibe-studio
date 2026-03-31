// plugins/protovibe/src/ui/components/visual/Spacing.tsx
import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { VisualSection } from './VisualSection';
import { VisualControl } from './VisualControl';
import { AutocompleteDropdown } from './AutocompleteDropdown';
import { SpacingBoxSVG } from './SpacingBoxSVG';
import { useProtovibe } from '../../context/ProtovibeContext';
import { takeSnapshot, updateSource } from '../../api/client';
import { buildContextPrefix, makeSafe, computeOptimalSpacing, cleanVal } from '../../utils/tailwind';
import { SCALES } from '../../constants/tailwind';
import { theme } from '../../theme';

// ─── Corner icons ──────────────────────────────────────────────────────────────

const CornerAllIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <rect x="1.5" y="1.5" width="9" height="9" rx="2.5" stroke="currentColor" strokeWidth="1.2" />
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
  onChange: (val: string) => void;
  placeholder: string;
  posStyle: React.CSSProperties;
  inheritedPlaceholder?: string;
  options?: typeof SCALES.spacing;
}> = ({ value, onChange, placeholder, posStyle, inheritedPlaceholder, options = SCALES.spacing }) => (
  <AutocompleteDropdown
    value={value === '-' ? '' : value}
    options={options}
    onCommit={onChange}
    placeholder={
      inheritedPlaceholder && !(value && value !== '-') ? inheritedPlaceholder : placeholder
    }
    zIndex={999999}
    containerStyle={{ ...posStyle, position: 'absolute', width: '36px', height: '16px' }}
    inputStyle={{
      width: '100%',
      height: '100%',
      background: 'transparent',
      border: '1px solid transparent',
      fontWeight: 'bold',
      fontSize: '10px',
      textAlign: 'center',
      outline: 'none',
      borderRadius: '2px',
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
    onInputFocus={(e) => {
      e.currentTarget.style.background = theme.bg_secondary;
      e.currentTarget.style.borderColor = theme.accent_default;
    }}
    onInputBlur={(e) => {
      e.currentTarget.style.background = 'transparent';
      e.currentTarget.style.borderColor = 'transparent';
    }}
    onInputMouseEnter={(e) => {
      if (document.activeElement !== e.currentTarget) {
        e.currentTarget.style.borderColor = theme.border_strong;
      }
    }}
    onInputMouseLeave={(e) => {
      if (document.activeElement !== e.currentTarget) {
        e.currentTarget.style.borderColor = 'transparent';
      }
    }}
  />
);

// ─── RadiusAutocomplete ────────────────────────────────────────────────────────
// Full-width autocomplete for border radius with an icon prefix.

const RadiusAutocomplete: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  icon: React.ReactNode;
  inheritedValue?: string;
}> = ({ value, onChange, placeholder, icon, inheritedValue }) => (
  <AutocompleteDropdown
    value={value === '-' ? '' : value}
    options={SCALES.radius}
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

// ─── Essentials section ────────────────────────────────────────────────────────

export const Spacing: React.FC<{ v: any; domV?: any }> = ({ v, domV }) => {
  const { activeData, activeSourceId, activeModifiers, runLockedMutation, themeColors } = useProtovibe();
  const [radiusExpanded, setRadiusExpanded] = useState(false);

  // ── Spacing update ──────────────────────────────────────────────────────────

  const handleSpacingUpdate = async (
    type: 'm' | 'p',
    direction: 't' | 'r' | 'b' | 'l',
    newVal: string,
  ) => {
    if (!activeData?.file) return;
    const safeVal = makeSafe(newVal);

    const vals = {
      t: cleanVal(type === 'm' ? v.mt : v.pt),
      r: cleanVal(type === 'm' ? v.mr : v.pr),
      b: cleanVal(type === 'm' ? v.mb : v.pb),
      l: cleanVal(type === 'm' ? v.ml : v.pl),
    };
    vals[direction] = safeVal || '';

    const newClassesStr = computeOptimalSpacing(type, vals.t, vals.r, vals.b, vals.l);
    const newClasses = newClassesStr.split(' ').filter(Boolean);
    const origClasses = type === 'm' ? v.origMargin : v.origPadding;
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

  const handleBorderUpdate = async (newVal: string) => {
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
      const origClass = v.borderWidth_original || '';
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

  const handleBorderSideUpdate = async (side: 't' | 'r' | 'b' | 'l', newVal: string) => {
    if (!activeData?.file) return;
    const safeVal = makeSafe(newVal);
    const currentContextPrefix = buildContextPrefix(activeModifiers);
    const sideKey = side === 't' ? 'borderT' : side === 'r' ? 'borderR' : side === 'b' ? 'borderB' : 'borderL';

    let newClass = '';
    if (safeVal && safeVal !== '-') {
      newClass = safeVal === 'DEFAULT'
        ? `${currentContextPrefix}border-${side}`
        : `${currentContextPrefix}border-${side}-${safeVal}`;
    }

    await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId!);
      const origClass = v[`${sideKey}_original`] || '';
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

  // ── Radius update ───────────────────────────────────────────────────────────

  const handleRadiusUpdate = async (
    corner: 'all' | 'tl' | 'tr' | 'br' | 'bl',
    newVal: string,
  ) => {
    if (!activeData?.file) return;
    const safeVal = makeSafe(newVal);
    const currentContextPrefix = buildContextPrefix(activeModifiers);

    const isAll = corner === 'all';
    const origClass = isAll
      ? v.radius_original || ''
      : v[`radius${corner.toUpperCase()}_original`] || '';

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

  // ── Gap update ──────────────────────────────────────────────────────────────

  const handleGapUpdate = async (newVal: string) => {
    if (!activeData?.file) return;
    const safeVal = makeSafe(newVal);
    const currentContextPrefix = buildContextPrefix(activeModifiers);

    const newClass = safeVal && safeVal !== '-' ? `${currentContextPrefix}gap-${safeVal}` : '';

    await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId!);
      const origClass = v.gap_original || '';
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
    return raw && raw !== '-' ? raw : '';
  };

  // ── Expand button style ─────────────────────────────────────────────────────

  const expandBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    padding: '2px',
    cursor: 'pointer',
    color: theme.text_tertiary,
    display: 'flex',
    alignItems: 'center',
    borderRadius: '3px',
    flexShrink: 0,
  };

  return (
    <VisualSection title="Essentials" defaultOpen>
      {/* ── Box model SVG with overlay inputs ── */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1', marginBottom: '12px' }}>
        <SpacingBoxSVG style={{ width: '100%', height: '100%', display: 'block' }} />

        {/* Margin – top / bottom / left / right */}
        <SpacingAutocomplete
          posStyle={centreH(7)}
          value={v.mt === '-' ? '' : v.mt}
          onChange={(val) => handleSpacingUpdate('m', 't', val)}
          placeholder="-"
          inheritedPlaceholder={cleanVal(domV?.mt)}
        />
        <SpacingAutocomplete
          posStyle={centreH(93)}
          value={v.mb === '-' ? '' : v.mb}
          onChange={(val) => handleSpacingUpdate('m', 'b', val)}
          placeholder="-"
          inheritedPlaceholder={cleanVal(domV?.mb)}
        />
        <SpacingAutocomplete
          posStyle={centre(7)}
          value={v.ml === '-' ? '' : v.ml}
          onChange={(val) => handleSpacingUpdate('m', 'l', val)}
          placeholder="-"
          inheritedPlaceholder={cleanVal(domV?.ml)}
        />
        <SpacingAutocomplete
          posStyle={centre(93)}
          value={v.mr === '-' ? '' : v.mr}
          onChange={(val) => handleSpacingUpdate('m', 'r', val)}
          placeholder="-"
          inheritedPlaceholder={cleanVal(domV?.mr)}
        />

        {/* Border sides – top / bottom / left / right */}
        <SpacingAutocomplete
          posStyle={centreH(19)}
          value={borderSideVal('borderT')}
          onChange={(val) => handleBorderSideUpdate('t', val)}
          placeholder="-"
          options={SCALES.borderWidth}
          inheritedPlaceholder={cleanVal(domV?.borderT)}
        />
        <SpacingAutocomplete
          posStyle={centreH(81)}
          value={borderSideVal('borderB')}
          onChange={(val) => handleBorderSideUpdate('b', val)}
          placeholder="-"
          options={SCALES.borderWidth}
          inheritedPlaceholder={cleanVal(domV?.borderB)}
        />
        <SpacingAutocomplete
          posStyle={centre(19)}
          value={borderSideVal('borderL')}
          onChange={(val) => handleBorderSideUpdate('l', val)}
          placeholder="-"
          options={SCALES.borderWidth}
          inheritedPlaceholder={cleanVal(domV?.borderL)}
        />
        <SpacingAutocomplete
          posStyle={centre(81)}
          value={borderSideVal('borderR')}
          onChange={(val) => handleBorderSideUpdate('r', val)}
          placeholder="-"
          options={SCALES.borderWidth}
          inheritedPlaceholder={cleanVal(domV?.borderR)}
        />

        {/* Padding – top / bottom / left / right */}
        <SpacingAutocomplete
          posStyle={centreH(30)}
          value={v.pt === '-' ? '' : v.pt}
          onChange={(val) => handleSpacingUpdate('p', 't', val)}
          placeholder="-"
          inheritedPlaceholder={cleanVal(domV?.pt)}
        />
        <SpacingAutocomplete
          posStyle={centreH(70)}
          value={v.pb === '-' ? '' : v.pb}
          onChange={(val) => handleSpacingUpdate('p', 'b', val)}
          placeholder="-"
          inheritedPlaceholder={cleanVal(domV?.pb)}
        />
        <SpacingAutocomplete
          posStyle={centre(30)}
          value={v.pl === '-' ? '' : v.pl}
          onChange={(val) => handleSpacingUpdate('p', 'l', val)}
          placeholder="-"
          inheritedPlaceholder={cleanVal(domV?.pl)}
        />
        <SpacingAutocomplete
          posStyle={centre(70)}
          value={v.pr === '-' ? '' : v.pr}
          onChange={(val) => handleSpacingUpdate('p', 'r', val)}
          placeholder="-"
          inheritedPlaceholder={cleanVal(domV?.pr)}
        />

        {/* Gap – content area centre */}
        <SpacingAutocomplete
          posStyle={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
          value={v.gap === '-' ? '' : v.gap}
          onChange={handleGapUpdate}
          placeholder="-"
          inheritedPlaceholder={cleanVal(domV?.gap)}
        />
      </div>

      {/* ── Border radius ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
        {/* Label row with expand button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '10px', fontWeight: 600, color: theme.text_tertiary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Radius</span>
          <button
            style={expandBtnStyle}
            onClick={() => setRadiusExpanded((x) => !x)}
            title={radiusExpanded ? 'Collapse corners' : 'Expand corners'}
          >
            {radiusExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>

        {/* All corners */}
        <RadiusAutocomplete
          value={v.radius === '-' ? '' : v.radius}
          onChange={(val) => handleRadiusUpdate('all', val)}
          placeholder="—"
          icon={<CornerAllIcon />}
          inheritedValue={cleanVal(domV?.radius)}
        />

        {/* Expanded – 4 individual corners */}
        {radiusExpanded && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <RadiusAutocomplete
              value={cornerVal('TL')}
              onChange={(val) => handleRadiusUpdate('tl', val)}
              placeholder="—"
              icon={<CornerTLIcon />}
              inheritedValue={cleanVal(domV?.radiusTL)}
            />
            <RadiusAutocomplete
              value={cornerVal('TR')}
              onChange={(val) => handleRadiusUpdate('tr', val)}
              placeholder="—"
              icon={<CornerTRIcon />}
              inheritedValue={cleanVal(domV?.radiusTR)}
            />
            <RadiusAutocomplete
              value={cornerVal('BL')}
              onChange={(val) => handleRadiusUpdate('bl', val)}
              placeholder="—"
              icon={<CornerBLIcon />}
              inheritedValue={cleanVal(domV?.radiusBL)}
            />
            <RadiusAutocomplete
              value={cornerVal('BR')}
              onChange={(val) => handleRadiusUpdate('br', val)}
              placeholder="—"
              icon={<CornerBRIcon />}
              inheritedValue={cleanVal(domV?.radiusBR)}
            />
          </div>
        )}
      </div>

      {/* ── BG Color ── */}
      <VisualControl
        label="BG Color"
        prefix="bg-"
        value={cleanVal(v.bg)}
        options={themeColors as any[]}
        originalClass={v.bg_original}
        type="input"
        inheritedValue={cleanVal(domV?.bg)}
      />
    </VisualSection>
  );
};
