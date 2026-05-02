// plugins/protovibe/src/ui/components/FloatingToolbar.tsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, ChevronUp, ChevronDown, Trash2, SquareDashed, BringToFront, SendToBack } from 'lucide-react';
import { useProtovibe } from '../context/ProtovibeContext';
import { addBlock, takeSnapshot, deleteBlocks } from '../api/client';
import { executeBlockAction } from '../utils/executeBlockAction';
import { theme } from '../theme';
import { INSPECTOR_WIDTH_PX } from '../constants/layout';
import { emitToast } from '../events/toast';

export const FloatingToolbar: React.FC = () => {
  const {
    currentBaseTarget, selectedTargets, activeData, activeSourceId,
    zones, availableComponents, refreshComponents,
    refreshActiveData, focusElement, focusNewBlock,
    runLockedMutation, isMutationLocked, inspectorOpen,
    clearFocus,
  } = useProtovibe();

  const [addMode, setAddMode] = useState<'child' | 'after' | null>(null);
  const showAddDialog = addMode !== null;
  const [addSearch, setAddSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const addSearchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const closestBlock = currentBaseTarget?.closest('[data-pv-block]');
  const closestBlockId = closestBlock?.getAttribute('data-pv-block') ?? null;
  const isBlockInCurrentFile = activeData?.componentProps?.some((p: any) => p.name === 'data-pv-block');

  const canAdd = !!(activeData?.file && zones.length > 0);
  const canBlockAction = !!(closestBlockId && isBlockInCurrentFile);
  const isMultiSelect = selectedTargets && selectedTargets.length > 1;
  const isSketchpadAbsolute = !!closestBlock?.hasAttribute('data-pv-sketchpad-el');

  const selectedBlockIds = (selectedTargets || [])
    .map(t => t.closest('[data-pv-block]')?.getAttribute('data-pv-block'))
    .filter(Boolean) as string[];
  const uniqueSelectedBlockIds = [...new Set(selectedBlockIds)];

  useEffect(() => {
    if (zones.length > 0) {
      setSelectedZone(zones[0].id);
    }
  }, [zones]);

  // Open add dialog via keyboard shortcut (Cmd+E)
  useEffect(() => {
    const handler = () => {
      if (!canAdd) return;
      refreshComponents();
      setAddSearch('');
      setActiveIndex(0);
      setAddMode('child');
    };
    window.addEventListener('pv:open-add-dialog', handler);
    return () => window.removeEventListener('pv:open-add-dialog', handler);
  }, [canAdd, refreshComponents]);

  // Open "add after" dialog via keyboard shortcut (Cmd+Shift+E)
  useEffect(() => {
    const handler = () => {
      if (!canBlockAction) return;
      refreshComponents();
      setAddSearch('');
      setActiveIndex(0);
      setAddMode('after');
    };
    window.addEventListener('pv:open-add-after-dialog', handler);
    return () => window.removeEventListener('pv:open-add-after-dialog', handler);
  }, [canBlockAction, refreshComponents]);

  // Focus search input after dialog opens (after React re-renders the input into the DOM)
  useEffect(() => {
    if (addMode !== null) addSearchRef.current?.focus();
  }, [addMode]);

  // Close add dialog on outside click or Escape
  useEffect(() => {
    if (!showAddDialog) return;
    const handleMouse = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setAddMode(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAddMode(null);
    };
    document.addEventListener('mousedown', handleMouse);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleMouse);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showAddDialog]);

  if (!inspectorOpen || (!canAdd && !canBlockAction)) return null;

  const handleBlockAction = async (action: string) => {
    setAddMode(null);
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

  const handleWrapBlocks = async () => {
    if (!activeData?.file || uniqueSelectedBlockIds.length === 0) return;

    // Check if any selected element is an ancestor/descendant of another selected element
    const isNested = selectedTargets.some(t1 =>
      selectedTargets.some(t2 => t1 !== t2 && t1.contains(t2))
    );
    if (isNested) {
      emitToast({ message: "Can't wrap these elements", variant: 'error' });
      return;
    }

    const targetLayoutMode = currentBaseTarget?.parentElement?.closest('[data-layout-mode]')?.getAttribute('data-layout-mode') || currentBaseTarget?.getAttribute('data-layout-mode') || 'flow';

    const res = await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId!);
      const response = await fetch('/__wrap-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: activeData.file, blockIds: uniqueSelectedBlockIds, targetLayoutMode }),
      });
      if (!response.ok) throw new Error('Failed to wrap blocks');
      return await response.json();
    });

    if (res?.wrapperId) focusNewBlock(res.wrapperId, { maxAttempts: 20 });
  };

  const handleDeleteBlocks = async () => {
    if (!activeData?.file || uniqueSelectedBlockIds.length === 0) return;

    const isNested = selectedTargets.some(t1 =>
      selectedTargets.some(t2 => t1 !== t2 && t1.contains(t2))
    );
    if (isNested) {
      emitToast({ message: "Can't delete nested selection together", variant: 'error' });
      return;
    }

    await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId!);
      await deleteBlocks(activeData.file, uniqueSelectedBlockIds);
    });

    clearFocus();
    await refreshActiveData();
  };

  const handleAddBlock = async (type: 'block' | 'component' | 'text', comp?: any) => {
    if (!activeData?.file) return;
    if (addMode === 'child' && !selectedZone) return;

    const zone = addMode === 'child' ? zones.find(z => z.id === selectedZone) : undefined;
    const targetLayoutMode = addMode === 'after'
      ? (currentBaseTarget?.parentElement?.closest('[data-layout-mode]')?.getAttribute('data-layout-mode') || 'flow')
      : (currentBaseTarget?.getAttribute('data-layout-mode') || 'flow');

    const res = await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId!);
      return addBlock({
        file: activeData.file,
        zoneId: addMode === 'child' ? selectedZone : undefined,
        afterBlockId: addMode === 'after' ? closestBlockId! : undefined,
        isPristine: addMode === 'child' ? zone?.isPristine : false,
        elementType: type,
        compName: comp?.name,
        importPath: comp?.importPath,
        defaultProps: comp?.defaultProps,
        defaultContent: comp?.defaultContent,
        additionalImportsForDefaultContent: comp?.additionalImportsForDefaultContent,
        targetStartLine: activeData.startLine,
        targetEndLine: activeData.endLine,
        targetLayoutMode,
        pasteX: 100,
        pasteY: 100,
      });
    });
    setAddMode(null);
    const focusIds: string[] = res?.newBlockIds?.length ? res.newBlockIds : (res?.blockId ? [res.blockId] : []);
    if (focusIds.length > 0) focusNewBlock(focusIds, { maxAttempts: 20 });
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
    fontFamily: theme.font_ui,
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
      { type: 'block', name: 'Empty Div Block', description: 'A plain &lt;div&gt; with flex layout' },
      { type: 'text', name: 'Empty Text Span', description: 'A span element with text' },
    ];
    const rankItems = <T extends { name: string; description: string }>(
      items: T[],
      nameKey: keyof T = 'name' as keyof T,
    ): T[] => {
      if (!q) return items;
      const exact: T[] = [];
      const nameIncludes: T[] = [];
      const descOnly: T[] = [];
      for (const item of items) {
        const name = String(item[nameKey]).toLowerCase();
        const desc = item.description.toLowerCase();
        if (name.startsWith(q)) exact.push(item);
        else if (name.includes(q)) nameIncludes.push(item);
        else if (desc.includes(q)) descOnly.push(item);
      }
      return [...exact, ...nameIncludes, ...descOnly];
    };

    const filteredBuiltins = rankItems(builtins);
    const filteredComponents = rankItems(
      availableComponents as any[],
      'displayName' as any,
    );

    const totalItems = filteredBuiltins.length + filteredComponents.length;
    const clampedIndex = totalItems > 0 ? Math.min(activeIndex, totalItems - 1) : 0;

    const activateItem = (index: number) => {
      if (index < filteredBuiltins.length) {
        handleAddBlock(filteredBuiltins[index].type);
      } else {
        handleAddBlock('component', filteredComponents[index - filteredBuiltins.length]);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = Math.min(clampedIndex + 1, totalItems - 1);
        setActiveIndex(next);
        listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = Math.max(clampedIndex - 1, 0);
        setActiveIndex(prev);
        listRef.current?.children[prev]?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' && totalItems > 0) {
        e.preventDefault();
        activateItem(clampedIndex);
      }
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
            onChange={e => { setAddSearch(e.target.value); setActiveIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search elements…"
            data-testid="input-add-search"
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
        <div ref={listRef} style={{ overflowY: 'auto', maxHeight: '240px', display: 'flex', flexDirection: 'column' }}>
          {filteredBuiltins.map((b, i) => (
            <button
              key={b.type}
              data-testid={`item-builtin-${b.type}`}
              disabled={locked}
              onClick={() => handleAddBlock(b.type)}
              onMouseEnter={() => setActiveIndex(i)}
              style={{ background: clampedIndex === i ? 'rgba(255,255,255,0.08)' : 'transparent', border: 'none', borderBottom: `1px solid ${theme.border_secondary}`, color: theme.text_secondary, padding: '8px 12px', textAlign: 'left', cursor: locked ? 'progress' : 'pointer', opacity: locked ? 0.6 : 1 }}
            >
              <strong style={{ color: theme.text_default, display: 'block', fontSize: '11px' }}>{b.name}</strong>
              <span style={{ fontSize: '9px', color: theme.text_tertiary }} dangerouslySetInnerHTML={{ __html: b.description }} />
            </button>
          ))}
          {filteredComponents.map((comp: any, i: number) => {
            const idx = filteredBuiltins.length + i;
            return (
              <button
                key={comp.name}
                disabled={locked}
                onClick={() => handleAddBlock('component', comp)}
                onMouseEnter={() => setActiveIndex(idx)}
                style={{ background: clampedIndex === idx ? 'rgba(255,255,255,0.08)' : 'transparent', border: 'none', borderBottom: `1px solid ${theme.border_secondary}`, color: theme.text_secondary, padding: '8px 12px', textAlign: 'left', cursor: locked ? 'progress' : 'pointer', opacity: locked ? 0.6 : 1 }}
              >
                <strong style={{ color: theme.text_default, display: 'block', fontSize: '11px' }}>{String(comp.displayName)}</strong>
                <span style={{ fontSize: '9px', color: theme.text_tertiary }}>{String(comp.description)}</span>
              </button>
            );
          })}
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
      data-testid="floating-toolbar"
      data-pv-ui="true"
      style={{
        position: 'fixed',
        bottom: '16px',
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
          background: 'rgba(48, 48, 48)',
          WebkitBackdropFilter: 'blur(14px)',
          borderRadius: '999px',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.04) inset',
          overflow: 'hidden',
        }}
      >
          {isMultiSelect ? (
            <>
            <button
              disabled={locked}
              onClick={handleWrapBlocks}
              onMouseEnter={() => setHoveredBtn('wrap')}
              onMouseLeave={() => setHoveredBtn(null)}
              style={mkBtnStyle('wrap', { minWidth: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', color: 'rgba(255,255,255,1)' })}
            >
              <SquareDashed size={13} strokeWidth={2.5} />
              Wrap {selectedTargets.length} elements
            </button>
            {divider}
            <button
              disabled={locked}
              onClick={handleDeleteBlocks}
              onMouseEnter={() => setHoveredBtn('del')}
              onMouseLeave={() => setHoveredBtn(null)}
              style={mkBtnStyle('del', {
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                padding: '0 14px',
                color: hoveredBtn === 'del' && !locked ? 'rgba(255, 90, 90, 1)' : 'rgba(255, 110, 110, 0.75)',
              })}
              title="Delete selected blocks"
            >
              <Trash2 size={13} strokeWidth={2} />
              Delete {uniqueSelectedBlockIds.length}
            </button>
          </>
          ) : (
            <>
              {canAdd && (
                <>
                  <button
                    disabled={locked}
                    onClick={() => {
                      if (addMode !== 'child') {
                        refreshComponents();
                        setAddSearch('');
                        setActiveIndex(0);
                      }
                      setAddMode(prev => prev === 'child' ? null : 'child');
                    }}
                    onMouseEnter={() => setHoveredBtn('add-child')}
                    onMouseLeave={() => setHoveredBtn(null)}
                    style={mkBtnStyle('add-child', {
                      minWidth: canBlockAction ? '120px' : '180px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      color: addMode === 'child' ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.82)',
                      background: addMode === 'child' ? 'rgba(255,255,255,0.1)' : (hoveredBtn === 'add-child' && !locked ? 'rgba(255,255,255,0.07)' : 'transparent'),
                    })}
                    title="Add child element"
                    data-testid="btn-add-child"
                  >
                    <Plus size={13} strokeWidth={2.5} />
                    Add child
                  </button>
                  {canBlockAction && divider}
                </>
              )}

              {canBlockAction && (
                <>
                  <button
                    disabled={locked}
                    onClick={() => {
                      if (addMode !== 'after') {
                        refreshComponents();
                        setAddSearch('');
                        setActiveIndex(0);
                      }
                      setAddMode(prev => prev === 'after' ? null : 'after');
                    }}
                    onMouseEnter={() => setHoveredBtn('add-after')}
                    onMouseLeave={() => setHoveredBtn(null)}
                    style={mkBtnStyle('add-after', {
                      minWidth: '120px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      color: addMode === 'after' ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.82)',
                      background: addMode === 'after' ? 'rgba(255,255,255,0.1)' : (hoveredBtn === 'add-after' && !locked ? 'rgba(255,255,255,0.07)' : 'transparent'),
                    })}
                    title="Add element after"
                  >
                    <Plus size={13} strokeWidth={2.5} />
                    Add after
                  </button>
                  {divider}
                  <button
                    disabled={locked}
                    onClick={handleWrapBlocks}
                    onMouseEnter={() => setHoveredBtn('wrap')}
                    onMouseLeave={() => setHoveredBtn(null)}
                    style={mkBtnStyle('wrap', { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' })}
                    title="Wrap in div"
                  >
                    <SquareDashed size={13} strokeWidth={2.5} />
                    Wrap
                  </button>
                  {divider}
                  <button
                    disabled={locked}
                    onClick={() => handleBlockAction(isSketchpadAbsolute ? 'move-down' : 'move-up')}
                    onMouseEnter={() => setHoveredBtn('up')}
                    onMouseLeave={() => setHoveredBtn(null)}
                    style={mkBtnStyle('up')}
                    title={isSketchpadAbsolute ? 'Bring to front' : 'Move up'}
                  >
                    {isSketchpadAbsolute ? <BringToFront size={13} strokeWidth={2.5} /> : <ChevronUp size={13} strokeWidth={2.5} />}
                    {isSketchpadAbsolute ? 'Bring to front' : 'Move up'}
                  </button>
                  {divider}
                  <button
                    disabled={locked}
                    onClick={() => handleBlockAction(isSketchpadAbsolute ? 'move-up' : 'move-down')}
                    onMouseEnter={() => setHoveredBtn('down')}
                    onMouseLeave={() => setHoveredBtn(null)}
                    style={mkBtnStyle('down')}
                    title={isSketchpadAbsolute ? 'Send backward' : 'Move down'}
                  >
                    {isSketchpadAbsolute ? <SendToBack size={13} strokeWidth={2.5} /> : <ChevronDown size={13} strokeWidth={2.5} />}
                    {isSketchpadAbsolute ? 'Send backward' : 'Move down'}
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
            </>
          )}
      </div>
    </div>
  );

  return createPortal(toolbar, document.body);
};
