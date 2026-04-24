// plugins/protovibe/src/ui/components/visual/VisualControl.tsx
import React, { useEffect, useState } from 'react';
import { useProtovibe } from '../../context/ProtovibeContext';
import { takeSnapshot, updateSource } from '../../api/client';
import { buildContextPrefix, makeSafe, cleanVal } from '../../utils/tailwind';
import { InspectorInput } from '../InspectorInput';
import { theme } from '../../theme';
import { AutocompleteDropdown, type AutocompleteOption, type ColorMode } from './AutocompleteDropdown';

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
}

export const VisualControl: React.FC<VisualControlProps> = ({ label, prefix, value, options, originalClass, type = 'select', width = '100%', inheritedValue, strictOptions = false, inputPrefix, emptyPlaceholder }) => {
  const { activeData, activeSourceId, activeModifiers, runLockedMutation } = useProtovibe();
  const [rawInputValue, setRawInputValue] = useState(value === '-' ? '' : value);

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
