import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { icons } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { DropdownList } from '@/components/ui/dropdown-list';
import { useFloatingPosition } from '@/lib/useFloatingPosition';
import type { DropdownItemProps } from '@/components/ui/dropdown-item';
import { DropdownItem } from '@/components/ui/dropdown-item';
import { SelectDropdownSearchContext } from '@/components/ui/select-dropdown-context';
import { SelectDropdownSearch } from '@/components/ui/select-dropdown-search';

export interface SelectDropdownProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Currently selected value (controlled) */
  value?: string;
  /** Fires with the new value string whenever the user selects an item */
  onSelectionChange?: (value: string) => void;
  /** Text shown in the trigger when nothing is selected */
  placeholder?: string;
  /** Lucide icon name shown before the value/placeholder in the trigger */
  prefixIcon?: string;
  /** Preferred placement of the dropdown panel */
  placement?: 'bottom' | 'top';
  /** Horizontal alignment of the panel relative to the trigger */
  align?: 'left' | 'center' | 'right';
  /** Width of the dropdown list panel */
  width?: 'auto' | 'sm' | 'md' | 'lg' | 'xl';
  /** Shows a destructive/error border on the trigger */
  error?: boolean;
  /** z-index for the floating panel */
  zIndex?: number;
  children?: React.ReactNode;
}

export function SelectDropdown({
  value,
  onSelectionChange,
  placeholder = 'Select an option',
  prefixIcon,
  placement = 'bottom',
  align = 'left',
  width = 'md',
  error = false,
  disabled = false,
  zIndex = 9999,
  children,
  onClick,
  className,
  ...props
}: SelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentValue, setCurrentValue] = useState<string | undefined>(value);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const anchorRef = useRef<HTMLButtonElement>(null);
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

  // Reset search when dropdown closes
  useEffect(() => {
    if (!isOpen) setSearchQuery('');
  }, [isOpen]);

  const handleSelect = (val: string) => {
    setCurrentValue(val);
    onSelectionChange?.(val);
    setIsOpen(false);
  };

  // Derive display label and icon from the matching child's props
  let displayLabel: string | undefined;
  let displayIcon: string | undefined;
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement<DropdownItemProps>(child)) return;
    const itemValue = child.props.value ?? child.props.label;
    if (itemValue === currentValue) {
      displayLabel = child.props.label;
      displayIcon = child.props.prefixIcon;
    }
  });

  // Clone each child to inject selected state, click handler, and search-based visibility
  const lowerQuery = searchQuery.toLowerCase();
  const enhancedChildren = React.Children.map(children, (child) => {
    if (!React.isValidElement<DropdownItemProps>(child)) return child;
    const itemValue = child.props.value ?? child.props.label;

    // For DropdownItems, apply search filtering
    if (itemValue !== undefined) {
      if (lowerQuery && !(child.props.label ?? itemValue).toLowerCase().includes(lowerQuery)) {
        return null;
      }
      return React.cloneElement(child, {
        selected: itemValue === currentValue,
        onClick: (e: React.MouseEvent<HTMLDivElement>) => {
          child.props.onClick?.(e);
          if (!child.props.disabled) handleSelect(itemValue);
        },
      });
    }

    // Non-DropdownItem children (e.g. SelectDropdownSearch) pass through unchanged
    return child;
  });

  const portalTarget =
    typeof document !== 'undefined'
      ? (document.getElementById('root') ?? document.body)
      : null;

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        disabled={disabled}
        data-open={isOpen}
        data-error={error}
        className={cn("flex h-10 w-full items-center gap-2 border border-border-default bg-background-default px-3 py-2 text-sm text-left text-foreground-default focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent data-[open=true]:ring-2 data-[open=true]:ring-primary data-[open=true]:border-transparent data-[error=true]:border-border-destructive disabled:cursor-not-allowed disabled:opacity-50 rounded", className)}
        onClick={(e) => {
          if (!disabled) setIsOpen((prev) => !prev);
          onClick?.(e);
        }}
        {...props}
        data-pv-component-id="SelectDropdown"
      >
        {(displayIcon ?? prefixIcon) && (
          <Icon name={(displayIcon ?? prefixIcon)!} size="sm" className="shrink-0 text-foreground-tertiary" />
        )}
        <span
          data-empty={!displayLabel}
          className="flex-1 truncate text-foreground-default data-[empty=true]:text-foreground-tertiary"
        >
          {displayLabel || placeholder}
        </span>
        <span
          className="inline-flex shrink-0 items-center justify-center opacity-50 text-foreground-default"
        >
          <Icon name={isOpen ? 'ChevronUp' : 'ChevronDown'} size="sm" />
        </span>
      </button>

      {isOpen && portalTarget
        ? createPortal(
            <SelectDropdownSearchContext.Provider value={{ query: searchQuery, setQuery: setSearchQuery }}>
              <div ref={panelRef} style={{ ...floatingStyle, zIndex }}>
                <DropdownList
                  width={width}
                  style={floatingStyle.minWidth != null ? { minWidth: floatingStyle.minWidth as number } : undefined}
                >
                  {enhancedChildren}
                </DropdownList>
              </div>
            </SelectDropdownSearchContext.Provider>,
            portalTarget
          )
        : null}
    </>
  );
}

