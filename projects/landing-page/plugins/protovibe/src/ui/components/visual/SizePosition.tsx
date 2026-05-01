// plugins/protovibe/src/ui/components/visual/SizePosition.tsx
import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Ratio, X } from 'lucide-react';
import { VisualSection } from './VisualSection';
import { VisualControl } from './VisualControl';
import { SegmentedControl } from './SegmentedControl';
import { buildContextPrefix, cleanVal } from '../../utils/tailwind';
import { theme } from '../../theme';
import { useScales } from '../../hooks/useScales';
import { useProtovibe } from '../../context/ProtovibeContext';
import { takeSnapshot, updateSource } from '../../api/client';
import { useFloatingDropdownPosition } from '../../hooks/useFloatingDropdownPosition';

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

const RATIO_OPTIONS: { label: string; ratio: string; cls: string }[] = [
  { label: 'Square', ratio: '1 / 1', cls: 'aspect-square' },
  { label: 'Video', ratio: '16 / 9', cls: 'aspect-video' },
  { label: 'Video portrait', ratio: '9 / 16', cls: 'aspect-[9/16]' },
  { label: 'Landscape', ratio: '3 / 2', cls: 'aspect-[3/2]' },
  { label: 'Portrait', ratio: '2 / 3', cls: 'aspect-[2/3]' },
];

const getRatioLabel = (cls: string | undefined): string => {
  if (!cls) return '';
  const found = RATIO_OPTIONS.find(o => o.cls === cls);
  if (found) return found.label;
  const m = cls.match(/^aspect-\[(.+)\]$/);
  if (m) return m[1].replace('/', ' / ');
  return cls.replace(/^aspect-/, '');
};

export const SizePosition: React.FC<{ v: any; domV?: any }> = ({ v, domV }) => {
  const scales = useScales();

  const { activeData, activeSourceId, activeModifiers, runLockedMutation } = useProtovibe();
  const [isRatioOpen, setIsRatioOpen] = useState(false);
  const ratioBtnRef = useRef<HTMLButtonElement>(null);
  const ratioMenuRef = useRef<HTMLDivElement>(null);
  const { style: ratioMenuStyle } = useFloatingDropdownPosition({
    isOpen: isRatioOpen,
    anchorRef: ratioBtnRef,
    dropdownRef: ratioMenuRef,
    preferredPlacement: 'bottom',
  });

  const hasRatio = !!v.aspectRatio;
  const ratioLabel = getRatioLabel(v.aspectRatio);

  const handleSetRatio = async (newCls: string) => {
    if (!activeData?.file || !activeSourceId) return;
    const ctxPrefix = buildContextPrefix(activeModifiers);
    const oldClass = v.aspectRatio_original || '';
    const newClass = newCls ? `${ctxPrefix}${newCls}` : '';
    if (oldClass === newClass) return;

    await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId);
      let action: 'add' | 'edit' | 'remove' = 'edit';
      if (!oldClass && newClass) action = 'add';
      if (oldClass && !newClass) action = 'remove';
      await updateSource({ ...activeData, id: activeSourceId, oldClass, newClass, action });
    });
  };

  const headerAction = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <button
        ref={ratioBtnRef}
        onClick={() => setIsRatioOpen(o => !o)}
        title="Aspect ratio"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '20px',
          height: '20px',
          borderRadius: '3px',
          border: 'none',
          background: hasRatio ? theme.accent_low : 'transparent',
          color: hasRatio ? theme.accent_default : theme.text_tertiary,
          cursor: 'pointer',
          padding: 0,
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={e => {
          if (!hasRatio) {
            e.currentTarget.style.background = theme.bg_low;
            e.currentTarget.style.color = theme.text_secondary;
          }
        }}
        onMouseLeave={e => {
          if (!hasRatio) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = theme.text_tertiary;
          }
        }}
      >
        <Ratio size={13} />
      </button>
      {hasRatio && (
        <button
          onClick={() => setIsRatioOpen(o => !o)}
          style={{
            fontSize: '10px',
            fontWeight: 600,
            color: theme.accent_default,
            letterSpacing: '0.02em',
            marginLeft: '2px',
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          {ratioLabel}
        </button>
      )}
      {hasRatio && (
        <button
          onClick={() => handleSetRatio('')}
          title="Clear aspect ratio"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            borderRadius: '3px',
            border: 'none',
            background: 'transparent',
            color: theme.accent_default,
            cursor: 'pointer',
            padding: 0,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = theme.bg_low; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <X size={13} />
        </button>
      )}
    </div>
  );

  return (
    <VisualSection title="Size" headerAction={headerAction}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
          <VisualControl label="Width" prefix="w-" cssProperty="width" value={cleanVal(v.w)} options={scales.size} originalClass={v.w_original} type="input" inheritedValue={cleanVal(domV?.w)} inputPrefix={<WidthIcon />} />
          <VisualControl label="Min W" prefix="min-w-" cssProperty="minWidth" value={cleanVal(v.minW)} options={scales.size} originalClass={v.minW_original} type="input" inheritedValue={cleanVal(domV?.minW)} />
          <VisualControl label="Max W" prefix="max-w-" cssProperty="maxWidth" value={cleanVal(v.maxW)} options={scales.size} originalClass={v.maxW_original} type="input" inheritedValue={cleanVal(domV?.maxW)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
          <VisualControl label="Height" prefix="h-" cssProperty="height" value={cleanVal(v.h)} options={scales.size} originalClass={v.h_original} type="input" inheritedValue={cleanVal(domV?.h)} inputPrefix={<HeightIcon />} />
          <VisualControl label="Min H" prefix="min-h-" cssProperty="minHeight" value={cleanVal(v.minH)} options={scales.size} originalClass={v.minH_original} type="input" inheritedValue={cleanVal(domV?.minH)} />
          <VisualControl label="Max H" prefix="max-h-" cssProperty="maxHeight" value={cleanVal(v.maxH)} options={scales.size} originalClass={v.maxH_original} type="input" inheritedValue={cleanVal(domV?.maxH)} />
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

      {isRatioOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999997 }} onClick={() => setIsRatioOpen(false)} />
          <div
            ref={ratioMenuRef}
            data-pv-overlay="true"
            data-pv-ui="true"
            style={{
              background: theme.bg_secondary,
              border: `1px solid ${theme.border_default}`,
              borderRadius: '6px',
              zIndex: 9999999,
              boxShadow: '0 8px 16px rgba(0,0,0,0.8)',
              overflow: 'hidden',
              minWidth: '140px',
              ...ratioMenuStyle,
            }}
          >
            {RATIO_OPTIONS.map(opt => {
              const isActive = v.aspectRatio === opt.cls;
              return (
                <button
                  key={opt.cls}
                  onClick={() => { handleSetRatio(opt.cls); setIsRatioOpen(false); }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '24px',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    color: isActive ? theme.accent_default : theme.text_secondary,
                    fontSize: '11px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = theme.bg_low; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span>{opt.label}</span>
                  <span style={{ color: isActive ? theme.accent_default : theme.text_tertiary, fontSize: '10px' }}>{opt.ratio}</span>
                </button>
              );
            })}
          </div>
        </>,
        document.body
      )}
    </VisualSection>
  );
};
