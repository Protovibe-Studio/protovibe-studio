// plugins/protovibe/src/ui/components/visual/Effects.tsx
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { VisualSection } from './VisualSection';
import { VisualControl } from './VisualControl';
import { SCALES } from '../../constants/tailwind';
import { cleanVal, buildContextPrefix } from '../../utils/tailwind';
import { useProtovibe } from '../../context/ProtovibeContext';
import { takeSnapshot, updateSource } from '../../api/client';
import { theme } from '../../theme';

export const Effects: React.FC<{ v: any; domV?: any }> = ({ v, domV }) => {
  const { activeData, activeSourceId, activeModifiers, runLockedMutation } = useProtovibe();
  const [localOpacity, setLocalOpacity] = useState<number | null>(null);

  const opacityRaw = cleanVal(v.opacity);
  const opacityNum = localOpacity ?? (opacityRaw ? parseInt(opacityRaw, 10) : 100);

  const handleOpacityCommit = async (opacity: number) => {
    if (!activeData?.file) return;
    const currentContextPrefix = buildContextPrefix(activeModifiers);
    const oldClass = v.opacity_original || (opacityRaw ? `opacity-${opacityRaw}` : '');
    const newClass = opacity === 100 ? '' : `${currentContextPrefix}opacity-${opacity}`;
    setLocalOpacity(null);
    await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId!);
      const action = !oldClass && newClass ? 'add' : oldClass && !newClass ? 'remove' : 'edit';
      if (oldClass === newClass) return;
      await updateSource({ ...activeData, id: activeSourceId!, oldClass, newClass, action });
    });
  };

  return (
    <VisualSection title="Effects">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* ── Opacity slider ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '9px', color: theme.text_tertiary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Opacity</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: theme.bg_tertiary, borderRadius: '3px', padding: opacityNum !== 100 ? '2px 2px 2px 6px' : '2px 6px' }}>
              <span style={{ fontSize: '9px', fontFamily: 'monospace', color: opacityNum !== 100 ? theme.accent_default : theme.border_strong, minWidth: '24px', textAlign: 'center' }}>
                {localOpacity ?? opacityNum}%
              </span>
              {opacityNum !== 100 && (
                <button
                  onClick={() => handleOpacityCommit(100)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px', borderRadius: '2px', border: 'none', background: 'transparent', color: theme.text_tertiary, cursor: 'pointer', padding: 0, flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.color = theme.text_secondary)}
                  onMouseLeave={e => (e.currentTarget.style.color = theme.text_tertiary)}
                >
                  <X size={9} />
                </button>
              )}
            </div>
          </div>
          <div style={{ position: 'relative', height: '16px', display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, height: '3px', borderRadius: '2px', background: theme.bg_tertiary, pointerEvents: 'none' }}>
              <div style={{ height: '100%', width: `${localOpacity ?? opacityNum}%`, background: (localOpacity ?? opacityNum) !== 100 ? theme.accent_default : theme.border_strong, borderRadius: '2px', transition: 'width 0.05s' }} />
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={localOpacity ?? opacityNum}
              onChange={e => setLocalOpacity(Number(e.target.value))}
              onMouseUp={() => handleOpacityCommit(localOpacity ?? opacityNum)}
              onTouchEnd={() => handleOpacityCommit(localOpacity ?? opacityNum)}
              style={{ position: 'relative', width: '100%', margin: 0, cursor: 'pointer', background: 'transparent', height: '16px' } as React.CSSProperties}
            />
          </div>
        </div>

        <VisualControl label="Box shadow" prefix="shadow-" value={cleanVal(v.shadow)} options={SCALES.shadow.filter(o => o.val !== 'inner')} originalClass={v.shadow_original} type="input" inheritedValue={cleanVal(domV?.shadow)} />
        <VisualControl label="Inset shadow" prefix="shadow-" value={cleanVal(v.insetShadow)} options={[{ val: 'inner', desc: 'Inner' }, { val: 'none', desc: 'None' }]} originalClass={v.insetShadow_original} type="input" inheritedValue={cleanVal(domV?.insetShadow)} />
      </div>
    </VisualSection>
  );
};
