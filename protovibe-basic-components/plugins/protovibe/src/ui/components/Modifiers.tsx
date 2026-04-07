// plugins/protovibe/src/ui/components/Modifiers.tsx
import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useProtovibe } from '../context/ProtovibeContext';
import { extractAvailableModifiers } from '../utils/tailwind';
import { SegmentedControl } from './visual/SegmentedControl';
import { useFloatingDropdownPosition } from '../hooks/useFloatingDropdownPosition';
import { theme } from '../theme';

// ─── Chip colours by modifier type ────────────────────────────────────────────

const CHIP_INTERACTION = { bg: theme.accent_low,    border: theme.accent_default,   text: theme.accent_default  };
const CHIP_SCREEN      = { bg: theme.warning_low,   border: theme.warning_primary,  text: theme.warning_primary };
const CHIP_VARIANT     = { bg: theme.success_low,   border: theme.success_default,  text: theme.success_default };

// ─── Chip ──────────────────────────────────────────────────────────────────────

interface ChipProps {
  label: string;
  colors: typeof CHIP_INTERACTION;
  onRemove: () => void;
}

const Chip: React.FC<ChipProps> = ({ label, colors, onRemove }) => (
  <div style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '1px 4px 1px 8px',
    borderRadius: '4px',
    background: colors.bg,
    border: `1px solid ${colors.border}`,
    color: colors.text,
    fontSize: '11px',
    fontWeight: 500,
    flexShrink: 0,
    lineHeight: 1.4,
  }}>
    {label}
    <button
      onClick={(e) => { e.stopPropagation(); onRemove(); }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '14px', height: '14px',
        borderRadius: '2px', border: 'none',
        background: 'transparent', color: colors.text,
        cursor: 'pointer', padding: 0, flexShrink: 0,
        opacity: 0.7,
      }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
    >
      <X size={9} />
    </button>
  </div>
);

// ─── Modifiers ────────────────────────────────────────────────────────────────

