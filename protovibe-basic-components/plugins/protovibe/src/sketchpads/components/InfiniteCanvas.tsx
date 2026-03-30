import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { CanvasTransform } from '../types';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;
const GRID_SIZE = 20;

interface InfiniteCanvasProps {
  children: React.ReactNode;
  transform: CanvasTransform;
  onTransformChange: (t: CanvasTransform) => void;
  onCanvasDoubleClick: (canvasX: number, canvasY: number) => void;
  onCanvasContextMenu: (e: React.MouseEvent) => void;
}

export function InfiniteCanvas({
  children,
  transform,
  onTransformChange,
  onCanvasDoubleClick,
  onCanvasContextMenu,
}: InfiniteCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const isBackgroundTarget = useCallback((target: EventTarget | null) => {
    return target === containerRef.current || target === innerRef.current;
  }, []);

  // Zoom centered on cursor
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, transform.zoom * delta));
      const ratio = newZoom / transform.zoom;

      onTransformChange({
        zoom: newZoom,
        panX: cursorX - ratio * (cursorX - transform.panX),
        panY: cursorY - ratio * (cursorY - transform.panY),
      });
    },
    [transform, onTransformChange],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Space key for pan mode
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpaceHeld(false);
        setIsPanning(false);
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Middle mouse button, space+left click, or left click on background starts pan
      if (e.button === 1 || (e.button === 0 && spaceHeld) || (e.button === 0 && isBackgroundTarget(e.target))) {
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          panX: transform.panX,
          panY: transform.panY,
        };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
    },
    [spaceHeld, isBackgroundTarget, transform.panX, transform.panY],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      onTransformChange({
        zoom: transform.zoom,
        panX: panStartRef.current.panX + dx,
        panY: panStartRef.current.panY + dy,
      });
    },
    [isPanning, transform.zoom, onTransformChange],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (isPanning) {
        setIsPanning(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      }
    },
    [isPanning],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      // Only on the canvas background, not on frames
      if (e.target !== containerRef.current && e.target !== containerRef.current?.firstElementChild) return;
      const rect = containerRef.current!.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left - transform.panX) / transform.zoom;
      const canvasY = (e.clientY - rect.top - transform.panY) / transform.zoom;
      onCanvasDoubleClick(canvasX, canvasY);
    },
    [transform, onCanvasDoubleClick],
  );

  // Generate dot grid pattern
  const gridSpacing = GRID_SIZE * transform.zoom;
  const offsetX = transform.panX % gridSpacing;
  const offsetY = transform.panY % gridSpacing;
  const dotOpacity = Math.min(1, Math.max(0.15, transform.zoom * 0.5));

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onContextMenu={onCanvasContextMenu}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        cursor: isPanning ? 'grabbing' : spaceHeld ? 'grab' : 'move',
        backgroundImage: `radial-gradient(circle, rgba(150,150,150,${dotOpacity}) 1px, transparent 1px)`,
        backgroundSize: `${gridSpacing}px ${gridSpacing}px`,
        backgroundPosition: `${offsetX}px ${offsetY}px`,
        backgroundColor: '#1a1a2e',
        touchAction: 'none',
      }}
    >
      <div
        ref={innerRef}
        data-sketchpad-zoom={transform.zoom}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transformOrigin: '0 0',
          transform: `translate(${transform.panX}px, ${transform.panY}px) scale(${transform.zoom})`,
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  );
}
