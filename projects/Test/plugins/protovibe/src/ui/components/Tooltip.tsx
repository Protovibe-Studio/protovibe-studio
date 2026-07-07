// plugins/protovibe/src/ui/components/Tooltip.tsx
//
// Global tooltip layer for the Protovibe shell. Replaces the native
// `title=""` browser tooltip with a styled one that matches the rest of
// the inspector chrome.
//
// Usage: drop <TooltipLayer /> once at the root of the shell, then put
// `data-tooltip="..."` on any element that should show a tip on hover or
// keyboard focus. There is no per-callsite wrapper component.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { theme } from '../theme';

const OPEN_DELAY_MS = 200;
const VIEWPORT_PAD = 8;
const ANCHOR_GAP = 6;

type Placement = 'top' | 'bottom';

interface TipState {
  text: string;
  anchorRect: DOMRect;
}

function findTooltipTarget(start: Element | null): HTMLElement | null {
  let el: Element | null = start;
  while (el && el !== document.body) {
    if (el instanceof HTMLElement && el.hasAttribute('data-tooltip')) return el;
    el = el.parentElement;
  }
  return null;
}

export function TooltipLayer() {
  const [tip, setTip] = useState<TipState | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; placement: Placement } | null>(null);
  const tipElRef = useRef<HTMLDivElement | null>(null);
  const openTimerRef = useRef<number | null>(null);
  const activeElRef = useRef<HTMLElement | null>(null);

  // Suppress native browser tooltip while ours is active by stashing the
  // element's `title` attribute. Restored on close.
  const stashedTitleRef = useRef<{ el: HTMLElement; title: string } | null>(null);

  const clearOpenTimer = () => {
    if (openTimerRef.current != null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  };

  const close = () => {
    clearOpenTimer();
    activeElRef.current = null;
    if (stashedTitleRef.current) {
      const { el, title } = stashedTitleRef.current;
      if (title) el.setAttribute('title', title);
      stashedTitleRef.current = null;
    }
    setTip(null);
    setPos(null);
  };

  const scheduleOpen = (el: HTMLElement) => {
    clearOpenTimer();
    activeElRef.current = el;
    openTimerRef.current = window.setTimeout(() => {
      const text = el.getAttribute('data-tooltip');
      if (!text) return;
      // Suppress native tooltip if a `title` is also set on the same node.
      const nativeTitle = el.getAttribute('title');
      if (nativeTitle) {
        stashedTitleRef.current = { el, title: nativeTitle };
        el.removeAttribute('title');
      }
      setTip({ text, anchorRect: el.getBoundingClientRect() });
    }, OPEN_DELAY_MS);
  };

  useEffect(() => {
    const onOver = (e: MouseEvent) => {
      const target = findTooltipTarget(e.target as Element | null);
      if (!target) return;
      if (target === activeElRef.current) return;
      // If switching to a different tooltip target, close current first.
      if (activeElRef.current) close();
      scheduleOpen(target);
    };
    const onOut = (e: MouseEvent) => {
      const target = findTooltipTarget(e.target as Element | null);
      if (!target) return;
      const related = e.relatedTarget as Element | null;
      if (related && target.contains(related)) return;
      if (target === activeElRef.current) close();
    };
    const onFocusIn = (e: FocusEvent) => {
      const target = findTooltipTarget(e.target as Element | null);
      if (!target) return;
      if (target === activeElRef.current) return;
      if (activeElRef.current) close();
      scheduleOpen(target);
    };
    const onFocusOut = (e: FocusEvent) => {
      const target = findTooltipTarget(e.target as Element | null);
      if (target && target === activeElRef.current) close();
    };
    const onScroll = () => close();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const onMouseDown = () => close();

    document.addEventListener('mouseover', onOver, true);
    document.addEventListener('mouseout', onOut, true);
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('mousedown', onMouseDown, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll, true);

    return () => {
      clearOpenTimer();
      document.removeEventListener('mouseover', onOver, true);
      document.removeEventListener('mouseout', onOut, true);
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('focusout', onFocusOut, true);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('mousedown', onMouseDown, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll, true);
    };
  }, []);

  useLayoutEffect(() => {
    if (!tip || !tipElRef.current) { setPos(null); return; }
    const tipEl = tipElRef.current;
    const tipW = tipEl.offsetWidth;
    const tipH = tipEl.offsetHeight;
    const a = tip.anchorRect;

    let placement: Placement = 'top';
    let top = a.top - ANCHOR_GAP - tipH;
    if (top < VIEWPORT_PAD) {
      placement = 'bottom';
      top = a.bottom + ANCHOR_GAP;
    }
    let left = a.left + a.width / 2 - tipW / 2;
    if (left + tipW > window.innerWidth - VIEWPORT_PAD) left = window.innerWidth - tipW - VIEWPORT_PAD;
    if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;

    setPos({ top, left, placement });
  }, [tip]);

  if (!tip) return null;

  return createPortal(
    <div
      ref={tipElRef}
      role="tooltip"
      style={{
        position: 'fixed',
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        zIndex: 9999999,
        pointerEvents: 'none',
        background: theme.bg_strong,
        color: theme.text_default,
        border: `1px solid ${theme.border_default}`,
        borderRadius: 6,
        boxShadow: '0 6px 20px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)',
        fontFamily: theme.font_ui,
        fontSize: 11,
        lineHeight: 1.35,
        padding: '5px 8px',
        maxWidth: 260,
        whiteSpace: 'pre-line',
        opacity: pos ? 1 : 0,
        transition: 'opacity 80ms ease-out',
      }}
    >
      {tip.text}
    </div>,
    document.body
  );
}
