import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { Sketchpad, SketchpadFrame, CanvasTransform, ComponentEntry } from '../types';
import { InfiniteCanvas } from './InfiniteCanvas';
import { FrameContainer } from './FrameContainer';
import { ComponentPalette } from './ComponentPalette';
import { SketchpadOverlayPanel } from './SketchpadOverlayPanel';
import * as api from '../api';
import { fetchSourceInfo, fetchZones, takeSnapshot, blockAction, addBlock } from '../../ui/api/client';
import { parseDefaultProps } from '../utils';
import { ToastViewport } from '../../ui/components/ToastViewport';
import { theme } from '../../ui/theme';
import { isTypingInput } from '../../ui/utils/elementType';
import { Frame, Square, Plus } from 'lucide-react';

// Client-side modules for React Component references (rendering)
const allModules: Record<string, any> = import.meta.glob('/src/components/**/*.{tsx,jsx}', { eager: true });

// Build a map of component name → { Component, DefaultContent, PreviewWrapper } from client-side modules
function getComponentRefs(): Record<string, { Component: React.ComponentType<any>; DefaultContent?: React.ComponentType<any>; PreviewWrapper?: React.ComponentType<any> }> {
  const refs: Record<string, { Component: React.ComponentType<any>; DefaultContent?: React.ComponentType<any>; PreviewWrapper?: React.ComponentType<any> }> = {};
  for (const [, mod] of Object.entries(allModules)) {
    const cfg = mod?.pvConfig;
    if (!cfg?.name || !mod[cfg.name]) continue;
    refs[cfg.name] = {
      Component: mod[cfg.name],
      DefaultContent: typeof mod.PvDefaultContent === 'function' ? mod.PvDefaultContent : undefined,
      PreviewWrapper: typeof mod.PvPreviewWrapper === 'function' ? mod.PvPreviewWrapper : undefined,
    };
  }
  return refs;
}


// Fetch component data from server (includes PvDefaultContent extraction)
async function fetchServerComponents(): Promise<ComponentEntry[]> {
  const refs = getComponentRefs();
  try {
    const res = await fetch('/__get-components');
    const data = await res.json();
    return (data.components || [])
      .filter((c: any) => refs[c.name])
      .map((c: any) => ({
        name: c.name,
        displayName: c.displayName || c.name,
        description: c.description || '',
        importPath: c.importPath || '',
        defaultProps: c.defaultProps || '',
        defaultContent: c.defaultContent || '',
        additionalImportsForDefaultContent: c.additionalImportsForDefaultContent || [],
        props: c.props || {},
        Component: refs[c.name].Component,
        DefaultContent: refs[c.name].DefaultContent,
        PreviewWrapper: refs[c.name].PreviewWrapper,
      }));
  } catch {
    // Fallback to client-side discovery if server is unavailable
    const discovered: ComponentEntry[] = [];
    for (const [, mod] of Object.entries(allModules)) {
      const cfg = mod?.pvConfig;
      if (!cfg?.name || !mod[cfg.name]) continue;
      discovered.push({
        name: cfg.name,
        displayName: cfg.displayName || cfg.name,
        description: cfg.description || '',
        importPath: cfg.importPath || '',
        defaultProps: cfg.defaultProps || '',
        defaultContent: typeof cfg.defaultContent === 'string' ? cfg.defaultContent : '',
        additionalImportsForDefaultContent: cfg.additionalImportsForDefaultContent || [],
        props: cfg.props || {},
        Component: mod[cfg.name],
        DefaultContent: typeof mod.PvDefaultContent === 'function' ? mod.PvDefaultContent : undefined,
        PreviewWrapper: typeof mod.PvPreviewWrapper === 'function' ? mod.PvPreviewWrapper : undefined,
      });
    }
    return discovered;
  }
}

const INITIAL_TRANSFORM: CanvasTransform = { zoom: 0.7, panX: 200, panY: 100 };

function centeredTransformForFrames(frames: SketchpadFrame[], viewportWidth: number, viewportHeight: number): CanvasTransform {
  if (frames.length === 0) return INITIAL_TRANSFORM;
  const zoom = 0.7;
  const minX = Math.min(...frames.map((f) => f.canvasX));
  const minY = Math.min(...frames.map((f) => f.canvasY));
  const maxX = Math.max(...frames.map((f) => f.canvasX + f.width));
  const maxY = Math.max(...frames.map((f) => f.canvasY + f.height));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  return {
    zoom,
    panX: viewportWidth / 2 - centerX * zoom,
    panY: viewportHeight / 2 - centerY * zoom,
  };
}

type SketchpadDropDetail = {
  sketchpadId: string;
  sourceFrameId: string;
  targetFrameId: string;
  draggedBlockId: string;
  targetLocatorId?: string | null;
  targetBlockId?: string | null;
  isFrameTarget: boolean;
  targetLayoutMode: 'flow' | 'absolute' | string;
  x: number;
  y: number;
  isDuplicate?: boolean;
  activeSourceId?: string | null;
};

