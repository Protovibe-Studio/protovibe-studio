// plugins/protovibe/src/ui/components/visual/Layout.tsx
import React from 'react';
import { VisualSection } from './VisualSection';
import { SegmentedControl } from './SegmentedControl';
import { VisualControl } from './VisualControl';
import { cleanVal } from '../../utils/tailwind';
import { ArrowRight, ArrowDown, ArrowLeft, ArrowUp } from 'lucide-react';

export const Layout: React.FC<{ v: any; domV?: any }> = ({ v, domV }) => {
  const isFlexOrGrid = v.display === 'flex' || v.display === 'grid' || v.display === 'inline-flex'
    || domV?.display === 'flex' || domV?.display === 'grid' || domV?.display === 'inline-flex';

  return (
    <VisualSection title="Layout">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <SegmentedControl
          label="Display"
          value={v.display}
          originalClass={v.display_original}
          inheritedValue={domV?.display}
          segments={[
            { label: 'Block', val: 'block' },
            { label: 'Flex', val: 'flex' },
            { label: 'Grid', val: 'grid' },
            { label: 'None', val: 'hidden' }
          ]}
        />

        {isFlexOrGrid && (
          <>
            <SegmentedControl
              label="Dir"
              value={v.direction}
              originalClass={v.direction_original}
              inheritedValue={domV?.direction}
              segments={[
                { icon: <ArrowRight size={14} />, val: 'flex-row', title: 'Row' },
                { icon: <ArrowDown size={14} />, val: 'flex-col', title: 'Column' },
                { icon: <ArrowLeft size={14} />, val: 'flex-row-reverse', title: 'Row Reverse' },
                { icon: <ArrowUp size={14} />, val: 'flex-col-reverse', title: 'Column Reverse' }
              ]}
            />
            <SegmentedControl
              label="Align"
              value={v.align}
              originalClass={v.align_original}
              inheritedValue={domV?.align}
              segments={[
                { label: 'Start', val: 'items-start' },
                { label: 'Center', val: 'items-center' },
                { label: 'End', val: 'items-end' },
                { label: 'Stretch', val: 'items-stretch' }
              ]}
            />
            <SegmentedControl
              label="Justify"
              value={v.justify}
              originalClass={v.justify_original}
              inheritedValue={domV?.justify}
              segments={[
                { label: 'Start', val: 'justify-start' },
                { label: 'Center', val: 'justify-center' },
                { label: 'End', val: 'justify-end' },
                { label: 'Betw', val: 'justify-between' }
              ]}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <SegmentedControl
                label="Wrap"
                value={v.wrap}
                originalClass={v.wrap_original}
                inheritedValue={domV?.wrap}
                segments={[
                  { label: 'Wrap', val: 'flex-wrap' },
                  { label: 'No', val: 'flex-nowrap' }
                ]}
                width="100%"
              />
            </div>
            <div>
              <VisualControl label="Gap" prefix="gap-" value={cleanVal(v.gap)} originalClass={v.gap_original} type="input" width="100%" inheritedValue={cleanVal(domV?.gap)} />
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <VisualControl label="Space X" prefix="space-x-" value={cleanVal(v.spaceX)} originalClass={v.spaceX_original} type="input" inheritedValue={cleanVal(domV?.spaceX)} />
          <VisualControl label="Space Y" prefix="space-y-" value={cleanVal(v.spaceY)} originalClass={v.spaceY_original} type="input" inheritedValue={cleanVal(domV?.spaceY)} />
        </div>
      </div>
    </VisualSection>
  );
};
