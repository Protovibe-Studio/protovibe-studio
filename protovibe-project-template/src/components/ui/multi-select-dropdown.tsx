import React, { useEffect, useRef, useState, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useFloatingPosition } from '@/lib/useFloatingPosition';
import { SelectDropdownSearchContext } from '@/components/ui/select-dropdown-context';
import type { MultiSelectDropdownItemProps } from '@/components/ui/multi-select-dropdown-item';
import { MultiSelectDropdownItem } from '@/components/ui/multi-select-dropdown-item';
import { Chip } from '@/components/ui/chip';
import { SelectDropdownSearch } from '@/components/ui/select-dropdown-search';
import { MultiSelectDropdownMenu } from '@/components/ui/multi-select-dropdown-menu';

export interface MultiSelectContextValue {
  activeValues: string[];
  toggleValue: (val: string) => void;
}

export const MultiSelectContext = createContext<MultiSelectContextValue | null>(null);

export function useMultiSelect() {
  return useContext(MultiSelectContext);
}

export interface MultiSelectDropdownProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'> {
  /** Comma-separated initial/controlled values (e.g. "opt1,opt2") */
  value?: string;
  /** Fires with comma-separated string whenever selection changes */
  onSelectionChange?: (value: string) => void;
  placeholder?: string;
  prefixIcon?: string;
  placement?: 'bottom' | 'top';
  align?: 'left' | 'center' | 'right';
  menuMinWidth?: 'auto' | 'sm' | 'md' | 'lg' | 'xl';
  error?: boolean;
  disabled?: boolean;
  showClearButton?: boolean;
  /** Controls the visual open state for canvas editing */
  menuOpen?: 'Auto (Default)' | 'Open temporarily for visual editing';
  zIndex?: number;
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

export function MultiSelectDropdown({
  value = '',
  onSelectionChange,
  placeholder = 'Select options',
  prefixIcon,
  placement = 'bottom',
  align = 'left',
  menuMinWidth = 'md',
  error = false,
  disabled = false,
  showClearButton = true,
  menuOpen = 'Auto (Default)',
  zIndex = 9999,
  children,
  onClick,
  className,
  ...props
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeValues, setActiveValues] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const isForcedOpen = menuOpen === 'Open temporarily for visual editing';

  // Sync incoming comma-separated string to state array
  useEffect(() => {
    const arr = value ? value.split(',').map(v => v.trim()).filter(Boolean) : [];
    setActiveValues(arr);
  }, [value]);

  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || isForcedOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Element;
      if (anchorRef.current && anchorRef.current.contains(target)) return;
      if (panelRef.current && panelRef.current.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen, isForcedOpen]);

  useEffect(() => {
    if (!isOpen || isForcedOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isForcedOpen]);

  const { style: floatingStyle } = useFloatingPosition({
    isOpen: isOpen && !isForcedOpen,
    anchorRef,
    dropdownRef: panelRef,
    preferredPlacement: placement,
    align,
  });

  useEffect(() => {
    if (!isOpen && !isForcedOpen) setSearchQuery('');
  }, [isOpen, isForcedOpen]);

  const toggleValue = (val: string) => {
    setActiveValues((prev) => {
      const next = prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val];
      onSelectionChange?.(next.join(','));
      return next;
    });
  };

  const removeValue = (val: string) => {
    setActiveValues((prev) => {
      const next = prev.filter((v) => v !== val);
      onSelectionChange?.(next.join(','));
      return next;
    });
  };

  const clearAll = () => {
    setActiveValues([]);
    onSelectionChange?.('');
  };

  // Map values to display labels based on children
  const valueLabelMap = new Map<string, string>();
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement<MultiSelectDropdownItemProps>(child)) return;
    const itemValue = child.props.value ?? child.props.label;
    if (itemValue && child.props.label) {
      valueLabelMap.set(itemValue, child.props.label);
    }
  });

  const lowerQuery = searchQuery.toLowerCase();
  const enhancedChildren = React.Children.map(children, (child) => {
    if (!React.isValidElement<MultiSelectDropdownItemProps>(child)) return child;
    const itemValue = child.props.value ?? child.props.label;
    if (itemValue !== undefined && lowerQuery && !(child.props.label ?? itemValue).toLowerCase().includes(lowerQuery)) {
      return null;
    }
    return child; // children will read from context internally
  });

  const portalTarget = typeof document !== 'undefined' ? (document.getElementById('root') ?? document.body) : null;

  return (
    <MultiSelectContext.Provider value={{ activeValues, toggleValue }}>
      <div
        ref={anchorRef}
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        aria-expanded={isOpen || isForcedOpen}
        data-open={isOpen || isForcedOpen}
        data-error={error}
        data-disabled={disabled}
        className={cn(
          "flex min-h-10 items-center gap-2 border border-border-default bg-background-default text-sm text-left text-foreground-default focus:outline-none focus:ring-2 focus:ring-background-primary focus:border-transparent data-[open=true]:ring-2 data-[open=true]:ring-background-primary data-[open=true]:border-transparent data-[error=true]:border-background-destructive data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50 rounded w-full p-1.5 cursor-pointer transition-colors",
          className
        )}
        onClick={(e) => {
          if (!disabled) setIsOpen((prev) => !prev);
          onClick?.(e);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) setIsOpen((prev) => !prev);
          }
        }}
        {...props}
        data-pv-component-id="MultiSelectDropdown"
      >
        {prefixIcon && (
          <Icon iconSymbol={prefixIcon} size="sm" className="shrink-0 text-foreground-tertiary ml-1" />
        )}

        <div className="flex-1 flex flex-wrap gap-1.5 items-center overflow-hidden ml-0.5">
          {activeValues.length > 0 ? (
            activeValues.map((val) => (
              <Chip
                key={val}
                label={valueLabelMap.get(val) || val}
                color="primary"
                removable
                onRemove={() => removeValue(val)}
              />
            ))
          ) : (
            <span className="text-foreground-tertiary truncate py-0.5 ml-0.5">
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-auto pr-1">
          {activeValues.length > 0 && showClearButton && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                clearAll();
              }}
              className="flex items-center justify-center text-foreground-tertiary hover:text-foreground-default transition-colors p-0.5 rounded"
            >
              <Icon iconSymbol="close" size="sm" />
            </button>
          )}

          <span className="inline-flex items-center justify-center opacity-50 text-foreground-default pointer-events-none">
            <Icon iconSymbol={isOpen || isForcedOpen ? 'ChevronUp' : 'ChevronDown'} size="sm" />
          </span>
        </div>
      </div>

      {isForcedOpen && (
        <div className="mt-1 w-full relative z-50">
          <SelectDropdownSearchContext.Provider value={{ query: searchQuery, setQuery: setSearchQuery }}>
            <MultiSelectDropdownMenu menuMinWidth={menuMinWidth}>
              {enhancedChildren}
            </MultiSelectDropdownMenu>
          </SelectDropdownSearchContext.Provider>
        </div>
      )}

      {!isForcedOpen && isOpen && portalTarget
        ? createPortal(
            <SelectDropdownSearchContext.Provider value={{ query: searchQuery, setQuery: setSearchQuery }}>
              <div ref={panelRef} style={{ ...floatingStyle, zIndex, pointerEvents: 'none' }}>
                <MultiSelectDropdownMenu
                  menuMinWidth={menuMinWidth}
                  style={{
                    pointerEvents: 'auto',
                    ...(floatingStyle.minWidth != null ? { minWidth: floatingStyle.minWidth as number } : {})
                  }}
                >
                  {enhancedChildren}
                </MultiSelectDropdownMenu>
              </div>
            </SelectDropdownSearchContext.Provider>,
            portalTarget
          )
        : null}
    </MultiSelectContext.Provider>
  );
}

