// plugins/protovibe/src/ui/components/visual/Position.tsx
import React from 'react';
import { VisualSection } from './VisualSection';
import { VisualControl } from './VisualControl';
import { SCALES } from '../../constants/tailwind';
import { cleanVal } from '../../utils/tailwind';

const POSITION_OPTIONS = [
  { val: 'relative', desc: 'relative' },
  { val: 'absolute', desc: 'absolute' },
  { val: 'fixed', desc: 'fixed' },
  { val: 'sticky', desc: 'sticky' },
];

export const Position: React.FC<{ v: any; domV?: any }> = ({ v, domV }) => {
  const activePos = v.position || domV?.position;
  const showOffsets = activePos === 'relative' || activePos === 'absolute' || activePos === 'fixed';

  return (
    <VisualSection title="Position">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <VisualControl
          label="Position"
          prefix=""
          cssProperty="position"
          value={v.position}
          options={POSITION_OPTIONS}
          originalClass={v.position_original}
          type="select"
          inheritedValue={domV?.position}
        />

        {showOffsets && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <VisualControl label="Top" prefix="top-" cssProperty="top" value={cleanVal(v.top)} originalClass={v.top_original} type="input" inheritedValue={cleanVal(domV?.top)} />
            <VisualControl label="Bottom" prefix="bottom-" cssProperty="bottom" value={cleanVal(v.bottom)} originalClass={v.bottom_original} type="input" inheritedValue={cleanVal(domV?.bottom)} />
            <VisualControl label="Left" prefix="left-" cssProperty="left" value={cleanVal(v.left)} originalClass={v.left_original} type="input" inheritedValue={cleanVal(domV?.left)} />
            <VisualControl label="Right" prefix="right-" cssProperty="right" value={cleanVal(v.right)} originalClass={v.right_original} type="input" inheritedValue={cleanVal(domV?.right)} />
          </div>
        )}

        <VisualControl label="Z-index" prefix="z-" cssProperty="zIndex" value={cleanVal(v.z)} options={SCALES.zIndex} originalClass={v.z_original} type="input" inheritedValue={cleanVal(domV?.z)} />
      </div>
    </VisualSection>
  );
};
