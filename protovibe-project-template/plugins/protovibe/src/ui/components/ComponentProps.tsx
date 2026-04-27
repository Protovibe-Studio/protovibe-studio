// plugins/protovibe/src/ui/components/ComponentProps.tsx
import React, { useState, useRef, useEffect } from 'react';
import { theme } from '../theme';
import { useProtovibe } from '../context/ProtovibeContext';
import { updateProp, takeSnapshot } from '../api/client';
import { InspectorInput } from './InspectorInput';
import { InspectorKeyValueInput } from './InspectorKeyValueInput';
import { MoreHorizontal } from 'lucide-react';

export const ComponentProps: React.FC = () => {
  const { activeData, activeSourceId, runLockedMutation } = useProtovibe();
  const [showLockedProps, setShowLockedProps] = useState(false);
  const [showAdvancedProps, setShowAdvancedProps] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);
  const [newPropKey, setNewPropKey] = useState('');
  const [newPropValue, setNewPropValue] = useState('');

  if (!activeData || !activeData.configSchema) return null;

  const configProps = activeData?.configSchema?.props || {};
  const existingProps = activeData?.componentProps || [];

  const mergedProps: any[] = [];
  Object.keys(configProps).forEach(key => {
    const existing = existingProps.find((p: any) => p.name === key);
    if (existing) {
      mergedProps.push(existing);
    } else {
      mergedProps.push({ name: key, value: '', shouldNotBeEdited: false, isMissing: true });
    }
  });
  
  existingProps.forEach((prop: any) => {
    if (!configProps[prop.name]) mergedProps.push(prop);
  });

  if (mergedProps.length === 0) return null;

  const handleUpdateProp = async (
    propName: string,
    propValue: any,
    loc: any,
    isMissing: boolean,
    removeWhenEmpty = false
  ) => {
    if (!activeData.file) return;

    if (removeWhenEmpty && String(propValue) === '') {
      if (isMissing) return;
      await runLockedMutation(async () => {
        await takeSnapshot(activeData.file, activeSourceId!);
        await updateProp({
          file: activeData.file,
          action: 'remove',
          propName,
          loc
        });
      });
      return;
    }

    await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId!);

      await updateProp({
        file: activeData.file,
        action: isMissing ? 'add' : 'edit',
        propName,
        propValue: String(propValue),
        loc,
        nameEnd: activeData.nameEnd
      });
    });
  };

  const handleRemoveProp = async (propName: string, loc: any) => {
    if (!activeData.file) return;
    await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId!);
      await updateProp({
        file: activeData.file,
        action: 'remove',
        propName,
        loc
      });
    });
  };

  const handleAddProp = async () => {
    if (!newPropKey.trim() || !activeData.file) return;
    await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId!);
      await updateProp({
        file: activeData.file,
        action: 'add',
        propName: newPropKey.trim(),
        propValue: newPropValue.trim(),
        nameEnd: activeData.nameEnd
      });
    });
    setNewPropKey('');
    setNewPropValue('');
    setShowAddForm(false);
  };

  return (
    <div style={{ borderTop: `1px solid ${theme.border_default}`, padding: '0 0 16px 0' }}>
      <div style={{ padding: '12px 20px', fontSize: '10px', fontWeight: '600', color: theme.text_default, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Component properties</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {showAdvancedProps && <button onClick={() => setShowAddForm(!showAddForm)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '3px', background: 'transparent', border: 'none', color: theme.text_tertiary, cursor: 'pointer', padding: 0, fontSize: '16px', lineHeight: 1 }} title="Add Prop">+</button>}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button onClick={() => setShowMenu(!showMenu)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '3px', background: 'transparent', border: 'none', color: theme.text_tertiary, cursor: 'pointer', padding: 0 }}><MoreHorizontal size={13} /></button>
            {showMenu && (
              <div style={{ position: 'absolute', right: 0, top: '100%', background: theme.bg_secondary, border: `1px solid ${theme.border_default}`, borderRadius: '4px', padding: '4px', zIndex: 10, width: 'max-content', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                <label style={{ fontSize: '10px', color: theme.text_secondary, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '4px 8px' }}>
                  <input type="checkbox" checked={showLockedProps} onChange={(e) => setShowLockedProps(e.target.checked)} /> Show locked props
                </label>
                <label style={{ fontSize: '10px', color: theme.text_secondary, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '4px 8px' }}>
                  <input type="checkbox" checked={showAdvancedProps} onChange={(e) => setShowAdvancedProps(e.target.checked)} /> Show advanced attributes
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {mergedProps.map(prop => {
          const isAdvanced = !configProps[prop.name] && !prop.shouldNotBeEdited;
          if (isAdvanced && !showAdvancedProps) return null;

          if (prop.shouldNotBeEdited) {
            if (!showLockedProps) return null;
            return (
              <InspectorKeyValueInput
                key={prop.name}
                label={(
                  <>
                    {prop.name === '...' ? 'Spread' : String(prop.name)}
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.7, marginLeft: '2px', display: 'inline-block' }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  </>
                )}
                labelTitle={prop.name}
                labelColor={theme.text_tertiary}
                type="text"
                value={prop.value}
                disabled
                inputStyle={{ opacity: 0.4, cursor: 'not-allowed', background: theme.bg_strong }}
              />
            );
          }

          const propConfig = configProps[prop.name];
          const isSelectLikeProp = propConfig?.type === 'select' || propConfig?.type === 'boolean' || propConfig?.type === 'iconSearch';
          const isUnsetValue = String(prop.value ?? '') === '';
          const showRemoveButton = !prop.isMissing && !(isSelectLikeProp && isUnsetValue);

          if (propConfig?.type === 'select' && Array.isArray(propConfig.options)) {
            return (
              <InspectorKeyValueInput
                key={prop.name}
                label={String(prop.name)}
                labelTitle={prop.name}
                labelColor={theme.text_secondary}
                type="select"
                value={prop.value}
                selectOptions={propConfig.options}
                unsetLabel="Unset"
                onChange={(nextValue) => handleUpdateProp(prop.name, nextValue, prop.loc, !!prop.isMissing, true)}
                showRemove={showRemoveButton}
                onRemove={() => handleRemoveProp(prop.name, prop.loc)}
              />
            );
          }

          if (propConfig?.type === 'iconSearch') {
            return (
              <InspectorKeyValueInput
                key={prop.name}
                label={String(prop.name)}
                labelTitle={prop.name}
                labelColor={theme.text_secondary}
                type="iconSearch"
                value={prop.value}
                onCommit={(nextValue) => handleUpdateProp(prop.name, nextValue, prop.loc, !!prop.isMissing)}
                showRemove={showRemoveButton}
                onRemove={() => handleRemoveProp(prop.name, prop.loc)}
              />
            );
          }

          if (propConfig?.type === 'boolean') {
            return (
              <InspectorKeyValueInput
                key={prop.name}
                label={String(prop.name)}
                labelTitle={prop.name}
                labelColor={theme.text_secondary}
                type="boolean"
                value={prop.value}
                unsetLabel="Unset"
                onChange={(nextValue) => handleUpdateProp(prop.name, nextValue, prop.loc, !!prop.isMissing, true)}
                showRemove={showRemoveButton}
                onRemove={() => handleRemoveProp(prop.name, prop.loc)}
              />
            );
          }

          return (
            <InspectorKeyValueInput
              key={prop.name}
              label={String(prop.name)}
              labelTitle={prop.name}
              labelColor={theme.text_secondary}
              type="text"
              value={prop.value === true ? 'true' : prop.value}
              onCommit={(nextValue) => handleUpdateProp(prop.name, nextValue, prop.loc, !!prop.isMissing)}
              showRemove={showRemoveButton}
              onRemove={() => handleRemoveProp(prop.name, prop.loc)}
            />
          );
        })}

        {showAddForm && (
          <div style={{ background: theme.bg_secondary, padding: '8px', borderRadius: '4px', border: `1px solid ${theme.border_default}`, marginTop: '4px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <InspectorInput type="text" value={newPropKey} onChange={(e) => setNewPropKey(e.target.value)} placeholder="Key (e.g. variant)" />
              <InspectorInput type="text" value={newPropValue} onChange={(e) => setNewPropValue(e.target.value)} placeholder="Value" />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddForm(false)} style={{ background: 'transparent', border: 'none', color: theme.text_tertiary, cursor: 'pointer', fontSize: '10px', fontWeight: 'bold', padding: '4px 8px' }}>Cancel</button>
              <button onClick={handleAddProp} style={{ background: theme.accent_default, border: 'none', color: theme.text_default, padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>Add</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
