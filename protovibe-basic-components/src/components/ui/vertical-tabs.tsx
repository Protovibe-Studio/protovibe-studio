import React, { useState, useEffect, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

export interface VerticalTabsContextValue {
  activeValue: string | undefined;
  onValueChange: (value: string) => void;
}

export const VerticalTabsContext = createContext<VerticalTabsContextValue | null>(null);

export function useVerticalTabs() {
  return useContext(VerticalTabsContext);
}

export interface VerticalTabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
}

export function VerticalTabs({
  value,
  onValueChange,
  children,
  className,
  ...props
}: VerticalTabsProps) {
  const [activeValue, setActiveValue] = useState<string | undefined>(value);

  useEffect(() => {
    setActiveValue(value);
  }, [value]);

  const handleValueChange = (newValue: string) => {
    setActiveValue(newValue);
    onValueChange?.(newValue);
  };

  return (
    <VerticalTabsContext.Provider value={{ activeValue, onValueChange: handleValueChange }}>
      <div
        data-value={activeValue}
        className={cn('flex flex-col gap-0.5', className)}
        {...props}
        data-pv-component-id="VerticalTabs"
      >
        {children}
      </div>
    </VerticalTabsContext.Provider>
  );
}

export const pvConfig = {
  name: 'VerticalTabs',
  componentId: 'VerticalTabs',
  displayName: 'Vertical Tabs',
  description: 'A vertical tab bar container that manages which tab is active.',
  importPath: '@/components/ui/vertical-tabs',
  snippet: 'value="tab1"',
  defaultContent: '{/* pv-editable-zone-start */}\n{/* pv-editable-zone-end */}',
  props: {
    value: { type: 'string', exampleValue: 'Lorem ipsum' },
  },
};
