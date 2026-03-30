// plugins/protovibe/src/ui/components/visual/Spacing.tsx
import React from 'react';
import { VisualSection } from './VisualSection';
import { useProtovibe } from '../../context/ProtovibeContext';
import { takeSnapshot, updateSource } from '../../api/client';
import { buildContextPrefix, makeSafe, computeOptimalSpacing, cleanVal } from '../../utils/tailwind';
import { SCALES } from '../../constants/tailwind';
import { theme } from '../../theme';
import { AutocompleteDropdown } from './AutocompleteDropdown';

const SpacingAutocomplete: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  posStyle: React.CSSProperties;
  inheritedPlaceholder?: string;
}> = ({ value, onChange, placeholder, posStyle, inheritedPlaceholder }) => {
  return (
    <AutocompleteDropdown
      value={value === '-' ? '' : value}
      options={SCALES.spacing}
      onCommit={onChange}
      placeholder={inheritedPlaceholder && !(value && value !== '-') ? inheritedPlaceholder : placeholder}
      zIndex={999999}
      containerStyle={{ ...posStyle, position: 'absolute', width: '34px', height: '16px' }}
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
};

export const Spacing: React.FC<{ v: any; domV?: any }> = ({ v, domV }) => {
  const { activeData, activeSourceId, activeModifiers, runLockedMutation } = useProtovibe();

  const handleSpacingUpdate = async (type: 'm' | 'p', direction: 't' | 'r' | 'b' | 'l', newVal: string) => {
    if (!activeData?.file) return;
    const safeVal = makeSafe(newVal);

    // Get current values
    const vals = {
      t: cleanVal(type === 'm' ? v.mt : v.pt),
      r: cleanVal(type === 'm' ? v.mr : v.pr),
      b: cleanVal(type === 'm' ? v.mb : v.pb),
      l: cleanVal(type === 'm' ? v.ml : v.pl),
    };

    // Apply the newly typed value
    vals[direction] = safeVal || '';

    // Recompute the optimal Tailwind classes (e.g. converting pt-4 pb-4 to py-4)
    const newClassesStr = computeOptimalSpacing(type, vals.t, vals.r, vals.b, vals.l);
    const newClasses = newClassesStr.split(' ').filter(Boolean);
    
    const origClasses = type === 'm' ? v.origMargin : v.origPadding;
    const currentContextPrefix = buildContextPrefix(activeModifiers);

    await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId!);

      const prefixedNewClasses = newClasses.map((c: string) => `${currentContextPrefix}${c}`).join(' ');

      // Use the backend's replace-multiple to safely strip all old margin/padding and inject the new set
      await updateSource({
        ...activeData,
        id: activeSourceId!,
        oldClasses: origClasses,
        newClass: prefixedNewClasses,
        action: 'replace-multiple'
      });
    });
  };
  
  const labelStyle = (pos: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute', fontSize: '8px', letterSpacing: '0.5px', color: '#888', ...pos
  });

  return (
    <VisualSection title="Spacing" defaultOpen>
      <div style={{ padding: '16px 0', borderBottom: `1px solid ${theme.border_default}`, display: 'flex', justifyContent: 'center' }}>
        <div style={{ borderStyle: 'solid', borderWidth: '24px 36px', borderColor: `${theme.border_default} ${theme.bg_secondary} ${theme.border_default} ${theme.bg_secondary}`, position: 'relative', borderRadius: '4px', display: 'flex', margin: '0 16px', width: '100%', maxWidth: '240px' }}>
          <span style={labelStyle({ top: '-18px', left: '-28px' })}>MARGIN</span>
          
          <SpacingAutocomplete posStyle={{ top: '-18px', left: '50%', transform: 'translateX(-50%)' }} value={v.mt === '-' ? '' : v.mt} onChange={(val) => handleSpacingUpdate('m', 't', val)} placeholder="-" inheritedPlaceholder={cleanVal(domV?.mt)} />
          <SpacingAutocomplete posStyle={{ bottom: '-18px', left: '50%', transform: 'translateX(-50%)' }} value={v.mb === '-' ? '' : v.mb} onChange={(val) => handleSpacingUpdate('m', 'b', val)} placeholder="-" inheritedPlaceholder={cleanVal(domV?.mb)} />
          <SpacingAutocomplete posStyle={{ left: '-34px', top: '50%', transform: 'translateY(-50%)' }} value={v.ml === '-' ? '' : v.ml} onChange={(val) => handleSpacingUpdate('m', 'l', val)} placeholder="-" inheritedPlaceholder={cleanVal(domV?.ml)} />
          <SpacingAutocomplete posStyle={{ right: '-34px', top: '50%', transform: 'translateY(-50%)' }} value={v.mr === '-' ? '' : v.mr} onChange={(val) => handleSpacingUpdate('m', 'r', val)} placeholder="-" inheritedPlaceholder={cleanVal(domV?.mr)} />
          
          <div style={{ flex: 1, borderStyle: 'solid', borderWidth: '24px 36px', borderColor: `${theme.border_strong} ${theme.border_default} ${theme.border_strong} ${theme.border_default}`, position: 'relative', display: 'flex' }}>
            <span style={labelStyle({ top: '-18px', left: '-28px' })}>PADDING</span>
            
            <SpacingAutocomplete posStyle={{ top: '-18px', left: '50%', transform: 'translateX(-50%)' }} value={v.pt === '-' ? '' : v.pt} onChange={(val) => handleSpacingUpdate('p', 't', val)} placeholder="-" inheritedPlaceholder={cleanVal(domV?.pt)} />
            <SpacingAutocomplete posStyle={{ bottom: '-18px', left: '50%', transform: 'translateX(-50%)' }} value={v.pb === '-' ? '' : v.pb} onChange={(val) => handleSpacingUpdate('p', 'b', val)} placeholder="-" inheritedPlaceholder={cleanVal(domV?.pb)} />
            <SpacingAutocomplete posStyle={{ left: '-34px', top: '50%', transform: 'translateY(-50%)' }} value={v.pl === '-' ? '' : v.pl} onChange={(val) => handleSpacingUpdate('p', 'l', val)} placeholder="-" inheritedPlaceholder={cleanVal(domV?.pl)} />
            <SpacingAutocomplete posStyle={{ right: '-34px', top: '50%', transform: 'translateY(-50%)' }} value={v.pr === '-' ? '' : v.pr} onChange={(val) => handleSpacingUpdate('p', 'r', val)} placeholder="-" inheritedPlaceholder={cleanVal(domV?.pr)} />
            
            <div style={{ flex: 1, background: theme.bg_default, minHeight: '16px', minWidth: '32px', border: `1px solid ${theme.border_strong}` }}></div>
          </div>
        </div>
      </div>
    </VisualSection>
  );
};