export function PvDefaultContent() {
  return (
    <>
      {/* pv-editable-zone-start */}
        {/* pv-block-start */}
        <SelectDropdownSearch data-pv-block="" placeholder="Search..." />
        {/* pv-block-end */}
        {/* pv-block-start */}
        <DropdownItem data-pv-block="" value="opt1" label="Option One" selected={false} />
        {/* pv-block-end */}
        {/* pv-block-start */}
        <DropdownItem data-pv-block="" value="opt2" label="Option Two" selected={false} />
        {/* pv-block-end */}
        {/* pv-block-start */}
        <DropdownItem data-pv-block="" value="opt3" label="Option Three" selected={false} />
        {/* pv-block-end */}
      {/* pv-editable-zone-end */}
    </>
  );
}

export const pvConfig = {
  name: 'SelectDropdown',
  componentId: 'SelectDropdown',
  displayName: 'Select Dropdown',
  description: 'An input-style trigger that opens a selectable dropdown list. Manages selection state internally.',
  importPath: '@/components/ui/select-dropdown',
  defaultProps: 'placeholder="Select an option"',
  defaultContent: <PvDefaultContent />,
  additionalImportsForDefaultContent: [
    { name: 'DropdownItem', path: '@/components/ui/dropdown-item' },
    { name: 'SelectDropdownSearch', path: '@/components/ui/select-dropdown-search' },
  ],
  props: {
    placeholder: { type: 'string', exampleValue: 'Select an option' },
    value: { type: 'string', exampleValue: 'opt1' },
    prefixIcon: { type: 'select', options: Object.keys(icons) },
    placement: { type: 'select', options: ['bottom', 'top'] },
    align: { type: 'select', options: ['left', 'center', 'right'] },
    width: { type: 'select', options: ['auto', 'sm', 'md', 'lg', 'xl'] },
    error: { type: 'boolean' },
    disabled: { type: 'boolean' },
  },
};

// =============================================================================
// AI USAGE GUIDE — SelectDropdown + DropdownItem
// =============================================================================
//
// SelectDropdown is a self-contained form select. Place DropdownItem children
// inside it — each must have a `value` prop (used as the selection identifier)
// and a `label` prop (shown in the trigger when selected).
//
// SelectDropdown automatically:
//   • Injects `selected` onto each item based on internal state
//   • Injects `onClick` to select the item and close the dropdown
//   • Displays the selected item's label in the trigger button
//
// Do NOT pass `selected` or `onClick` manually to items inside SelectDropdown —
// they are injected automatically and will be overridden.
//
// MODE 1 — Self-managed (no store, clicking just works)
//
//   <SelectDropdown placeholder="Choose a plan">
//     <DropdownItem value="free"  label="Free"  prefixIcon="Gift" />
//     <DropdownItem value="pro"   label="Pro"   prefixIcon="Zap" />
//     <DropdownItem value="team"  label="Team"  prefixIcon="Users" />
//   </SelectDropdown>
//
// MODE 2 — Connected to a store (controlled + reactive)
//
//   <SelectDropdown
//     value={store.plan}
//     onSelectionChange={(val) => store.dispatch({ type: 'SET_PLAN', value: val })}
//     placeholder="Choose a plan"
//   >
//     <DropdownItem value="free"  label="Free" />
//     <DropdownItem value="pro"   label="Pro" />
//     <DropdownItem value="team"  label="Team" />
//   </SelectDropdown>
//
//   Works with any state solution: useState, Zustand, Redux, Jotai, etc.
//   Example with useState:
//
//   const [plan, setPlan] = useState('free');
//   <SelectDropdown value={plan} onSelectionChange={setPlan}>...</SelectDropdown>
//
// =============================================================================
