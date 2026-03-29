import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownList } from '@/components/ui/dropdown-list';
import { DropdownItem } from '@/components/ui/dropdown-item';
import { DropdownSeparator } from '@/components/ui/dropdown-separator';
import { useFloatingPosition } from '@/lib/useFloatingPosition';
import { cn } from '@/lib/utils';

export interface DropdownButtonProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Button label */
  label?: string;
  /** Button visual style */
  variant?: 'solid' | 'outline' | 'ghost';
  /** Button color */
  color?: 'primary' | 'neutral' | 'danger';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Icon on the left side of the button */
  leftIcon?: string;
  /** Icon on the right side of the button — defaults to ChevronDown */
  rightIcon?: string;
  /** Preferred placement of the dropdown panel */
  placement?: 'bottom' | 'top';
  /** Horizontal alignment of the panel relative to the button */
  align?: 'left' | 'center' | 'right';
  /** Width of the dropdown list panel */
  width?: 'auto' | 'sm' | 'md' | 'lg' | 'xl';
  /** z-index for the floating panel */
  zIndex?: number;
  children?: React.ReactNode;
}

export function DropdownButton({
  label = 'Options',
  variant = 'outline',
  color = 'neutral',
  size = 'md',
  leftIcon,
  rightIcon = 'ChevronDown',
  placement = 'bottom',
  align = 'left',
  width = 'md',
  zIndex = 9999,
  children,
  className,
  ...props
}: DropdownButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const anchorRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Element;
      if (anchorRef.current && anchorRef.current.contains(target)) return;
      if (panelRef.current && panelRef.current.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen]);

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

  const portalTarget =
    typeof document !== 'undefined'
      ? (document.getElementById('root') ?? document.body)
      : null;

  return (
    <span
      ref={anchorRef}
      className={cn('inline-flex', className)}
      {...props}
      data-pv-component-id="DropdownButton"
    >
      <Button
        label={label}
        variant={variant}
        color={color}
        size={size}
        leftIcon={leftIcon}
        rightIcon={rightIcon}
        className="w-full"
        onClick={() => setIsOpen((prev) => !prev)}
      />

      {isOpen && portalTarget
        ? createPortal(
            <div ref={panelRef} style={{ ...floatingStyle, zIndex }}>
              <DropdownList
                width={width}
                style={floatingStyle.minWidth != null ? { minWidth: floatingStyle.minWidth as number } : undefined}
              >
                {children}
              </DropdownList>
            </div>,
            portalTarget
          )
        : null}
    </span>
  );
}

export function PvDefaultContent() {
  return (
    <>
      {/* pv-editable-zone-start */}
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
    </>
  );
}

export const pvConfig = {
  name: 'DropdownButton',
  componentId: 'DropdownButton',
  displayName: 'Dropdown Button',
  description: 'A button that opens a floating dropdown menu on click.',
  importPath: '@/components/ui/dropdown-button',
  defaultProps: 'label="Options" variant="outline" color="neutral" rightIcon="ChevronDown"',
  defaultContent: <PvDefaultContent />,
  additionalImportsForDefaultContent: [
    { name: 'DropdownItem', path: '@/components/ui/dropdown-item' },
    { name: 'DropdownSeparator', path: '@/components/ui/dropdown-separator' },
  ],
  props: {
    label: { type: 'string', exampleValue: 'Options' },
    variant: { type: 'select', options: ['solid', 'outline', 'ghost'] },
    color: { type: 'select', options: ['primary', 'neutral', 'danger'] },
    size: { type: 'select', options: ['sm', 'md', 'lg'] },
    leftIcon: { type: 'select', options: Object.keys(LucideIcons) },
    rightIcon: { type: 'select', options: Object.keys(LucideIcons) },
    placement: { type: 'select', options: ['bottom', 'top'] },
    align: { type: 'select', options: ['left', 'center', 'right'] },
    width: { type: 'select', options: ['auto', 'sm', 'md', 'lg', 'xl'] },
  },
};
