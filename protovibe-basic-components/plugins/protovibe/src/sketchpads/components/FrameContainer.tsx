import React, { useRef, useState, useCallback } from 'react';

interface FrameContainerProps {
  frameId: string;
  name: string;
  width: number;
  height: number;
  canvasX: number;
  canvasY: number;
  zoom: number;
  isSelected: boolean;
  children: React.ReactNode;
  onMove: (frameId: string, x: number, y: number) => void;
  onResize: (frameId: string, w: number, h: number) => void;
  onSelect: (frameId: string) => void;
  onDelete: (frameId: string) => void;
  onRename: (frameId: string) => void;
}

const TITLE_BAR_HEIGHT = 32;
const MIN_FRAME_SIZE = 100;

export function FrameContainer({
  frameId,
  name,
  width,
  height,
  canvasX,
  canvasY,
  zoom,
  isSelected,
  children,
  onMove,
  onResize,
  onSelect,
  onDelete,
  onRename,
}: FrameContainerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0, frameX: 0, frameY: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const frameRef = useRef<HTMLDivElement>(null);

  // Title bar drag to reposition frame on canvas
  const handleTitlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY, frameX: canvasX, frameY: canvasY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onSelect(frameId);
    },
    [canvasX, canvasY, frameId, onSelect],
  );

  const handleTitlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const dx = (e.clientX - dragStartRef.current.x) / zoom;
      const dy = (e.clientY - dragStartRef.current.y) / zoom;
      onMove(frameId, dragStartRef.current.frameX + dx, dragStartRef.current.frameY + dy);
    },
    [isDragging, zoom, frameId, onMove],
  );

  const handleTitlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (isDragging) {
        setIsDragging(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      }
    },
    [isDragging],
  );

  // Resize handle (bottom-right corner)
  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      setIsResizing(true);
      resizeStartRef.current = { x: e.clientX, y: e.clientY, w: width, h: height };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [width, height],
  );

  const handleResizePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isResizing) return;
      const dx = (e.clientX - resizeStartRef.current.x) / zoom;
      const dy = (e.clientY - resizeStartRef.current.y) / zoom;
      const newW = Math.max(MIN_FRAME_SIZE, resizeStartRef.current.w + dx);
      const newH = Math.max(MIN_FRAME_SIZE, resizeStartRef.current.h + dy);
      onResize(frameId, Math.round(newW), Math.round(newH));
    },
    [isResizing, zoom, frameId, onResize],
  );

  const handleResizePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (isResizing) {
        setIsResizing(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      }
    },
    [isResizing],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenuPos({ x: e.clientX, y: e.clientY });
      setShowContextMenu(true);
    },
    [],
  );

  const handleContentClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(frameId);
    },
    [frameId, onSelect],
  );

  return (
    <>
      <div
        ref={frameRef}
        style={{
          position: 'absolute',
          left: canvasX,
          top: canvasY,
          width,
          userSelect: 'none',
        }}
        onClick={handleContentClick}
      >
        {/* Frame title */}
        <div
          onPointerDown={handleTitlePointerDown}
          onPointerMove={handleTitlePointerMove}
          onPointerUp={handleTitlePointerUp}
          onContextMenu={handleContextMenu}
          onDoubleClick={(e) => { e.stopPropagation(); onRename(frameId); }}
          style={{
            height: TITLE_BAR_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            padding: '0 10px',
            fontSize: 12,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 600,
            color: isSelected ? '#18a0fb' : '#999',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            letterSpacing: '-0.2px',
          }}
        >
          {name}
          <span style={{ marginLeft: 8, fontWeight: 400, opacity: 0.5, fontSize: 11 }}>
            {width} × {height}
          </span>
        </div>

        {/* Frame content area */}
        <div
          data-sketchpad-frame={frameId}
          style={{
            width,
            height,
            position: 'relative',
            backgroundColor: '#ffffff',
            borderRadius: 4,
            border: isSelected ? '2px solid #18a0fb' : '1px solid rgba(255,255,255,0.1)',
            overflow: 'hidden',
            boxShadow: isSelected
              ? '0 0 0 1px #18a0fb, 0 4px 24px rgba(0,0,0,0.3)'
              : '0 2px 12px rgba(0,0,0,0.2)',
          }}
        >
          {children}
        </div>

        {/* Resize handle */}
        <div
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          style={{
            position: 'absolute',
            right: -4,
            bottom: -4,
            width: 12,
            height: 12,
            cursor: 'nwse-resize',
            borderRadius: '0 0 4px 0',
            background: isSelected ? '#18a0fb' : 'transparent',
            opacity: isSelected ? 1 : 0,
            transition: 'opacity 0.15s',
          }}
        />
      </div>

      {/* Context menu */}
      {showContextMenu && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99998 }}
            onClick={() => setShowContextMenu(false)}
          />
          <div
            style={{
              position: 'fixed',
              left: contextMenuPos.x,
              top: contextMenuPos.y,
              zIndex: 99999,
              background: '#2a2a3e',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              padding: '4px 0',
              minWidth: 140,
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 12,
            }}
          >
            {[
              { label: 'Rename', action: () => onRename(frameId) },
              { label: 'Delete', action: () => onDelete(frameId) },
            ].map((item) => (
              <div
                key={item.label}
                onClick={() => {
                  setShowContextMenu(false);
                  item.action();
                }}
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  color: item.label === 'Delete' ? '#ff5555' : '#ddd',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {item.label}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
