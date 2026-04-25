import React, { useState, useEffect, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';
import { RadioItem } from '@/components/ui/radio-item';

export interface RadioGroupContextValue {
  activeValue: string | undefined;
  onValueChange: (value: string) => void;
}

export const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export function useRadioGroup() {
  return useContext(RadioGroupContext);
}

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
  orientation?: 'vertical' | 'horizontal';
  children?: React.ReactNode;
}

export function RadioGroup({
  value,
  onValueChange,
  orientation = 'vertical',
  children,
  className,
  ...props
}: RadioGroupProps) {
  const [activeValue, setActiveValue] = useState<string | undefined>(value);

  useEffect(() => {
    setActiveValue(value);
  }, [value]);

  const handleValueChange = (newValue: string) => {
    setActiveValue(newValue);
    onValueChange?.(newValue);
  };

  return (
    <RadioGroupContext.Provider value={{ activeValue, onValueChange: handleValueChange }}>
      <div
        role="radiogroup"
        data-orientation={orientation}
        data-value={activeValue}
        className={cn(
          'flex gap-2',
          'data-[orientation=vertical]:flex-col',
          'data-[orientation=horizontal]:flex-row data-[orientation=horizontal]:flex-wrap',
          className
        )}
        {...props}
        data-pv-component-id="RadioGroup"
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

export function PvDefaultContent() {
  return (
    <>
      {/* pv-editable-zone-start */}
        {/* pv-block-start */}
        <RadioItem data-pv-block="" value="opt1" primaryText="Option One" secondaryText="Description for option one" />
        {/* pv-block-end */}
        {/* pv-block-start */}
        <RadioItem data-pv-block="" value="opt2" primaryText="Option Two" secondaryText="Description for option two" />
        {/* pv-block-end */}
        {/* pv-block-start */}
        <RadioItem data-pv-block="" value="opt3" primaryText="Option Three" secondaryText="Third option" />
        {/* pv-block-end */}
      {/* pv-editable-zone-end */}
    </>
  );
}

export const pvConfig = {
  name: 'RadioGroup',
  componentId: 'RadioGroup',
  displayName: 'Radio Group',
  description: 'A container for radio items with vertical or horizontal orientation.',
  importPath: '@/components/ui/radio-group',
  defaultProps: 'orientation="vertical" value="opt1"',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  additionalImportsForDefaultContent: [
    { name: 'RadioItem', path: '@/components/ui/radio-item' },
  ],
  props: {
    value: { type: 'string', exampleValue: 'Lorem ipsum' },
    orientation: { type: 'select', options: ['vertical', 'horizontal'] },
  },
};

// =============================================================================
// AI USAGE GUIDE — RadioGroup + RadioItem
// =============================================================================
//
// RadioGroup manages which RadioItem is selected via React Context. RadioItem
// consumes that context automatically — no manual selected={true} wiring needed
// when items are inside a RadioGroup.
//
// IMPORTANT RULES:
//   • Always give every <RadioItem> a unique `value` prop.
//   • Give <RadioGroup> an initial `value` matching the item that should start
//     selected. Omit `value` entirely to start with nothing selected.
//   • Do NOT pass `selected` to RadioItems inside a RadioGroup — it is ignored
//     when context is present. Only use `selected` on standalone RadioItems
//     that have no RadioGroup parent (e.g. in Protovibe static previews).
//   • `disabled` on a RadioItem still works inside a RadioGroup — a disabled
//     item cannot be clicked and will not trigger onValueChange.
//
// -----------------------------------------------------------------------------
// MODE 1 — Self-managed (no store, clicking just works)
// -----------------------------------------------------------------------------
//
//   <RadioGroup value="opt1">
//     <RadioItem value="opt1" primaryText="Option One" />
//     <RadioItem value="opt2" primaryText="Option Two" />
//     <RadioItem value="opt3" primaryText="Option Three" disabled />
//   </RadioGroup>
//
//   The group holds its own internal state. Clicking any enabled item selects
//   it immediately. No external code or callbacks required.
//
// -----------------------------------------------------------------------------
// MODE 2 — Connected to a store (controlled + reactive)
// -----------------------------------------------------------------------------
//
//   <RadioGroup
//     value={store.plan}
//     onValueChange={(val) => store.dispatch({ type: 'SET_PLAN', value: val })}
//   >
//     <RadioItem value="free"  primaryText="Free"  secondaryText="$0/month" />
//     <RadioItem value="pro"   primaryText="Pro"   secondaryText="$12/month" />
//     <RadioItem value="team"  primaryText="Team"  secondaryText="$30/month" />
//   </RadioGroup>
//
//   `onValueChange` fires with the new value string every time the user clicks
//   an item. Pass that value to your store/state manager. When the store later
//   updates `value`, the group re-syncs via useEffect — making this fully
//   bidirectional (UI → store and store → UI).
//
//   Works with any state solution: useState, Zustand, Redux, Jotai, XState, etc.
//   Example with useState:
//
//   const [plan, setPlan] = useState('free');
//   <RadioGroup value={plan} onValueChange={setPlan}>...</RadioGroup>
//
// -----------------------------------------------------------------------------
// MODE 3 — Standalone RadioItem (no RadioGroup, Protovibe static preview)
// -----------------------------------------------------------------------------
//
//   <RadioItem value="opt1" selected={true}  primaryText="Option One" />
//   <RadioItem value="opt2" selected={false} primaryText="Option Two" />
//
//   When RadioItem is rendered without a RadioGroup parent (e.g. dropped as a
//   standalone block in Protovibe), it falls back to the explicit `selected`
//   boolean prop. Use this only for static demos or isolated previews.
//
// -----------------------------------------------------------------------------
// ORIENTATION
// -----------------------------------------------------------------------------
//
//   <RadioGroup orientation="horizontal" value="s">
//     <RadioItem value="s" primaryText="Small" />
//     <RadioItem value="m" primaryText="Medium" />
//     <RadioItem value="l" primaryText="Large" />
//   </RadioGroup>
//
//   "vertical" (default) stacks items in a column.
//   "horizontal" wraps items in a row.
//
// =============================================================================
