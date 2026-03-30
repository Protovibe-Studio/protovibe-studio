// plugins/protovibe/src/ui/components/FloatingToolbar.tsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { useProtovibe } from '../context/ProtovibeContext';
import { addBlock, takeSnapshot } from '../api/client';
import { executeBlockAction } from '../utils/executeBlockAction';
import { theme } from '../theme';
import { INSPECTOR_WIDTH_PX } from '../constants/layout';

export const FloatingToolbar: React.FC = () => {
  const {
    currentBaseTarget, activeData, activeSourceId,
    zones, availableComponents, refreshComponents,
    refreshActiveData, focusElement, focusNewBlock,
    runLockedMutation, isMutationLocked, inspectorOpen,
  } = useProtovibe();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const addSearchRef = useRef<HTMLInputElement>(null);

  const closestBlock = currentBaseTarget?.closest('[data-pv-block]');
  const closestBlockId = closestBlock?.getAttribute('data-pv-block') ?? null;
  const isBlockInCurrentFile = activeData?.componentProps?.some((p: any) => p.name === 'data-pv-block');

  const canAdd = !!(activeData?.file && zones.length > 0);
  const canBlockAction = !!(closestBlockId && isBlockInCurrentFile);

  useEffect(() => {
    if (zones.length > 0) {
      const expectedZoneName = closestBlockId ? `inside-${closestBlockId}` : null;
      const found = zones.find(z => z.name === expectedZoneName) || zones[0];
      setSelectedZone(found.id);
    }
  }, [zones, closestBlockId]);

  // Close add dialog on outside click
  useEffect(() => {
    if (!showAddDialog) return;
    const handler = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setShowAddDialog(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAddDialog]);

  if (!inspectorOpen || (!canAdd && !canBlockAction)) return null;

  const handleBlockAction = async (action: string) => {
    setShowAddDialog(false);
    if (!closestBlockId || !activeData?.file) return;
    await runLockedMutation(async () => {
      await executeBlockAction({
        action: action as 'delete' | 'move-up' | 'move-down',
        blockId: closestBlockId,
        file: activeData.file,
        activeSourceId: activeSourceId!,
        focusElement,
        refreshActiveData,
      });
    });
  };

  const handleAddBlock = async (type: 'block' | 'component' | 'text', comp?: any) => {
    if (!activeData?.file || !selectedZone) return;
    const zone = zones.find(z => z.id === selectedZone);
    if (!zone) return;
    const res = await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId!);
      return addBlock({
        file: activeData.file,
        zoneId: selectedZone,
        isPristine: zone.isPristine,
        elementType: type,
        compName: comp?.name,
        importPath: comp?.importPath,
        defaultProps: comp?.defaultProps,
        defaultContent: comp?.defaultContent,
        additionalImportsForDefaultContent: comp?.additionalImportsForDefaultContent,
        targetStartLine: activeData.startLine,
        targetEndLine: activeData.endLine,
      });
    });
    setShowAddDialog(false);
    if (res?.blockId) focusNewBlock(res.blockId, { maxAttempts: 20 });
  };

  const locked = isMutationLocked;

  const mkBtnStyle = (id: string, extra?: React.CSSProperties): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '0 13px',
    height: '100%',
    background: hoveredBtn === id && !locked ? 'rgba(255,255,255,0.07)' : 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.82)',
    fontSize: '12px',
    fontFamily: 'sans-serif',
    fontWeight: 500,
    cursor: locked ? 'progress' : 'pointer',
    opacity: locked ? 0.45 : 1,
    whiteSpace: 'nowrap',
    transition: 'background 0.1s, color 0.1s',
    ...extra,
  });

  const divider = (
    <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
  );

  // Build add-element dropdown contents
  const renderAddDialog = () => {
    const q = addSearch.toLowerCase();
    const builtins: Array<{ type: 'block' | 'text'; name: string; description: string }> = [
      { type: 'block', name: 'Empty Block', description: 'A plain &lt;div&gt; with flex layout' },
      { type: 'text', name: 'Text Node', description: 'A span element with text' },
    ];
    const filteredBuiltins = builtins.filter(b =>
      !q || b.name.toLowerCase().includes(q) || b.description.toLowerCase().includes(q)
    );
    const filteredComponents = (availableComponents as any[]).filter(c =>
      !q || String(c.displayName).toLowerCase().includes(q) || String(c.description).toLowerCase().includes(q)
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (filteredBuiltins[0]) handleAddBlock(filteredBuiltins[0].type);
      else if (filteredComponents[0]) handleAddBlock('component', filteredComponents[0]);
    };

    return (
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '280px',
          background: theme.bg_secondary,
          border: `1px solid ${theme.border_default}`,
          borderRadius: '8px',
          boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border_default}`, flexShrink: 0 }}>
          <input
            ref={addSearchRef}
            value={addSearch}
            onChange={e => setAddSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search elements…"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: theme.bg_default,
              border: `1px solid ${theme.border_default}`,
              borderRadius: '4px',
              color: theme.text_default,
              fontSize: '11px',
              padding: '4px 8px',
              outline: 'none',
            }}
          />
        </div>
        <div style={{ overflowY: 'auto', maxHeight: '240px', display: 'flex', flexDirection: 'column' }}>
          {filteredBuiltins.map(b => (
            <button
              key={b.type}
              disabled={locked}
              onClick={() => handleAddBlock(b.type)}
              style={{ background: 'transparent', border: 'none', borderBottom: `1px solid ${theme.border_secondary}`, color: theme.text_secondary, padding: '8px 12px', textAlign: 'left', cursor: locked ? 'progress' : 'pointer', opacity: locked ? 0.6 : 1 }}
            >
              <strong style={{ color: theme.text_default, display: 'block', fontSize: '11px' }}>{b.name}</strong>
              <span style={{ fontSize: '9px', color: theme.text_tertiary }} dangerouslySetInnerHTML={{ __html: b.description }} />
            </button>
          ))}
          {filteredComponents.map((comp: any) => (
            <button
              key={comp.name}
              disabled={locked}
              onClick={() => handleAddBlock('component', comp)}
              style={{ background: 'transparent', border: 'none', borderBottom: `1px solid ${theme.border_secondary}`, color: theme.text_secondary, padding: '8px 12px', textAlign: 'left', cursor: locked ? 'progress' : 'pointer', opacity: locked ? 0.6 : 1 }}
            >
              <strong style={{ color: theme.text_default, display: 'block', fontSize: '11px' }}>{String(comp.displayName)}</strong>
              <span style={{ fontSize: '9px', color: theme.text_tertiary }}>{String(comp.description)}</span>
            </button>
          ))}
          {filteredBuiltins.length === 0 && filteredComponents.length === 0 && (
            <div style={{ padding: '12px', fontSize: '11px', color: theme.text_tertiary, textAlign: 'center' }}>No results</div>
          )}
        </div>
      </div>
    );
  };

  const toolbar = (
    <div
      ref={toolbarRef}
      data-pv-ui="true"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: inspectorOpen ? `calc((100vw - ${INSPECTOR_WIDTH_PX}px) / 2)` : '50%',
        transform: 'translateX(-50%)',
        zIndex: 99998,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'auto',
      }}
    >
      {showAddDialog && renderAddDialog()}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '38px',
          background: 'rgba(18, 18, 24, 0.88)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderRadius: '999px',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.04) inset',
          overflow: 'hidden',
        }}
      >
        {canAdd && (
          <>
            <button
              disabled={locked}
              onClick={() => {
                if (!showAddDialog) {
                  refreshComponents();
                  setAddSearch('');
                  setTimeout(() => addSearchRef.current?.focus(), 0);
                }
                setShowAddDialog(v => !v);
              }}
              onMouseEnter={() => setHoveredBtn('add')}
              onMouseLeave={() => setHoveredBtn(null)}
              style={mkBtnStyle('add', {
                minWidth: '180px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                color: showAddDialog ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.82)',
                background: showAddDialog ? 'rgba(255,255,255,0.1)' : (hoveredBtn === 'add' && !locked ? 'rgba(255,255,255,0.07)' : 'transparent'),
              })}
              title="Add child element"
            >
              <Plus size={13} strokeWidth={2.5} />
              Add child element
            </button>
            {canBlockAction && divider}
          </>
        )}

        {canBlockAction && (
          <>
            <button
              disabled={locked}
              onClick={() => handleBlockAction('move-up')}
              onMouseEnter={() => setHoveredBtn('up')}
              onMouseLeave={() => setHoveredBtn(null)}
              style={mkBtnStyle('up')}
              title="Move up"
            >
              <ChevronUp size={13} strokeWidth={2.5} />
              Move up
            </button>
            {divider}
            <button
              disabled={locked}
              onClick={() => handleBlockAction('move-down')}
              onMouseEnter={() => setHoveredBtn('down')}
              onMouseLeave={() => setHoveredBtn(null)}
              style={mkBtnStyle('down')}
              title="Move down"
            >
              <ChevronDown size={13} strokeWidth={2.5} />
              Move down
            </button>
            {divider}
            <button
              disabled={locked}
              onClick={() => handleBlockAction('delete')}
              onMouseEnter={() => setHoveredBtn('del')}
              onMouseLeave={() => setHoveredBtn(null)}
              style={mkBtnStyle('del', {
                padding: '0 14px',
                color: hoveredBtn === 'del' && !locked ? 'rgba(255, 90, 90, 1)' : 'rgba(255, 110, 110, 0.75)',
              })}
              title="Delete block"
            >
              <Trash2 size={13} strokeWidth={2} />
            </button>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(toolbar, document.body);
};
