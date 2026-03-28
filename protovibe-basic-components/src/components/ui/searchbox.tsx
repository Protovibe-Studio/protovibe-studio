import React from 'react';
import { Icon } from './icon';

export interface SearchboxProps extends React.HTMLAttributes<HTMLDivElement> {
  error?: boolean;
  disabled?: boolean;
  value?: string;
  placeholder?: string;
}

export function Searchbox({ error, disabled, value, placeholder, ...props }: SearchboxProps) {
  return (
    <div
      data-error={error}
      data-disabled={disabled}
      className="relative flex items-center w-full"
      {...props}
      data-pv-component-id="Searchbox"
    >
      <div className="absolute left-3 text-foreground-tertiary">
        <Icon name="Search" size="sm" />
      </div>
      <input
        data-error={error}
        data-disabled={disabled}
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        className="flex h-10 w-full rounded-md border border-border-default bg-background-default pl-10 pr-10 py-2 text-sm text-foreground-default placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed data-[disabled=true]:opacity-50 data-[error=true]:border-destructive data-[error=true]:focus:ring-destructive"
        readOnly
      />
      {value && (
        <button
          type="button"
          className="absolute right-3 text-foreground-tertiary hover:text-foreground-secondary"
        >
          <Icon name="X" size="sm" />
        </button>
      )}
    </div>
  );
}

export const pvConfig = {
  name: 'Searchbox',
  componentId: 'Searchbox',
  displayName: 'Searchbox',
  description: 'A search input field',
  importPath: '@/components/ui/searchbox',
  defaultProps: 'placeholder="Search..."',
  defaultContent: '',
  props: {
    placeholder: { type: 'string', exampleValue: 'Lorem ipsum' },
    value: { type: 'string', exampleValue: 'Lorem ipsum' },
    disabled: { type: 'boolean' },
    error: { type: 'boolean' },
  },
};
