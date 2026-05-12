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
import { Frame, Square, Plus, Menu, Type, Minus } from 'lucide-react';

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

const VerticalLineIcon = (props: React.ComponentProps<typeof Minus>) => (
  <Minus {...props} style={{ ...props.style, transform: 'rotate(90deg)' }} />
);

function isFrameInViewport(
  frame: SketchpadFrame,
  transform: CanvasTransform,
  viewportWidth: number,
  viewportHeight: number,
): boolean {
  const left = transform.panX + frame.canvasX * transform.zoom;
  const top = transform.panY + frame.canvasY * transform.zoom;
  const right = left + frame.width * transform.zoom;
  const bottom = top + frame.height * transform.zoom;
  return right > 0 && left < viewportWidth && bottom > 0 && top < viewportHeight;
}

function ensureFramesVisible(
  frames: SketchpadFrame[],
  transform: CanvasTransform,
  viewportWidth: number,
  viewportHeight: number,
): CanvasTransform {
  if (frames.length === 0 || viewportWidth <= 0 || viewportHeight <= 0) return transform;
  if (frames.some((f) => isFrameInViewport(f, transform, viewportWidth, viewportHeight))) return transform;
  return centeredTransformForFrames(frames, viewportWidth, viewportHeight);
}

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
  draggedBlockId: string; // legacy fallback
  draggedBlockIds: string[];
  targetLocatorId?: string | null;
  targetBlockId?: string | null;
  isFrameTarget: boolean;
  targetLayoutMode: 'flow' | 'absolute' | string;
  x: number;
  y: number;
  isDuplicate?: boolean;
  activeSourceId?: string | null;
  // Per-block source-frame-relative positions used as a fallback when the
  // drop target has no editable zone — instead of snapping back, we apply
  // these as a position-only update on the source frame.
  fallbackPositions?: Array<{ blockId: string; x: number; y: number }>;
};

