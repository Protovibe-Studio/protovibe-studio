// plugins/protovibe/src/ui/components/Modifiers.tsx
import React from 'react';
import { useProtovibe } from '../context/ProtovibeContext';
import { extractAvailableModifiers } from '../utils/tailwind';
import { SegmentedControl } from './visual/SegmentedControl';
import { theme } from '../theme';

export const Modifiers: React.FC = () => {
  const { activeModifiers, setActiveModifiers, activeData, currentBaseTarget } = useProtovibe();

  if (!activeData) return null;

  // 1. Get classes from the consumer's source code
  const flatClasses = activeData.parsedClasses ? Object.values(activeData.parsedClasses).flat().map((c: any) => c.cls) : [];
  
  // 2. Get the full concatenated class string directly from the rendered DOM element
  const domClasses = currentBaseTarget?.getAttribute('class')?.split(/\s+/) || [];

  // 3. Combine them and extract all data-* modifiers
  const combinedClasses = [...flatClasses, ...domClasses];
  const availableDataAttrs = extractAvailableModifiers(combinedClasses);

  const handleInteraction = (val: string) => {
    setActiveModifiers(prev => {
      if (val === 'none') return { ...prev, interaction: [] };
      const interaction = [...prev.interaction];
      const idx = interaction.indexOf(val);
      if (idx > -1) interaction.splice(idx, 1);
      else interaction.push(val);
      return { ...prev, interaction };
    });
  };

  const handleBreakpoint = (val: string) => {
    setActiveModifiers(prev => ({ ...prev, breakpoint: val === 'none' ? null : val }));
  };

  const handleDataAttr = (key: string, val: string) => {
    setActiveModifiers(prev => {
      const dataAttrs = { ...prev.dataAttrs };
      if (val === 'none') delete dataAttrs[key];
      else dataAttrs[key] = val;
      return { ...prev, dataAttrs };
    });
  };

  return (
    <div style={{ borderTop: `1px solid ${theme.border_default}`, paddingBottom: '16px' }}>
      <div style={{ padding: '12px 16px', color: theme.text_default, fontSize: '10px', fontWeight: '600' }}>
        <span>Which state to style?</span>
      </div>
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Interaction Modifiers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '9px', color: theme.text_tertiary, textTransform: 'uppercase' }}>Interaction</span>
          <SegmentedControl
            label=""
            value={activeModifiers.interaction.length === 0 ? 'none' : activeModifiers.interaction}
            onChange={handleInteraction}
            segments={[
              { label: 'None', val: 'none' },
              { label: 'Hover', val: 'hover', title: 'Hover' },
              { label: 'Active', val: 'active', title: 'Active' },
              { label: 'Focus', val: 'focus', title: 'Focus' },
              { label: 'Disabled', val: 'disabled', title: 'Disabled' }
            ]}
          />
        </div>

        {/* Screen / Breakpoint Modifiers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '9px', color: theme.text_tertiary, textTransform: 'uppercase' }}>Screen</span>
          <SegmentedControl
            label=""
            value={activeModifiers.breakpoint || 'none'}
            onChange={handleBreakpoint}
            segments={[
              { label: 'All', val: 'none' },
              { label: 'Sm', val: 'sm' },
              { label: 'Md', val: 'md' },
              { label: 'Lg', val: 'lg' },
              { label: 'XL', val: 'xl' }
            ]}
          />
        </div>

        {/* Dynamic Variant Modifiers (data-* attributes) */}
        {Object.entries(availableDataAttrs).map(([key, values]) => {
          const activeVal = activeModifiers.dataAttrs[key] || 'none';
          const domVal = currentBaseTarget?.getAttribute(`data-${key}`);
          const segments = [{ label: 'None', val: 'none', shadow: !domVal ? `inset 0 -2px 0 0 ${theme.success_default}` : undefined }];
          
          values.forEach(v => {
            segments.push({
              label: v.charAt(0).toUpperCase() + v.slice(1),
              val: v,
              shadow: domVal === v ? `inset 0 -2px 0 0 ${theme.success_default}` : undefined
            });
          });

          return (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '9px', color: theme.text_tertiary, textTransform: 'uppercase' }}>{key}</span>
              <SegmentedControl
                label=""
                value={activeVal}
                onChange={(val) => handleDataAttr(key, val)}
                segments={segments}
              />
            </div>
          );
        })}

      </div>
    </div>
  );
};