export function PvDefaultContent() {
  return (
    <>
      {/* pv-editable-zone-start */}
        {/* pv-block-start */}
        <SelectDropdownSearch data-pv-block="" placeholder="Search people..." />
        {/* pv-block-end */}
        {/* pv-block-start */}
        <MultiSelectDropdownItem data-pv-block="" value="alice" label="Alice Johnson" badgeLabel="Design" />
        {/* pv-block-end */}
        {/* pv-block-start */}
        <MultiSelectDropdownItem data-pv-block="" value="bob" label="Bob Smith" badgeLabel="Engineering" />
        {/* pv-block-end */}
        {/* pv-block-start */}
        <MultiSelectDropdownItem data-pv-block="" value="carol" label="Carol Davis" badgeLabel="Marketing" />
        {/* pv-block-end */}
      {/* pv-editable-zone-end */}
    </>
  );
}

export const pvConfig = {
  name: 'MultiSelectDropdown',
  componentId: 'MultiSelectDropdown',
  displayName: 'Multi-Select Dropdown',
  description: 'A select dropdown allowing multiple choices with visual chips.',
  importPath: '@/components/ui/multi-select-dropdown',
  defaultProps: 'placeholder="Select..." value="alice,bob" menuOpen="Auto (Default)"',
  defaultContent: <PvDefaultContent />,
  additionalImportsForDefaultContent: [
    { name: 'MultiSelectDropdownItem', path: '@/components/ui/multi-select-dropdown-item' },
    { name: 'SelectDropdownSearch', path: '@/components/ui/select-dropdown-search' },
  ],
  props: {
    placeholder: { type: 'string', exampleValue: 'Select...' },
    value: { type: 'string', exampleValue: 'alice,bob' },
    prefixIcon: { type: 'iconSearch', exampleValue: 'users' },
    placement: { type: 'select', options: ['bottom', 'top'] },
    align: { type: 'select', options: ['left', 'center', 'right'] },
    menuMinWidth: { type: 'select', options: ['auto', 'sm', 'md', 'lg', 'xl'] },
    error: { type: 'boolean' },
    disabled: { type: 'boolean' },
    showClearButton: { type: 'boolean' },
    menuOpen: { type: 'select', options: ['Auto (Default)', 'Open temporarily for visual editing'] },
  },
};