export function SketchpadApp() {
  const [sketchpads, setSketchpads] = useState<Sketchpad[]>([]);
  const [activeSketchpadId, setActiveSketchpadId] = useState<string>('');
  const [transform, setTransform] = useState<CanvasTransform>(INITIAL_TRANSFORM);
  const [selectedFrameIds, setSelectedFrameIds] = useState<string[]>([]);
  const selectedFrameId = selectedFrameIds[selectedFrameIds.length - 1] ?? null;
  const handleFrameSelect = useCallback((frameId: string | null, additive?: boolean) => {
    setSelectedFrameIds((prev) => {
      if (frameId === null) return [];
      if (!additive) return [frameId];
      if (prev.includes(frameId)) return prev.filter((id) => id !== frameId);
      return [...prev, frameId];
    });
  }, []);
  const [marquee, setMarquee] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [marqueePreview, setMarqueePreview] = useState<Array<{ left: number; top: number; width: number; height: number }>>([]);
  const spaceHeldRef = useRef(false);
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'PV_SPACE_MODE') {
        spaceHeldRef.current = e.data.active;
      }
    };
    window.addEventListener('message', handleMessage);

    const down = (e: KeyboardEvent) => { if (e.code === 'Space') spaceHeldRef.current = true; };
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') spaceHeldRef.current = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const [showSketchpadPanel, setShowSketchpadPanel] = useState(false);
  const [dragComp, setDragComp] = useState<ComponentEntry | null>(null);

  const [components, setComponents] = useState<ComponentEntry[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showComponentPalette, setShowComponentPalette] = useState(true);
  const [renamePrompt, setRenamePrompt] = useState<{ frameId: string, name: string } | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [pendingAction, setPendingAction] = useState<
    | { type: 'add-rectangle'; comp: ComponentEntry }
    | { type: 'add-horizontal-line'; comp: ComponentEntry }
    | { type: 'add-vertical-line'; comp: ComponentEntry }
    | { type: 'add-text' }
    | null
  >(null);
  const [isZoomControlsHovered, setIsZoomControlsHovered] = useState(false);

  const [isMutationLocked, setIsMutationLocked] = useState(false);
  const mutationLockRef = useRef(false);
  const mousePosRef = useRef({ x: 0, y: 0 });

  type FrameClipboardEntry = {
    sourceFrameId: string;
    name: string;
    width: number;
    height: number;
    canvasX: number;
    canvasY: number;
    content: string;
  };
  const frameClipboardRef = useRef<FrameClipboardEntry[] | null>(null);

  useEffect(() => {
    const track = (e: MouseEvent) => { mousePosRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('mousemove', track, { passive: true });
    return () => window.removeEventListener('mousemove', track);
  }, []);

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

  // Tracks whether initial transform has been applied for the currently-loaded sketchpad
  // so we can skip the auto-center effect when a saved viewState was restored.
  const initialTransformAppliedRef = useRef(false);

  // Load registry on mount — auto-create a default sketchpad if none exist.
  // Restores last-active sketchpad and its persisted pan/zoom.
  useEffect(() => {
    api.fetchRegistry().then(async (reg) => {
      if (reg.sketchpads?.length > 0) {
        setSketchpads(reg.sketchpads);
        const initial =
          reg.sketchpads.find((s) => s.id === reg.lastActiveSketchpadId) ?? reg.sketchpads[0];
        setActiveSketchpadId(initial.id);
        if (initial.viewState) {
          setTransform(initial.viewState);
          initialTransformAppliedRef.current = true;
        }
        loadAllFrameModules(initial.id, initial.frames);
      } else {
        const sp = await api.createSketchpad('Sketchpad 1');
        const frame = await api.createFrame(sp.id, 'Frame 1', 1440, 900, 0, 0);
        setSketchpads([{ ...sp, frames: [frame] }]);
        setActiveSketchpadId(sp.id);
        loadAllFrameModules(sp.id, [frame]);
      }
    });
  }, [loadAllFrameModules]);

  // Persist active sketchpad id whenever it changes.
  const lastPersistedActiveRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeSketchpadId) return;
    if (lastPersistedActiveRef.current === activeSketchpadId) return;
    lastPersistedActiveRef.current = activeSketchpadId;
    api.updateSketchpadView(activeSketchpadId, { makeActive: true }).catch(() => {});
  }, [activeSketchpadId]);

  // Debounced + unload-safe persistence of pan/zoom for the active sketchpad.
  // Skips the very first transform value after switching sketchpads (set programmatically
  // from saved viewState or from auto-centering) to avoid a redundant write back.
  const lastSavedTransformRef = useRef<{ id: string; transform: CanvasTransform } | null>(null);
  useEffect(() => {
    if (!activeSketchpadId) return;
    // Reset baseline whenever active sketchpad changes
    if (lastSavedTransformRef.current?.id !== activeSketchpadId) {
      lastSavedTransformRef.current = { id: activeSketchpadId, transform };
      return;
    }
    const last = lastSavedTransformRef.current.transform;
    if (last.zoom === transform.zoom && last.panX === transform.panX && last.panY === transform.panY) return;
    const handle = setTimeout(() => {
      lastSavedTransformRef.current = { id: activeSketchpadId, transform };
      api.updateSketchpadView(activeSketchpadId, { viewState: transform }).catch(() => {});
    }, 3000);
    return () => clearTimeout(handle);
  }, [activeSketchpadId, transform]);

  // Save view state on tab close / refresh via sendBeacon.
  useEffect(() => {
    const flush = () => {
      if (!activeSketchpadId) return;
      api.updateSketchpadView(
        activeSketchpadId,
        { viewState: transform, makeActive: true },
        { keepalive: true },
      );
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
    };
  }, [activeSketchpadId, transform]);

  const zoomToPoint = useCallback((newZoom: number, clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const fx = clientX - rect.left;
    const fy = clientY - rect.top;
    setTransform(prev => {
      const ratio = newZoom / prev.zoom;
      return { zoom: newZoom, panX: fx - ratio * (fx - prev.panX), panY: fy - ratio * (fy - prev.panY) };
    });
  }, []);

  const zoomToCenter = useCallback((newZoom: number) => {
    const { x, y } = mousePosRef.current;
    zoomToPoint(newZoom, x, y);
  }, [zoomToPoint]);

  const zoomByFactor = useCallback((factor: number) => {
    const { x, y } = mousePosRef.current;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const fx = x - rect.left;
    const fy = y - rect.top;
    setTransform(prev => {
      const newZoom = Math.min(3, Math.max(0.1, prev.zoom * factor));
      const ratio = newZoom / prev.zoom;
      return { zoom: newZoom, panX: fx - ratio * (fx - prev.panX), panY: fy - ratio * (fy - prev.panY) };
    });
  }, []);

  const activeSketchpad = useMemo(
    () => sketchpads.find((s) => s.id === activeSketchpadId),
    [sketchpads, activeSketchpadId],
  );

  // Handle initial autocentering exactly once, when the canvas becomes visible
  const hasInitiallyCentered = useRef(false);

  useEffect(() => {
    if (hasInitiallyCentered.current || !activeSketchpad) return;
    if (initialTransformAppliedRef.current) {
      hasInitiallyCentered.current = true;
      return;
    }

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

  // When the user opens the Sketchpad nav tab, ensure at least one Frame is in
  // the viewport — otherwise auto-center on the bounding box of all frames.
  // Guards against stale viewState pointing into empty space (e.g. after a frame
  // was deleted far from the camera, or after coordinate corruption).
  const transformRef = useRef(transform);
  useEffect(() => { transformRef.current = transform; }, [transform]);
  const activeSketchpadRef = useRef(activeSketchpad);
  useEffect(() => { activeSketchpadRef.current = activeSketchpad; }, [activeSketchpad]);
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== 'PV_SKETCHPAD_TAB_OPENED') return;
      const sp = activeSketchpadRef.current;
      const container = containerRef.current;
      if (!sp || !container || sp.frames.length === 0) return;
      const { width, height } = container.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      const next = ensureFramesVisible(sp.frames, transformRef.current, width, height);
      if (next !== transformRef.current) setTransform(next);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

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
            const next = remaining[0];
            setActiveSketchpadId(next.id);
            setSelectedFrameIds([]);
            const rect = containerRef.current?.getBoundingClientRect();
            const baseTransform = next.viewState ?? INITIAL_TRANSFORM;
            const safeTransform =
              rect && rect.width > 0 && rect.height > 0
                ? ensureFramesVisible(next.frames, baseTransform, rect.width, rect.height)
                : baseTransform;
            setTransform(safeTransform);
            initialTransformAppliedRef.current = true;
            hasInitiallyCentered.current = true;
            loadAllFrameModules(next.id, next.frames);
          }
        }
      });
    },
    [activeSketchpadId, sketchpads, loadAllFrameModules, runLockedMutation],
  );

  const handleDuplicateSketchpad = useCallback(
    async (id: string) => {
      await runLockedMutation(async () => {
        const newSp = await api.duplicateSketchpad(id);
        if (!newSp?.id) return;
        setSketchpads((prev) => [...prev, newSp]);
        setActiveSketchpadId(newSp.id);
        setSelectedFrameIds([]);
        await loadAllFrameModules(newSp.id, newSp.frames);
        if (containerRef.current && newSp.frames.length > 0) {
          const rect = containerRef.current.getBoundingClientRect();
          setTransform(centeredTransformForFrames(newSp.frames, rect.width, rect.height));
        }
        window.dispatchEvent(new CustomEvent('pv-toast', {
          detail: { message: `Sketchpad "${newSp.name}" created`, variant: 'info' },
        }));
      });
    },
    [runLockedMutation, loadAllFrameModules],
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
        setSelectedFrameIds([frame.id]);
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
          setSelectedFrameIds([result.frame.id]);
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
        setSelectedFrameIds((prev) => prev.filter((id) => id !== frameId));
      });
    },
    [activeSketchpadId, runLockedMutation],
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

  const handleMoveFramesMulti = useCallback(
    (updates: Array<{ frameId: string; x: number; y: number }>) => {
      setSketchpads((prev) =>
        prev.map((s) =>
          s.id === activeSketchpadId
            ? {
                ...s,
                frames: s.frames.map((f) => {
                  const u = updates.find((u) => u.frameId === f.id);
                  return u ? { ...f, canvasX: u.x, canvasY: u.y } : f;
                }),
              }
            : s,
        ),
      );
    },
    [activeSketchpadId],
  );

  const handleMoveFramesMultiEnd = useCallback(
    (updates: Array<{ frameId: string; x: number; y: number }>) => {
      if (!activeSketchpadId || updates.length === 0) return;
      runLockedMutation(() =>
        api.updateFramePositionMulti(
          activeSketchpadId,
          updates.map((u) => ({ frameId: u.frameId, canvasX: Math.round(u.x), canvasY: Math.round(u.y) })),
        ),
      );
    },
    [activeSketchpadId, runLockedMutation],
  );

  const handleDuplicateFramesMulti = useCallback(
    async (entries: Array<{ frameId: string; canvasX: number; canvasY: number }>) => {
      if (!activeSketchpadId || entries.length === 0) return;
      await runLockedMutation(async () => {
        const result = await api.duplicateFramesMulti(
          activeSketchpadId,
          entries.map((e) => ({ frameId: e.frameId, canvasX: Math.round(e.canvasX), canvasY: Math.round(e.canvasY) })),
        );
        if (result?.ok && result.frames.length > 0) {
          for (const f of result.frames) {
            await loadFrameModule(activeSketchpadId, f.id);
          }
          setSketchpads((prev) =>
            prev.map((s) =>
              s.id === activeSketchpadId ? { ...s, frames: [...s.frames, ...result.frames] } : s,
            ),
          );
          setSelectedFrameIds(result.frames.map((f) => f.id));
        }
      });
    },
    [activeSketchpadId, loadFrameModule, runLockedMutation],
  );

  const copyFramesToClipboard = useCallback(
    async (frameIds: string[]): Promise<FrameClipboardEntry[] | null> => {
      if (!activeSketchpad || frameIds.length === 0) return null;
      const frames = activeSketchpad.frames.filter((f) => frameIds.includes(f.id));
      if (frames.length === 0) return null;
      const entries: FrameClipboardEntry[] = [];
      for (const f of frames) {
        try {
          const { content } = await api.readFrame(activeSketchpad.id, f.id);
          if (content) {
            entries.push({
              sourceFrameId: f.id,
              name: f.name,
              width: f.width,
              height: f.height,
              canvasX: f.canvasX,
              canvasY: f.canvasY,
              content,
            });
          }
        } catch (e) {
          console.warn('[Sketchpad] Failed to read frame', f.id, e);
        }
      }
      return entries.length > 0 ? entries : null;
    },
    [activeSketchpad],
  );

  const handleCopyFrames = useCallback(
    async (frameIds: string[]) => {
      const entries = await copyFramesToClipboard(frameIds);
      if (entries) {
        frameClipboardRef.current = entries;
        window.dispatchEvent(new CustomEvent('pv-toast', {
          detail: {
            message: `${entries.length} frame${entries.length !== 1 ? 's' : ''} copied`,
            variant: 'info',
          },
        }));
      }
    },
    [copyFramesToClipboard],
  );

  const handleCutFrames = useCallback(
    async (frameIds: string[]) => {
      const entries = await copyFramesToClipboard(frameIds);
      if (!entries) return;
      frameClipboardRef.current = entries;
      await runLockedMutation(async () => {
        if (!activeSketchpadId) return;
        await api.deleteFramesMulti(activeSketchpadId, frameIds);
        setSketchpads((prev) =>
          prev.map((s) =>
            s.id === activeSketchpadId
              ? { ...s, frames: s.frames.filter((f) => !frameIds.includes(f.id)) }
              : s,
          ),
        );
        setFrameModules((prev) => {
          const next = { ...prev };
          for (const id of frameIds) delete next[id];
          return next;
        });
        setSelectedFrameIds((prev) => prev.filter((id) => !frameIds.includes(id)));
      });
      window.dispatchEvent(new CustomEvent('pv-toast', {
        detail: {
          message: `${entries.length} frame${entries.length !== 1 ? 's' : ''} cut`,
          variant: 'info',
        },
      }));
    },
    [copyFramesToClipboard, runLockedMutation, activeSketchpadId],
  );

  const handlePasteFrames = useCallback(async () => {
    const entries = frameClipboardRef.current;
    if (!entries || entries.length === 0 || !activeSketchpadId) return;

    // Compute paste positions: preserve relative arrangement from source bounding box
    // origin, anchor at viewport center (or origin offset by 40,40 if same sketchpad).
    const minX = Math.min(...entries.map((e) => e.canvasX));
    const minY = Math.min(...entries.map((e) => e.canvasY));

    let anchorX = minX + 40;
    let anchorY = minY + 40;
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewCx = rect.width / 2;
      const viewCy = rect.height / 2;
      const canvasCx = (viewCx - transform.panX) / transform.zoom;
      const canvasCy = (viewCy - transform.panY) / transform.zoom;
      const maxX = Math.max(...entries.map((e) => e.canvasX + e.width));
      const maxY = Math.max(...entries.map((e) => e.canvasY + e.height));
      const groupCx = (minX + maxX) / 2;
      const groupCy = (minY + maxY) / 2;
      anchorX = canvasCx - (groupCx - minX);
      anchorY = canvasCy - (groupCy - minY);
    }

    await runLockedMutation(async () => {
      const result = await api.pasteFrames(
        activeSketchpadId,
        entries.map((e) => ({
          name: e.name,
          width: e.width,
          height: e.height,
          canvasX: Math.round(anchorX + (e.canvasX - minX)),
          canvasY: Math.round(anchorY + (e.canvasY - minY)),
          content: e.content,
          sourceFrameId: e.sourceFrameId,
        })),
      );
      if (result?.ok && result.frames.length > 0) {
        for (const f of result.frames) {
          await loadFrameModule(activeSketchpadId, f.id);
        }
        setSketchpads((prev) =>
          prev.map((s) =>
            s.id === activeSketchpadId ? { ...s, frames: [...s.frames, ...result.frames] } : s,
          ),
        );
        setSelectedFrameIds(result.frames.map((f) => f.id));
        window.dispatchEvent(new CustomEvent('pv-toast', {
          detail: {
            message: `${result.frames.length} frame${result.frames.length !== 1 ? 's' : ''} pasted`,
            variant: 'info',
          },
        }));
      }
    });
  }, [activeSketchpadId, transform, runLockedMutation, loadFrameModule]);

  const handleDeleteFramesMulti = useCallback(
    async (frameIds: string[]) => {
      if (!activeSketchpadId || frameIds.length === 0) return;
      await runLockedMutation(async () => {
        await api.deleteFramesMulti(activeSketchpadId, frameIds);
        setSketchpads((prev) =>
          prev.map((s) =>
            s.id === activeSketchpadId
              ? { ...s, frames: s.frames.filter((f) => !frameIds.includes(f.id)) }
              : s,
          ),
        );
        setFrameModules((prev) => {
          const next = { ...prev };
          for (const id of frameIds) delete next[id];
          return next;
        });
        setSelectedFrameIds((prev) => prev.filter((id) => !frameIds.includes(id)));
      });
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
  const focusNewBlock = useCallback(async (blockId: string | string[]) => {
    const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
    const ids = Array.isArray(blockId) ? blockId : [blockId];
    if (ids.length === 0) return;
    const maxAttempts = 20;
    for (let attempts = 0; attempts < maxAttempts; attempts++) {
      const allFound = ids.every(id => !!document.querySelector(`[data-pv-block="${id}"]`));
      if (allFound) {
        window.dispatchEvent(new CustomEvent('pv-select-block', { detail: { blockIds: ids } }));
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

  const handleAddHorizontalLineCentered = useCallback(async () => {
    if (!activeSketchpadId) return;
    const comp = components.find((c) => c.name === 'HorizontalLine');
    if (!comp) return;
    setPendingAction({ type: 'add-horizontal-line', comp });
  }, [activeSketchpadId, components]);

  const handleAddVerticalLineCentered = useCallback(async () => {
    if (!activeSketchpadId) return;
    const comp = components.find((c) => c.name === 'VerticalLine');
    if (!comp) return;
    setPendingAction({ type: 'add-vertical-line', comp });
  }, [activeSketchpadId, components]);

  const handleAddText = useCallback(
    async (frameId: string, x: number, y: number) => {
      if (!activeSketchpadId) return;
      const targetFile = `src/sketchpads/${activeSketchpadId}/${frameId}.tsx`;

      await runLockedMutation(async () => {
        await takeSnapshot(targetFile, '');
        const result = await addBlock({
          file: targetFile,
          zoneId: 'target-zone-placeholder',
          elementType: 'text',
          targetLayoutMode: 'absolute',
          pasteX: Math.round(x),
          pasteY: Math.round(y),
        });
        if (result?.blockId) await focusNewBlock(result.blockId);
      });
    },
    [activeSketchpadId, runLockedMutation, focusNewBlock],
  );

  const handleAddTextCentered = useCallback(async () => {
    if (!activeSketchpadId) return;
    setPendingAction({ type: 'add-text' });
  }, [activeSketchpadId]);

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

  // One-shot flag: set when the user clicks a frame's title bar so we both keep the
  // frame selected AND focus the frame root in the inspector. The bridge → parent
  // shell → us round-trip would otherwise echo PV_SET_SELECTION and clear frame focus.
  const suppressFrameClearOnceRef = useRef(false);
  useEffect(() => {
    const onFrameRootSelected = () => { suppressFrameClearOnceRef.current = true; };
    window.addEventListener('pv-frame-root-selected', onFrameRootSelected);
    return () => window.removeEventListener('pv-frame-root-selected', onFrameRootSelected);
  }, []);

  // Listen for undo/redo completion and element selection events from the parent shell
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'PV_UNDO_REDO_COMPLETE') {
        reloadRegistry();
      }
      if (e.data?.type === 'PV_SET_SELECTION' && e.data.runtimeIds && e.data.runtimeIds.length > 0) {
        if (suppressFrameClearOnceRef.current) {
          suppressFrameClearOnceRef.current = false;
        } else {
          setSelectedFrameIds([]);
        }
      }
      if (e.data?.type === 'PV_SKETCHPAD_ZOOM') {
        const code: string = e.data.code;
        if (code === 'Digit0' || code === 'Numpad0') zoomToCenter(1);
        else if (code === 'Equal' || code === 'NumpadAdd') zoomByFactor(1.2);
        else if (code === 'Minus' || code === 'NumpadSubtract') zoomByFactor(1 / 1.2);
      }
      // Title-bar selection moves focus into the parent shell, so the iframe's
      // own Delete keydown never fires. The parent forwards the intent here.
      if (e.data?.type === 'PV_FRAME_DELETE_REQUEST' && selectedFrameIds.length > 0) {
        handleDeleteFramesMulti(selectedFrameIds);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [reloadRegistry, zoomToCenter, zoomByFactor, selectedFrameIds, handleDeleteFramesMulti]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      // Zoom shortcuts must intercept before isTypingInput to block native browser zoom
      if (e.metaKey || e.ctrlKey) {
        if (e.code === 'Digit0' || e.code === 'Numpad0') {
          e.preventDefault();
          zoomToCenter(1);
          return;
        } else if (e.code === 'Equal' || e.code === 'NumpadAdd') {
          e.preventDefault();
          zoomByFactor(1.2);
          return;
        } else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
          e.preventDefault();
          zoomByFactor(1 / 1.2);
          return;
        }
      }

      if (isTypingInput(document.activeElement as HTMLElement | null)) return;

      if (e.key === 'Escape' && pendingAction) {
        setPendingAction(null);
        return;
      }

      // Delete selected frame(s) via keyboard
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedFrameIds.length > 0) {
        handleDeleteFramesMulti(selectedFrameIds);
        return;
      }

      // Frame-level clipboard: copy/cut/paste between sketchpads
      if (e.metaKey || e.ctrlKey) {
        const key = e.key.toLowerCase();
        if (key === 'c' && selectedFrameIds.length > 0) {
          e.preventDefault();
          handleCopyFrames(selectedFrameIds);
          return;
        }
        if (key === 'x' && selectedFrameIds.length > 0) {
          e.preventDefault();
          handleCutFrames(selectedFrameIds);
          return;
        }
        if (key === 'v' && frameClipboardRef.current && frameClipboardRef.current.length > 0) {
          e.preventDefault();
          handlePasteFrames();
          return;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedFrameIds, handleDeleteFramesMulti, pendingAction, zoomToCenter, zoomByFactor, handleCopyFrames, handleCutFrames, handlePasteFrames]);

  // Marquee selection: starts on canvas background or empty area inside a frame.
  // Containment-only: an element/frame must be fully enclosed.
  // If any frame is fully contained, only frames are selected (no mixed selection).
  // Otherwise, selects top-level pv-blocks within the frame the marquee started in.
  useEffect(() => {
    const MOVE_THRESHOLD = 3;
    let dragging = false;
    let started = false;
    let startClientX = 0;
    let startClientY = 0;
    let startFrameContent: HTMLElement | null = null;

    const isInside = (outer: DOMRect, inner: DOMRect) =>
      outer.left <= inner.left && outer.top <= inner.top && outer.right >= inner.right && outer.bottom >= inner.bottom;

    type Candidates =
      | { mode: 'frames'; frameIds: string[]; els: HTMLElement[] }
      | { mode: 'blocks'; blockIds: string[]; els: HTMLElement[] }
      | { mode: 'none'; els: [] };

    const computeCandidates = (rect: DOMRect, startFrame: HTMLElement | null): Candidates => {
      const frameRoots = Array.from(document.querySelectorAll('[data-sketchpad-frame-root]')) as HTMLElement[];
      const containedFrames = frameRoots.filter((el) => isInside(rect, el.getBoundingClientRect()));
      if (containedFrames.length > 0) {
        return {
          mode: 'frames',
          frameIds: containedFrames.map((el) => el.getAttribute('data-sketchpad-frame-root')!).filter(Boolean),
          els: containedFrames,
        };
      }
      if (!startFrame) return { mode: 'none', els: [] };
      const allBlocks = Array.from(startFrame.querySelectorAll('[data-pv-block]')) as HTMLElement[];
      const topLevel = allBlocks.filter((el) => !el.parentElement?.closest('[data-pv-block]'));
      const contained = topLevel.filter((el) => isInside(rect, el.getBoundingClientRect()));
      return {
        mode: 'blocks',
        blockIds: contained.map((el) => el.getAttribute('data-pv-block')!).filter(Boolean),
        els: contained,
      };
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (spaceHeldRef.current) return;
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest('[data-pv-block], [data-pv-sketchpad-el]')) return;
      if (t.closest('[data-sketchpad-resize-handle]')) return;
      // The focused-frame drag overlay handles its own pointer flow. Without
      // this guard the window-level marquee handler also engages on the same
      // pointerdown and runs querySelectorAll + setMarqueePreview on every
      // move, which manifests as severe lag while dragging the frame.
      if (t.closest('[data-sketchpad-frame-overlay]')) return;
      const frameRoot = t.closest('[data-sketchpad-frame-root]');
      const frameContent = t.closest('[data-sketchpad-frame]') as HTMLElement | null;
      if (frameRoot && !frameContent) return;
      const onCanvas = !!t.closest('[data-sketchpad-canvas]');
      if (!frameContent && !onCanvas) return;

      // Don't preempt the bridge here — let it handle plain clicks (e.g. empty-frame click
      // selects the frame root so the user can paste into it). We only take over once the
      // user actually drags past the threshold.
      dragging = true;
      started = false;
      startClientX = e.clientX;
      startClientY = e.clientY;
      startFrameContent = frameContent;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      if (!started) {
        const dx = Math.abs(e.clientX - startClientX);
        const dy = Math.abs(e.clientY - startClientY);
        if (dx < MOVE_THRESHOLD && dy < MOVE_THRESHOLD) return;
        started = true;
      }
      e.preventDefault();
      setMarquee({ x1: startClientX, y1: startClientY, x2: e.clientX, y2: e.clientY });

      const left = Math.min(startClientX, e.clientX);
      const right = Math.max(startClientX, e.clientX);
      const top = Math.min(startClientY, e.clientY);
      const bottom = Math.max(startClientY, e.clientY);
      const rect = new DOMRect(left, top, right - left, bottom - top);
      const candidates = computeCandidates(rect, startFrameContent);
      setMarqueePreview(candidates.els.map((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, width: r.width, height: r.height };
      }));
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      const wasMarquee = started;
      started = false;
      setMarquee(null);
      setMarqueePreview([]);

      // Plain click (no drag): bridge already handled element-side selection (frame-root pick or
      // deselect). It doesn't know about frame multi-selection though, so we clear that here —
      // any plain click on empty area means the user is exiting the frame-set selection.
      if (!wasMarquee) {
        setSelectedFrameIds([]);
        return;
      }

      const left = Math.min(startClientX, e.clientX);
      const right = Math.max(startClientX, e.clientX);
      const top = Math.min(startClientY, e.clientY);
      const bottom = Math.max(startClientY, e.clientY);
      const rect = new DOMRect(left, top, right - left, bottom - top);
      const candidates = computeCandidates(rect, startFrameContent);

      if (candidates.mode === 'frames') {
        setSelectedFrameIds(candidates.frameIds);
        window.dispatchEvent(new CustomEvent('pv-clear-selection'));
      } else if (candidates.mode === 'blocks' && candidates.blockIds.length > 0) {
        setSelectedFrameIds([]);
        window.dispatchEvent(new CustomEvent('pv-select-block', { detail: { blockIds: candidates.blockIds } }));
      } else {
        setSelectedFrameIds([]);
        window.dispatchEvent(new CustomEvent('pv-clear-selection'));
      }
    };

    // Bubble phase so the sketchpad bridge's capture-phase handler can stopPropagation
    // (e.g. when entering element resize from the 8px safe-margin) before we start a marquee.
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  // Context-aware drop — resolves target zone (frame root or nested editable zone), then cut/paste.
  useEffect(() => {
    const handleDropElement = async (e: Event) => {
      const data = (e as CustomEvent<SketchpadDropDetail>).detail;
      if (!data) return;

      const {
        sketchpadId,
        sourceFrameId,
        targetFrameId,
        draggedBlockIds,
        targetLocatorId,
        isFrameTarget,
        targetLayoutMode,
        x,
        y,
        isDuplicate,
        activeSourceId,
        fallbackPositions,
      } = data;

      if (!sketchpadId || !sourceFrameId || !targetFrameId || !draggedBlockIds?.length) return;

      // When the drop target turns out to be invalid (no source locator or no
      // editable zone), we keep the elements in their source frame and just
      // update their absolute position so the user's drag isn't discarded.
      const applyFallbackPositions = async () => {
        if (!fallbackPositions?.length) return;
        await Promise.all(
          fallbackPositions.map((p) =>
            api.updateElementPosition(sketchpadId, sourceFrameId, p.blockId, p.x, p.y),
          ),
        );
      };

      const sourceFile = `src/sketchpads/${sketchpadId}/${sourceFrameId}.tsx`;
      const fallbackTargetFile = `src/sketchpads/${sketchpadId}/${targetFrameId}.tsx`;

      try {
        await runLockedMutation(async () => {
            // 1. Copy the elements first
            await blockAction('copy', draggedBlockIds, sourceFile);

            // 2. Resolve target
            let currentTargetFile = fallbackTargetFile;
            let currentTargetZoneId = 'target-zone-placeholder';
            let currentTargetIsPristine = false;
            let currentTargetStartLine: number | undefined;
            let currentTargetEndLine: number | undefined;

            if (!isFrameTarget) {
              if (!targetLocatorId) {
                await applyFallbackPositions();
                return;
              }
              try {
                const sourceInfo = await fetchSourceInfo(targetLocatorId);
                currentTargetFile = sourceInfo.file;
                currentTargetStartLine = sourceInfo.startLine;
                currentTargetEndLine = sourceInfo.endLine;
                const zonesData = await fetchZones(sourceInfo.file, sourceInfo.startLine, sourceInfo.startCol, sourceInfo.endLine);
                if (!zonesData?.zones?.length) {
                  await applyFallbackPositions();
                  return;
                }
                currentTargetZoneId = zonesData.zones[0].id;
                currentTargetIsPristine = zonesData.zones[0].isPristine;
              } catch (err) {
                console.error('[Sketchpad] Failed to resolve nested drop target:', err);
                await applyFallbackPositions();
                return;
              }
            }

            const extraFiles = sourceFile !== currentTargetFile ? [currentTargetFile] : [];
            await takeSnapshot(sourceFile, activeSourceId || '', extraFiles);

            // 3. Paste
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

            // 4. Delete originals (single bulk call to avoid N HMR cycles)
            if (!isDuplicate) {
              await blockAction('delete', draggedBlockIds, sourceFile);
            }

            const focusIds: string[] = res?.newBlockIds?.length ? res.newBlockIds : (res?.blockId ? [res.blockId] : []);
            if (focusIds.length > 0) await focusNewBlock(focusIds);
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
            isSelected={selectedFrameIds.includes(frame.id)}
            selectedFrameIds={selectedFrameIds}
            onMove={handleMoveFrame}
            onMoveEnd={handleMoveFrameEnd}
            onMoveMulti={handleMoveFramesMulti}
            onMoveMultiEnd={handleMoveFramesMultiEnd}
            onResize={handleResizeFrame}
            onResizeEnd={handleResizeFrameEnd}
            onSelect={handleFrameSelect}
            onDuplicate={handleDuplicateFrame}
            onDuplicateMulti={handleDuplicateFramesMulti}
            onDelete={handleDeleteFrame}
            onDeleteMulti={handleDeleteFramesMulti}
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

      {marquee && (
        <>
          {marqueePreview.map((r, i) => (
            <div
              key={i}
              style={{
                position: 'fixed',
                left: r.left,
                top: r.top,
                width: r.width,
                height: r.height,
                outline: '2px solid #0092ff',
                outlineOffset: -1,
                pointerEvents: 'none',
                zIndex: 9998,
              }}
            />
          ))}
          <div
            style={{
              position: 'fixed',
              left: Math.min(marquee.x1, marquee.x2),
              top: Math.min(marquee.y1, marquee.y2),
              width: Math.abs(marquee.x2 - marquee.x1),
              height: Math.abs(marquee.y2 - marquee.y1),
              background: 'rgba(0,146,255, 0.12)',
              border: '1px solid #0092ff',
              pointerEvents: 'none',
              zIndex: 9999,
            }}
          />
        </>
      )}

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
          title="Sketchpads"
          isActive={showSketchpadPanel}
          onClick={() => setShowSketchpadPanel((p) => !p)}
        >
          <Menu size={16} />
        </ToolbarButton>
        <ToolbarButton
          data-testid="toolbar-add"
          ref={addButtonRef}
          title="Add"
          isActive={showAddMenu}
          onClick={() => setShowAddMenu((p) => !p)}
        >
          <Plus size={16} />
        </ToolbarButton>
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
                if (
                  pendingAction.type === 'add-rectangle' ||
                  pendingAction.type === 'add-horizontal-line' ||
                  pendingAction.type === 'add-vertical-line'
                ) {
                  handleAddComponent(pendingAction.comp, targetFrame.id, relX, relY);
                } else if (pendingAction.type === 'add-text') {
                  handleAddText(targetFrame.id, relX, relY);
                }
                setSelectedFrameIds([targetFrame.id]);
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
            <span>
              {pendingAction.type === 'add-text'
                ? 'Click inside a frame to place the text'
                : pendingAction.type === 'add-horizontal-line'
                ? 'Click inside a frame to place the horizontal line'
                : pendingAction.type === 'add-vertical-line'
                ? 'Click inside a frame to place the vertical line'
                : 'Click inside a frame to place the rectangle'}
            </span>
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
              { label: 'Frame', icon: Frame, action: handleAddFrameCentered },
              { label: 'Rectangle', icon: Square, action: handleAddRectangleCentered },
              { label: 'Horizontal line', icon: Minus, action: handleAddHorizontalLineCentered },
              { label: 'Vertical line', icon: VerticalLineIcon, action: handleAddVerticalLineCentered },
              { label: 'Text', icon: Type, action: handleAddTextCentered },
              { label: 'Component', icon: Plus, action: () => setShowComponentPalette(true) },
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
                <item.icon size={16} strokeWidth={2} style={{ display: 'block' }} />
                <span style={{ lineHeight: 1, paddingTop: '1px' }}>{item.label}</span>
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
            padding: 0;
            line-height: 0;
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
                if (val > 0.92 && val < 1.08) val = 1;
                zoomToCenter(val);
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
              onClick={() => zoomToCenter(1)}
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
          if (id === activeSketchpadId) {
            setShowSketchpadPanel(false);
            return;
          }
          // Persist current transform to the outgoing sketchpad before switching.
          if (activeSketchpadId) {
            api.updateSketchpadView(activeSketchpadId, { viewState: transform }).catch(() => {});
            setSketchpads((prev) =>
              prev.map((s) => (s.id === activeSketchpadId ? { ...s, viewState: transform } : s)),
            );
          }
          setActiveSketchpadId(id);
          setShowSketchpadPanel(false);
          setSelectedFrameIds([]);
          const sp = sketchpads.find((s) => s.id === id);
          if (sp) {
            const rect = containerRef.current?.getBoundingClientRect();
            if (sp.viewState) {
              const safeTransform =
                rect && rect.width > 0 && rect.height > 0
                  ? ensureFramesVisible(sp.frames, sp.viewState, rect.width, rect.height)
                  : sp.viewState;
              setTransform(safeTransform);
              initialTransformAppliedRef.current = true;
            } else {
              initialTransformAppliedRef.current = false;
              hasInitiallyCentered.current = false;
            }
            loadAllFrameModules(id, sp.frames);
          }
          api.updateSketchpadView(id, { makeActive: true }).catch(() => {});
        }}
        onCreate={handleCreateSketchpad}
        onDelete={handleDeleteSketchpad}
        onRename={handleRenameSketchpad}
        onDuplicate={handleDuplicateSketchpad}
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
  { children: React.ReactNode; title: string; isActive: boolean; onClick: () => void; 'data-testid'?: string }
>(function ToolbarButton({ children, title, isActive, onClick, 'data-testid': testId }, ref) {
  return (
    <button
      ref={ref}
      data-testid={testId}
      onClick={onClick}
      title={title}
      className={`sketchpad-toolbar-button ${isActive ? 'is-active' : ''}`}
    >
      {children}
    </button>
  );
});
