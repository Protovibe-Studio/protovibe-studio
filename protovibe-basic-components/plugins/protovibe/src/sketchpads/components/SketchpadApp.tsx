import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Sketchpad, SketchpadFrame, CanvasTransform, ComponentEntry } from '../types';
import { InfiniteCanvas } from './InfiniteCanvas';
import { FrameContainer } from './FrameContainer';
import { ComponentPalette } from './ComponentPalette';
import { SketchpadOverlayPanel } from './SketchpadOverlayPanel';
import * as api from '../api';

// Client-side modules for React Component references (rendering)
const allModules: Record<string, any> = import.meta.glob('/src/components/**/*.{tsx,jsx}', { eager: true });

// Build a map of component name → { Component, DefaultContent } from client-side modules
function getComponentRefs(): Record<string, { Component: React.ComponentType<any>; DefaultContent?: React.ComponentType<any> }> {
  const refs: Record<string, { Component: React.ComponentType<any>; DefaultContent?: React.ComponentType<any> }> = {};
  for (const [, mod] of Object.entries(allModules)) {
    const cfg = mod?.pvConfig;
    if (!cfg?.name || !mod[cfg.name]) continue;
    refs[cfg.name] = {
      Component: mod[cfg.name],
      DefaultContent: typeof mod.PvDefaultContent === 'function' ? mod.PvDefaultContent : undefined,
    };
  }
  return refs;
}

/** Parse a pvConfig.defaultProps string like `variant="default" label="Click me"` into plain props. */
export function parseDefaultProps(defaultProps: string): Record<string, any> {
  const result: Record<string, any> = {};
  const re = /(\w[\w-]*)(?:=(?:"([^"]*)"|'([^']*)'|\{(true|false)\}))?(?=[\s>]|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(defaultProps)) !== null) {
    const [, key, dq, sq, boolStr] = m;
    if (dq !== undefined) result[key] = dq;
    else if (sq !== undefined) result[key] = sq;
    else if (boolStr !== undefined) result[key] = boolStr === 'true';
    else result[key] = true;
  }
  return result;
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
      });
    }
    return discovered;
  }
}

const INITIAL_TRANSFORM: CanvasTransform = { zoom: 0.7, panX: 200, panY: 100 };

