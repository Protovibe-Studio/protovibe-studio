import React from 'react';
import { cn } from '@/lib/utils';

export interface RadioIconProps extends React.HTMLAttributes<HTMLDivElement> {
  state?: 'selected' | 'unselected' | 'disabled' | 'error' | 'inherit';
}

export function RadioIcon({ state = 'inherit', className, ...props }: RadioIconProps) {
  return (
    <div
      data-state={state}
      className={cn("rounded-full border-2 flex items-center justify-center transition-all shrink-0 data-[state=selected]:border-background-primary data-[state=unselected]:bg-background-default data-[state=disabled]:border-border-default data-[state=disabled]:bg-background-default data-[state=disabled]:opacity-50 data-[state=error]:border-background-destructive data-[state=error]:bg-background-default data-[state=inherit]:border-border-default data-[state=inherit]:bg-background-default data-[state=selected]:bg-background-elevated w-[18px] h-[18px] data-[state=unselected]:border-border-strong", className)}
      {...props}
      data-pv-component-id="RadioIcon"
    >
      <div
        data-state={state}
        className="w-2.5 h-2.5 rounded-full transition-opacity opacity-0 data-[state=selected]:opacity-100 bg-background-primary"
      />
    </div>
  );
}

export function PvDefaultContent() {
  return <></>;
}

export const pvConfig = {
  name: 'RadioIcon',
  componentId: 'RadioIcon',
  displayName: 'Radio Icon',
  description: 'A radio button indicator showing selected, unselected, disabled, or error states.',
  importPath: '@/components/ui/radio-icon',
  defaultProps: 'state="unselected"',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  props: {
    state: { type: 'select', options: ['selected', 'unselected', 'disabled', 'error', 'inherit'] },
  },
};
