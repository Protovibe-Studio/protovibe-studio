import { useEffect } from 'react';
import { INSPECTOR_TRANSITION_EASING, INSPECTOR_TRANSITION_MS } from '../constants/layout';

const SCALE_ROOT_SELECTOR = '[data-pv-canvas]';
const CANVAS_EDGE_PADDING_PX = 12;
const INSPECTOR_GAP_PX = 12;

export function useInspectorAppScale(isOpen: boolean, inspectorWidthPx: number) {
  useEffect(() => {
    const scaleRoot = document.querySelector<HTMLElement>(SCALE_ROOT_SELECTOR);
    if (!scaleRoot) return;

    const originalTransition = scaleRoot.style.transition;
    const originalOverflow = scaleRoot.style.overflow;
    const originalBorderRadius = scaleRoot.style.borderRadius;
    const transformTransition = `transform ${INSPECTOR_TRANSITION_MS}ms ${INSPECTOR_TRANSITION_EASING}`;
    scaleRoot.style.transition = originalTransition
      ? `${originalTransition}, ${transformTransition}`
      : transformTransition;

    const setScale = (scale: number, active: boolean) => {
      const translateX = active ? CANVAS_EDGE_PADDING_PX : 0;
      const translateY = active ? CANVAS_EDGE_PADDING_PX : 0;

      scaleRoot.style.transformOrigin = 'top left';
      scaleRoot.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
      scaleRoot.style.width = `${window.innerWidth}px`;
      scaleRoot.style.overflow = active ? 'hidden' : originalOverflow;
      scaleRoot.style.borderRadius = active ? '8px' : originalBorderRadius;
    };

    if (!isOpen) {
      setScale(1, false);
      return;
    }

    const applyScale = () => {
      const viewportWidth = window.innerWidth;
      if (viewportWidth <= 0) return;

      const availableWidth = Math.max(
        viewportWidth - inspectorWidthPx - CANVAS_EDGE_PADDING_PX - INSPECTOR_GAP_PX,
        1
      );
      const scale = Math.min(1, availableWidth / viewportWidth);
      setScale(scale, true);
    };

    applyScale();
    window.addEventListener('resize', applyScale);

    return () => {
      window.removeEventListener('resize', applyScale);
      setScale(1, false);
      scaleRoot.style.transition = originalTransition;
    };
  }, [isOpen, inspectorWidthPx]);
}