// plugins/protovibe/src/ui/components/Modifiers.tsx
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Check } from 'lucide-react';
import { useProtovibe } from '../context/ProtovibeContext';
import { extractAvailableModifiers, parseModifiers, type ActiveModifiers } from '../utils/tailwind';
import { SegmentedControl } from './visual/SegmentedControl';
import { useFloatingDropdownPosition } from '../hooks/useFloatingDropdownPosition';
import { theme } from '../theme';

const emptyModifiers = (): ActiveModifiers => ({ interaction: [], breakpoint: null, dataAttrs: {}, pseudoClasses: [] });
const modifierTokens = (value: ActiveModifiers) => [
  ...value.interaction,
  ...(value.breakpoint ? [value.breakpoint] : []),
  ...Object.entries(value.dataAttrs).map(([key, val]) => `data-[${key}=${val}]`),
  ...(value.pseudoClasses || []),
];
const modifierKey = (modifiers: string[]) => [...modifiers].sort().join(':');

export const Modifiers: React.FC = () => {
  const { activeModifiers, setActiveModifiers, activeData, currentBaseTarget, activeSourceId } = useProtovibe();
  const [isOpen, setIsOpen] = useState(false);
  const [draftModifiers, setDraftModifiers] = useState<ActiveModifiers>(emptyModifiers);
  const [pendingGroups, setPendingGroups] = useState<string[][]>([]);
  const [showMore, setShowMore] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const { style: popoverStyle } = useFloatingDropdownPosition({
    isOpen,
    anchorRef: fieldRef,
    dropdownRef: popoverRef,
    preferredPlacement: 'bottom',
    updateDeps: [Object.keys(draftModifiers.dataAttrs).length],
  });

  useEffect(() => {
    setPendingGroups([]);
    setIsOpen(false);
    setShowMore(false);
    setDraftModifiers(emptyModifiers());
  }, [currentBaseTarget, activeSourceId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setIsOpen(false);
        fieldRef.current?.querySelector('button')?.focus();
      }
    };
    popoverRef.current?.querySelector('button')?.focus();
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen]);

  const pathname = (currentBaseTarget?.ownerDocument?.defaultView?.location?.pathname ?? '').toLowerCase();
  const isComponentsTab = pathname.includes('components');

  const flatClasses = activeData?.parsedClasses
    ? Object.values(activeData?.parsedClasses).flat().map((c: any) => c.cls)
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

    pendingGroups.forEach(modifiers => {
      const key = modifierKey(modifiers);
      if (!groups[key]) groups[key] = { modifiers, count: 0, classes: [] };
    });
    return Object.values(groups).sort((a, b) => b.count - a.count);
  }, [flatClasses, pendingGroups]);

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
    setDraftModifiers(prev => {
      if (val === 'none') return { ...prev, interaction: [] };
      const interaction = [...prev.interaction];
      const idx = interaction.indexOf(val);
      if (idx > -1) interaction.splice(idx, 1);
      else interaction.push(val);
      return { ...prev, interaction };
    });
  };

  const handleBreakpoint = (val: string) => {
    setDraftModifiers(prev => ({ ...prev, breakpoint: val === 'none' ? null : val }));
  };

  const handleStructural = (val: string) => {
    setDraftModifiers(prev => {
      const structurals = ['first', 'last', 'odd', 'even'];
      const filtered = (prev.pseudoClasses || []).filter(p => !structurals.includes(p));
      if (val !== 'none' && val !== '') filtered.push(val);
      return { ...prev, pseudoClasses: filtered };
    });
  };

  const UNSET_SENTINEL = '__unset__';

  const handleDataAttr = (key: string, val: string) => {
    setDraftModifiers(prev => {
      const dataAttrs = { ...prev.dataAttrs };
      if (val === UNSET_SENTINEL || val === '') delete dataAttrs[key];
      else dataAttrs[key] = val;
      return { ...prev, dataAttrs };
    });
  };

  const draftTokens = modifierTokens(draftModifiers);
  const submitState = () => {
    if (!draftTokens.length) return;
    setPendingGroups(groups => groups.some(group => modifierKey(group) === modifierKey(draftTokens))
      ? groups : [...groups, draftTokens]);
    setActiveModifiers(draftModifiers);
    setShowMore(true);
    setIsOpen(false);
    fieldRef.current?.querySelector('button')?.focus();
  };

  if (!activeData) return null;

  return (
    <div style={{ borderTop: `1px solid ${theme.border_default}`, padding: '12px 20px 16px' }}>
      <div ref={fieldRef} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: theme.text_default, fontSize: '11px', lineHeight: '20px', fontWeight: '600', marginBottom: '8px' }}>
        Which state to style?
        <button
          type="button"
          data-tooltip="Add hover or variant modifier...."
          aria-label="Add hover or variant modifier...."
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          onClick={() => {
            setDraftModifiers(emptyModifiers());
            setIsOpen(open => !open);
          }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', padding: 0, border: 'none', borderRadius: '4px', background: 'transparent', color: theme.text_secondary, cursor: 'pointer' }}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* ── Existing Modifiers List ── */}
      <div role="radiogroup" aria-label="Which state to style?" style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {[{ modifiers: [], classes: [], count: 0 }, ...matchingGroups, ...(showMore ? otherGroups : [])].map((group) => {
            const label = group.modifiers.length ? group.modifiers.map(formatModifier).join(' & ') : 'All states';
            const SHOW = 2;
            const visibleClasses = group.classes.slice(0, SHOW);
            const remaining = group.classes.length - SHOW;
            const classesLabel = visibleClasses.join(' • ') + (remaining > 0 ? ` • +${remaining}` : '');
            const bps = ['sm', 'md', 'lg', 'xl', '2xl'];
            const interactions = ['hover', 'active', 'focus', 'visited', 'disabled'];

            const isActive = modifierKey(group.modifiers) === modifierKey(modifierTokens(activeModifiers));

            return (
              <button
                key={modifierKey(group.modifiers)}
                type="button"
                role="radio"
                aria-checked={isActive}
                tabIndex={isActive ? 0 : -1}
                onKeyDown={event => {
                  if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                  event.preventDefault();
                  const radios = Array.from(event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>('[role=radio]'));
                  const index = radios.indexOf(event.currentTarget);
                  const next = event.key === 'Home' ? 0 : event.key === 'End' ? radios.length - 1 : (index + (['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1) + radios.length) % radios.length;
                  radios[next].focus();
                  radios[next].click();
                }}
                onClick={() => {
                  const nextModifiers = { interaction: [] as string[], breakpoint: null as string | null, dataAttrs: {} as Record<string, string>, pseudoClasses: [] as string[] };

                  group.modifiers.forEach(mod => {
                    if (bps.includes(mod)) nextModifiers.breakpoint = mod;
                    else if (interactions.includes(mod)) nextModifiers.interaction.push(mod);
                    else {
                      const match = mod.match(/^data-\[([^=]+)=([^\]]+)\]$/);
                      if (match) {
                        nextModifiers.dataAttrs[match[1]] = match[2];
                      } else {
                        nextModifiers.pseudoClasses.push(mod);
                      }
                    }
                  });
                  setActiveModifiers(nextModifiers);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'transparent',
                  border: 'none',
                  padding: '6px 8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderRadius: '6px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = theme.bg_secondary;
                  (e.currentTarget.querySelector('[data-label-primary]') as HTMLElement | null)?.style.setProperty('color', theme.text_default);
                  (e.currentTarget.querySelector('[data-label-secondary]') as HTMLElement | null)?.style.setProperty('color', theme.text_secondary);
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  (e.currentTarget.querySelector('[data-label-primary]') as HTMLElement | null)?.style.setProperty('color', isActive ? theme.text_default : theme.text_secondary);
                  (e.currentTarget.querySelector('[data-label-secondary]') as HTMLElement | null)?.style.setProperty('color', isActive ? theme.text_secondary : theme.text_low);
                }}
              >
                <span aria-hidden="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '12px', height: '12px', boxSizing: 'border-box', borderRadius: '50%', border: `1px solid ${isActive ? theme.accent_default : theme.border_strong}`, background: isActive ? theme.accent_default : 'transparent', color: theme.text_default, marginRight: '8px', flexShrink: 0 }}>
                  {isActive && <Check size={9} strokeWidth={3} />}
                </span>
                <span style={{ fontSize: '11px', color: theme.text_secondary, flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span data-label-primary style={{ color: isActive ? theme.text_default : theme.text_secondary }}>{label}</span>
                  {classesLabel && <span data-label-secondary style={{ color: isActive ? theme.text_secondary : theme.text_low, fontSize: '11px' }}>{classesLabel}</span>}
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

      {/* ── Popover ───────────────────────────────────────────────────────── */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999997 }} onClick={() => setIsOpen(false)} />
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Add state"
            data-pv-overlay="true"
            data-pv-ui="true"
            style={{
              width: '300px',
              boxSizing: 'border-box',
              background: theme.bg_default,
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
              <span style={{ fontSize: '11px', lineHeight: '11px', color: theme.text_secondary }}>Interaction</span>
              <SegmentedControl
                label=""
                value={draftModifiers.interaction.length === 0 ? 'none' : draftModifiers.interaction}
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
              <span style={{ fontSize: '11px', lineHeight: '11px', color: theme.text_secondary }}>Screen width above</span>
              <SegmentedControl
                label=""
                value={draftModifiers.breakpoint || 'none'}
                onChange={handleBreakpoint}
                segments={[
                  { label: 'All', val: 'none' },
                  { label: '640',  val: 'sm'   },
                  { label: '768',  val: 'md'   },
                  { label: '1024',  val: 'lg'   },
                  { label: '1536',  val: 'xl'   },
                ]}
              />
            </div>

            {/* Child Position */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', lineHeight: '11px', color: theme.text_secondary }}>Child Position</span>
              <SegmentedControl
                label=""
                value={draftModifiers.pseudoClasses?.find(p => ['first', 'last', 'odd', 'even'].includes(p)) || 'none'}
                onChange={handleStructural}
                segments={[
                  { label: 'All', val: 'none' },
                  { label: 'First', val: 'first' },
                  { label: 'Last', val: 'last' },
                  { label: 'Odd', val: 'odd' },
                  { label: 'Even', val: 'even' },
                ]}
              />
            </div>

            {/* Dynamic data-attr variants */}
            {Object.entries(availableDataAttrs).map(([key, values]) => {
              const activeVal = draftModifiers.dataAttrs[key] || '__unset__';
              const domVal = currentBaseTarget?.getAttribute(`data-${key}`);
              const segments: any[] = [{
                label: 'Unset', val: '__unset__',
                dashedHighlight: !domVal,
              }];
              values.forEach(v => segments.push({
                label: v.charAt(0).toUpperCase() + v.slice(1),
                val: v,
                dashedHighlight: domVal === v,
              }));
              return (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '11px', lineHeight: '11px', color: theme.text_secondary }}>{key}</span>
                  <SegmentedControl
                    label=""
                    value={activeVal}
                    onChange={(val) => handleDataAttr(key, val)}
                    segments={segments}
                  />
                </div>
              );
            })}

            {Object.keys(availableDataAttrs).length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '16px' }}>
                <div style={{ width: '16px', borderBottom: `2px dashed ${theme.success_default}`, flexShrink: 0 }} />
                <span style={{ fontSize: '10px', color: theme.text_secondary, lineHeight: 1.3 }}>
                  Indicates the current state of the selected element
                </span>
              </div>
            )}
            <button type="button" onClick={submitState} disabled={!draftTokens.length} style={{ padding: '7px 12px', border: 'none', borderRadius: '6px', background: theme.accent_default, color: theme.text_default, fontSize: '11px', cursor: draftTokens.length ? 'pointer' : 'default', opacity: draftTokens.length ? 1 : 0.5 }}>Add state</button>

          </div>
        </>,
        document.body
      )}
    </div>
  );
};
