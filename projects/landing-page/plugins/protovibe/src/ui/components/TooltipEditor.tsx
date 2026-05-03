import React, { useState, useEffect } from 'react';
import { useProtovibe } from '../context/ProtovibeContext';
import { updateProp, takeSnapshot } from '../api/client';
import { InspectorInput } from './InspectorInput';
import { SegmentedControl } from './visual/SegmentedControl';
import { theme } from '../theme';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, X } from 'lucide-react';

export const TooltipEditor: React.FC = () => {
  const { activeData, activeSourceId, runLockedMutation } = useProtovibe();

  const textProp = activeData?.componentProps?.find(
    (p: any) => p.name === 'title' || p.name === 'data-tooltip-text'
  );
  const dirProp = activeData?.componentProps?.find(
    (p: any) => p.name === 'data-tooltip-dir'
  );

  const [text, setText] = useState('');

  useEffect(() => {
    setText(textProp?.value || '');
  }, [textProp?.value]);

  if (!activeData) return null;

  const handleUpdate = async (propName: string, newValue: string, isMissing: boolean, loc: any) => {
    if (!activeData.file) return;

    await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId!);
      await updateProp({
        file: activeData.file,
        action: newValue === '' ? 'remove' : isMissing ? 'add' : 'edit',
        propName,
        propValue: newValue,
        loc,
        nameEnd: activeData.nameEnd,
      });
    });
  };

  return (
    <div style={{ borderTop: `1px solid ${theme.border_default}`, padding: '12px 20px' }}>
      <div style={{ fontSize: '10px', fontWeight: '600', color: theme.text_default, marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '20px' }}>
        <span>Tooltip</span>
        {textProp && (
          <button
            onClick={async () => {
              setText('');
              await handleUpdate('data-tooltip-text', '', false, textProp.loc);
              if (dirProp) await handleUpdate('data-tooltip-dir', '', false, dirProp.loc);
            }}
            title="Clear tooltip"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '3px', border: 'none', background: 'transparent', color: theme.text_tertiary, cursor: 'pointer', padding: 0, transition: 'background 0.15s, color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = theme.bg_low; e.currentTarget.style.color = theme.text_secondary; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.text_tertiary; }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <InspectorInput
          type="text"
          placeholder="Enter tooltip text..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => handleUpdate('data-tooltip-text', text, !textProp, textProp?.loc)}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        />

        {text && (
          <SegmentedControl
            label=""
            value={dirProp?.value || 'top'}
            onChange={(val) => handleUpdate('data-tooltip-dir', val, !dirProp, dirProp?.loc)}
            segments={[
              { icon: <ArrowUp size={12} />, label: 'Above', val: 'top', title: 'Above' },
              { icon: <ArrowDown size={12} />, label: 'Below', val: 'bottom', title: 'Below' },
              { icon: <ArrowLeft size={12} />, label: 'Left', val: 'left', title: 'Left' },
              { icon: <ArrowRight size={12} />, label: 'Right', val: 'right', title: 'Right' },
            ]}
          />
        )}
      </div>
    </div>
  );
};
