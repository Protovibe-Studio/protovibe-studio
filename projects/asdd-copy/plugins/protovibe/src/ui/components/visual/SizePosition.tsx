// plugins/protovibe/src/ui/components/visual/SizePosition.tsx
import React from 'react';
import { VisualSection } from './VisualSection';
import { VisualControl } from './VisualControl';
import { SegmentedControl } from './SegmentedControl';
import { SCALES } from '../../constants/tailwind';
import { cleanVal } from '../../utils/tailwind';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, Underline, Strikethrough, RemoveFormatting } from 'lucide-react';
import { theme } from '../../theme';

export const SizePosition: React.FC<{ v: any }> = ({ v }) => {
  return (
    <VisualSection title="Size & Position">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <VisualControl label="Width" prefix="w-" value={cleanVal(v.w)} options={SCALES.size} originalClass={v.w_original} type="input" />
          <VisualControl label="Height" prefix="h-" value={cleanVal(v.h)} options={SCALES.size} originalClass={v.h_original} type="input" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <VisualControl label="Min W" prefix="min-w-" value={cleanVal(v.minW)} originalClass={v.minW_original} type="input" />
          <VisualControl label="Max W" prefix="max-w-" value={cleanVal(v.maxW)} originalClass={v.maxW_original} type="input" />
          <VisualControl label="Min H" prefix="min-h-" value={cleanVal(v.minH)} originalClass={v.minH_original} type="input" />
          <VisualControl label="Max H" prefix="max-h-" value={cleanVal(v.maxH)} originalClass={v.maxH_original} type="input" />
        </div>

        <div style={{ background: theme.bg_strong, padding: '12px', borderRadius: '6px', border: `1px solid ${theme.border_default}`, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '10px', fontWeight: 'bold', color: theme.text_tertiary, textTransform: 'uppercase' }}>Flex Child</span>
          <SegmentedControl 
            label="Size" 
            value={v.flex || (v.flexGrow === 'grow' ? 'grow' : v.flexShrink === 'shrink' ? 'shrink' : '')} 
            originalClass={v.flex_original || v.flexGrow_original || v.flexShrink_original}
            segments={[
              { label: 'Fill', val: 'flex-1' },
              { label: 'Grow', val: 'grow', prefix: '' },
              { label: 'Shrink', val: 'shrink', prefix: '' },
              { label: 'None', val: 'flex-none' }
            ]}
          />
          <SegmentedControl 
            label="Align" 
            value={v.selfAlign} 
            originalClass={v.selfAlign_original}
            segments={[
              { label: 'Auto', val: 'self-auto' },
              { label: 'Start', val: 'self-start' },
              { label: 'Ctr', val: 'self-center' },
              { label: 'End', val: 'self-end' }
            ]}
          />
        </div>

        <SegmentedControl 
          label="Pos" 
          value={v.position} 
          originalClass={v.position_original}
          segments={[
            { label: 'Stat', val: 'static' },
            { label: 'Rel', val: 'relative' },
            { label: 'Abs', val: 'absolute' },
            { label: 'Fix', val: 'fixed' },
            { label: 'Stk', val: 'sticky' }
          ]}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
          <VisualControl label="Top" prefix="top-" value={cleanVal(v.top)} originalClass={v.top_original} type="input" />
          <VisualControl label="Bott" prefix="bottom-" value={cleanVal(v.bottom)} originalClass={v.bottom_original} type="input" />
          <VisualControl label="Left" prefix="left-" value={cleanVal(v.left)} originalClass={v.left_original} type="input" />
          <VisualControl label="Right" prefix="right-" value={cleanVal(v.right)} originalClass={v.right_original} type="input" />
          <VisualControl label="Z" prefix="z-" value={cleanVal(v.z)} options={SCALES.zIndex} originalClass={v.z_original} type="input" />
        </div>
      </div>
    </VisualSection>
  );
};