export function SketchpadApp() {
  const [sketchpads, setSketchpads] = useState<Sketchpad[]>([]);
  const [activeSketchpadId, setActiveSketchpadId] = useState<string>('');
  const [transform, setTransform] = useState<CanvasTransform>(INITIAL_TRANSFORM);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [showSketchpadPanel, setShowSketchpadPanel] = useState(false);
  const [dragComp, setDragComp] = useState<ComponentEntry | null>(null);

  const [components, setComponents] = useState<ComponentEntry[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Load registry on mount
  useEffect(() => {
    api.fetchRegistry().then((reg) => {
      if (reg.sketchpads?.length > 0) {
        setSketchpads(reg.sketchpads);
        setActiveSketchpadId(reg.sketchpads[0].id);
        loadAllFrameModules(reg.sketchpads[0].id, reg.sketchpads[0].frames);
      }
    });
  }, [loadAllFrameModules]);

  const activeSketchpad = useMemo(
    () => sketchpads.find((s) => s.id === activeSketchpadId),
    [sketchpads, activeSketchpadId],
  );

  // Sketchpad CRUD
  const handleCreateSketchpad = useCallback(async (name: string) => {
    const sp = await api.createSketchpad(name);
    setSketchpads((prev) => [...prev, sp]);
    setActiveSketchpadId(sp.id);
  }, []);

  const handleDeleteSketchpad = useCallback(
    async (id: string) => {
      await api.deleteSketchpad(id);
      setSketchpads((prev) => {
        const next = prev.filter((s) => s.id !== id);
        if (activeSketchpadId === id && next.length > 0) {
          setActiveSketchpadId(next[0].id);
        }
        return next;
      });
    },
    [activeSketchpadId],
  );

  const handleRenameSketchpad = useCallback(async (id: string, name: string) => {
    await api.renameSketchpad(id, name);
    setSketchpads((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name } : s)),
    );
  }, []);

  // Frame CRUD
  const handleCreateFrame = useCallback(
    async (canvasX: number, canvasY: number) => {
      if (!activeSketchpadId) return;
      const name = `Frame ${(activeSketchpad?.frames.length ?? 0) + 1}`;
      const frame = await api.createFrame(activeSketchpadId, name, 800, 600, Math.round(canvasX), Math.round(canvasY));
      setSketchpads((prev) =>
        prev.map((s) =>
          s.id === activeSketchpadId
            ? { ...s, frames: [...s.frames, frame] }
            : s,
        ),
      );
      setSelectedFrameId(frame.id);
      // Load the newly created frame module
      loadFrameModule(activeSketchpadId, frame.id);
    },
    [activeSketchpadId, activeSketchpad, loadFrameModule],
  );

  const handleAddFrameCentered = useCallback(async () => {
    if (!activeSketchpadId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Convert viewport center to canvas coordinates
    const viewCx = rect.width / 2;
    const viewCy = rect.height / 2;
    const canvasX = (viewCx - transform.panX) / transform.zoom - 400; // center 800-wide frame
    const canvasY = (viewCy - transform.panY) / transform.zoom - 300; // center 600-tall frame
    await handleCreateFrame(canvasX, canvasY);
  }, [activeSketchpadId, transform, containerRef, handleCreateFrame]);

  const handleDeleteFrame = useCallback(
    async (frameId: string) => {
      if (!activeSketchpadId) return;
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
    },
    [activeSketchpadId, selectedFrameId],
  );

  const handleRenameFrame = useCallback(
    (frameId: string) => {
      const frame = activeSketchpad?.frames.find((f) => f.id === frameId);
      if (!frame) return;
      const newName = prompt('Rename frame:', frame.name);
      if (newName && newName.trim()) {
        setSketchpads((prev) =>
          prev.map((s) =>
            s.id === activeSketchpadId
              ? {
                  ...s,
                  frames: s.frames.map((f) =>
                    f.id === frameId ? { ...f, name: newName.trim() } : f,
                  ),
                }
              : s,
          ),
        );
      }
    },
    [activeSketchpad, activeSketchpadId],
  );

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
      // Persist on pointer up (debounced via frame component)
      api.updateFramePosition(activeSketchpadId, frameId, Math.round(x), Math.round(y));
    },
    [activeSketchpadId],
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
      api.resizeFrame(activeSketchpadId, frameId, w, h);
    },
    [activeSketchpadId],
  );

  // Element interactions — components are rendered from frame .tsx modules.
  // When an element is added, the backend writes to the frame file and we re-import the module.
  const handleAddComponent = useCallback(
    async (comp: ComponentEntry, frameId?: string, x?: number, y?: number) => {
      const targetFrame = frameId || selectedFrameId;
      if (!targetFrame || !activeSketchpadId) return;

      const posX = x ?? 100;
      const posY = y ?? 100;

      // Write element to the frame file via backend
      await api.addElementToFrame(
        activeSketchpadId,
        targetFrame,
        comp.name,
        comp.importPath,
        comp.defaultProps,
        comp.defaultContent,
        posX,
        posY,
        comp.additionalImportsForDefaultContent,
      );

      // Re-import the frame module to pick up the new element
      await loadFrameModule(activeSketchpadId, targetFrame);
    },
    [selectedFrameId, activeSketchpadId, loadFrameModule],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Zoom to fit
      if (e.key === '0' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setTransform(INITIAL_TRANSFORM);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <InfiniteCanvas
        transform={transform}
        onTransformChange={setTransform}
        onCanvasDoubleClick={handleCreateFrame}
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
            onResize={handleResizeFrame}
            onSelect={setSelectedFrameId}
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
                  color: '#bbb',
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
          label="☰"
          title="Sketchpads"
          isActive={showSketchpadPanel}
          onClick={() => setShowSketchpadPanel((p) => !p)}
        />
        <ToolbarButton
          label="+"
          title="Add Frame"
          isActive={false}
          onClick={handleAddFrameCentered}
        />
      </div>

      {/* Zoom indicator */}
      <div
        style={{
          position: 'fixed',
          bottom: 12,
          right: 12,
          background: 'rgba(42,42,62,0.9)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 11,
          color: '#999',
          fontFamily: 'Inter, system-ui, sans-serif',
          userSelect: 'none',
          zIndex: 100,
        }}
      >
        {Math.round(transform.zoom * 100)}%
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
            color: '#666',
            fontSize: 14,
            fontFamily: 'Inter, system-ui, sans-serif',
            userSelect: 'none',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>⊞</div>
          <div>Double-click anywhere to create a frame</div>
        </div>
      )}

      <ComponentPalette
        components={components}
        onDragStart={setDragComp}
        onClickAdd={(comp) => handleAddComponent(comp)}
      />

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
    </div>
  );
}

// ─── Toolbar button ────────────────────────────────────────────────────────

function ToolbarButton({
  label,
  title,
  isActive,
  onClick,
}: {
  label: string;
  title: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 36,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.1)',
        background: isActive ? 'rgba(24,160,251,0.2)' : 'rgba(42,42,62,0.9)',
        color: isActive ? '#18a0fb' : '#ccc',
        cursor: 'pointer',
        fontSize: 16,
        fontWeight: 600,
        fontFamily: 'Inter, system-ui, sans-serif',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {label}
    </button>
  );
}
