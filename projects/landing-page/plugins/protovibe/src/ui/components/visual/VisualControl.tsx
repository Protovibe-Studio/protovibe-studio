// plugins/protovibe/src/ui/components/visual/VisualControl.tsx
import React, { useEffect, useState } from 'react';
import { useProtovibe } from '../../context/ProtovibeContext';
import { takeSnapshot, updateSource } from '../../api/client';
import { buildContextPrefix, makeSafe, cleanVal } from '../../utils/tailwind';
import { InspectorInput } from '../InspectorInput';
import { theme } from '../../theme';
import { AutocompleteDropdown, type AutocompleteOption, type ColorMode } from './AutocompleteDropdown';

// Patterns for picking the right preview value source.
const CSS_UNIT_OR_KEYWORD = /^(-?[\d.]+(px|rem|em|%|vh|vw|fr)|auto|none|0)$/i;
const PLAIN_NUMERIC = /^-?[\d.]+$/;

function isColorOption(opt?: AutocompleteOption): boolean {
  if (!opt) return false;
  return opt.lightValue !== undefined || opt.darkValue !== undefined || (opt as any).hex !== undefined;
}

// Resolve a hovered val/option into a CSS value. Heuristic chain:
//   1. Color option → `var(--color-<val>)` (theme-aware light/dark)
//   2. opt.desc is a CSS unit/keyword (e.g. '12px', 'auto') → use desc
//   3. val is plain numeric (zIndex, opacity %) → use val
//   4. Fallback to `var(--<token>-<val>)` matching Tailwind v4 theme vars
//      (e.g. `--tracking-tight`, `--font-sans`, `--shadow-md`)
function resolvePreviewValue(prefix: string, val: string, opt?: AutocompleteOption): string | null {
  if (!val) return null;
  if (isColorOption(opt)) return `var(--color-${val})`;
  if (opt?.desc && CSS_UNIT_OR_KEYWORD.test(opt.desc)) return opt.desc;
  if (CSS_UNIT_OR_KEYWORD.test(val)) return val;
  if (PLAIN_NUMERIC.test(val)) return val;
  const token = prefix.replace(/-$/, '');
  if (!token) return null;
  return `var(--${token}-${val})`;
}

interface Option extends AutocompleteOption {
  hex?: string;
  lightValue?: string;
  darkValue?: string;
}

interface VisualControlProps {
  label: string;
  prefix: string;
  value: string;
  options?: Option[];
  originalClass?: string | string[];
  type?: 'select' | 'input';
  width?: string;
  inheritedValue?: string;
  strictOptions?: boolean;
  inputPrefix?: React.ReactNode;
  emptyPlaceholder?: string;
  /** CSS property (or properties) to set as inline style for hover preview.
   *  When omitted, the field doesn't preview. */
  cssProperty?: string | string[];
}

