// plugins/protovibe/src/ui/components/visual/SegmentedControl.tsx
import React, { useState } from 'react';
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
  dashedHighlight?: boolean;
}

interface SegmentedControlProps {
  label: string;
  value: string | string[];
  segments: Segment[];
  originalClass?: string;
  prefix?: string;
  width?: string;
  onChange?: (val: string) => void;
  inheritedValue?: string;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({ label, value, segments, originalClass, prefix = '', width = '100%', onChange, inheritedValue }) => {
  const { activeData, activeSourceId, activeModifiers, runLockedMutation } = useProtovibe();
  const [hoveredVal, setHoveredVal] = useState<string | null>(null);

  const isNoneLike = (seg: Segment) => seg.val === 'none' || seg.val === '' || seg.label === 'All';
  const hasResetOption = segments.some(seg => seg.val === 'none' || seg.val === '' || seg.val === '__unset__');

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

  const btnStyle = (isActive: boolean, isInherited: boolean, isHovered: boolean, seg: Segment): React.CSSProperties => {
    const activeColor = theme.accent_default;
    const bg = isActive ? theme.bg_tertiary : isInherited ? theme.bg_tertiary : isHovered ? theme.bg_low : 'transparent';
    const color = isActive ? activeColor : isInherited ? theme.text_default : isHovered ? theme.text_secondary : theme.text_tertiary;

    return {
      flex: 1,
      padding: '4px 8px',
      background: bg,
      border: 'none',
      color,
      fontSize: '11px',
      cursor: 'pointer',
      transition: 'background 0.15s, color 0.15s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      boxShadow: seg.shadow || ((seg as any).highlight ? `inset 0 -2px 0 0 ${theme.success_default}` : 'none')
    };
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width }}>
      {label && <span style={{ fontSize: '11px', lineHeight: '11px', color: theme.text_secondary, width: '50px', flexShrink: 0 }}>{label}</span>}
      <div style={groupStyle}>
        {segments.map((seg, idx) => {
          const isActive = Array.isArray(value) ? value.includes(seg.val) : value === seg.val;
          const hasOverride = Array.isArray(value) ? value.length > 0 : !!value;
          const isInherited = !isActive && !hasOverride && !!inheritedValue && (
            Array.isArray(inheritedValue) ? inheritedValue.includes(seg.val) : inheritedValue === seg.val
          );
          return (
            <React.Fragment key={seg.val}>
              {idx > 0 && <div style={{ width: '1px', background: theme.border_default }}></div>}
              <button
                onClick={() => handleSelect(seg.val, seg.prefix)}
                onMouseEnter={() => setHoveredVal(seg.val)}
                onMouseLeave={() => setHoveredVal(null)}
                style={btnStyle(isActive, isInherited, hoveredVal === seg.val, seg)}
                title={seg.title || seg.label}
              >
                {seg.icon && <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{seg.icon}</span>}
                {seg.label && <span style={{ marginLeft: seg.icon ? '4px' : '0' }}>{seg.label}</span>}
                {seg.dashedHighlight && (
                  <div style={{ position: 'absolute', bottom: 0, left: 4, right: 4, borderBottom: `2px dashed ${theme.success_default}` }} />
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};