// plugins/protovibe/src/ui/components/visual/Effects.tsx
import React from 'react';
import { VisualSection } from './VisualSection';
import { VisualControl } from './VisualControl';
import { SCALES } from '../../constants/tailwind';
import { cleanVal } from '../../utils/tailwind';
import { useProtovibe } from '../../context/ProtovibeContext';

export const Effects: React.FC<{ v: any; domV?: any }> = ({ v, domV }) => {
  const { themeColors } = useProtovibe();
  return (
    <VisualSection title="Effects">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <VisualControl label="Opacity" prefix="opacity-" value={cleanVal(v.opacity)} options={SCALES.opacity} originalClass={v.opacity_original} type="input" inheritedValue={cleanVal(domV?.opacity)} />
        <VisualControl label="Box shadow" prefix="shadow-" value={cleanVal(v.shadow)} options={SCALES.shadow.filter(o => o.val !== 'inner')} originalClass={v.shadow_original} type="input" inheritedValue={cleanVal(domV?.shadow)} />
        <VisualControl label="Inset shadow" prefix="shadow-" value={cleanVal(v.insetShadow)} options={[{ val: 'inner', desc: 'Inner' }, { val: 'none', desc: 'None' }]} originalClass={v.insetShadow_original} type="input" inheritedValue={cleanVal(domV?.insetShadow)} />
      </div>
    </VisualSection>
  );
};
