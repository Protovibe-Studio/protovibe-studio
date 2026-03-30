// plugins/protovibe/src/ui/components/visual/Typography.tsx
import React from 'react';
import { VisualSection } from './VisualSection';
import { VisualControl } from './VisualControl';
import { SegmentedControl } from './SegmentedControl';
import { SCALES } from '../../constants/tailwind';
import { cleanVal } from '../../utils/tailwind';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, Underline, Strikethrough, RemoveFormatting } from 'lucide-react';
import { theme } from '../../theme';
import { useProtovibe } from '../../context/ProtovibeContext';

export const Typography: React.FC<{ v: any; domV?: any }> = ({ v, domV }) => {
  const { themeColors } = useProtovibe();
  return (
    <VisualSection title="Typography">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <VisualControl label="Font" prefix="font-" value={v.fontFamily} options={SCALES.fontFamily} originalClass={v.fontFamily_original} type="input" inheritedValue={domV?.fontFamily} />
          <VisualControl label="Weight" prefix="font-" value={v.fontWeight} options={[
            { val: 'thin', desc: '100' },
            { val: 'light', desc: '300' },
            { val: 'normal', desc: '400' },
            { val: 'medium', desc: '500' },
            { val: 'semibold', desc: '600' },
            { val: 'bold', desc: '700' },
            { val: 'black', desc: '900' }
          ]} originalClass={v.fontWeight_original} inheritedValue={domV?.fontWeight} />
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <VisualControl label="Size" prefix="text-" value={cleanVal(v.textSize)} options={SCALES.textSize} originalClass={v.textSize_original} type="input" inheritedValue={cleanVal(domV?.textSize)} />
          <VisualControl label="Color" prefix="text-" value={cleanVal(v.textColor)} options={themeColors} originalClass={v.textColor_original} type="input" inheritedValue={cleanVal(domV?.textColor)} />
        </div>

        <SegmentedControl
          label="Align"
          value={v.textAlign}
          originalClass={v.textAlign_original}
          prefix="text-"
          inheritedValue={domV?.textAlign}
          segments={[
            { icon: <AlignLeft size={14} />, val: 'left', title: 'Left' },
            { icon: <AlignCenter size={14} />, val: 'center', title: 'Center' },
            { icon: <AlignRight size={14} />, val: 'right', title: 'Right' },
            { icon: <AlignJustify size={14} />, val: 'justify', title: 'Justify' }
          ]}
        />

        <SegmentedControl
          label="Decor"
          value={v.textDecoration}
          originalClass={v.textDecoration_original}
          inheritedValue={domV?.textDecoration}
          segments={[
            { icon: <RemoveFormatting size={14} />, val: 'no-underline', title: 'None' },
            { icon: <Underline size={14} />, val: 'underline', title: 'Underline' },
            { icon: <Strikethrough size={14} />, val: 'line-through', title: 'Strikethrough' }
          ]}
        />
      </div>
    </VisualSection>
  );
};
