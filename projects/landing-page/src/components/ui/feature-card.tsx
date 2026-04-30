import React from 'react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export interface FeatureCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: string;
  heading?: string;
  description?: string;
}

export function FeatureCard({ icon = 'mdi:star', heading = 'Feature', description = 'Description', className, ...props }: FeatureCardProps) {
  return (
    <div
      className={cn('shrink-0 bg-background-secondary rounded-[14px] px-[28px] py-[32px] flex flex-col transition-all duration-200 hover:bg-background-tertiary hover:-translate-y-[2px] h-[300px] w-[240px]', className)}
      {...props}
      data-pv-component-id="FeatureCard"
    >
      <Icon iconSymbol={icon} size="lg" className="mb-5 text-foreground-primary" />
      <div className="flex flex-col gap-0 mt-auto">
        <h3 className="font-secondary font-bold leading-[1.15] tracking-[-0.02em] text-foreground-strong m-[0_0_12px] text-balance text-xl max-w-[70%]">
          {heading}
        </h3>
        <p className="text-[14.5px] text-foreground-secondary leading-[1.55] text-pretty">
          {description}
        </p>
      </div>
    </div>
  );
}

export function PvDefaultContent() {
  return <></>;
}

export const pvConfig = {
  name: 'FeatureCard',
  componentId: 'FeatureCard',
  displayName: 'Feature Card',
  description: 'A card with an icon, heading, and description for showcasing features.',
  importPath: '@/components/ui/feature-card',
  defaultProps: 'icon="mdi:star" heading="Feature title" description="Brief description of the feature."',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  props: {
    icon: { type: 'iconSearch', exampleValue: 'mdi:star' },
    heading: { type: 'string', exampleValue: 'Feature title' },
    description: { type: 'string', exampleValue: 'Brief description of the feature.' },
  },
};
