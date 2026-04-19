import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { CanvasTransform } from '../types';
import { theme } from '../../ui/theme';

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
  const currentTransform = useRef(transform);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyTransformToDOM = useCallback(() => {
    if (!containerRef.current || !innerRef.current) return;
    const { zoom, panX, panY } = currentTransform.current;

    const gridSpacing = GRID_SIZE * zoom;
    const offsetX = panX % gridSpacing;
    const offsetY = panY % gridSpacing;
    const dotOpacity = Math.min(1, Math.max(0.15, zoom * 0.5));

    containerRef.current.style.backgroundSize = `${gridSpacing}px ${gridSpacing}px`;
    containerRef.current.style.backgroundPosition = `${offsetX}px ${offsetY}px`;
    containerRef.current.style.backgroundImage = `radial-gradient(circle, rgba(150,150,150,${dotOpacity}) 1px, transparent 1px)`;

    innerRef.current.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    innerRef.current.setAttribute('data-sketchpad-zoom', String(zoom));
    innerRef.current.style.setProperty('--frame-label-scale', String(1 / zoom));
  }, []);

  useEffect(() => {
    currentTransform.current = transform;
    requestAnimationFrame(applyTransformToDOM);
  }, [transform, applyTransformToDOM]);

  const isBackgroundTarget = useCallback((target: EventTarget | null) => {
    return target === containerRef.current || target === innerRef.current;
  }, []);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault(); // Prevents browser zoom/scroll
      const container = containerRef.current;
      if (!container) return;

      const t = currentTransform.current;

      // Normalize delta based on scroll mode (pixels vs lines)
      // Standard mice use lines (mode 1), trackpads use pixels (mode 0)
      const multiplier = e.deltaMode === 1 ? 40 : 1;
      const deltaX = e.deltaX * multiplier;
      const deltaY = e.deltaY * multiplier;

      if (e.ctrlKey || e.metaKey) {
        // Zooming
        const rect = container.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;

        // Smooth zoom factor, handles both stepped mouse wheels and trackpad pinches
        const zoomFactor = Math.exp(-deltaY / 300);
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, t.zoom * zoomFactor));
        const ratio = newZoom / t.zoom;

        currentTransform.current = {
          zoom: newZoom,
          panX: cursorX - ratio * (cursorX - t.panX),
          panY: cursorY - ratio * (cursorY - t.panY),
        };
      } else {
        // Panning (Shift+Scroll naturally populates e.deltaX in modern browsers)
        currentTransform.current = {
          ...t,
          panX: t.panX - deltaX,
          panY: t.panY - deltaY,
        };
      }

      requestAnimationFrame(applyTransformToDOM);

      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        onTransformChange(currentTransform.current);
      }, 100);
    },
    [applyTransformToDOM, onTransformChange],
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
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable)) return;
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
      if (e.button === 1 || (e.button === 0 && spaceHeld) || (e.button === 0 && isBackgroundTarget(e.target))) {
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          panX: currentTransform.current.panX,
          panY: currentTransform.current.panY,
        };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
    },
    [spaceHeld, isBackgroundTarget],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;

      currentTransform.current = {
        ...currentTransform.current,
        panX: panStartRef.current.panX + dx,
        panY: panStartRef.current.panY + dy,
      };

      requestAnimationFrame(applyTransformToDOM);
    },
    [isPanning, applyTransformToDOM],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (isPanning) {
        setIsPanning(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        onTransformChange(currentTransform.current);
      }
    },
    [isPanning, onTransformChange],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== containerRef.current && e.target !== containerRef.current?.firstElementChild) return;
      const rect = containerRef.current!.getBoundingClientRect();
      const t = currentTransform.current;
      const canvasX = (e.clientX - rect.left - t.panX) / t.zoom;
      const canvasY = (e.clientY - rect.top - t.panY) / t.zoom;
      onCanvasDoubleClick(canvasX, canvasY);
    },
    [onCanvasDoubleClick],
  );

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
        backgroundColor: theme.bg_strong,
        touchAction: 'none',
      }}
    >
      <div
        ref={innerRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transformOrigin: '0 0',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  );
}
