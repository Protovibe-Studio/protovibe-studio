import React from 'react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export interface CalloutProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'agent';
  icon?: string;
  title?: string;
  children?: React.ReactNode;
}

export function Callout({
  variant = 'info',
  icon,
  title,
  children,
  className,
  ...props
}: CalloutProps) {
  const resolvedIcon = icon ?? (variant === 'agent' ? 'sparkles' : 'information');
  const resolvedTitle =
    title ?? (variant === 'agent' ? 'Only in code — do it with your AI agent' : undefined);

  return (
    <div
      {...props}
      data-variant={variant}
      className={cn(
        'flex items-start gap-3 rounded p-5 border data-[variant=info]:border-border-default data-[variant=info]:bg-background-secondary data-[variant=agent]:border-border-primary data-[variant=agent]:bg-background-sunken',
        className
      )}
      data-pv-component-id="Callout"
    >
      <div
        data-variant={variant}
        className="shrink-0 p-0.5 data-[variant=info]:text-foreground-primary data-[variant=agent]:text-foreground-primary"
      >
        <Icon iconSymbol={resolvedIcon} size="md" />
      </div>
      <div className="min-w-0 flex-1 flex flex-col gap-2">
        {resolvedTitle && (
          <div className="font-semibold text-[15px] text-foreground-strong">{resolvedTitle}</div>
        )}
        <div className="text-foreground-secondary leading-[1.7]">{children}</div>
      </div>
    </div>
  );
}

export function PvDefaultContent() {
  return (
    <>
      {/* pv-editable-zone-start */}
      {/* pv-editable-zone-end */}
    </>
  );
}

export const pvConfig = {
  name: 'Callout',
  componentId: 'Callout',
  displayName: 'Callout',
  description: 'A boxed callout with icon and title for tips, info notes, or AI-agent prompts.',
  importPath: '@/components/ui/callout',
  defaultProps: `variant="info" icon="information" title="Heads up"`,
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  props: {
    variant: { type: 'select', options: ['info', 'agent'] },
    icon: { type: 'iconSearch', exampleValue: 'information' },
    title: { type: 'string', exampleValue: 'Heads up' },
  },
};
