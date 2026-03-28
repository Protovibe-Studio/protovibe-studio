import React, { useState, useEffect, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

export interface TabsContextValue {
  activeValue: string | undefined;
  onValueChange: (value: string) => void;
}

export const TabsContext = createContext<TabsContextValue | null>(null);

export function useTabs() {
  return useContext(TabsContext);
}

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
}

export function Tabs({
  value,
  onValueChange,
  children,
  className,
  ...props
}: TabsProps) {
  const [activeValue, setActiveValue] = useState<string | undefined>(value);

  useEffect(() => {
    setActiveValue(value);
  }, [value]);

  const handleValueChange = (newValue: string) => {
    setActiveValue(newValue);
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ activeValue, onValueChange: handleValueChange }}>
      <div
        data-value={activeValue}
        className={cn('flex space-x-1 border-b border-border-default', className)}
        {...props}
        data-pv-component-id="Tabs"
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export const pvConfig = {
  name: 'Tabs',
  componentId: 'Tabs',
  displayName: 'Tabs',
  description: 'A tab bar container that manages which tab is active.',
  importPath: '@/components/ui/tabs',
  snippet: 'value="tab1"',
  defaultContent: `
{/* pv-editable-zone-start */}
  {/* pv-block-start */}
  <TabTrigger data-pv-block="" label="Tab 1" value="tab1" />
  {/* pv-block-end */}
  {/* pv-block-start */}
  <TabTrigger data-pv-block="" label="Tab 2" value="tab2" />
  {/* pv-block-end */}
  {/* pv-block-start */}
  <TabTrigger data-pv-block="" label="Tab 3" value="tab3" />
  {/* pv-block-end */}
{/* pv-editable-zone-end */}`,
  additionalImports: [
    { name: 'TabTrigger', path: '@/components/ui/tab-trigger' },
  ],
  props: {
    value: { type: 'string', exampleValue: 'Lorem ipsum' },
  },
};
