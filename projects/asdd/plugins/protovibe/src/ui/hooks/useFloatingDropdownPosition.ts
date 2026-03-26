import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

type Placement = 'top' | 'bottom';

interface UseFloatingDropdownPositionParams {
  isOpen: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  dropdownRef: React.RefObject<HTMLElement | null>;
  offset?: number;
  viewportPadding?: number;
  preferredPlacement?: Placement;
  minVisibleHeight?: number;
  updateDeps?: unknown[];
}

interface FloatingDropdownPosition {
  style: React.CSSProperties;
  placement: Placement;
  updatePosition: () => void;
}

const DEFAULT_MAX_HEIGHT = 280;

export function useFloatingDropdownPosition({
  isOpen,
  anchorRef,
  dropdownRef,
  offset = 4,
  viewportPadding = 8,
  preferredPlacement = 'bottom',
  minVisibleHeight = 120,
  updateDeps = [],
}: UseFloatingDropdownPositionParams): FloatingDropdownPosition {
  const rafIdRef = useRef<number | null>(null);
  const [placement, setPlacement] = useState<Placement>(preferredPlacement);
  const [style, setStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    visibility: 'hidden',
  });

  const updatePosition = useCallback(() => {
    const anchorEl = anchorRef.current;
    const dropdownEl = dropdownRef.current;
    if (!isOpen || !anchorEl || !dropdownEl) return;

    const anchorRect = anchorEl.getBoundingClientRect();
    const dropdownRect = dropdownEl.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const measuredWidth = Math.max(dropdownRect.width, anchorRect.width);
    const measuredHeight = dropdownRect.height || DEFAULT_MAX_HEIGHT;

    const spaceBelow = viewportHeight - anchorRect.bottom - viewportPadding;
    const spaceAbove = anchorRect.top - viewportPadding;

    const shouldOpenAbove =
      preferredPlacement === 'bottom'
        ? spaceBelow < minVisibleHeight && spaceAbove > spaceBelow
        : spaceAbove >= minVisibleHeight || spaceAbove > spaceBelow;

    const nextPlacement: Placement = shouldOpenAbove ? 'top' : 'bottom';
    const availableHeight = Math.max(
      minVisibleHeight,
      (nextPlacement === 'bottom' ? spaceBelow : spaceAbove) - offset
    );
    const nextMaxHeight = Math.max(minVisibleHeight, Math.min(DEFAULT_MAX_HEIGHT, availableHeight));

    let left = anchorRect.left + anchorRect.width / 2 - measuredWidth / 2;
    left = Math.min(Math.max(left, viewportPadding), viewportWidth - viewportPadding - measuredWidth);

    const renderedHeight = Math.min(measuredHeight, nextMaxHeight);
    const top =
      nextPlacement === 'bottom'
        ? Math.min(anchorRect.bottom + offset, viewportHeight - viewportPadding - renderedHeight)
        : Math.max(viewportPadding, anchorRect.top - offset - renderedHeight);

    setPlacement(nextPlacement);
    setStyle({
      position: 'fixed',
      top,
      left,
      minWidth: anchorRect.width,
      maxWidth: Math.max(120, viewportWidth - viewportPadding * 2),
      maxHeight: nextMaxHeight,
      visibility: 'visible',
    });
  }, [anchorRef, dropdownRef, isOpen, minVisibleHeight, offset, preferredPlacement, viewportPadding]);

  const scheduleUpdate = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      updatePosition();
    });
  }, [updatePosition]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    scheduleUpdate();
  }, [isOpen, scheduleUpdate]);

  useEffect(() => {
    if (!isOpen) return;
    scheduleUpdate();
  }, [isOpen, scheduleUpdate, ...updateDeps]);

  useEffect(() => {
    if (!isOpen) return;

    const anchorEl = anchorRef.current;
    const dropdownEl = dropdownRef.current;
    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            scheduleUpdate();
          })
        : null;

    if (resizeObserver && anchorEl) resizeObserver.observe(anchorEl);
    if (resizeObserver && dropdownEl) resizeObserver.observe(dropdownEl);

    const handleViewportChange = () => {
      scheduleUpdate();
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
      resizeObserver?.disconnect();

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [anchorRef, dropdownRef, isOpen, scheduleUpdate]);

  return {
    style,
    placement,
    updatePosition: scheduleUpdate,
  };
}