export const VisualControl: React.FC<VisualControlProps> = ({ label, prefix, value, options, originalClass, width = '100%', inheritedValue, strictOptions = false, inputPrefix, emptyPlaceholder, cssProperty }) => {
  const { activeData, activeSourceId, activeModifiers, runLockedMutation } = useProtovibe();
  const [rawInputValue, setRawInputValue] = useState(value === '-' ? '' : value);

  const buildPreview = (hoveredVal: string, opt?: AutocompleteOption): Record<string, string> | null => {
    if (!cssProperty || !hoveredVal || hoveredVal === '-') return null;
    const cssValue = resolvePreviewValue(prefix, hoveredVal, opt);
    if (!cssValue) return null;
    const props = Array.isArray(cssProperty) ? cssProperty : [cssProperty];
    return Object.fromEntries(props.map(p => [p, cssValue]));
  };

  useEffect(() => {
    setRawInputValue(value === '-' ? '' : value);
  }, [value]);

  const handleChange = async (newVal: string, prevVal?: string) => {
    if (!activeData?.file) return;

    const currentContextPrefix = buildContextPrefix(activeModifiers);
    const safeVal = makeSafe(newVal);

    // If it's a dash or empty, we treat it as removal (no new class)
    let newClass = '';
    if (safeVal && safeVal !== '-') {
      const isNeg = safeVal.startsWith('-');
      const coreVal = isNeg ? safeVal.slice(1) : safeVal;
      const sign = isNeg ? '-' : '';

      if (coreVal === 'DEFAULT' && prefix.endsWith('-')) {
        newClass = `${currentContextPrefix}${sign}${prefix.slice(0, -1)}`;
      } else {
        newClass = `${currentContextPrefix}${sign}${prefix}${coreVal}`;
      }
    }

    // Reconstruct original class: prefer _original, then prevVal from autocomplete, then current value
    const reconstructFromVal = (v: string) => {
      if (!v || v === '-') return '';
      const cv = cleanVal(v);
      if (!cv) return '';
      const isNeg = cv.startsWith('-');
      const coreCv = isNeg ? cv.slice(1) : cv;
      const sign = isNeg ? '-' : '';

      if (coreCv === 'DEFAULT' && prefix.endsWith('-')) return `${sign}${prefix.slice(0, -1)}`;
      return `${sign}${prefix}${coreCv}`;
    };

    await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId!);

      // For simplicity, we'll handle single class update.
      if (Array.isArray(originalClass)) {
        // Remove all old classes first, then add the new one
        for (const old of originalClass) {
          await updateSource({
            ...activeData,
            id: activeSourceId!,
            oldClass: old,
            newClass: '',
            action: 'remove'
          });
        }
        if (newClass) {
          await updateSource({
            ...activeData,
            id: activeSourceId!,
            oldClass: '',
            newClass,
            action: 'add'
          });
        }
      } else {
        const effectiveOriginal = originalClass || reconstructFromVal(prevVal ?? '') || reconstructFromVal(value);

        let action = 'edit';
        if (!effectiveOriginal && newClass) action = 'add';
        if (effectiveOriginal && !newClass) action = 'remove';
        if (effectiveOriginal === newClass) return;

        await updateSource({
          ...activeData,
          id: activeSourceId!,
          oldClass: effectiveOriginal,
          newClass,
          action
        });
      }
    });
  };
  return (
    <div data-testid={`control-${label.toLowerCase().replace(/\s+/g, '-')}`} style={{ display: 'flex', flexDirection: 'column', gap: '4px', width, position: 'relative' }}>
      <label style={{ fontSize: '9px', color: theme.text_tertiary, textTransform: 'uppercase' }}>{label}</label>
      {options && options.length > 0 ? (
        <AutocompleteDropdown
          value={value === '-' ? '' : value}
          placeholder={inheritedValue && !(value && value !== '-') ? inheritedValue : emptyPlaceholder}
          options={options}
          onCommit={handleChange}
          previewBuild={buildPreview}
          zIndex={9999999}
          prefix={inputPrefix}
          strictOptions={strictOptions}
          renderOption={(opt, colorMode?: ColorMode) => {
            const typedOpt = opt as Option;
            // Resolve color: prefer mode-aware lightValue/darkValue, fall back to hex
            let swatchColor: string | undefined;
            if (colorMode === 'light' && typedOpt.lightValue) swatchColor = typedOpt.lightValue;
            else if (colorMode === 'dark' && typedOpt.darkValue) swatchColor = typedOpt.darkValue;
            else if (typedOpt.hex) swatchColor = typedOpt.hex;

            if (swatchColor) {
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: swatchColor, border: `1px solid ${theme.border_default}`, flexShrink: 0 }} />
                  <span style={{ fontWeight: 'bold' }}>{String(typedOpt.val)}</span>
                </div>
              );
            }

            return (
              <>
                <span style={{ fontWeight: 'bold' }}>{String(typedOpt.val)}</span>
                <span style={{ color: theme.text_tertiary, fontSize: '9px', marginLeft: '12px' }}>{String(typedOpt.desc)}</span>
              </>
            );
          }}
        />
      ) : (
        <InspectorInput
          type="text"
          value={rawInputValue}
          placeholder={inheritedValue && !rawInputValue ? inheritedValue : undefined}
          onChange={(e) => setRawInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') {
              setRawInputValue(value === '-' ? '' : value);
              e.currentTarget.blur();
            }
            if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && options && options.length > 0) {
              e.preventDefault();
              const idx = rawInputValue ? options.findIndex(o => o.val === rawInputValue) : -1;
              const nextIdx = e.key === 'ArrowUp'
                ? (idx === -1 ? 0 : Math.min(idx + 1, options.length - 1))
                : (idx === -1 ? 0 : Math.max(idx - 1, 0));
              setRawInputValue(options[nextIdx].val);
            }
          }}
          onBlur={() => handleChange(rawInputValue)}
        />
      )}
    </div>
  );
};
