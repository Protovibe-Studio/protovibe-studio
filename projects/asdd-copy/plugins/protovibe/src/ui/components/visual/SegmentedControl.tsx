// plugins/protovibe/src/ui/components/visual/SegmentedControl.tsx
import React from 'react';
import { useProtovibe } from '../../context/ProtovibeContext';
import { takeSnapshot, updateSource } from '../../api/client';
import { buildContextPrefix } from '../../utils/tailwind';
import { theme } from '../../theme';

interface Segment {
  label?: string;
  icon?: React.ReactNode;
  val: string;
  title?: string;
  prefix?: string;
  shadow?: string;
}

interface SegmentedControlProps {
  label: string;
  value: string | string[];
  segments: Segment[];
  originalClass?: string;
  prefix?: string;
  width?: string;
  onChange?: (val: string) => void;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({ label, value, segments, originalClass, prefix = '', width = '100%', onChange }) => {
  const { activeData, activeSourceId, activeModifiers, runLockedMutation } = useProtovibe();

  const isNoneLike = (seg: Segment) => seg.val === 'none' || seg.val === '' || seg.label === 'All';
  const hasResetOption = segments.some(seg => seg.val === 'none' || seg.val === '');

  const handleSelect = async (val: string, segmentPrefix?: string) => {
    let finalVal = val;
    // If not a control with an explicit reset option (none/''), allow toggling off
    if (!hasResetOption) {
      const isSelected = Array.isArray(value) ? value.includes(val) : value === val;
      if (isSelected) {
        finalVal = '';
      }
    }

    if (onChange) {
      onChange(finalVal);
      return;
    }
    if (!activeData?.file) return;

    const currentContextPrefix = buildContextPrefix(activeModifiers);
    const finalPrefix = segmentPrefix !== undefined ? segmentPrefix : prefix;
    let newClass = finalVal ? `${currentContextPrefix}${finalPrefix}${finalVal}` : '';

    if (originalClass === newClass) return;

    await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId!);

      let action = 'edit';
      if (!originalClass && newClass) action = 'add';
      if (originalClass && !newClass) action = 'remove';

      await updateSource({
        ...activeData,
        id: activeSourceId!,
        oldClass: originalClass || '',
        newClass,
        action
      });
    });
  };

  const groupStyle: React.CSSProperties = {
    display: 'flex',
    background: theme.bg_secondary,
    borderRadius: '4px',
    border: `1px solid ${theme.border_default}`,
    overflow: 'hidden',
    flex: 1
  };

  const btnStyle = (isActive: boolean, seg: Segment): React.CSSProperties => {
    // If active and value is "None"-like, use grey. Else blue.
    const activeColor = isNoneLike(seg) ? theme.text_secondary : theme.accent_default;

    return {
      flex: 1,
      padding: '4px 8px',
      background: isActive ? theme.bg_tertiary : 'transparent',
      border: 'none',
      color: isActive ? activeColor : theme.text_tertiary,
      fontSize: '11px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: seg.shadow || (seg.highlight ? `inset 0 -2px 0 0 ${theme.success_default}` : 'none')
    };
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width }}>
      {label && <span style={{ fontSize: '9px', color: theme.text_tertiary, textTransform: 'uppercase', width: '50px', flexShrink: 0 }}>{label}</span>}
      <div style={groupStyle}>
        {segments.map((seg, idx) => {
          const isActive = Array.isArray(value) ? value.includes(seg.val) : value === seg.val;
          return (
            <React.Fragment key={seg.val}>
              {idx > 0 && <div style={{ width: '1px', background: theme.border_default }}></div>}
              <button 
                onClick={() => handleSelect(seg.val, seg.prefix)}
                style={btnStyle(isActive, seg)}
                title={seg.title || seg.label}
              >
                {seg.icon && <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{seg.icon}</span>}
                {seg.label && <span style={{ marginLeft: seg.icon ? '4px' : '0' }}>{seg.label}</span>}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};