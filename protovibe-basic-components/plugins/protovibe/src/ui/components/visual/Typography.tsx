// plugins/protovibe/src/ui/components/visual/Typography.tsx
import React from 'react';
import { VisualSection } from './VisualSection';
import { VisualControl } from './VisualControl';
import { SegmentedControl } from './SegmentedControl';
import { cleanVal } from '../../utils/tailwind';
import { useScales } from '../../hooks/useScales';
import { prioritizeColors } from '../../constants/tailwind';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, Underline, Strikethrough, RemoveFormatting } from 'lucide-react';
import { theme } from '../../theme';
import { useProtovibe } from '../../context/ProtovibeContext';

export const Typography: React.FC<{ v: any; domV?: any }> = ({ v, domV }) => {
  const { themeColors } = useProtovibe();
  const scales = useScales();
  return (
    <VisualSection title="Typography">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <VisualControl label="Text color" prefix="text-" value={cleanVal(v.textColor)} options={prioritizeColors(themeColors as any[], 'foreground-')} originalClass={v.textColor_original} type="input" inheritedValue={cleanVal(domV?.textColor)} />
          <VisualControl label="Font size" prefix="text-" value={cleanVal(v.textSize)} options={scales.textSize} originalClass={v.textSize_original} type="input" inheritedValue={cleanVal(domV?.textSize)} />
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <VisualControl label="Font family" prefix="font-" value={v.fontFamily} options={scales.fontFamily} originalClass={v.fontFamily_original} type="input" inheritedValue={domV?.fontFamily} />
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '9px', color: theme.text_tertiary, textTransform: 'uppercase' }}>Align</span>
          <SegmentedControl
            label=""
            value={v.textAlign}
            originalClass={v.textAlign_original}
            prefix="text-"
            inheritedValue={domV?.textAlign}
            width="100%"
            segments={[
              { icon: <AlignLeft size={14} />, val: 'left', title: 'Left' },
              { icon: <AlignCenter size={14} />, val: 'center', title: 'Center' },
              { icon: <AlignRight size={14} />, val: 'right', title: 'Right' },
              { icon: <AlignJustify size={14} />, val: 'justify', title: 'Justify' }
            ]}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '9px', color: theme.text_tertiary, textTransform: 'uppercase' }}>Decor</span>
          <SegmentedControl
            label=""
            value={v.textDecoration}
            originalClass={v.textDecoration_original}
            inheritedValue={domV?.textDecoration}
            width="100%"
            segments={[
              { icon: <RemoveFormatting size={14} />, val: 'no-underline', title: 'None' },
              { icon: <Underline size={14} />, val: 'underline', title: 'Underline' },
              { icon: <Strikethrough size={14} />, val: 'line-through', title: 'Strikethrough' }
            ]}
          />
        </div>
      </div>
    </VisualSection>
  );
};
