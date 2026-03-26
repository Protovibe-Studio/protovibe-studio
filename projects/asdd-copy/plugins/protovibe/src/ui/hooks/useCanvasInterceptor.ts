// plugins/protovibe/src/ui/hooks/useCanvasInterceptor.ts
import { useEffect, useRef } from 'react';
import { useProtovibe } from '../context/ProtovibeContext';
import { isTextEditableElement, PV_FOCUS_TEXT_CONTENT_EVENT } from '../utils/elementType';

export function useCanvasInterceptor() {
  const { inspectorOpen, focusElement, highlightedElement, currentBaseTarget, isMutationLocked } = useProtovibe();
  const hoveredElementRef = useRef<HTMLElement | null>(null);
  const suppressNextClickTargetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!inspectorOpen) {
      if (hoveredElementRef.current) {
        const prev = hoveredElementRef.current as any;
        hoveredElementRef.current.style.outline = prev._pv_hover_original_outline || '';
        hoveredElementRef.current.style.outlineOffset = prev._pv_hover_original_offset || '';
        hoveredElementRef.current = null;
      }
      return;
    }

    const clearHoverOutline = () => {
      if (!hoveredElementRef.current) return;
      const prev = hoveredElementRef.current as any;
      hoveredElementRef.current.style.outline = prev._pv_hover_original_outline || '';
      hoveredElementRef.current.style.outlineOffset = prev._pv_hover_original_offset || '';
      hoveredElementRef.current = null;
    };

    const findInspectableTarget = (start: EventTarget | null): HTMLElement | null => {
      const root = document.getElementById('protovibe-root');
      if (root && start instanceof Node && root.contains(start)) {
        return null;
      }

      let target = start as HTMLElement | null;
      while (target && target !== document.documentElement) {
        if (target.attributes) {
          for (let i = 0; i < target.attributes.length; i++) {
            if (target.attributes[i].name.startsWith('data-pv-loc-')) {
              return target;
            }
          }
        }
        target = target.parentElement as HTMLElement;
      }

      return null;
    };

    const isCurrentBaseTarget = (target: HTMLElement | null): boolean => {
      if (!currentBaseTarget || !target) return false;
      return currentBaseTarget === target;
    };

    const handleDown = (e: MouseEvent | PointerEvent) => {
      if (isMutationLocked) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const target = findInspectableTarget(e.target);
      if (!target) return;

      if (isCurrentBaseTarget(target)) {
        suppressNextClickTargetRef.current = null;
        clearHoverOutline();
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      suppressNextClickTargetRef.current = target;
      clearHoverOutline();
      focusElement(target);
    };

    const handlePointerDown = (e: PointerEvent) => {
      handleDown(e);
    };

    const handleMouseDown = (e: MouseEvent) => {
      handleDown(e);
    };

    const handleClick = (e: MouseEvent) => {
      if (isMutationLocked) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const target = findInspectableTarget(e.target);
      if (!target) return;

      const suppressTarget = suppressNextClickTargetRef.current;
      if (suppressTarget && suppressTarget.contains(target)) {
        e.preventDefault();
        e.stopPropagation();
        suppressNextClickTargetRef.current = null;
        return;
      }

      if (isCurrentBaseTarget(target)) {
        clearHoverOutline();
        return;
      }

      e.preventDefault();
      e.stopPropagation();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isMutationLocked) {
        clearHoverOutline();
        return;
      }

      const target = findInspectableTarget(e.target);

      if (!target || target === highlightedElement) {
        clearHoverOutline();
        return;
      }

      if (hoveredElementRef.current === target) {
        return;
      }

      clearHoverOutline();

      const targetAny = target as any;
      targetAny._pv_hover_original_outline = target.style.outline;
      targetAny._pv_hover_original_offset = target.style.outlineOffset;
      target.style.outline = '1px solid rgba(24, 160, 251, 0.6)';
      target.style.outlineOffset = '2px';
      hoveredElementRef.current = target;
    };

    const handleMouseLeave = () => {
      clearHoverOutline();
    };

    const handleDoubleClick = (e: MouseEvent) => {
      if (isMutationLocked) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const target = findInspectableTarget(e.target);
      if (!target || !currentBaseTarget) return;

      if (target !== currentBaseTarget) return;
      if (!isTextEditableElement(currentBaseTarget)) return;

      e.preventDefault();
      e.stopPropagation();
      window.dispatchEvent(new Event(PV_FOCUS_TEXT_CONTENT_EVENT));
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('mouseleave', handleMouseLeave, true);
    document.addEventListener('dblclick', handleDoubleClick, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('mouseleave', handleMouseLeave, true);
      document.removeEventListener('dblclick', handleDoubleClick, true);
      clearHoverOutline();
    };
  }, [inspectorOpen, focusElement, highlightedElement, currentBaseTarget, isMutationLocked]);
}
