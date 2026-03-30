// plugins/protovibe/src/ui/components/visual/VisualControl.tsx
import React, { useEffect, useState } from 'react';
import { useProtovibe } from '../../context/ProtovibeContext';
import { takeSnapshot, updateSource } from '../../api/client';
import { buildContextPrefix, makeSafe } from '../../utils/tailwind';
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
}

export const VisualControl: React.FC<VisualControlProps> = ({ label, prefix, value, options, originalClass, type = 'select', width = '100%', inheritedValue }) => {
  const { activeData, activeSourceId, activeModifiers, runLockedMutation } = useProtovibe();
  const [rawInputValue, setRawInputValue] = useState(value === '-' ? '' : value);

  useEffect(() => {
    setRawInputValue(value === '-' ? '' : value);
  }, [value]);

  const handleChange = async (newVal: string) => {
    if (!activeData?.file) return;

    const currentContextPrefix = buildContextPrefix(activeModifiers);
    const safeVal = makeSafe(newVal);
    
    // If it's a dash or empty, we treat it as removal (no new class)
    let newClass = '';
    if (safeVal && safeVal !== '-') {
      if (safeVal === 'DEFAULT' && prefix.endsWith('-')) {
        newClass = `${currentContextPrefix}${prefix.slice(0, -1)}`;
      } else {
        newClass = `${currentContextPrefix}${prefix}${safeVal}`;
      }
    }
    
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
        let action = 'edit';
        if (!originalClass && newClass) action = 'add';
        if (originalClass && !newClass) action = 'remove';
        if (originalClass === newClass) return;

        await updateSource({
          ...activeData,
          id: activeSourceId!,
          oldClass: originalClass || '',
          newClass,
          action
        });
      }
    });
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width, position: 'relative' }}>
      <label style={{ fontSize: '9px', color: theme.text_tertiary, textTransform: 'uppercase' }}>{label}</label>
      {options && options.length > 0 ? (
        <AutocompleteDropdown
          value={value === '-' ? '' : value}
          placeholder={inheritedValue && !(value && value !== '-') ? inheritedValue : undefined}
          options={options}
          onCommit={handleChange}
          zIndex={9999999}
          showColorModeToggle={options.some(o => (o as Option).lightValue !== undefined || (o as Option).darkValue !== undefined || (o as Option).hex !== undefined)}
          filterOptions={(opts, query, hasTyped) => {
            if (!hasTyped) return opts;
            return opts.filter((opt) =>
              opt.val.toLowerCase().startsWith(query) ||
              opt.val.toLowerCase().includes(`-${query}`) ||
              (opt.desc && opt.desc.toLowerCase().includes(query))
            );
          }}
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
          }}
          onBlur={() => handleChange(rawInputValue)}
        />
      )}
    </div>
  );
};
