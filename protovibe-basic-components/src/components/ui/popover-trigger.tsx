import React, { createContext, forwardRef, useContext, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFloatingPosition } from '@/lib/useFloatingPosition';
import { Button } from '@/components/ui/button';
import { DropdownList } from '@/components/ui/dropdown-list';
import { DropdownGroupLabel } from '@/components/ui/dropdown-group-label';
import { DropdownItem } from '@/components/ui/dropdown-item';
import { DropdownSeparator } from '@/components/ui/dropdown-separator';

export const PopoverContext = createContext<{ close: () => void } | null>(null);

export function usePopoverClose() {
  return useContext(PopoverContext);
}

export interface PopoverHandle {
  close: () => void;
  open: () => void;
  toggle: () => void;
}

export interface PopoverTriggerProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Preferred placement of the floating panel */
  placement?: 'bottom' | 'top';
  /** Horizontal alignment of the floating panel relative to the anchor */
  align?: 'left' | 'center' | 'right';
  /** z-index for the floating panel */
  zIndex?: number;
  /** Whether clicking outside the panel closes it. Default true. */
  closeOnClickOutside?: boolean;
  children?: React.ReactNode;
}

export const PopoverTrigger = forwardRef<PopoverHandle, PopoverTriggerProps>(function PopoverTrigger({
  placement = 'bottom',
  align = 'left',
  zIndex = 9999,
  closeOnClickOutside = true,
  children,
  ...props
}, ref) {
  const [isOpen, setIsOpen] = useState(false);

  const anchorRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    close: () => setIsOpen(false),
    open: () => setIsOpen(true),
    toggle: () => setIsOpen((prev) => !prev),
  }));

  // Close on click outside (only when enabled)
  useEffect(() => {
    if (!isOpen || !closeOnClickOutside) return;
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Element;
      if (anchorRef.current && anchorRef.current.contains(target)) return;
      if (panelRef.current && panelRef.current.contains(target)) return;
      if (target.closest('[data-prevent-closing-popover]')) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen, closeOnClickOutside]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const { style: floatingStyle } = useFloatingPosition({
    isOpen,
    anchorRef,
    dropdownRef: panelRef,
    preferredPlacement: placement,
    align,
  });

  const childArray = React.Children.toArray(children);
  const triggerChild = childArray[0];
  const panelChildren = childArray.slice(1);

  const portalTarget =
    typeof document !== 'undefined'
      ? (document.getElementById('root') ?? document.body)
      : null;

  return (
    <PopoverContext.Provider value={{ close: () => setIsOpen(false) }}>
      <span
        ref={anchorRef}
        style={{ display: 'inline-flex', cursor: 'pointer' }}
        onClick={() => setIsOpen((prev) => !prev)}
        {...props}
        data-pv-component-id="PopoverTrigger"
      >
        {triggerChild}
      </span>

      {isOpen && portalTarget
        ? createPortal(
            <div
              ref={panelRef}
              style={{ ...floatingStyle, zIndex }}
            >
              {panelChildren}
            </div>,
            portalTarget
          )
        : null}
    </PopoverContext.Provider>
  );
});

export function PvDefaultContent() {
  return (
    <>
      {/* pv-editable-zone-start */}
        {/* pv-block-start */}
        <Button data-pv-block="" label="Open Menu" variant="outline" color="neutral" size="md" rightIcon="ChevronDown" />
        {/* pv-block-end */}
        {/* pv-block-start */}
        <DropdownList data-pv-block="" width="md">
          {/* pv-editable-zone-start */}
          {/* pv-block-start */}
          <DropdownGroupLabel data-pv-block="" label="Actions" />
          {/* pv-block-end */}
          {/* pv-block-start */}
          <DropdownItem data-pv-block="" label="Edit" prefixIcon="Edit2" />
          {/* pv-block-end */}
          {/* pv-block-start */}
          <DropdownItem data-pv-block="" label="Duplicate" prefixIcon="Copy" />
          {/* pv-block-end */}
          {/* pv-block-start */}
          <DropdownSeparator data-pv-block="" />
          {/* pv-block-end */}
          {/* pv-block-start */}
          <DropdownItem data-pv-block="" label="Delete" prefixIcon="Trash2" destructive={true} />
          {/* pv-block-end */}
          {/* pv-editable-zone-end */}
        </DropdownList>
        {/* pv-block-end */}
      {/* pv-editable-zone-end */}
    </>
  );
}

export const pvConfig = {
  name: 'PopoverTrigger',
  componentId: 'PopoverTrigger',
  displayName: 'Popover Trigger',
  description: 'Wraps a trigger element; shows floating content on click, portalled to root.',
  importPath: '@/components/ui/popover-trigger',
  defaultProps: 'placement="bottom"',
  defaultContent: <PvDefaultContent />,
  additionalImportsForDefaultContent: [
    { name: 'Button', path: '@/components/ui/button' },
    { name: 'DropdownList', path: '@/components/ui/dropdown-list' },
    { name: 'DropdownGroupLabel', path: '@/components/ui/dropdown-group-label' },
    { name: 'DropdownItem', path: '@/components/ui/dropdown-item' },
    { name: 'DropdownSeparator', path: '@/components/ui/dropdown-separator' },
  ],
  props: {
    placement: { type: 'select', options: ['bottom', 'top'] },
    align: { type: 'select', options: ['left', 'center', 'right'] },
    closeOnClickOutside: { type: 'boolean' },
    zIndex: { type: 'string', exampleValue: 'Lorem ipsum' },
  },
};
