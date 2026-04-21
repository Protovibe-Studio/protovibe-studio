import React, { useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useFloatingDropdownPosition } from '../../ui/hooks/useFloatingDropdownPosition';
import { theme } from '../../ui/theme';

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
  onMoveEnd: (frameId: string, x: number, y: number) => void;
  onResize: (frameId: string, w: number, h: number) => void;
  onResizeEnd: (frameId: string, w: number, h: number) => void;
  onSelect: (frameId: string) => void;
  onDuplicate: (frameId: string, canvasX: number, canvasY: number) => void;
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
  onMoveEnd,
  onResize,
  onResizeEnd,
  onDuplicate,
  onSelect,
  onDelete,
  onRename,
}: FrameContainerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isAltDragging, setIsAltDragging] = useState(false);
  const isDuplicateDragRef = useRef(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, frameX: 0, frameY: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { style: menuStyle } = useFloatingDropdownPosition({
    isOpen: showContextMenu,
    anchorRef: moreButtonRef,
    dropdownRef: menuRef,
    preferredPlacement: 'bottom',
    offset: 4,
  });

  // Title bar drag to reposition frame on canvas
  const handleTitlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      isDuplicateDragRef.current = e.altKey;
      setIsAltDragging(e.altKey);
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY, frameX: canvasX, frameY: canvasY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onSelect(frameId);
      // Focus the frame div so keyboard Delete works after clicking title bar
      frameRef.current?.focus({ preventScroll: true });
    },
    [canvasX, canvasY, frameId, onSelect],
  );

  const handleTitlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !frameRef.current) return;
      const dx = (e.clientX - dragStartRef.current.x) / zoom;
      const dy = (e.clientY - dragStartRef.current.y) / zoom;
      // GPU-accelerated translation during drag
      frameRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
      // Track alt key state mid-drag (mirrors sketchpad-bridge pattern)
      const altHeld = e.altKey;
      isDuplicateDragRef.current = altHeld;
      setIsAltDragging(altHeld);
    },
    [isDragging, zoom],
  );

  const handleTitlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (isDragging) {
        setIsDragging(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);

        const dx = (e.clientX - dragStartRef.current.x) / zoom;
        const dy = (e.clientY - dragStartRef.current.y) / zoom;
        const newX = dragStartRef.current.frameX + dx;
        const newY = dragStartRef.current.frameY + dy;

        setIsAltDragging(false);

        if (isDuplicateDragRef.current) {
          // Alt+drag: restore source frame to its original position, create duplicate at drop position
          isDuplicateDragRef.current = false;
          if (frameRef.current) {
            frameRef.current.style.transform = '';
            frameRef.current.style.left = `${dragStartRef.current.frameX}px`;
            frameRef.current.style.top = `${dragStartRef.current.frameY}px`;
          }
          onMove(frameId, dragStartRef.current.frameX, dragStartRef.current.frameY);
          onDuplicate(frameId, newX, newY);
        } else {
          if (frameRef.current) {
            // Clear the temporary drag transform and immediately set exact left/top to prevent a 1-frame micro-stutter
            frameRef.current.style.transform = '';
            frameRef.current.style.left = `${newX}px`;
            frameRef.current.style.top = `${newY}px`;
          }

          // Only persist position if the frame actually moved; a plain click has dx=dy=0
          // and calling onMoveEnd would trigger an unnecessary _registry.json write.
          if (dx !== 0 || dy !== 0) {
            onMove(frameId, newX, newY);
            onMoveEnd(frameId, newX, newY);
          }
        }
      }
    },
    [isDragging, zoom, frameId, onMove, onMoveEnd, onDuplicate],
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

      // Optimistic DOM update for instant 60fps visual feedback
      if (frameRef.current && contentRef.current) {
        frameRef.current.style.width = `${Math.round(newW)}px`;
        frameRef.current.style.height = `${Math.round(newH) + TITLE_BAR_HEIGHT}px`;
        contentRef.current.style.width = `${Math.round(newW)}px`;
        contentRef.current.style.height = `${Math.round(newH)}px`;
      }
    },
    [isResizing, zoom],
  );

  const handleResizePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (isResizing) {
        setIsResizing(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        const dx = (e.clientX - resizeStartRef.current.x) / zoom;
        const dy = (e.clientY - resizeStartRef.current.y) / zoom;
        const newW = Math.max(MIN_FRAME_SIZE, resizeStartRef.current.w + dx);
        const newH = Math.max(MIN_FRAME_SIZE, resizeStartRef.current.h + dy);

        onResize(frameId, Math.round(newW), Math.round(newH));
        onResizeEnd(frameId, Math.round(newW), Math.round(newH));
      }
    },
    [isResizing, zoom, frameId, onResize, onResizeEnd],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setShowContextMenu(true);
    },
    [],
  );

  const handleMoreButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowContextMenu((prev) => !prev);
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

  const menuItems = [
    { label: 'Rename', action: () => onRename(frameId) },
    { label: 'Duplicate', action: () => onDuplicate(frameId, canvasX + 40, canvasY + 40) },
    { label: 'Delete', action: () => onDelete(frameId) },
  ];

  return (
    <>
      {/* Ghost — shown at original position when alt is held during drag */}
      {isDragging && isAltDragging && (
        <div
          style={{
            position: 'absolute',
            left: canvasX,
            top: canvasY,
            width,
            pointerEvents: 'none',
            opacity: 0.4,
            userSelect: 'none',
          }}
        >
          <div
            style={{
              height: TITLE_BAR_HEIGHT,
              display: 'flex',
              alignItems: 'center',
              padding: '0',
              fontSize: 12,
              fontFamily: 'var(--font-sans, system-ui, sans-serif)',
              fontWeight: 600,
              color: '#999',
              letterSpacing: '-0.2px',
            }}
          >
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 'calc(100% / var(--frame-label-scale))',
                transform: 'scale(var(--frame-label-scale))',
                transformOrigin: '0 100%',
              }}
            >
              {name}
              <span style={{ fontWeight: 400, opacity: 0.5, fontSize: 11, marginLeft: 6 }}>
                ({width} × {height})
              </span>
            </span>
          </div>
          <div
            className="bg-background-default"
            style={{
              width,
              height,
              position: 'relative',
              borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.1)',
              overflow: 'hidden',
              boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
            }}
          >
            {children}
          </div>
        </div>
      )}
      <div
        ref={frameRef}
        tabIndex={-1}
        style={{
          position: 'absolute',
          left: canvasX,
          top: canvasY,
          width,
          height: height + TITLE_BAR_HEIGHT,
          userSelect: 'none',
          cursor: 'default',
          outline: 'none',
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
            justifyContent: 'space-between',
            padding: '0',
            fontSize: 12,
            fontFamily: 'var(--font-sans, system-ui, sans-serif)',
            fontWeight: 600,
            color: isSelected ? '#18a0fb' : '#999',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            letterSpacing: '-0.2px',
            gap: 4,
          }}
        >
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 'calc(100% / var(--frame-label-scale) - 16px)',
              transform: 'scale(var(--frame-label-scale))',
              transformOrigin: '0 100%',
            }}
          >
            {name}
            <span style={{ fontWeight: 400, opacity: 0.5, fontSize: 11, marginLeft: 6 }}>
              ({width} × {height})
            </span>
          </span>
          {/* More menu button */}
          <button
            ref={moreButtonRef}
            data-testid="frame-more-btn"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleMoreButtonClick}
            title="Frame options"
            style={{
              width: 16,
              height: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              border: 'none',
              background: isSelected ? '#18a0fb' : (showContextMenu ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.85)'),
              color: isSelected ? '#fff' : '#333',
              cursor: 'pointer',
              fontSize: 12,
              padding: 0,
              flexShrink: 0,
              lineHeight: 1,
              boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
              transform: 'scale(var(--frame-label-scale))',
              transformOrigin: '100% 100%',
            }}
          >
            ⋮
          </button>
        </div>

        {/* Frame content area */}
        <div
          ref={contentRef}
          data-sketchpad-frame={frameId}
          data-layout-mode="absolute"
          className="bg-background-default"
          style={{
            width,
            height,
            position: 'relative',
            borderRadius: 4,
            border: isSelected ? '2px solid #18a0fb' : '1px solid rgba(255,255,255,0.1)',
            overflow: 'visible',
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

      {/* Context menu — rendered in portal so it escapes the canvas CSS transform */}
      {showContextMenu && createPortal(
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99998 }}
            onClick={() => setShowContextMenu(false)}
          />
          <div
            ref={menuRef}
            style={{
              ...menuStyle,
              zIndex: 99999,
              background: theme.bg_default,
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              padding: '4px 0',
              minWidth: 140,
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              fontFamily: 'var(--font-sans, system-ui, sans-serif)',
              fontSize: 12,
            }}
          >
            {menuItems.map((item) => (
              <div
                key={item.label}
                data-testid={`frame-menu-${item.label.toLowerCase()}`}
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
        </>,
        document.body,
      )}
    </>
  );
}
