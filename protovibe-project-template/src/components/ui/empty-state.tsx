import React from 'react';
import * as LucideIcons from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: string;
  iconSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  heading?: string;
  secondaryText?: string;
  learnMoreLabel?: string;
  learnMoreHref?: string;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  children?: React.ReactNode;
}

export function EmptyState({
  icon,
  iconSize = 'xl',
  heading,
  secondaryText,
  learnMoreLabel,
  learnMoreHref,
  primaryActionLabel,
  secondaryActionLabel,
  children,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-icon-size={iconSize}
      className={cn(
        "flex flex-col items-center justify-center gap-4 min-h-48 py-12 px-6 text-center",
        className
      )}
      {...props}
      data-pv-component-id="EmptyState"
    >
      {icon && (
        <div className="text-foreground-tertiary">
          <Icon name={icon} size={iconSize} />
        </div>
      )}

      {(heading || secondaryText) && (
        <div className="flex flex-col items-center gap-1.5 max-w-sm">
          {heading && (
            <p className="text-base font-semibold text-foreground-default">
              {heading}
            </p>
          )}
          {secondaryText && (
            <p className="text-sm text-foreground-secondary">
              {secondaryText}
              {learnMoreLabel && (
                <>{' '}<a
                  href={learnMoreHref ?? '#'}
                  className="text-foreground-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
                >{learnMoreLabel}</a></>
              )}
            </p>
          )}
        </div>
      )}

      {/* pv-editable-zone-start */}
      {children}
      {/* pv-editable-zone-end */}

      {(primaryActionLabel || secondaryActionLabel) && (
        <div className="grid grid-cols-1 w-fit mx-auto gap-2">
          {primaryActionLabel && (
            <Button
              label={primaryActionLabel}
              variant="solid"
              color="primary"
              size="sm"
              className="w-full"
            />
          )}
          {secondaryActionLabel && (
            <Button
              label={secondaryActionLabel}
              variant="outline"
              color="neutral"
              size="sm"
              className="w-full"
            />
          )}
        </div>
      )}
    </div>
  );
}

export function PvDefaultContent() {
  return <></>;
}

export const pvConfig = {
  name: 'EmptyState',
  componentId: 'EmptyState',
  displayName: 'Empty State',
  description: 'A centered empty state with optional icon, heading, description and action buttons.',
  importPath: '@/components/ui/empty-state',
  defaultProps: 'icon="Inbox" iconSize="xl" heading="Nothing here yet" secondaryText="Get started by creating your first item."',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  props: {
    icon: { type: 'select', options: Object.keys(LucideIcons) },
    iconSize: { type: 'select', options: ['sm', 'md', 'lg', 'xl', '2xl'] },
    heading: { type: 'string', exampleValue: 'Nothing here yet' },
    secondaryText: { type: 'string', exampleValue: 'Get started by creating your first item.' },
    learnMoreLabel: { type: 'string', exampleValue: 'Learn more' },
    learnMoreHref: { type: 'string', exampleValue: '#' },
    primaryActionLabel: { type: 'string', exampleValue: 'Get started' },
    secondaryActionLabel: { type: 'string', exampleValue: 'Learn more' },
  },
  invalidCombinations: [
    // only md and xl icon sizes make sense for empty states
    (props: Record<string, any>) => !!props.iconSize && !['md', 'xl'].includes(props.iconSize),
    // empty state without description text looks incomplete
    (props: Record<string, any>) => !props.secondaryText,
    // button labels must never be empty strings
    (props: Record<string, any>) => props.primaryActionLabel === '',
    (props: Record<string, any>) => props.secondaryActionLabel === '',
  ],
};
