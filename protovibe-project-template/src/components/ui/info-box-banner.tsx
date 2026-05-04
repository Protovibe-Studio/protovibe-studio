import React, { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface InfoBoxBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: string;
  heading?: string;
  secondaryText?: string;
  color?: 'primary' | 'destructive' | 'success' | 'warning' | 'info' | 'neutral';
  showCloseButton?: boolean;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  actionsLayout?: 'bottom' | 'right';
  children?: React.ReactNode;
}

export function InfoBoxBanner({
  icon = 'Info',
  heading,
  secondaryText,
  color = 'info',
  showCloseButton = true,
  primaryActionLabel,
  secondaryActionLabel,
  actionsLayout = 'bottom',
  children,
  className,
  ...props
}: InfoBoxBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      data-color={color}
      data-actions-layout={actionsLayout}
      className={cn("relative flex data-[color=primary]:bg-background-primary-subtle data-[color=destructive]:bg-background-destructive-subtle data-[color=success]:bg-background-success-subtle data-[color=warning]:bg-background-warning-subtle data-[color=info]:bg-background-info-subtle data-[color=neutral]:bg-background-secondary rounded items-start p-3 gap-2 data-[color=info]:border-border-info/20 data-[color=warning]:border-border-warning/15 data-[color=success]:border-border-success/20 data-[color=primary]:border-border-primary/20 data-[color=neutral]:border-border-default data-[color=destructive]:border-border-destructive/10 border-border-strong/10 border-0", className)}
      {...props}
      data-pv-component-id="InfoBoxBanner"
    >
      {/* Left icon */}
      <div className="shrink-0 data-[color=primary]:text-foreground-primary data-[color=destructive]:text-foreground-destructive data-[color=success]:text-foreground-success data-[color=warning]:text-foreground-warning data-[color=info]:text-foreground-info data-[color=neutral]:text-foreground-secondary p-0.5" data-color={color}>
        <Icon iconSymbol={icon} size="md" />
      </div>

      {/* Middle: heading + secondary text + optional zone + (bottom) action buttons */}
      <div className="min-w-0 flex-1 pr-3">
        {heading && (
          <p className="font-semibold data-[color=primary]:text-foreground-primary data-[color=destructive]:text-foreground-destructive data-[color=success]:text-foreground-success data-[color=warning]:text-foreground-warning data-[color=info]:text-foreground-info data-[color=neutral]:text-foreground-default text-base pt-0.5" data-color={color}>
            {heading}
          </p>
        )}
        {secondaryText && (
          <p className="py-1 text-foreground-default text-base">
            {secondaryText}
          </p>
        )}

        {children}

        {actionsLayout === 'bottom' && (primaryActionLabel || secondaryActionLabel) && (
          <div className="flex gap-2 flex-wrap py-1">
            {primaryActionLabel && (
              <Button
                label={primaryActionLabel}
                variant="solid"
                color={color === 'destructive' ? 'danger' : 'primary'}
                size="sm"
              />
            )}
            {secondaryActionLabel && (
              <Button
                label={secondaryActionLabel}
                variant="ghost"
                color={color === 'destructive' ? 'danger' : color === 'neutral' ? 'neutral' : 'primary'}
                size="sm"
              />
            )}
          </div>
        )}
      </div>

      {/* Right action buttons (when actionsLayout === 'right') */}
      {actionsLayout === 'right' && (primaryActionLabel || secondaryActionLabel) && (
        <div className="shrink-0 self-center flex gap-2 px-2">
          {primaryActionLabel && (
            <Button
              label={primaryActionLabel}
              variant="solid"
              color={color === 'destructive' ? 'danger' : 'primary'}
              size="sm"
            />
          )}
          {secondaryActionLabel && (
            <Button
              label={secondaryActionLabel}
              variant="ghost"
              color={color === 'destructive' ? 'danger' : color === 'neutral' ? 'neutral' : 'primary'}
              size="sm"
            />
          )}
        </div>
      )}

      {/* Top-right close button */}
      {showCloseButton && (
        <Button
          variant="ghost"
          color="neutral"
          size="sm"
          iconOnly
          leftIcon="close"
          className="shrink-0 self-start -mt-2 -mr-2"
          aria-label="Close"
          onClick={() => setDismissed(true)}
        />
      )}
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
  name: 'InfoBoxBanner',
  componentId: 'InfoBoxBanner',
  displayName: 'Info Box Banner',
  description: 'An alert banner with icon, heading, text, action buttons and a close button.',
  importPath: '@/components/ui/info-box-banner',
  defaultProps: 'icon="Info" heading="Heads up" secondaryText="Something needs your attention." color="info" showCloseButton={true}',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  props: {
    icon: { type: 'iconSearch', exampleValue: 'cog' },
    heading: { type: 'string', exampleValue: 'Lorem ipsum' },
    secondaryText: { type: 'string', exampleValue: 'This is some example secondary text for infobox. Good luck!' },
    color: { type: 'select', options: ['primary', 'destructive', 'success', 'warning', 'info', 'neutral'] },
    showCloseButton: { type: 'boolean' },
    primaryActionLabel: { type: 'string', exampleValue: 'Lorem ipsum' },
    secondaryActionLabel: { type: 'string', exampleValue: 'Lorem ipsum' },
    actionsLayout: { type: 'select', options: ['bottom', 'right'] },
  },
  invalidCombinations: [
    // infobox without description text looks incomplete
    (props: Record<string, any>) => !props.secondaryText,
  ],
};
