// plugins/protovibe/src/ui/components/visual/Effects.tsx
import React from 'react';
import { VisualSection } from './VisualSection';
import { VisualControl } from './VisualControl';
import { SCALES } from '../../constants/tailwind';
import { cleanVal } from '../../utils/tailwind';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, Underline, Strikethrough, RemoveFormatting } from 'lucide-react';
import { theme } from '../../theme';
import { useProtovibe } from '../../context/ProtovibeContext';

export const Effects: React.FC<{ v: any; domV?: any }> = ({ v, domV }) => {
  const { themeColors } = useProtovibe();
  return (
    <VisualSection title="Background, Border & Effects">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <VisualControl label="BG Color" prefix="bg-" value={cleanVal(v.bg)} options={themeColors} originalClass={v.bg_original} type="input" inheritedValue={cleanVal(domV?.bg)} />
          <VisualControl label="SVG Fill" prefix="fill-" value={cleanVal(v.fill)} options={themeColors} originalClass={v.fill_original} type="input" inheritedValue={cleanVal(domV?.fill)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <VisualControl label="Radius" prefix="rounded-" value={cleanVal(v.radius)} options={SCALES.radius} originalClass={v.radius_original} type="input" inheritedValue={cleanVal(domV?.radius)} />
          <VisualControl label="Bord W" prefix="border-" value={cleanVal(v.borderWidth)} options={SCALES.borderWidth} originalClass={v.borderWidth_original} type="input" inheritedValue={cleanVal(domV?.borderWidth)} />
          <VisualControl label="Bord Clr" prefix="border-" value={cleanVal(v.borderColor)} options={themeColors} originalClass={v.borderColor_original} type="input" inheritedValue={cleanVal(domV?.borderColor)} />
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <VisualControl label="Opacity" prefix="opacity-" value={cleanVal(v.opacity)} options={SCALES.opacity} originalClass={v.opacity_original} type="input" inheritedValue={cleanVal(domV?.opacity)} />
          <VisualControl label="Shadow" prefix="shadow-" value={cleanVal(v.shadow)} options={SCALES.shadow} originalClass={v.shadow_original} type="input" inheritedValue={cleanVal(domV?.shadow)} />
        </div>
      </div>
    </VisualSection>
  );
};
