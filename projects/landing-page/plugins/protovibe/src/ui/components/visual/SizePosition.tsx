// plugins/protovibe/src/ui/components/visual/SizePosition.tsx
import React from 'react';
import { VisualSection } from './VisualSection';
import { VisualControl } from './VisualControl';
import { SegmentedControl } from './SegmentedControl';
import { cleanVal } from '../../utils/tailwind';
import { theme } from '../../theme';
import { useScales } from '../../hooks/useScales';

const HeightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 -960 960 960" fill="currentColor">
    <path d="M480-120 320-280l56-56 64 63v-414l-64 63-56-56 160-160 160 160-56 57-64-64v414l64-63 56 56-160 160Z"/>
  </svg>
);

const WidthIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 -960 960 960" fill="currentColor" style={{ transform: 'rotate(90deg)' }}>
    <path d="M480-120 320-280l56-56 64 63v-414l-64 63-56-56 160-160 160 160-56 57-64-64v414l64-63 56 56-160 160Z"/>
  </svg>
);

export const SizePosition: React.FC<{ v: any; domV?: any }> = ({ v, domV }) => {
  const scales = useScales();
  return (
    <VisualSection title="Size">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
          <VisualControl label="Width" prefix="w-" value={cleanVal(v.w)} options={scales.size} originalClass={v.w_original} type="input" inheritedValue={cleanVal(domV?.w)} inputPrefix={<WidthIcon />} />
          <VisualControl label="Min W" prefix="min-w-" value={cleanVal(v.minW)} options={scales.size} originalClass={v.minW_original} type="input" inheritedValue={cleanVal(domV?.minW)} />
          <VisualControl label="Max W" prefix="max-w-" value={cleanVal(v.maxW)} options={scales.size} originalClass={v.maxW_original} type="input" inheritedValue={cleanVal(domV?.maxW)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
          <VisualControl label="Height" prefix="h-" value={cleanVal(v.h)} options={scales.size} originalClass={v.h_original} type="input" inheritedValue={cleanVal(domV?.h)} inputPrefix={<HeightIcon />} />
          <VisualControl label="Min H" prefix="min-h-" value={cleanVal(v.minH)} options={scales.size} originalClass={v.minH_original} type="input" inheritedValue={cleanVal(domV?.minH)} />
          <VisualControl label="Max H" prefix="max-h-" value={cleanVal(v.maxH)} options={scales.size} originalClass={v.maxH_original} type="input" inheritedValue={cleanVal(domV?.maxH)} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '9px', color: theme.text_tertiary, textTransform: 'uppercase' }}>Flex child size</span>
          <SegmentedControl
            label=""
            value={v.flex || (v.flexGrow === 'grow' ? 'grow' : v.flexShrink === 'shrink' ? 'shrink' : '')}
            originalClass={v.flex_original || v.flexGrow_original || v.flexShrink_original}
            inheritedValue={domV?.flex || (domV?.flexGrow === 'grow' ? 'grow' : domV?.flexShrink === 'shrink' ? 'shrink' : undefined)}
            width="100%"
            segments={[
              { label: 'Fill', val: 'flex-1' },
              { label: 'Grow', val: 'grow', prefix: '' },
              { label: 'Shrink', val: 'shrink', prefix: '' },
              { label: 'None', val: 'flex-none' }
            ]}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '9px', color: theme.text_tertiary, textTransform: 'uppercase' }}>Flex child align</span>
          <SegmentedControl
            label=""
            value={v.selfAlign}
            originalClass={v.selfAlign_original}
            inheritedValue={domV?.selfAlign}
            width="100%"
            segments={[
              { label: 'Auto', val: 'self-auto' },
              { label: 'Start', val: 'self-start' },
              { label: 'Center', val: 'self-center' },
              { label: 'End', val: 'self-end' }
            ]}
          />
        </div>
      </div>
    </VisualSection>
  );
};
