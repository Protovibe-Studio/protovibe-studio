import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { TooltipCallout } from '@/components/ui/tooltip-callout';

interface TooltipState {
  visible: boolean;
  text: string;
  direction: 'top' | 'bottom' | 'left' | 'right';
  x: number;
  y: number;
}

export function TooltipProvider() {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    text: '',
    direction: 'top',
    x: 0,
    y: 0,
  });

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[title], [data-tooltip-text]') as HTMLElement;
      if (!target) return;

      // Suppress native tooltip by swapping title -> data-tooltip-text
      if (target.hasAttribute('title')) {
        target.setAttribute('data-tooltip-text', target.getAttribute('title') || '');
        target.removeAttribute('title');
      }

      const text = target.getAttribute('data-tooltip-text');
      if (!text) return;

      const prefDir = (target.getAttribute('data-tooltip-dir') as TooltipState['direction']) || 'top';
      const rect = target.getBoundingClientRect();
      const spacing = 8;
      let dir = prefDir;

      // Estimated dimensions for collision detection (max-w-xs = 320px)
      const estWidth = Math.min(text.length * 7, 320);
      const estHeight = text.length > 45 ? 60 : 32;

      // Calculate position & flip if hitting viewport edges
      let x = 0;
      let y = 0;

      if (dir === 'top') {
        x = rect.left + rect.width / 2;
        y = rect.top - spacing;
        if (y - estHeight < 0) dir = 'bottom';
      } else if (dir === 'bottom') {
        x = rect.left + rect.width / 2;
        y = rect.bottom + spacing;
        if (y + estHeight > window.innerHeight) dir = 'top';
      } else if (dir === 'left') {
        x = rect.left - spacing;
        y = rect.top + rect.height / 2;
        if (x - estWidth < 0) dir = 'right';
      } else if (dir === 'right') {
        x = rect.right + spacing;
        y = rect.top + rect.height / 2;
        if (x + estWidth > window.innerWidth) dir = 'left';
      }

      // Recalculate coordinates after potential flip
      if (dir === 'top') { x = rect.left + rect.width / 2; y = rect.top - spacing; }
      if (dir === 'bottom') { x = rect.left + rect.width / 2; y = rect.bottom + spacing; }
      if (dir === 'left') { x = rect.left - spacing; y = rect.top + rect.height / 2; }
      if (dir === 'right') { x = rect.right + spacing; y = rect.top + rect.height / 2; }

      setTooltip({ visible: true, text, direction: dir, x, y });
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-tooltip-text]');
      if (target) setTooltip(prev => ({ ...prev, visible: false }));
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('scroll', handleMouseOut, true);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('scroll', handleMouseOut, true);
    };
  }, []);

  if (!tooltip.visible || !tooltip.text) return null;

  return createPortal(
    <TooltipCallout
      text={tooltip.text}
      direction={tooltip.direction}
      style={{
        position: 'fixed',
        left: tooltip.x,
        top: tooltip.y,
        transform:
          tooltip.direction === 'top' ? 'translate(-50%, -100%)' :
          tooltip.direction === 'bottom' ? 'translate(-50%, 0)' :
          tooltip.direction === 'left' ? 'translate(-100%, -50%)' :
          'translate(0, -50%)',
        zIndex: 99999,
        pointerEvents: 'none',
      }}
    />,
    document.body
  );
}
