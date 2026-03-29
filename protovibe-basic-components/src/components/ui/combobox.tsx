import React from 'react';
import { Icon } from './icon';
import { cn } from '@/lib/utils';

export interface ComboboxProps extends React.HTMLAttributes<HTMLDivElement> {
  placeholder?: string;
  open?: boolean;
  value?: string;
  children?: React.ReactNode;
}

export function Combobox({ placeholder = 'Search...', open = false, value, children, className, ...props }: ComboboxProps) {
  return (
    <div data-state={open ? 'open' : 'closed'} className={cn('relative w-full', className)} {...props}>
      <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-background-default text-left border border-border-default focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent sm:text-sm">
        <input
          className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-foreground-strong bg-transparent focus:outline-none"
          value={value}
          placeholder={placeholder}
          readOnly
        />
        <button
          className="absolute inset-y-0 right-0 flex items-center pr-2"
        >
          <Icon name="ChevronsUpDown" size="sm" className="text-foreground-tertiary" />
        </button>
      </div>
      
      <div
        data-state={open ? 'open' : 'closed'}
        className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-background-default py-1 text-base shadow-lg ring-1 ring-border-default focus:outline-none sm:text-sm data-[state=closed]:hidden z-10"
      >
        {children}
      </div>
    </div>
  );
}

export const comboboxPvConfig = {
  name: 'Combobox',
  displayName: 'Combobox',
  description: 'A combobox input',
  importPath: '@/components/ui/combobox',
  defaultProps: 'placeholder="Search items..." open={true}',
  defaultContent: '{/* pv-editable-zone-start */}\n{/* pv-editable-zone-end */}',
  props: {
    placeholder: { type: 'string', exampleValue: 'Lorem ipsum' },
    open: { type: 'boolean' },
    value: { type: 'string', exampleValue: 'Lorem ipsum' },
  },
};

export interface ComboboxItemProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  value?: string;
  selected?: boolean;
}

export function ComboboxItem({ label, value, selected, className, ...props }: ComboboxItemProps) {
  return (
    <div
      data-selected={selected}
      className={cn('relative cursor-default select-none py-2 pl-10 pr-4 text-foreground-strong hover:bg-primary hover:text-primary-foreground data-[selected=true]:bg-primary-subtle data-[selected=true]:text-primary', className)}
      {...props}
    >
      <span className="block truncate data-[selected=true]:font-medium">{label}</span>
      {selected && (
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary hover:text-primary-foreground">
          <Icon name="Check" size="sm" />
        </span>
      )}
    </div>
  );
}

export const comboboxItemPvConfig = {
  name: 'ComboboxItem',
  displayName: 'Combobox Item',
  description: 'An item within a combobox',
  importPath: '@/components/ui/combobox',
  defaultProps: 'label="Item 1" value="item1"',
  defaultContent: '',
  props: {
    label: { type: 'string', exampleValue: 'Lorem ipsum' },
    value: { type: 'string', exampleValue: 'Lorem ipsum' },
    selected: { type: 'boolean' },
  },
};
