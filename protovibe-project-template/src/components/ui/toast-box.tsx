import React from 'react';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const defaultIcons: Record<string, string> = {
  success: 'CircleCheck',
  destructive: 'XCircle',
  warning: 'AlertTriangle',
  neutral: 'Info',
};

export interface ToastBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'destructive' | 'neutral' | 'warning';
  heading?: string;
  secondaryText?: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
  showCloseButton?: boolean;
  onClose?: () => void;
}

export function ToastBox({
  variant = 'neutral',
  heading,
  secondaryText,
  icon,
  actionLabel,
  onAction,
  showCloseButton = true,
  onClose,
  className,
  ...props
}: ToastBoxProps) {
  const resolvedIcon = icon || defaultIcons[variant] || 'Info';

  return (
    <div
      data-variant={variant}
      className={cn(
        "flex items-start gap-3 rounded-lg border-l-4 p-4 shadow-lg min-w-[320px] max-w-[480px] data-[variant=success]:bg-background-success-subtle data-[variant=success]:border-l-success data-[variant=destructive]:bg-background-destructive-subtle data-[variant=destructive]:border-l-destructive data-[variant=warning]:bg-background-warning-subtle data-[variant=warning]:border-l-warning data-[variant=neutral]:bg-background-secondary data-[variant=neutral]:border-l-border-default",
        className
      )}
      {...props}
      data-pv-component-id="ToastBox"
    >
      {/* Icon */}
      <div
        data-variant={variant}
        className="mt-0.5 shrink-0 data-[variant=success]:text-foreground-success data-[variant=destructive]:text-foreground-destructive data-[variant=warning]:text-foreground-warning data-[variant=neutral]:text-foreground-secondary"
      >
        <Icon iconSymbol={resolvedIcon} size="md" />
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0">
        {heading && (
          <p className="text-sm font-semibold text-foreground-default">
            {heading}
          </p>
        )}
        {secondaryText && (
          <p className="mt-0.5 text-sm text-foreground-secondary">{secondaryText}</p>
        )}
      </div>

      {/* Action button */}
      {actionLabel && (
        <Button
          label={actionLabel}
          variant="outline"
          color="neutral"
          size="sm"
          className="shrink-0 self-center"
          onClick={onAction}
        />
      )}

      {/* Close button */}
      {showCloseButton && (
        <Button
          variant="ghost"
          color="neutral"
          size="sm"
          iconOnly
          leftIcon="close"
          className="shrink-0 self-start -mt-0.5 -mr-1"
          aria-label="Close toast"
          onClick={onClose}
        />
      )}
    </div>
  );
}

export function PvDefaultContent() {
  return <></>;
}

export const pvConfig = {
  name: 'ToastBox',
  componentId: 'ToastBox',
  displayName: 'Toast Box',
  description: 'A toast notification box with icon, heading, secondary text, action button and close button.',
  importPath: '@/components/ui/toast-box',
  defaultProps: 'variant="success" heading="Success!" secondaryText="Your changes have been saved."',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  props: {
    variant: { type: 'select', options: ['success', 'destructive', 'neutral', 'warning'] },
    heading: { type: 'string', exampleValue: 'Changes saved' },
    secondaryText: { type: 'string', exampleValue: 'Your changes have been saved successfully.' },
    icon: { type: 'iconSearch', exampleValue: 'cog' },
    actionLabel: { type: 'string', exampleValue: 'Undo' },
    showCloseButton: { type: 'boolean' },
  },
  invalidCombinations: [
    // heading is the primary identity of a toast — must always be present
    (props: Record<string, any>) => !props.heading,
    // secondary text without a heading has no context
    (props: Record<string, any>) => !!props.secondaryText && !props.heading,
  ],
};
