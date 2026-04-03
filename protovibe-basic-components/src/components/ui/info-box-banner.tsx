import React, { useState } from 'react';
import * as LucideIcons from 'lucide-react';
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
      className={cn("relative flex gap-3 p-4 data-[color=primary]:bg-background-primary-subtle data-[color=destructive]:bg-background-destructive-subtle data-[color=success]:bg-background-success-subtle data-[color=warning]:bg-background-warning-subtle data-[color=info]:bg-background-info-subtle data-[color=neutral]:bg-background-secondary rounded", className)}
      {...props}
      data-pv-component-id="InfoBoxBanner"
    >
      {/* Left icon */}
      <div className="mt-0.5 shrink-0 data-[color=primary]:text-foreground-primary data-[color=destructive]:text-foreground-destructive data-[color=success]:text-foreground-success data-[color=warning]:text-foreground-warning data-[color=info]:text-foreground-info data-[color=neutral]:text-foreground-secondary" data-color={color}>
        <Icon name={icon} size="md" />
      </div>

      {/* Middle: heading + secondary text + optional zone + (bottom) action buttons */}
      <div className="flex-1 min-w-0">
        {heading && (
          <p className="text-sm font-semibold data-[color=primary]:text-foreground-primary data-[color=destructive]:text-foreground-destructive data-[color=success]:text-foreground-success data-[color=warning]:text-foreground-warning data-[color=info]:text-foreground-info data-[color=neutral]:text-foreground-default" data-color={color}>
            {heading}
          </p>
        )}
        {secondaryText && (
          <p className="mt-0.5 text-sm text-foreground-secondary">
            {secondaryText}
          </p>
        )}

        {children}

        {actionsLayout === 'bottom' && (primaryActionLabel || secondaryActionLabel) && (
          <div className="mt-3 flex gap-2 flex-wrap">
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
        <div className="shrink-0 self-center flex gap-2">
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
          leftIcon="X"
          className="shrink-0 self-start -mt-0.5 -mr-1"
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
    icon: { type: 'select', options: Object.keys(LucideIcons) },
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
