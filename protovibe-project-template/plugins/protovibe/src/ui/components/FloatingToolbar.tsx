// plugins/protovibe/src/ui/components/FloatingToolbar.tsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, ChevronUp, ChevronDown, Trash2, SquareDashed, Ungroup, BringToFront, SendToBack, MoreVertical, PenTool, Copy, CopyPlus, Clipboard, ClipboardPaste } from 'lucide-react';
import { useProtovibe } from '../context/ProtovibeContext';
import { addBlock, takeSnapshot, deleteBlocks, unwrapBlock } from '../api/client';
import { collectChildPositions } from '../utils/unwrapGeometry';
import { executeBlockAction, executeClipboardBlockAction } from '../utils/executeBlockAction';
import { snapshotElement, DomSnapshot } from '../utils/domSnapshot';
import { ConvertToSketchpadDialog } from './ConvertToSketchpadDialog';
import { theme } from '../theme';
import { INSPECTOR_WIDTH_PX } from '../constants/layout';
import { emitToast } from '../events/toast';
import { openNotEditableDialog } from './NotEditableDialog';

const NOT_EDITABLE_TOOLTIP = "Element isn't editable yet — click to see how to fix it";

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
  const [moreOpen, setMoreOpen] = useState(false);
  const [convertSnapshot, setConvertSnapshot] = useState<DomSnapshot | null>(null);
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
      if (!canAdd) {
        if (currentBaseTarget) openNotEditableDialog();
        return;
      }
      refreshComponents();
      setAddSearch('');
      setActiveIndex(0);
      setAddMode('child');
    };
    window.addEventListener('pv:open-add-dialog', handler);
    return () => window.removeEventListener('pv:open-add-dialog', handler);
  }, [canAdd, currentBaseTarget, refreshComponents]);

  // Open "add after" dialog via keyboard shortcut (Cmd+Shift+E)
  useEffect(() => {
    const handler = () => {
      if (!canBlockAction) {
        if (currentBaseTarget) openNotEditableDialog();
        return;
      }
      refreshComponents();
      setAddSearch('');
      setActiveIndex(0);
      setAddMode('after');
    };
    window.addEventListener('pv:open-add-after-dialog', handler);
    return () => window.removeEventListener('pv:open-add-after-dialog', handler);
  }, [canBlockAction, currentBaseTarget, refreshComponents]);

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

  // Close the "more" menu on outside click or Escape
  useEffect(() => {
    if (!moreOpen) return;
    const handleMouse = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('mousedown', handleMouse);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleMouse);
      document.removeEventListener('keydown', handleKey);
    };
  }, [moreOpen]);

  // Keep the toolbar visible for any selected element — even ones that are not
  // pv blocks. Actions that need a block open the "not editable" dialog instead.
  if (!inspectorOpen || (!currentBaseTarget && !canAdd && !canBlockAction)) return null;

  const handleOpenConvertDialog = () => {
    setMoreOpen(false);
    setAddMode(null);
    // Conversion is DOM-based, so it works for any selected element — prefer
    // the enclosing pv-block (matches copy/cut semantics) when there is one.
    const target = (canBlockAction && closestBlock ? closestBlock : currentBaseTarget) as HTMLElement | null;
    if (!target) return;
    const snapshot = snapshotElement(target);
    if (!snapshot) {
      emitToast({ message: 'Nothing to convert in this selection', variant: 'error' });
      return;
    }
    setConvertSnapshot(snapshot);
  };

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

  // Resolve the pv-block ids for the current selection (or the single focused
  // element), mirroring the copy/cut/paste logic in useKeyboardShortcuts.
  const getActionBlockIds = () => {
    const targets = selectedTargets?.length > 0 ? selectedTargets : (currentBaseTarget ? [currentBaseTarget] : []);
    return [...new Set(
      targets
        .map(t => t.closest('[data-pv-block]')?.getAttribute('data-pv-block'))
        .filter(Boolean) as string[]
    )];
  };

  const handleClipboardAction = async (action: 'copy' | 'duplicate') => {
    setMoreOpen(false);
    const blockIds = getActionBlockIds();
    if (blockIds.length === 0 || !isBlockInCurrentFile || !activeData?.file) {
      openNotEditableDialog();
      return;
    }
    await runLockedMutation(async () => {
      await executeClipboardBlockAction({
        action,
        blockId: blockIds,
        file: activeData.file,
        activeSourceId: activeSourceId!,
        focusElement,
        refreshActiveData,
      });
    });
    emitToast({ message: action === 'copy' ? 'Block copied to clipboard' : 'Block duplicated', variant: 'info' });
  };

  const handlePasteBlock = async (isPasteAfter: boolean) => {
    setMoreOpen(false);
    if (!activeData?.file || !currentBaseTarget) return;

    const targetZone = zones[0];
    const targetBlockId = getActionBlockIds()[0];

    if (isPasteAfter && (!targetBlockId || !isBlockInCurrentFile)) {
      emitToast({ message: "Can't paste after this element", variant: 'error' });
      return;
    }
    if (!isPasteAfter && !targetZone) {
      emitToast({ message: "Can't paste inside this element", variant: 'error' });
      return;
    }

    const targetContainer = isPasteAfter ? currentBaseTarget?.parentElement : currentBaseTarget;
    const targetLayoutMode = targetContainer?.getAttribute('data-layout-mode') || 'flow';

    await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId!, undefined, 'paste');
      const res = await addBlock({
        file: activeData.file,
        zoneId: isPasteAfter ? undefined : targetZone.id,
        afterBlockId: isPasteAfter ? targetBlockId! : undefined,
        isPristine: isPasteAfter ? false : targetZone.isPristine,
        elementType: 'paste',
        targetStartLine: activeData.startLine,
        targetEndLine: activeData.endLine,
        targetLayoutMode,
        pasteX: 100,
        pasteY: 100,
      });
      const focusIds: string[] = res?.newBlockIds?.length ? res.newBlockIds : (res?.blockId ? [res.blockId] : []);
      if (focusIds.length > 0) {
        emitToast({ message: 'Pasted successfully', variant: 'info' });
        focusNewBlock(focusIds);
      }
    }).catch((err: any) => {
      emitToast({ message: err.message || 'Failed to paste block', variant: 'error' });
    });
  };

  const handleWrapBlocks = async () => {
    if (uniqueSelectedBlockIds.length === 0) {
      openNotEditableDialog();
      return;
    }
    if (!activeData?.file) return;

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
      await takeSnapshot(activeData.file, activeSourceId!, undefined, 'wrap blocks');
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

  const handleUnwrapBlock = async () => {
    setAddMode(null);
    if (!closestBlockId || !closestBlock || !activeData?.file) return;

    const childPositions = collectChildPositions(closestBlock as HTMLElement);
    if (Object.keys(childPositions).length === 0) {
      emitToast({ message: 'Nothing to unwrap', variant: 'error' });
      return;
    }

    const targetLayoutMode = (closestBlock.parentElement?.closest('[data-layout-mode]')?.getAttribute('data-layout-mode') || 'flow') as 'flow' | 'absolute';

    const res = await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId!, undefined, 'unwrap block');
      return unwrapBlock({
        file: activeData.file,
        blockId: closestBlockId,
        targetLayoutMode,
        childPositions: targetLayoutMode === 'absolute' ? childPositions : undefined,
      });
    }).catch((err: any) => {
      emitToast({ message: err.message || 'Failed to unwrap block', variant: 'error' });
    });

    if (res?.blockIds?.length) focusNewBlock(res.blockIds, { maxAttempts: 20 });
  };

  const handleDeleteBlocks = async () => {
    if (uniqueSelectedBlockIds.length === 0) {
      openNotEditableDialog();
      return;
    }
    if (!activeData?.file) return;

    const isNested = selectedTargets.some(t1 =>
      selectedTargets.some(t2 => t1 !== t2 && t1.contains(t2))
    );
    if (isNested) {
      emitToast({ message: "Can't delete nested selection together", variant: 'error' });
      return;
    }

    await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId!, undefined, uniqueSelectedBlockIds.length > 1 ? `delete ${uniqueSelectedBlockIds.length} blocks` : 'delete block');
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
      await takeSnapshot(activeData.file, activeSourceId!, undefined, comp?.name ? `add ${comp.name}` : `add ${type}`);
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

  const renderMoreMenuItem = (
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    opts?: { shortcut?: string; testId?: string },
  ) => (
    <button
      data-testid={opts?.testId}
      disabled={locked}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'transparent',
        border: 'none',
        color: theme.text_default,
        fontSize: '11px',
        fontFamily: theme.font_ui,
        padding: '9px 12px',
        textAlign: 'left',
        cursor: locked ? 'progress' : 'pointer',
        opacity: locked ? 0.6 : 1,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {icon}
      <span style={{ flex: 1 }}>{label}</span>
      {opts?.shortcut && (
        <span style={{ color: theme.text_tertiary, fontSize: '10px', letterSpacing: '0.5px' }}>{opts.shortcut}</span>
      )}
    </button>
  );

  const renderMoreMenu = () => (
    <div
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 8px)',
        right: 0,
        minWidth: '220px',
        background: theme.bg_secondary,
        border: `1px solid ${theme.border_default}`,
        borderRadius: '8px',
        boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {renderMoreMenuItem(
        <Copy size={13} strokeWidth={2} />,
        'Copy',
        () => handleClipboardAction('copy'),
        { shortcut: '⌘C', testId: 'item-copy' },
      )}
      {renderMoreMenuItem(
        <CopyPlus size={13} strokeWidth={2} />,
        'Duplicate',
        () => handleClipboardAction('duplicate'),
        { shortcut: '⌘D', testId: 'item-duplicate' },
      )}
      {renderMoreMenuItem(
        <Clipboard size={13} strokeWidth={2} />,
        'Paste',
        () => handlePasteBlock(false),
        { shortcut: '⌘V', testId: 'item-paste' },
      )}
      {renderMoreMenuItem(
        <ClipboardPaste size={13} strokeWidth={2} />,
        'Paste after',
        () => handlePasteBlock(true),
        { shortcut: '⌘⇧V', testId: 'item-paste-after' },
      )}
      <div style={{ height: '1px', background: theme.border_secondary, margin: '4px 0' }} />
      {renderMoreMenuItem(
        <PenTool size={13} strokeWidth={2} />,
        'Convert to Sketchpad…',
        handleOpenConvertDialog,
        { testId: 'item-convert-to-sketchpad' },
      )}
    </div>
  );

  const toolbar = (
    <div
      ref={toolbarRef}
      data-testid="floating-toolbar"
      data-pv-ui="true"
      style={{
        position: 'fixed',
        bottom: '0px',
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
      {moreOpen && renderMoreMenu()}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '38px',
          background: 'rgba(48, 48, 48)',
          WebkitBackdropFilter: 'blur(14px)',
          borderRadius: '16px 16px 0 0',
          border: '1px solid rgba(255,255,255,0.1)',
          borderBottomColor: 'transparent',
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
              data-tooltip="Delete selected blocks"
            >
              <Trash2 size={13} strokeWidth={2} />
              Delete {uniqueSelectedBlockIds.length}
            </button>
          </>
          ) : (
            <>
              <button
                disabled={locked}
                onClick={() => {
                  if (!canAdd) {
                    openNotEditableDialog();
                    return;
                  }
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
                  minWidth: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  color: addMode === 'child' ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.82)',
                  background: addMode === 'child' ? 'rgba(255,255,255,0.1)' : (hoveredBtn === 'add-child' && !locked ? 'rgba(255,255,255,0.07)' : 'transparent'),
                })}
                data-tooltip={canAdd ? 'Add child element' : NOT_EDITABLE_TOOLTIP}
                data-testid="btn-add-child"
              >
                <Plus size={13} strokeWidth={2.5} />
                Add child
              </button>
              {divider}
              <button
                disabled={locked}
                onClick={() => {
                  if (!canBlockAction) {
                    openNotEditableDialog();
                    return;
                  }
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
                data-tooltip={canBlockAction ? 'Add element after' : NOT_EDITABLE_TOOLTIP}
              >
                <Plus size={13} strokeWidth={2.5} />
                Add after
              </button>
              {divider}
              <button
                disabled={locked}
                onClick={() => canBlockAction ? handleWrapBlocks() : openNotEditableDialog()}
                onMouseEnter={() => setHoveredBtn('wrap')}
                onMouseLeave={() => setHoveredBtn(null)}
                style={mkBtnStyle('wrap', { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' })}
                data-tooltip={canBlockAction ? 'Wrap in div' : NOT_EDITABLE_TOOLTIP}
              >
                <SquareDashed size={13} strokeWidth={2.5} />
                Wrap
              </button>
              {divider}
              <button
                disabled={locked}
                onClick={() => canBlockAction ? handleUnwrapBlock() : openNotEditableDialog()}
                onMouseEnter={() => setHoveredBtn('unwrap')}
                onMouseLeave={() => setHoveredBtn(null)}
                style={mkBtnStyle('unwrap', { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' })}
                data-tooltip={canBlockAction ? 'Unwrap children' : NOT_EDITABLE_TOOLTIP}
                data-testid="btn-unwrap"
              >
                <Ungroup size={13} strokeWidth={2.5} />
                Unwrap
              </button>
              {divider}
              <button
                disabled={locked}
                onClick={() => canBlockAction ? handleBlockAction(isSketchpadAbsolute ? 'move-down' : 'move-up') : openNotEditableDialog()}
                onMouseEnter={() => setHoveredBtn('up')}
                onMouseLeave={() => setHoveredBtn(null)}
                style={mkBtnStyle('up')}
                data-tooltip={canBlockAction ? (isSketchpadAbsolute ? 'Bring to front' : 'Move up') : NOT_EDITABLE_TOOLTIP}
              >
                {isSketchpadAbsolute ? <BringToFront size={13} strokeWidth={2.5} /> : <ChevronUp size={13} strokeWidth={2.5} />}
                {isSketchpadAbsolute ? 'Bring to front' : 'Move up'}
              </button>
              {divider}
              <button
                disabled={locked}
                onClick={() => canBlockAction ? handleBlockAction(isSketchpadAbsolute ? 'move-up' : 'move-down') : openNotEditableDialog()}
                onMouseEnter={() => setHoveredBtn('down')}
                onMouseLeave={() => setHoveredBtn(null)}
                style={mkBtnStyle('down')}
                data-tooltip={canBlockAction ? (isSketchpadAbsolute ? 'Send backward' : 'Move down') : NOT_EDITABLE_TOOLTIP}
              >
                {isSketchpadAbsolute ? <SendToBack size={13} strokeWidth={2.5} /> : <ChevronDown size={13} strokeWidth={2.5} />}
                {isSketchpadAbsolute ? 'Send backward' : 'Move down'}
              </button>
              {divider}
              <button
                disabled={locked}
                onClick={() => canBlockAction ? handleBlockAction('delete') : openNotEditableDialog()}
                onMouseEnter={() => setHoveredBtn('del')}
                onMouseLeave={() => setHoveredBtn(null)}
                style={mkBtnStyle('del', {
                  padding: '0 14px',
                  color: hoveredBtn === 'del' && !locked ? 'rgba(255, 90, 90, 1)' : 'rgba(255, 110, 110, 0.75)',
                })}
                data-tooltip={canBlockAction ? 'Delete block' : NOT_EDITABLE_TOOLTIP}
              >
                <Trash2 size={13} strokeWidth={2} />
              </button>
              {!isSketchpadAbsolute && (
                <>
                  {divider}
                  <button
                    disabled={locked}
                    onClick={() => {
                      setAddMode(null);
                      setMoreOpen(prev => !prev);
                    }}
                    onMouseEnter={() => setHoveredBtn('more')}
                    onMouseLeave={() => setHoveredBtn(null)}
                    style={mkBtnStyle('more', {
                      color: moreOpen ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.82)',
                      background: moreOpen ? 'rgba(255,255,255,0.1)' : (hoveredBtn === 'more' && !locked ? 'rgba(255,255,255,0.07)' : 'transparent'),
                    })}
                    data-tooltip="More actions"
                    data-testid="btn-more-menu"
                  >
                    <MoreVertical size={13} strokeWidth={2.5} />
                  </button>
                </>
              )}
            </>
          )}
      </div>
    </div>
  );

  return (
    <>
      {createPortal(toolbar, document.body)}
      {convertSnapshot && (
        <ConvertToSketchpadDialog
          file={activeData?.file || ''}
          snapshot={convertSnapshot}
          onClose={() => setConvertSnapshot(null)}
        />
      )}
    </>
  );
};
