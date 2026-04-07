// plugins/protovibe/src/ui/components/Modifiers.tsx
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useProtovibe } from '../context/ProtovibeContext';
import { extractAvailableModifiers, parseModifiers } from '../utils/tailwind';
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
  const [showMore, setShowMore] = useState(false);
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
    if (!currentBaseTarget) {
      lastProcessedTarget.current = null;
    }
  }, [currentBaseTarget]);

  if (!activeData) return null;

  const pathname = (currentBaseTarget?.ownerDocument?.defaultView?.location?.pathname ?? '').toLowerCase();
  const isComponentsTab = pathname.includes('components');

  const flatClasses = activeData.parsedClasses
    ? Object.values(activeData.parsedClasses).flat().map((c: any) => c.cls)
    : [];
  const domClasses = currentBaseTarget?.getAttribute('class')?.split(/\s+/) || [];
  const availableDataAttrs = extractAvailableModifiers([...flatClasses, ...domClasses]);

  const modifierGroups = useMemo(() => {
    const groups: Record<string, { modifiers: string[], count: number, classes: string[] }> = {};
    
    flatClasses.forEach((cls: string) => {
      const { modifiers, base } = parseModifiers(cls);
      if (modifiers.length === 0) return;
      
      const key = [...modifiers].sort().join(':');
      if (!groups[key]) {
        groups[key] = { modifiers, count: 0, classes: [] };
      }
      groups[key].count++;
      groups[key].classes.push(base);
    });
    
    return Object.values(groups).sort((a, b) => b.count - a.count);
  }, [flatClasses]);

  // In the components tab, collect the element's actual data-attr values to filter matching groups
  const elementDataAttrs = useMemo(() => {
    if (!isComponentsTab || !currentBaseTarget) return null;
    const attrs: Record<string, string> = {};
    for (const attr of Array.from(currentBaseTarget.attributes)) {
      if (attr.name.startsWith('data-') && !attr.name.startsWith('data-pv-')) {
        attrs[attr.name.slice(5)] = attr.value;
      }
    }
    return attrs;
  }, [isComponentsTab, currentBaseTarget]);

  const { matchingGroups, otherGroups } = useMemo(() => {
    if (!elementDataAttrs) return { matchingGroups: modifierGroups, otherGroups: [] };
    const matching: typeof modifierGroups = [];
    const other: typeof modifierGroups = [];
    modifierGroups.forEach(group => {
      const isMatch = group.modifiers.every(mod => {
        const m = mod.match(/^data-\[([^=]+)=([^\]]+)\]$/);
        if (m) return elementDataAttrs[m[1]] === m[2];
        return true; // interactions and breakpoints always match
      });
      if (isMatch) matching.push(group);
      else other.push(group);
    });
    return { matchingGroups: matching, otherGroups: other };
  }, [modifierGroups, elementDataAttrs]);

  const formatModifier = (mod: string) => {
    if (mod.startsWith('data-[')) {
      const match = mod.match(/^data-\[([^=]+)=([^\]]+)\]$/);
      if (match) {
        return `${match[1].charAt(0).toUpperCase() + match[1].slice(1)}: ${match[2]}`;
      }
    }
    return mod.charAt(0).toUpperCase() + mod.slice(1);
  };

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

      {/* ── Existing Modifiers List ── */}
      {modifierGroups.length > 0 && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {[...matchingGroups, ...(showMore ? otherGroups : [])].map((group) => {
            const label = group.modifiers.map(formatModifier).join(' & ');
            const SHOW = 2;
            const visibleClasses = group.classes.slice(0, SHOW);
            const remaining = group.classes.length - SHOW;
            const classesLabel = visibleClasses.join(' • ') + (remaining > 0 ? ` • +${remaining}` : '');
            const bps = ['sm', 'md', 'lg', 'xl', '2xl'];
            const interactions = ['hover', 'active', 'focus', 'visited', 'disabled'];

            const isActive = (() => {
              const expectedInteraction: string[] = [];
              let expectedBreakpoint: string | null = null;
              const expectedDataAttrs: Record<string, string> = {};
              group.modifiers.forEach(mod => {
                if (bps.includes(mod)) expectedBreakpoint = mod;
                else if (interactions.includes(mod)) expectedInteraction.push(mod);
                else {
                  const match = mod.match(/^data-\[([^=]+)=([^\]]+)\]$/);
                  if (match) expectedDataAttrs[match[1]] = match[2];
                }
              });
              const interactionMatch =
                expectedInteraction.length === activeModifiers.interaction.length &&
                expectedInteraction.every(i => activeModifiers.interaction.includes(i));
              const breakpointMatch = expectedBreakpoint === activeModifiers.breakpoint;
              const dataAttrsMatch =
                Object.keys(expectedDataAttrs).length === Object.keys(activeModifiers.dataAttrs).length &&
                Object.entries(expectedDataAttrs).every(([k, v]) => activeModifiers.dataAttrs[k] === v);
              return interactionMatch && breakpointMatch && dataAttrsMatch;
            })();

            return (
              <button
                key={group.modifiers.join(':')}
                onClick={() => {
                  if (isActive) {
                    setActiveModifiers({ interaction: [], breakpoint: null, dataAttrs: {} });
                    return;
                  }
                  const nextModifiers = { interaction: [] as string[], breakpoint: null as string | null, dataAttrs: {} as Record<string, string> };

                  group.modifiers.forEach(mod => {
                    if (bps.includes(mod)) nextModifiers.breakpoint = mod;
                    else if (interactions.includes(mod)) nextModifiers.interaction.push(mod);
                    else {
                      const match = mod.match(/^data-\[([^=]+)=([^\]]+)\]$/);
                      if (match) {
                        nextModifiers.dataAttrs[match[1]] = match[2];
                      }
                    }
                  });
                  setActiveModifiers(nextModifiers);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: isActive ? theme.accent_low : 'transparent',
                  border: 'none',
                  padding: '6px 8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderRadius: '6px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = isActive ? theme.accent_low : theme.bg_secondary;
                  (e.currentTarget.querySelector('[data-label-primary]') as HTMLElement | null)?.style.setProperty('color', theme.text_default);
                  (e.currentTarget.querySelector('[data-label-secondary]') as HTMLElement | null)?.style.setProperty('color', theme.text_secondary);
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = isActive ? theme.accent_low : 'transparent';
                  (e.currentTarget.querySelector('[data-label-primary]') as HTMLElement | null)?.style.setProperty('color', isActive ? theme.text_default : theme.text_secondary);
                  (e.currentTarget.querySelector('[data-label-secondary]') as HTMLElement | null)?.style.setProperty('color', isActive ? theme.text_secondary : theme.text_low);
                }}
              >
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: theme.accent_default, marginRight: '8px', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: theme.text_secondary, flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span data-label-primary style={{ color: isActive ? theme.text_default : theme.text_secondary }}>{label}</span>
                  <span data-label-secondary style={{ color: isActive ? theme.text_secondary : theme.text_low, fontSize: '11px' }}>{classesLabel}</span>
                </span>
              </button>
            );
          })}
          {otherGroups.length > 0 && (
            <button
              onClick={() => setShowMore(s => !s)}
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'transparent',
                border: 'none',
                padding: '4px 8px',
                cursor: 'pointer',
                color: theme.text_tertiary,
                fontSize: '11px',
                borderRadius: '6px',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = theme.text_secondary)}
              onMouseLeave={e => (e.currentTarget.style.color = theme.text_tertiary)}
            >
              {showMore ? `Hide ${otherGroups.length} more` : `Show ${otherGroups.length} more`}
            </button>
          )}
        </div>
      )}

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
