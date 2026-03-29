import React from 'react';
import * as LucideIcons from 'lucide-react';
import { Icon } from './icon';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  variant?: 'solid' | 'outline' | 'ghost';
  color?: 'primary' | 'neutral' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  iconOnly?: boolean;
  leftIcon?: string;
  rightIcon?: string;
}

export function Button({
  label,
  variant = 'solid',
  color = 'primary',
  size = 'md',
  iconOnly,
  leftIcon,
  rightIcon,
  disabled,
  className,
  ...props
}: ButtonProps) {
  return (
    <button variant="outline"
      data-variant={variant}
      data-color={color}
      data-size={size}
      data-icon-only={iconOnly || undefined}
      data-disabled={disabled}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none data-[disabled=true]:opacity-50 data-[size=sm]:h-8 data-[size=sm]:px-3 data-[size=sm]:text-xs data-[size=md]:h-10 data-[size=md]:px-4 data-[size=md]:text-sm data-[size=lg]:h-12 data-[size=lg]:px-8 data-[size=lg]:text-base data-[icon-only=true]:data-[size=sm]:w-8 data-[icon-only=true]:data-[size=sm]:px-0 data-[icon-only=true]:data-[size=md]:w-10 data-[icon-only=true]:data-[size=md]:px-0 data-[icon-only=true]:data-[size=lg]:w-12 data-[icon-only=true]:data-[size=lg]:px-0 data-[variant=solid]:data-[color=primary]:bg-primary data-[variant=solid]:data-[color=primary]:text-primary-foreground hover:data-[variant=solid]:data-[color=primary]:bg-primary-hover data-[variant=solid]:data-[color=neutral]:bg-background-secondary data-[variant=solid]:data-[color=neutral]:text-foreground-default hover:data-[variant=solid]:data-[color=neutral]:bg-background-tertiary data-[variant=solid]:data-[color=danger]:bg-destructive data-[variant=solid]:data-[color=danger]:text-destructive-foreground hover:data-[variant=solid]:data-[color=danger]:bg-destructive-hover data-[variant=outline]:data-[color=primary]:border data-[variant=outline]:data-[color=primary]:border-primary data-[variant=outline]:data-[color=primary]:text-primary hover:data-[variant=outline]:data-[color=primary]:bg-background-primary-subtle data-[variant=outline]:data-[color=neutral]:border data-[variant=outline]:data-[color=neutral]:border-border-default data-[variant=outline]:data-[color=neutral]:text-foreground-default hover:data-[variant=outline]:data-[color=neutral]:bg-secondary data-[variant=outline]:data-[color=danger]:border data-[variant=outline]:data-[color=danger]:border-destructive data-[variant=outline]:data-[color=danger]:text-destructive hover:data-[variant=outline]:data-[color=danger]:bg-background-destructive-subtle data-[variant=ghost]:data-[color=primary]:text-primary hover:data-[variant=ghost]:data-[color=primary]:bg-primary-subtle data-[variant=ghost]:data-[color=neutral]:text-foreground-default hover:data-[variant=ghost]:data-[color=neutral]:bg-secondary data-[variant=ghost]:data-[color=danger]:text-destructive hover:data-[variant=ghost]:data-[color=danger]:bg-background-destructive-subtle",
        className
      )}
      {...props}
      data-pv-component-id="Button"
    >
      {leftIcon && <Icon name={leftIcon} size={size === 'sm' ? 'sm' : 'md'} />}
      {label && !iconOnly && <span>{label}</span>}
      {rightIcon && <Icon name={rightIcon} size={size === 'sm' ? 'sm' : 'md'} />}
    </button>
  );
}

export const pvConfig = {
  name: 'Button',
  componentId: 'Button',
  displayName: 'Button',
  description: 'A clickable button',
  importPath: '@/components/ui/button',
  defaultProps: 'label="Button" variant="solid" color="primary" size="md"',
  defaultContent: '',
  props: {
    label: { type: 'string', exampleValue: 'Lorem ipsum' },
    variant: { type: 'select', options: ['solid', 'outline', 'ghost'] },
    color: { type: 'select', options: ['primary', 'neutral', 'danger'] },
    size: { type: 'select', options: ['sm', 'md', 'lg'] },
    iconOnly: { type: 'boolean' },
    leftIcon: { type: 'select', options: Object.keys(LucideIcons) },
    rightIcon: { type: 'select', options: Object.keys(LucideIcons) },
    disabled: { type: 'boolean' },
  },
  invalidCombinations: [
    // iconOnly with no icon to show is meaningless
    (props: Record<string, any>) => !!props.iconOnly && !props.leftIcon && !props.rightIcon,
    // non-iconOnly button with no label is invisible
    (props: Record<string, any>) => !props.iconOnly && !props.label,
    // iconOnly with both icons is visually ambiguous — pick one side
    (props: Record<string, any>) => !!props.iconOnly && !!props.leftIcon && !!props.rightIcon,
  ],
};