export const Modifiers: React.FC = () => {
  const { activeModifiers, setActiveModifiers, activeData, currentBaseTarget } = useProtovibe();
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const { style: popoverStyle } = useFloatingDropdownPosition({
    isOpen,
    anchorRef: fieldRef,
    dropdownRef: popoverRef,
    preferredPlacement: 'bottom',
    updateDeps: [Object.keys(activeModifiers.dataAttrs).length],
  });

  const lastProcessedTarget = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Wait until we have a target and its parsed AST data
    if (!currentBaseTarget || !activeData?.parsedClasses) {
      if (!currentBaseTarget) lastProcessedTarget.current = null;
      return;
    }
    
    // Only run once per selected element to allow users to toggle chips off manually later
    if (lastProcessedTarget.current === currentBaseTarget) return;

    // We only want to auto-select states inside the Components playground
    const pathname = (currentBaseTarget.ownerDocument?.defaultView?.location?.pathname ?? '').toLowerCase();
    const isComponentsTab = pathname.includes('components');

    if (isComponentsTab) {
      const flatClasses = Object.values(activeData.parsedClasses).flat().map((c: any) => c.cls);
      const domClasses = currentBaseTarget.getAttribute('class')?.split(/\s+/) || [];
      const availableDataAttrs = extractAvailableModifiers([...flatClasses, ...domClasses]);

      const nextDataAttrs: Record<string, string> = {};
      let hasChanges = false;

      // Check the DOM node for attributes that match our available Tailwind modifiers
      Object.keys(availableDataAttrs).forEach(key => {
        const domVal = currentBaseTarget.getAttribute(`data-${key}`);
        if (domVal) {
          nextDataAttrs[key] = domVal;
          hasChanges = true;
        }
      });

      if (hasChanges) {
        setActiveModifiers(prev => ({ ...prev, dataAttrs: { ...prev.dataAttrs, ...nextDataAttrs } }));
      }
    }

    lastProcessedTarget.current = currentBaseTarget;
  }, [currentBaseTarget, activeData, setActiveModifiers]);

  if (!activeData) return null;

  const flatClasses = activeData.parsedClasses
    ? Object.values(activeData.parsedClasses).flat().map((c: any) => c.cls)
    : [];
  const domClasses = currentBaseTarget?.getAttribute('class')?.split(/\s+/) || [];
  const availableDataAttrs = extractAvailableModifiers([...flatClasses, ...domClasses]);

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

  const UNSET_SENTINEL = '__unset__';

  const handleDataAttr = (key: string, val: string) => {
    setActiveModifiers(prev => {
      const dataAttrs = { ...prev.dataAttrs };
      if (val === UNSET_SENTINEL || val === '') delete dataAttrs[key];
      else dataAttrs[key] = val;
      return { ...prev, dataAttrs };
    });
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveModifiers({ interaction: [], breakpoint: null, dataAttrs: {} });
  };

  // ── Build chip list ──────────────────────────────────────────────────────────
  const chips: Array<{ key: string; label: string; colors: typeof CHIP_INTERACTION; onRemove: () => void }> = [];

  activeModifiers.interaction.forEach(i => chips.push({
    key: `interaction-${i}`,
    label: i.charAt(0).toUpperCase() + i.slice(1),
    colors: CHIP_INTERACTION,
    onRemove: () => handleInteraction(i),
  }));

  if (activeModifiers.breakpoint) {
    const bp = activeModifiers.breakpoint;
    chips.push({
      key: `bp-${bp}`,
      label: bp.toUpperCase(),
      colors: CHIP_SCREEN,
      onRemove: () => handleBreakpoint('none'),
    });
  }

  Object.entries(activeModifiers.dataAttrs).forEach(([key, val]) => {
    const label = `${key.charAt(0).toUpperCase() + key.slice(1)}: ${val.charAt(0).toUpperCase() + val.slice(1)}`;
    chips.push({
      key: `data-${key}`,
      label,
      colors: CHIP_VARIANT,
      onRemove: () => handleDataAttr(key, '__unset__'),
    });
  });

  const hasAny = chips.length > 0;

  return (
    <div style={{ borderTop: `1px solid ${theme.border_default}`, padding: '12px 16px' }}>
      <div style={{ color: theme.text_default, fontSize: '10px', fontWeight: '600', marginBottom: '8px' }}>
        Which state to style?
      </div>

      {/* ── Chip-input field ──────────────────────────────────────────────── */}
      <div
        ref={fieldRef}
        onClick={() => setIsOpen(o => !o)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '4px',
          minHeight: '24px',
          padding: hasAny ? '3px 28px 3px 8px' : '0 28px 0 8px',
          borderRadius: '6px',
          border: `1px solid ${isOpen ? theme.border_accent : isHovered ? theme.border_strong : theme.border_default}`,
          background: theme.bg_secondary,
          cursor: 'pointer',
          position: 'relative',
          boxSizing: 'border-box',
          transition: 'border-color 0.15s',
        }}
      >
        {!hasAny && (
          <span style={{ fontSize: '11px', color: theme.text_tertiary, lineHeight: '20px' }}>
            Add hover or variant modifier....
          </span>
        )}
        {chips.map(c => (
          <Chip key={c.key} label={c.label} colors={c.colors} onRemove={c.onRemove} />
        ))}

        {/* Clear-all button */}
        {hasAny && (
          <button
            onClick={clearAll}
            style={{
              position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '18px', height: '18px',
              borderRadius: '3px', border: 'none',
              background: 'transparent', color: theme.text_tertiary,
              cursor: 'pointer', padding: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = theme.text_secondary)}
            onMouseLeave={e => (e.currentTarget.style.color = theme.text_tertiary)}
          >
            <X size={11} />
          </button>
        )}
      </div>

      {/* ── Popover ───────────────────────────────────────────────────────── */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999997 }} onClick={() => setIsOpen(false)} />
          <div
            ref={popoverRef}
            data-pv-overlay="true"
            data-pv-ui="true"
            style={{
              background: theme.bg_secondary,
              border: `1px solid ${theme.border_default}`,
              borderRadius: '8px',
              zIndex: 9999999,
              boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              overflowY: 'auto',
              ...popoverStyle,
            }}
          >
            {/* Interaction */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '9px', color: theme.text_tertiary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Interaction</span>
              <SegmentedControl
                label=""
                value={activeModifiers.interaction.length === 0 ? 'none' : activeModifiers.interaction}
                onChange={handleInteraction}
                segments={[
                  { label: 'None',     val: 'none'     },
                  { label: 'Hover',    val: 'hover'    },
                  { label: 'Active',   val: 'active'   },
                  { label: 'Focus',    val: 'focus'    },
                  { label: 'Disabled', val: 'disabled' },
                ]}
              />
            </div>

            {/* Screen */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '9px', color: theme.text_tertiary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Screen</span>
              <SegmentedControl
                label=""
                value={activeModifiers.breakpoint || 'none'}
                onChange={handleBreakpoint}
                segments={[
                  { label: 'All', val: 'none' },
                  { label: 'Sm',  val: 'sm'   },
                  { label: 'Md',  val: 'md'   },
                  { label: 'Lg',  val: 'lg'   },
                  { label: 'XL',  val: 'xl'   },
                ]}
              />
            </div>

            {/* Dynamic data-attr variants */}
            {Object.entries(availableDataAttrs).map(([key, values]) => {
              const activeVal = activeModifiers.dataAttrs[key] || '__unset__';
              const domVal = currentBaseTarget?.getAttribute(`data-${key}`);
              const segments = [{
                label: 'Unset', val: '__unset__',
                shadow: !domVal ? `inset 0 -2px 0 0 ${theme.success_default}` : undefined,
              }];
              values.forEach(v => segments.push({
                label: v.charAt(0).toUpperCase() + v.slice(1),
                val: v,
                shadow: domVal === v ? `inset 0 -2px 0 0 ${theme.success_default}` : undefined,
              }));
              return (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '9px', color: theme.text_tertiary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{key}</span>
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
        </>,
        document.body
      )}
    </div>
  );
};
