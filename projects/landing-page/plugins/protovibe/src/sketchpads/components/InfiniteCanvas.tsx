import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { CanvasTransform } from '../types';
import { isTypingInput } from '../../ui/utils/elementType';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;

const CANVAS_BG_COLOR = 'oklch(0.32 0 0)';

const TARGET_PRIMARY_PX = 24;
const SUBDIVISIONS = 3;

const PRIMARY_DOT_COLOR = 'oklch(0.6 0 0)';
const PRIMARY_DOT_RADIUS = 1.5;

const SECONDARY_DOT_COLOR_BASE = 'oklch(0.6 0 0)';
const SECONDARY_DOT_RADIUS = 1;
const SECONDARY_MAX_ALPHA = 1;

interface InfiniteCanvasProps {
  children: React.ReactNode;
  transform: CanvasTransform;
  onTransformChange: (t: CanvasTransform) => void;
  onCanvasContextMenu: (e: React.MouseEvent) => void;
}

export function InfiniteCanvas({
  children,
  transform,
  onTransformChange,
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

    const baseUnit = Math.pow(2, Math.round(Math.log2(TARGET_PRIMARY_PX / zoom)));
    const primarySpacing = baseUnit * zoom;
    const secondarySpacing = primarySpacing / SUBDIVISIONS;

    const mod = (a: number, b: number) => ((a % b) + b) % b;
    const primaryX = mod(panX, primarySpacing);
    const primaryY = mod(panY, primarySpacing);
    const secondaryX = mod(panX, secondarySpacing);
    const secondaryY = mod(panY, secondarySpacing);

    const lower = TARGET_PRIMARY_PX / Math.SQRT2;
    const upper = TARGET_PRIMARY_PX * Math.SQRT2;
    const t = Math.min(1, Math.max(0, (primarySpacing - lower) / (upper - lower)));
    const secondaryAlpha = (t * SECONDARY_MAX_ALPHA).toFixed(3);
    const secondaryColor = SECONDARY_DOT_COLOR_BASE.replace(/\)$/, ` / ${secondaryAlpha})`);

    containerRef.current.style.backgroundImage =
      `radial-gradient(circle at 0 0, ${PRIMARY_DOT_COLOR} ${PRIMARY_DOT_RADIUS}px, transparent ${PRIMARY_DOT_RADIUS}px),` +
      `radial-gradient(circle at 0 0, ${secondaryColor} ${SECONDARY_DOT_RADIUS}px, transparent ${SECONDARY_DOT_RADIUS}px)`;
    containerRef.current.style.backgroundSize =
      `${primarySpacing}px ${primarySpacing}px, ${secondarySpacing}px ${secondarySpacing}px`;
    containerRef.current.style.backgroundPosition =
      `${primaryX}px ${primaryY}px, ${secondaryX}px ${secondaryY}px`;

    innerRef.current.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    innerRef.current.setAttribute('data-sketchpad-zoom', String(zoom));
    innerRef.current.style.setProperty('--frame-label-scale', String(1 / zoom));
    // Notify the selection-overlay layer (rendered fixed on document.body, outside this
    // transformed wrapper) that element rects have moved. CSS transform changes don't fire
    // scroll/ResizeObserver, so without this the overlays would lag during zoom/pan.
    window.dispatchEvent(new Event('pv-canvas-transform'));
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
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'PV_SPACE_MODE') {
        setSpaceHeld(e.data.active);
        if (!e.data.active) setIsPanning(false);
      }
    };
    window.addEventListener('message', handleMessage);

    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        if (isTypingInput(document.activeElement as HTMLElement | null)) return;
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
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 1 || (e.button === 0 && spaceHeld)) {
        e.preventDefault();
        e.stopPropagation();
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
      e.stopPropagation();
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
        e.stopPropagation();
        setIsPanning(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        onTransformChange(currentTransform.current);
      }
    },
    [isPanning, onTransformChange],
  );

  return (
    <div
      ref={containerRef}
      data-sketchpad-canvas=""
      onPointerDownCapture={handlePointerDown}
      onPointerMoveCapture={handlePointerMove}
      onPointerUpCapture={handlePointerUp}
      onContextMenu={onCanvasContextMenu}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        cursor: isPanning ? 'grabbing' : spaceHeld ? 'grab' : 'default',
        backgroundColor: CANVAS_BG_COLOR,
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
      {spaceHeld && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 9999,
            cursor: isPanning ? 'grabbing' : 'grab',
          }}
        />
      )}
    </div>
  );
}
