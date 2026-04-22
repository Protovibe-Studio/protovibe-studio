import React from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';

export interface SuperLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  heading?: string;
  primaryText?: string;
  secondaryText?: string;
  prefixIcon?: string;
  suffixIcon?: string;
}

export function SuperLabel({
  heading,
  primaryText,
  secondaryText,
  prefixIcon,
  suffixIcon,
  className,
  ...props
}: SuperLabelProps) {
  return (
    <div
      className={cn('flex items-center gap-2', className)}
      {...props}
      data-pv-component-id="SuperLabel"
    >
      {prefixIcon && <Icon iconSymbol={prefixIcon} size="sm" className="text-foreground-default" />}
      <div className="flex flex-col gap-0.5 flex-1">
        {heading && (
          <span className="font-bold text-foreground-default text-base leading-tight">
            {heading}
          </span>
        )}
        {primaryText && (
          <span className="text-foreground-default font-normal text-base">{primaryText}</span>
        )}
        {secondaryText && (
          <span className="text-foreground-secondary text-sm">{secondaryText}</span>
        )}
      </div>
      {suffixIcon && <Icon iconSymbol={suffixIcon} size="sm" className="text-foreground-tertiary" />}
    </div>
  );
}

export function PvDefaultContent() {
  return <></>;
}

export const pvConfig = {
  name: 'SuperLabel',
  componentId: 'SuperLabel',
  displayName: 'Super Label',
  description: 'A rich label with optional heading, primary text, secondary text, and prefix/suffix icons.',
  importPath: '@/components/ui/super-label',
  defaultProps: 'primaryText="Label"',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  props: {
    heading: { type: 'string', exampleValue: 'Lorem ipsum' },
    primaryText: { type: 'string', exampleValue: 'Lorem ipsum' },
    secondaryText: { type: 'string', exampleValue: 'Lorem ipsum' },
    prefixIcon: { type: 'iconSearch', exampleValue: 'cog' },
    suffixIcon: { type: 'iconSearch', exampleValue: 'arrow-right' },
  },
};