export function SketchpadApp() {
  const [sketchpads, setSketchpads] = useState<Sketchpad[]>([]);
  const [activeSketchpadId, setActiveSketchpadId] = useState<string>('');
  const [transform, setTransform] = useState<CanvasTransform>(INITIAL_TRANSFORM);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [showSketchpadPanel, setShowSketchpadPanel] = useState(false);
  const [dragComp, setDragComp] = useState<ComponentEntry | null>(null);

  const [components, setComponents] = useState<ComponentEntry[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showComponentPalette, setShowComponentPalette] = useState(false);
  const [renamePrompt, setRenamePrompt] = useState<{ frameId: string, name: string } | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [pendingAction, setPendingAction] = useState<{ type: 'add-rectangle'; comp: ComponentEntry } | null>(null);
  const [isZoomControlsHovered, setIsZoomControlsHovered] = useState(false);

  const [isMutationLocked, setIsMutationLocked] = useState(false);
  const mutationLockRef = useRef(false);

  const runLockedMutation = useCallback(async <T,>(mutation: () => Promise<T>): Promise<T | undefined> => {
    if (mutationLockRef.current) return undefined;
    mutationLockRef.current = true;
    setIsMutationLocked(true);
    try {
      const result = await mutation();
      // Let HMR/Fast Refresh settle before accepting the next mutation.
      await new Promise<void>((resolve) => setTimeout(resolve, 150));
      return result;
    } finally {
      mutationLockRef.current = false;
      setIsMutationLocked(false);
    }
  }, []);

  // Fetch components from server (includes PvDefaultContent extraction)
  useEffect(() => {
    fetchServerComponents().then(setComponents);
  }, []);

  // Dynamically loaded frame modules (keyed by frameId)
  const [frameModules, setFrameModules] = useState<
    Record<string, React.ComponentType<any>>
  >({});

  // Load a frame module dynamically via import()
  const loadFrameModule = useCallback(
    async (sketchpadId: string, frameId: string) => {
      try {
        const mod = await import(
          /* @vite-ignore */ `/src/sketchpads/${sketchpadId}/${frameId}.tsx?t=${Date.now()}`
        );
        if (mod?.default) {
          setFrameModules((prev) => ({ ...prev, [frameId]: mod.default }));
        }
      } catch (e) {
        console.warn(`Failed to load frame module ${frameId}:`, e);
      }
    },
    [],
  );

  // Load all frame modules for the active sketchpad
  const loadAllFrameModules = useCallback(
    async (sketchpadId: string, frames: SketchpadFrame[]) => {
      const modules: Record<string, React.ComponentType<any>> = {};
      for (const frame of frames) {
        try {
          const mod = await import(
            /* @vite-ignore */ `/src/sketchpads/${sketchpadId}/${frame.id}.tsx?t=${Date.now()}`
          );
          if (mod?.default) {
            modules[frame.id] = mod.default;
          }
        } catch (e) {
          console.warn(`Failed to load frame module ${frame.id}:`, e);
        }
      }
      setFrameModules(modules);
    },
    [],
  );

  // Load registry on mount — auto-create a default sketchpad if none exist
  useEffect(() => {
    api.fetchRegistry().then(async (reg) => {
      if (reg.sketchpads?.length > 0) {
        setSketchpads(reg.sketchpads);
        setActiveSketchpadId(reg.sketchpads[0].id);
        loadAllFrameModules(reg.sketchpads[0].id, reg.sketchpads[0].frames);
      } else {
        const sp = await api.createSketchpad('Sketchpad 1');
        const frame = await api.createFrame(sp.id, 'Frame 1', 1440, 900, 0, 0);
        setSketchpads([{ ...sp, frames: [frame] }]);
        setActiveSketchpadId(sp.id);
        loadAllFrameModules(sp.id, [frame]);
      }
    });
  }, [loadAllFrameModules]);

  const activeSketchpad = useMemo(
    () => sketchpads.find((s) => s.id === activeSketchpadId),
    [sketchpads, activeSketchpadId],
  );

  // Handle initial autocentering exactly once, when the canvas becomes visible
  const hasInitiallyCentered = useRef(false);

  useEffect(() => {
    if (hasInitiallyCentered.current || !activeSketchpad) return;

    const container = containerRef.current;
    if (!container) return;

    const checkAndCenter = (width: number, height: number) => {
      if (width > 0 && height > 0 && !hasInitiallyCentered.current) {
        hasInitiallyCentered.current = true;
        if (activeSketchpad.frames && activeSketchpad.frames.length > 0) {
          setTransform(centeredTransformForFrames(activeSketchpad.frames, width, height));
        }
        return true;
      }
      return false;
    };

    // Attempt to center immediately if the container is already visible
    if (checkAndCenter(container.clientWidth, container.clientHeight)) {
      return;
    }

    // Otherwise, wait for the iframe to become visible via ResizeObserver
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (checkAndCenter(entry.contentRect.width, entry.contentRect.height)) {
          observer.disconnect();
          break;
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [activeSketchpad]);

  // Sketchpad CRUD
  const handleCreateSketchpad = useCallback(async (name: string) => {
    await runLockedMutation(async () => {
      const sp = await api.createSketchpad(name);
      const frame = await api.createFrame(sp.id, 'Frame 1', 1440, 900, 0, 0);
      const spWithFrame = { ...sp, frames: [frame] };
      setSketchpads((prev) => [...prev, spWithFrame]);
      setActiveSketchpadId(sp.id);
      await loadFrameModule(sp.id, frame.id);
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setTransform(centeredTransformForFrames([frame], rect.width, rect.height));
      }
    });
  }, [runLockedMutation, loadFrameModule]);

  const handleDeleteSketchpad = useCallback(
    async (id: string) => {
      await runLockedMutation(async () => {
        await api.deleteSketchpad(id);
        const remaining = sketchpads.filter((s) => s.id !== id);
        if (remaining.length === 0) {
          // Auto-create a default sketchpad so the canvas is never empty
          const sp = await api.createSketchpad('Sketchpad 1');
          setSketchpads([sp]);
          setActiveSketchpadId(sp.id);
        } else {
          setSketchpads(remaining);
          if (activeSketchpadId === id) {
            setActiveSketchpadId(remaining[0].id);
            loadAllFrameModules(remaining[0].id, remaining[0].frames);
          }
        }
      });
    },
    [activeSketchpadId, sketchpads, loadAllFrameModules, runLockedMutation],
  );

  const handleRenameSketchpad = useCallback(async (id: string, name: string) => {
    await runLockedMutation(async () => {
      await api.renameSketchpad(id, name);
      setSketchpads((prev) =>
        prev.map((s) => (s.id === id ? { ...s, name } : s)),
      );
    });
  }, [runLockedMutation]);

  // Frame CRUD
  const handleCreateFrame = useCallback(
    async (canvasX: number, canvasY: number) => {
      if (!activeSketchpadId) return;
      await runLockedMutation(async () => {
        const name = `Frame ${(activeSketchpad?.frames.length ?? 0) + 1}`;
        const frame = await api.createFrame(activeSketchpadId, name, 1440, 900, Math.round(canvasX), Math.round(canvasY));
        setSketchpads((prev) =>
          prev.map((s) =>
            s.id === activeSketchpadId
              ? { ...s, frames: [...s.frames, frame] }
              : s,
          ),
        );
        setSelectedFrameId(frame.id);
        await loadFrameModule(activeSketchpadId, frame.id);
      });
    },
    [activeSketchpadId, activeSketchpad, loadFrameModule, runLockedMutation],
  );

  const handleAddFrameCentered = useCallback(async () => {
    if (!activeSketchpadId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Convert viewport center to canvas coordinates
    const viewCx = rect.width / 2;
    const viewCy = rect.height / 2;
    const canvasX = (viewCx - transform.panX) / transform.zoom - 720; // center 1440-wide frame
    const canvasY = (viewCy - transform.panY) / transform.zoom - 450; // center 900-tall frame
    await handleCreateFrame(canvasX, canvasY);
  }, [activeSketchpadId, transform, containerRef, handleCreateFrame]);


  const handleDuplicateFrame = useCallback(
    async (frameId: string, canvasX: number, canvasY: number) => {
      if (!activeSketchpadId) return;
      await runLockedMutation(async () => {
        const result = await api.duplicateFrame(activeSketchpadId, frameId, Math.round(canvasX), Math.round(canvasY));
        if (result?.ok) {
          await loadFrameModule(activeSketchpadId, result.frame.id);
          setSketchpads((prev) =>
            prev.map((s) =>
              s.id === activeSketchpadId
                ? { ...s, frames: [...s.frames, result.frame] }
                : s,
            ),
          );
          setSelectedFrameId(result.frame.id);
        }
      });
    },
    [activeSketchpadId, loadFrameModule, runLockedMutation],
  );

  const handleDeleteFrame = useCallback(
    async (frameId: string) => {
      if (!activeSketchpadId) return;
      await runLockedMutation(async () => {
        await api.deleteFrame(activeSketchpadId, frameId);
        setSketchpads((prev) =>
          prev.map((s) =>
            s.id === activeSketchpadId
              ? { ...s, frames: s.frames.filter((f) => f.id !== frameId) }
              : s,
          ),
        );
        setFrameModules((prev) => {
          const next = { ...prev };
          delete next[frameId];
          return next;
        });
        if (selectedFrameId === frameId) setSelectedFrameId(null);
      });
    },
    [activeSketchpadId, selectedFrameId, runLockedMutation],
  );

  const handleRenameFrame = useCallback(
    (frameId: string) => {
      const frame = activeSketchpad?.frames.find((f) => f.id === frameId);
      if (!frame) return;
      setRenamePrompt({ frameId, name: frame.name });
    },
    [activeSketchpad],
  );

  const executeRenameFrame = useCallback((frameId: string, newName: string) => {
    setRenamePrompt(null);
    if (newName && newName.trim()) {
      const trimmed = newName.trim();
      runLockedMutation(async () => {
        setSketchpads((prev) =>
          prev.map((s) =>
            s.id === activeSketchpadId
              ? {
                  ...s,
                  frames: s.frames.map((f) =>
                    f.id === frameId ? { ...f, name: trimmed } : f,
                  ),
                }
              : s,
          ),
        );
        await api.renameFrame(activeSketchpadId, frameId, trimmed);
      });
    }
  }, [activeSketchpadId, runLockedMutation]);

  const handleMoveFrame = useCallback(
    (frameId: string, x: number, y: number) => {
      setSketchpads((prev) =>
        prev.map((s) =>
          s.id === activeSketchpadId
            ? {
                ...s,
                frames: s.frames.map((f) =>
                  f.id === frameId ? { ...f, canvasX: x, canvasY: y } : f,
                ),
              }
            : s,
        ),
      );
    },
    [activeSketchpadId],
  );

  const handleMoveFrameEnd = useCallback(
    (frameId: string, x: number, y: number) => {
      if (activeSketchpadId) {
        runLockedMutation(() => api.updateFramePosition(activeSketchpadId, frameId, Math.round(x), Math.round(y)));
      }
    },
    [activeSketchpadId, runLockedMutation],
  );

  const handleResizeFrame = useCallback(
    (frameId: string, w: number, h: number) => {
      setSketchpads((prev) =>
        prev.map((s) =>
          s.id === activeSketchpadId
            ? {
                ...s,
                frames: s.frames.map((f) =>
                  f.id === frameId ? { ...f, width: w, height: h } : f,
                ),
              }
            : s,
        ),
      );
    },
    [activeSketchpadId],
  );

  const handleResizeFrameEnd = useCallback(
    (frameId: string, w: number, h: number) => {
      if (activeSketchpadId) {
        runLockedMutation(() => api.resizeFrame(activeSketchpadId, frameId, Math.round(w), Math.round(h)));
      }
    },
    [activeSketchpadId, runLockedMutation],
  );

  // Element interactions — components are rendered from frame .tsx modules.
  // When an element is added, the backend writes to the frame file and we re-import the module.
  // After adding an element, poll for it in the DOM and select it via the bridge
  const focusNewBlock = useCallback(async (blockId: string) => {
    const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
    const maxAttempts = 20;
    for (let attempts = 0; attempts < maxAttempts; attempts++) {
      const el = document.querySelector(`[data-pv-block="${blockId}"]`);
      if (el) {
        window.dispatchEvent(new CustomEvent('pv-select-block', { detail: { blockId } }));
        return;
      }
      await wait(50);
    }
  }, []);

  const handleAddComponent = useCallback(
    async (comp: ComponentEntry, frameId?: string, x?: number, y?: number) => {
      const targetFrame = frameId || selectedFrameId;
      if (!targetFrame || !activeSketchpadId) return;

      const posX = x ?? 100;
      const posY = y ?? 100;
      const targetFile = `src/sketchpads/${activeSketchpadId}/${targetFrame}.tsx`;

      await runLockedMutation(async () => {
        await takeSnapshot(targetFile, '');
        const result = await addBlock({
          file: targetFile,
          zoneId: 'target-zone-placeholder',
          elementType: 'component',
          compName: comp.name,
          importPath: comp.importPath,
          defaultProps: comp.defaultProps,
          defaultContent: comp.defaultContent,
          additionalImportsForDefaultContent: comp.additionalImportsForDefaultContent,
          targetLayoutMode: 'absolute',
          pasteX: Math.round(posX),
          pasteY: Math.round(posY),
        });
        if (result?.blockId) await focusNewBlock(result.blockId);
      });
    },
    [selectedFrameId, activeSketchpadId, runLockedMutation, focusNewBlock],
  );

  const handleAddRectangleCentered = useCallback(async () => {
    if (!activeSketchpadId) return;
    const rectComp = components.find((c) => c.name === 'Rectangle');
    if (!rectComp) return;

    setPendingAction({ type: 'add-rectangle', comp: rectComp });
  }, [activeSketchpadId, components]);

  // Reload registry state after undo/redo (frames are hot-reloaded by HMR)
  const reloadRegistry = useCallback(async () => {
    const reg = await api.fetchRegistry();
    
    if (activeSketchpadId && activeSketchpad) {
      const nextSp = reg.sketchpads.find(s => s.id === activeSketchpadId);
      if (nextSp) {
        // Only load modules for frames that were just restored/added by the undo/redo
        const restoredFrames = nextSp.frames.filter(
          (nf) => !activeSketchpad.frames.some((pf) => pf.id === nf.id)
        );
        for (const frame of restoredFrames) {
          loadFrameModule(activeSketchpadId, frame.id);
        }
      }
    }
    
    setSketchpads(reg.sketchpads);
  }, [activeSketchpadId, activeSketchpad, loadFrameModule]);

  // Listen for undo/redo completion and element selection events from the parent shell
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'PV_UNDO_REDO_COMPLETE') {
        reloadRegistry();
      }
      // If any element inside the canvas is officially selected, drop the frame highlight
      if (e.data?.type === 'PV_SET_SELECTION' && e.data.runtimeIds && e.data.runtimeIds.length > 0) {
        setSelectedFrameId(null);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [reloadRegistry]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (isTypingInput(document.activeElement as HTMLElement | null)) return;

      if (e.key === 'Escape' && pendingAction) {
        setPendingAction(null);
        return;
      }

      // Zoom to fit
      if (e.key === '0' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setTransform(INITIAL_TRANSFORM);
        return;
      }

      // Delete selected frame via keyboard
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedFrameId) {
        handleDeleteFrame(selectedFrameId);
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedFrameId, handleDeleteFrame, pendingAction]);

  // Context-aware drop — resolves target zone (frame root or nested editable zone), then cut/paste.
  useEffect(() => {
    const handleDropElement = async (e: Event) => {
      const data = (e as CustomEvent<SketchpadDropDetail>).detail;
      if (!data) return;

      const {
        sketchpadId,
        sourceFrameId,
        targetFrameId,
        draggedBlockId,
        targetLocatorId,
        isFrameTarget,
        targetLayoutMode,
        x,
        y,
        isDuplicate,
        activeSourceId,
      } = data;

      if (!sketchpadId || !sourceFrameId || !targetFrameId || !draggedBlockId) return;

      const sourceFile = `src/sketchpads/${sketchpadId}/${sourceFrameId}.tsx`;
        const fallbackTargetFile = `src/sketchpads/${sketchpadId}/${targetFrameId}.tsx`;

      try {
        await runLockedMutation(async () => {
            // 1. Copy the element first
          await blockAction('copy', draggedBlockId, sourceFile);

            // 2. Fetch the target fresh so zone IDs and line numbers are current.
            let currentTargetFile = fallbackTargetFile;
            let currentTargetZoneId = 'target-zone-placeholder';
            let currentTargetIsPristine = false;
            let currentTargetStartLine: number | undefined;
            let currentTargetEndLine: number | undefined;

            if (!isFrameTarget) {
              if (!targetLocatorId) {
                window.dispatchEvent(new CustomEvent('pv-toast', {
                  detail: { message: 'Cannot drop here - no source locator found', variant: 'error' },
                }));
                return;
              }

              try {
                const sourceInfo = await fetchSourceInfo(targetLocatorId);
                currentTargetFile = sourceInfo.file;
                currentTargetStartLine = sourceInfo.startLine;
                currentTargetEndLine = sourceInfo.endLine;

                const zonesData = await fetchZones(
                  sourceInfo.file,
                  sourceInfo.startLine,
                  sourceInfo.startCol,
                  sourceInfo.endLine,
                );

                if (!zonesData?.zones || zonesData.zones.length === 0) {
                  window.dispatchEvent(new CustomEvent('pv-toast', {
                    detail: { message: 'Cannot drop here - no editable zone', variant: 'error' },
                  }));
                  return;
                }

                currentTargetZoneId = zonesData.zones[0].id;
                currentTargetIsPristine = zonesData.zones[0].isPristine;
              } catch (err) {
                console.error('[Sketchpad] Failed to resolve nested drop target:', err);
                window.dispatchEvent(new CustomEvent('pv-toast', {
                  detail: { message: 'Cannot resolve drop target', variant: 'error' },
                }));
                return;
              }
            }

            const extraFiles = sourceFile !== currentTargetFile ? [currentTargetFile] : [];
            await takeSnapshot(sourceFile, activeSourceId || '', extraFiles);

            // 3. Paste into the freshly fetched target
            const res = await addBlock({
              file: currentTargetFile,
              zoneId: currentTargetZoneId,
              isPristine: currentTargetIsPristine,
              elementType: 'paste',
              targetLayoutMode,
              pasteX: Math.round(x),
              pasteY: Math.round(y),
              targetStartLine: currentTargetStartLine,
              targetEndLine: currentTargetEndLine,
            });

            // 4. Delete the original block (if not duplicating)
            if (!isDuplicate) {
              await blockAction('delete', draggedBlockId, sourceFile);
            }

            if (res?.blockId) {
              await focusNewBlock(res.blockId);
            }
        });
      } catch (err) {
        console.error('[Sketchpad] Drop sequence failed:', err);
      }
    };

    window.addEventListener('pv-sketchpad-drop-element', handleDropElement);
    return () => window.removeEventListener('pv-sketchpad-drop-element', handleDropElement);
  }, [runLockedMutation, focusNewBlock]);

  // Drop handler for drag from palette
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const compName = e.dataTransfer.getData('text/plain');
      const comp = components.find((c) => c.name === compName);
      if (!comp || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left - transform.panX) / transform.zoom;
      const canvasY = (e.clientY - rect.top - transform.panY) / transform.zoom;

      // Find which frame the drop landed on
      const targetFrame = activeSketchpad?.frames.find(
        (f) =>
          canvasX >= f.canvasX &&
          canvasX <= f.canvasX + f.width &&
          canvasY >= f.canvasY &&
          canvasY <= f.canvasY + f.height,
      );

      if (targetFrame) {
        const relX = canvasX - targetFrame.canvasX;
        const relY = canvasY - targetFrame.canvasY;
        handleAddComponent(comp, targetFrame.id, relX, relY);
      }
    },
    [components, transform, activeSketchpad, handleAddComponent],
  );

  return (
    <div
      ref={containerRef}
      data-sketchpad-id={activeSketchpadId || undefined}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      }}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <InfiniteCanvas
        transform={transform}
        onTransformChange={setTransform}
        onCanvasContextMenu={(e) => e.preventDefault()}
      >
        {activeSketchpad?.frames.map((frame) => (
          <FrameContainer
            key={frame.id}
            frameId={frame.id}
            name={frame.name}
            width={frame.width}
            height={frame.height}
            canvasX={frame.canvasX}
            canvasY={frame.canvasY}
            zoom={transform.zoom}
            isSelected={selectedFrameId === frame.id}
            onMove={handleMoveFrame}
            onMoveEnd={handleMoveFrameEnd}
            onResize={handleResizeFrame}
            onResizeEnd={handleResizeFrameEnd}
            onSelect={setSelectedFrameId}
            onDuplicate={handleDuplicateFrame}
            onDelete={handleDeleteFrame}
            onRename={handleRenameFrame}
          >
            {/* Render frame module — components come from the frame .tsx file */}
            {frameModules[frame.id] ? (
              React.createElement(frameModules[frame.id])
            ) : (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: theme.text_secondary,
                  fontSize: 13,
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                Click a component to add it
              </div>
            )}
          </FrameContainer>
        ))}
      </InfiniteCanvas>

      {/* Toolbar */}
      <div
        style={{
          position: 'fixed',
          top: 12,
          left: 12,
          display: 'flex',
          gap: 6,
          zIndex: 100,
        }}
      >
        <ToolbarButton
          data-testid="toolbar-sketchpads"
          label="☰"
          title="Sketchpads"
          isActive={showSketchpadPanel}
          onClick={() => setShowSketchpadPanel((p) => !p)}
        />
        <ToolbarButton
          data-testid="toolbar-add"
          ref={addButtonRef}
          label="+"
          title="Add"
          isActive={showAddMenu}
          onClick={() => setShowAddMenu((p) => !p)}
        />
      </div>

      {/* Pending action: click-to-place overlay + info bar */}
      {pendingAction && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 250,
              cursor: 'crosshair',
            }}
            onClick={(e) => {
              if (!containerRef.current) return;
              const rect = containerRef.current.getBoundingClientRect();
              const canvasX = (e.clientX - rect.left - transform.panX) / transform.zoom;
              const canvasY = (e.clientY - rect.top - transform.panY) / transform.zoom;

              const targetFrame = activeSketchpad?.frames.find(
                (f) =>
                  canvasX >= f.canvasX &&
                  canvasX <= f.canvasX + f.width &&
                  canvasY >= f.canvasY &&
                  canvasY <= f.canvasY + f.height,
              );

              if (targetFrame) {
                const relX = canvasX - targetFrame.canvasX;
                const relY = canvasY - targetFrame.canvasY;
                handleAddComponent(pendingAction.comp, targetFrame.id, relX, relY);
                setSelectedFrameId(targetFrame.id);
                setPendingAction(null);
              }
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '8px 16px',
              background: theme.accent_default,
              color: theme.text_default,
              fontSize: 13,
              fontFamily: 'var(--font-sans, system-ui, sans-serif)',
              fontWeight: 500,
              zIndex: 300,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <span>Click inside a frame to place the rectangle</span>
            <button
              onClick={(e) => { e.stopPropagation(); setPendingAction(null); }}
              style={{
                background: 'none',
                border: 'none',
                color: theme.text_default,
                cursor: 'pointer',
                fontSize: 16,
                padding: '0 4px',
                lineHeight: 1,
                opacity: 0.8,
              }}
              title="Cancel"
            >
              ✕
            </button>
          </div>
        </>
      )}

      {/* Add menu dropdown */}
      {showAddMenu && createPortal(
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 199 }}
            onClick={() => setShowAddMenu(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: (addButtonRef.current?.getBoundingClientRect().bottom ?? 48) + 4,
              left: addButtonRef.current?.getBoundingClientRect().left ?? 54,
              zIndex: 200,
              background: theme.bg_default,
              border: `1px solid ${theme.border_default}`,
              borderRadius: 8,
              padding: '4px 0',
              minWidth: 160,
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              fontFamily: 'var(--font-sans, system-ui, sans-serif)',
              fontSize: 12,
            }}
          >
            {[
              { label: 'New frame', icon: Frame, action: handleAddFrameCentered },
              { label: 'New rectangle', icon: Square, action: handleAddRectangleCentered },
              { label: 'Add component', icon: Plus, action: () => setShowComponentPalette(true) },
            ].map((item) => (
              <div
                key={item.label}
                data-testid={`add-menu-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => {
                  setShowAddMenu(false);
                  item.action();
                }}
                style={{
                  padding: '7px 12px',
                  cursor: 'pointer',
                  color: theme.text_secondary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = theme.bg_low;
                  e.currentTarget.style.color = theme.text_default;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = theme.text_secondary;
                }}
              >
                <item.icon size={14} strokeWidth={2.5} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </>,
        document.body,
      )}

      <style>
        {`
          .sketchpad-zoom-slider {
            -webkit-appearance: none;
            appearance: none;
            height: 4px;
            border-radius: 999px;
            background: ${theme.border_default};
          }

          .sketchpad-zoom-slider:focus,
          .sketchpad-zoom-slider:focus-visible {
            outline: none;
            box-shadow: none;
          }

          .sketchpad-zoom-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 12px;
            height: 12px;
            border-radius: 999px;
            background: ${theme.text_secondary};
            border: 1px solid ${theme.border_default};
          }

          .sketchpad-zoom-slider::-moz-range-thumb {
            width: 12px;
            height: 12px;
            border-radius: 999px;
            background: ${theme.text_secondary};
            border: 1px solid ${theme.border_default};
          }

          .sketchpad-zoom-slider::-moz-range-track {
            height: 4px;
            border-radius: 999px;
            background: ${theme.border_default};
          }

          .sketchpad-toolbar-button {
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            font-family: var(--font-sans, system-ui, sans-serif);
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            transition: all 0.15s;
            outline: none;
            border: 1px solid ${theme.border_default};
            background: ${theme.bg_strong};
            color: ${theme.text_secondary};
          }

          .sketchpad-toolbar-button:hover {
            border-color: ${theme.border_accent};
            background: ${theme.bg_secondary};
            color: ${theme.text_default};
          }

          .sketchpad-toolbar-button:active {
            background: ${theme.bg_tertiary};
            transform: translateY(1px);
          }

          .sketchpad-toolbar-button.is-active {
            border-color: ${theme.border_accent};
            background: #1e3040; /* More solid dark blue background instead of transparent accent_low */
            color: ${theme.accent_default};
          }

          .sketchpad-toolbar-button.is-active:hover {
            background: #253d52;
          }
        `}
      </style>

      {/* Zoom controls */}
      <div
        onMouseEnter={(e) => { setIsZoomControlsHovered(true); e.currentTarget.style.borderColor = theme.border_accent; }}
        onMouseLeave={(e) => { setIsZoomControlsHovered(false); e.currentTarget.style.borderColor = theme.border_default; }}
        style={{
          position: 'fixed',
          bottom: 12,
          right: 12,
          background: theme.bg_strong,
          border: `1px solid ${theme.border_default}`,
          borderRadius: 6,
          padding: isZoomControlsHovered ? '6px 12px' : '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isZoomControlsHovered ? '12px' : 0,
          zIndex: 100,
          backdropFilter: 'blur(12px)',
          minWidth: isZoomControlsHovered ? 'auto' : 34,
          minHeight: 34,
          transition: 'border-color 0.15s',
        }}
      >
        {isZoomControlsHovered ? (
          <>
            <input
              className="sketchpad-zoom-slider"
              type="range"
              min={0.1}
              max={3}
              step={0.01}
              value={transform.zoom}
              onChange={(e) => {
                let val = parseFloat(e.target.value);
                // Magnetic snap to exactly 100% when close
                if (val > 0.92 && val < 1.08) val = 1;

                if (!containerRef.current) return;
                const rect = containerRef.current.getBoundingClientRect();
                // Slider zooms towards the center of the viewport
                const viewCx = rect.width / 2;
                const viewCy = rect.height / 2;
                const ratio = val / transform.zoom;

                setTransform(prev => ({
                  zoom: val,
                  panX: viewCx - ratio * (viewCx - prev.panX),
                  panY: viewCy - ratio * (viewCy - prev.panY),
                }));
              }}
              style={{
                width: '80px',
                cursor: 'pointer'
              }}
              title="Zoom Level"
            />
            <span
              style={{
                fontSize: 11,
                color: theme.text_secondary,
                fontFamily: 'var(--font-sans, system-ui, sans-serif)',
                userSelect: 'none',
                minWidth: '32px',
                textAlign: 'right',
                cursor: 'pointer'
              }}
              onClick={() => {
                // Reset to 100% on click
                if (!containerRef.current) return;
                const rect = containerRef.current.getBoundingClientRect();
                const viewCx = rect.width / 2;
                const viewCy = rect.height / 2;
                const ratio = 1 / transform.zoom;

                setTransform(prev => ({
                  zoom: 1,
                  panX: viewCx - ratio * (viewCx - prev.panX),
                  panY: viewCy - ratio * (viewCy - prev.panY),
                }));
              }}
              title="Reset to 100%"
            >
              {Math.round(transform.zoom * 100)}%
            </span>
          </>
        ) : (
          <div
            title="Zoom controls"
            style={{
              width: 16,
              height: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.text_secondary,
              pointerEvents: 'none',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M11 8V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M8 11H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M20 20L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>

      {/* Empty state when no frames */}
      {activeSketchpad && activeSketchpad.frames.length === 0 && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: theme.text_tertiary,
            fontSize: 14,
            fontFamily: 'var(--font-sans, system-ui, sans-serif)',
            userSelect: 'none',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>⊞</div>
          <div>Click the + button above to create a frame</div>
        </div>
      )}

      {showComponentPalette && (
        <ComponentPalette
          components={components}
          onDragStart={setDragComp}
          onClickAdd={(comp) => handleAddComponent(comp)}
          onClose={() => setShowComponentPalette(false)}
        />
      )}

      <SketchpadOverlayPanel
        isOpen={showSketchpadPanel}
        onClose={() => setShowSketchpadPanel(false)}
        sketchpads={sketchpads}
        activeSketchpadId={activeSketchpadId}
        onSelect={(id) => {
          setActiveSketchpadId(id);
          setShowSketchpadPanel(false);
          setSelectedFrameId(null);
          const sp = sketchpads.find((s) => s.id === id);
          if (sp) loadAllFrameModules(id, sp.frames);
        }}
        onCreate={handleCreateSketchpad}
        onDelete={handleDeleteSketchpad}
        onRename={handleRenameSketchpad}
      />
      {isMutationLocked && (
        <div
          data-testid="mutation-lock-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            background: 'transparent',
            pointerEvents: 'auto',
            cursor: 'progress',
          }}
        />
      )}
      <ToastViewport />

      {renamePrompt && createPortal(
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'rgba(0,0,0,0.55)' }}
            onClick={() => setRenamePrompt(null)}
          />
          <div
            style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              zIndex: 99999, background: theme.bg_default, border: `1px solid ${theme.border_default}`,
              borderRadius: 12, padding: '20px 24px', width: 320, boxShadow: '0 16px 64px rgba(0,0,0,0.7)',
              fontFamily: 'var(--font-sans, system-ui, sans-serif)'
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: theme.text_default, marginBottom: 12 }}>Rename Frame</div>
            <input
              autoFocus
              defaultValue={renamePrompt.name}
              onFocus={(e) => e.currentTarget.select()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') executeRenameFrame(renamePrompt.frameId, e.currentTarget.value);
                if (e.key === 'Escape') setRenamePrompt(null);
              }}
              style={{
                width: '100%', background: theme.bg_low, border: `1px solid ${theme.border_accent}`,
                borderRadius: 6, padding: '8px 12px', color: theme.text_default, fontSize: 13, outline: 'none', marginBottom: 20
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setRenamePrompt(null)}
                style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${theme.border_default}`, background: 'transparent', color: theme.text_secondary, cursor: 'pointer', fontSize: 12 }}
              >Cancel</button>
              <button
                onClick={(e) => {
                  const input = e.currentTarget.parentElement?.previousElementSibling as HTMLInputElement;
                  executeRenameFrame(renamePrompt.frameId, input.value);
                }}
                style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: theme.accent_default, color: theme.text_default, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
              >Rename</button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

// ─── Toolbar button ────────────────────────────────────────────────────────

const ToolbarButton = React.forwardRef<
  HTMLButtonElement,
  { label: string; title: string; isActive: boolean; onClick: () => void; 'data-testid'?: string }
>(function ToolbarButton({ label, title, isActive, onClick, 'data-testid': testId }, ref) {
  return (
    <button
      ref={ref}
      data-testid={testId}
      onClick={onClick}
      title={title}
      className={`sketchpad-toolbar-button ${isActive ? 'is-active' : ''}`}
    >
      {label}
    </button>
  );
});
