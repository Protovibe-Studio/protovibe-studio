import React, { useState, useEffect, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';
import { SegmentedControlItem } from '@/components/ui/segmented-control-item';

export interface SegmentedControlContextValue {
  activeValue: string | undefined;
  onValueChange: (value: string) => void;
}

export const SegmentedControlContext = createContext<SegmentedControlContextValue | null>(null);

export function useSegmentedControl() {
  return useContext(SegmentedControlContext);
}

export interface SegmentedControlProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
}

export function SegmentedControl({
  value,
  onValueChange,
  children,
  className,
  ...props
}: SegmentedControlProps) {
  const [activeValue, setActiveValue] = useState<string | undefined>(value);

  useEffect(() => {
    setActiveValue(value);
  }, [value]);

  const handleValueChange = (newValue: string) => {
    setActiveValue(newValue);
    onValueChange?.(newValue);
  };

  return (
    <SegmentedControlContext.Provider value={{ activeValue, onValueChange: handleValueChange }}>
      <div
        data-value={activeValue}
        className={cn("inline-flex p-1 rounded bg-background-sunken", className)}
        {...props}
        data-pv-component-id="SegmentedControl"
      >
        {children}
      </div>
    </SegmentedControlContext.Provider>
  );
}

export function PvDefaultContent() {
  return (
    <>
      {/* pv-editable-zone-start */}
        {/* pv-block-start */}
        <SegmentedControlItem data-pv-block="" label="Option 1" value="opt1" />
        {/* pv-block-end */}
        {/* pv-block-start */}
        <SegmentedControlItem data-pv-block="" label="Option 2" value="opt2" />
        {/* pv-block-end */}
        {/* pv-block-start */}
        <SegmentedControlItem data-pv-block="" label="Option 3" value="opt3" />
        {/* pv-block-end */}
      {/* pv-editable-zone-end */}
    </>
  );
}

export const pvConfig = {
  name: 'SegmentedControl',
  componentId: 'SegmentedControl',
  displayName: 'Segmented Control',
  description: 'A segmented control container that manages which item is active.',
  importPath: '@/components/ui/segmented-control',
  defaultProps: 'value="opt1"',
  defaultContent: <PvDefaultContent />,
  additionalImportsForDefaultContent: [
    { name: 'SegmentedControlItem', path: '@/components/ui/segmented-control-item' },
  ],
  props: {
    value: { type: 'string', exampleValue: 'Lorem ipsum' },
  },
};
