import React, { useContext, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { SelectDropdownSearchContext } from '@/components/ui/select-dropdown-context';

export interface SelectDropdownSearchProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  placeholder?: string;
}

export function SelectDropdownSearch({
  placeholder = 'Search...',
  className,
  ...props
}: SelectDropdownSearchProps) {
  const ctx = useContext(SelectDropdownSearchContext);
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus when rendered (dropdown just opened)
  useEffect(() => {
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      {...props}
      className={cn("flex items-center gap-2 border-b min-h-9 border-border-secondary pt-0.5 pb-1.5 px-3", className)}
      data-pv-component-id="SelectDropdownSearch"
      // Stop click from bubbling up to the SelectDropdown trigger
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Icon iconSymbol="Search" size="sm" className="shrink-0 text-foreground-tertiary" />
      <input
        ref={inputRef}
        type="text"
        value={ctx?.query ?? ''}
        onChange={(e) => ctx?.setQuery(e.target.value)}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-foreground-default placeholder:text-foreground-tertiary"
        // Prevent Escape from propagating so it doesn't close the dropdown before clearing
        onKeyDown={(e) => {
          if (e.key === 'Escape' && ctx?.query) {
            e.stopPropagation();
            ctx.setQuery('');
          }
        }}
      />
      {ctx?.query && (
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => { e.preventDefault(); ctx.setQuery(''); inputRef.current?.focus(); }}
          className="shrink-0 flex items-center cursor-pointer text-foreground-tertiary hover:text-foreground-default"
        >
          <Icon iconSymbol="close" size="sm" />
        </button>
      )}
    </div>
  );
}

export function PvDefaultContent() {
  return <></>;
}

export const pvConfig = {
  name: 'SelectDropdownSearch',
  componentId: 'SelectDropdownSearch',
  displayName: 'Select Dropdown Search',
  description: 'A search field that auto-filters items inside a SelectDropdown. Place it as the first child.',
  importPath: '@/components/ui/select-dropdown-search',
  defaultProps: 'placeholder="Search..."',
  defaultContent: <PvDefaultContent />,
  props: {
    placeholder: { type: 'string', exampleValue: 'Search...' },
  },
};
