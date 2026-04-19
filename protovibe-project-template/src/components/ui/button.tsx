import React from 'react';
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
    <button
      data-variant={variant}
      data-color={color}
      data-size={size}
      data-icon-only={iconOnly || undefined}
      data-disabled={disabled}
      disabled={disabled}
      className={cn("inline-flex items-center justify-center gap-2 transition-colors disabled:pointer-events-none cursor-pointer data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50 data-[size=sm]:text-xs data-[icon-only=true]:data-[size=sm]:px-0 data-[icon-only=true]:data-[size=md]:px-0 data-[icon-only=true]:data-[size=lg]:px-0 data-[variant=solid]:data-[color=primary]:bg-background-primary data-[variant=solid]:data-[color=primary]:text-foreground-on-primary hover:data-[variant=solid]:data-[color=primary]:bg-background-primary-hover active:data-[variant=solid]:data-[color=primary]:bg-background-primary-pressed hover:data-[variant=solid]:data-[color=neutral]:bg-background-secondary-hover active:data-[variant=solid]:data-[color=neutral]:bg-background-secondary-pressed data-[variant=solid]:data-[color=danger]:bg-background-destructive hover:data-[variant=solid]:data-[color=danger]:bg-background-destructive-hover active:data-[variant=solid]:data-[color=danger]:bg-background-destructive-pressed data-[variant=outline]:data-[color=primary]:border data-[variant=outline]:data-[color=primary]:border-background-primary data-[variant=outline]:data-[color=primary]:text-background-primary hover:data-[variant=outline]:data-[color=primary]:bg-background-primary-subtle active:data-[variant=outline]:data-[color=primary]:bg-background-primary-subtle-pressed data-[variant=outline]:data-[color=neutral]:border data-[variant=outline]:data-[color=neutral]:border-border-default hover:data-[variant=outline]:data-[color=neutral]:bg-background-transparent-hover active:data-[variant=outline]:data-[color=neutral]:bg-background-transparent-pressed data-[variant=outline]:data-[color=danger]:border data-[variant=outline]:data-[color=danger]:border-background-destructive data-[variant=outline]:data-[color=danger]:text-background-destructive hover:data-[variant=outline]:data-[color=danger]:bg-background-destructive-subtle active:data-[variant=outline]:data-[color=danger]:bg-background-destructive-subtle-pressed data-[variant=ghost]:data-[color=primary]:text-background-primary hover:data-[variant=ghost]:data-[color=primary]:bg-background-primary-subtle active:data-[variant=ghost]:data-[color=primary]:bg-background-primary-subtle-pressed hover:data-[variant=ghost]:data-[color=neutral]:bg-background-transparent-hover active:data-[variant=ghost]:data-[color=neutral]:bg-background-transparent-pressed data-[variant=ghost]:data-[color=danger]:text-background-destructive hover:data-[variant=ghost]:data-[color=danger]:bg-background-destructive-subtle active:data-[variant=ghost]:data-[color=danger]:bg-background-destructive-subtle-pressed data-[size=sm]:h-7 data-[size=sm]:data-[icon-only=true]:w-7 flex-none rounded data-[size=lg]:px-5 data-[size=md]:text-base data-[size=md]:h-9 data-[size=lg]:text-lg data-[size=lg]:h-11 data-[size=md]:px-4 data-[size=sm]:pl-3 data-[size=sm]:pr-2.5 data-[icon-only=true]:data-[size=md]:w-9 data-[variant=solid]:data-[color=danger]:text-foreground-inverse font-semibold data-[variant=outline]:data-[color=neutral]:text-foreground-secondary data-[variant=ghost]:data-[color=neutral]:text-foreground-secondary data-[variant=solid]:shadow-sm data-[variant=solid]:data-[color=neutral]:bg-background-default data-[variant=solid]:data-[color=neutral]:border-border-default data-[variant=solid]:data-[color=neutral]:border data-[icon-only=true]:data-[size=lg]:w-11 data-[variant=solid]:data-[color=neutral]:text-foreground-secondary", className)}
      {...props}
      data-pv-component-id="Button"
    >
      {leftIcon && <Icon iconSymbol={leftIcon} size={size === 'lg' ? 'md' : 'sm'} />}
      {label && !iconOnly && <span className="leading-none">{label}</span>}
      {rightIcon && <Icon iconSymbol={rightIcon} size={size === 'lg' ? 'md' : 'sm'} />}
    </button>
  );
}

export function PvDefaultContent() {
  return <></>;
}

export const pvConfig = {
  name: 'Button',
  componentId: 'Button',
  displayName: 'Button',
  description: 'A clickable button',
  importPath: '@/components/ui/button',
  defaultProps: 'label="Button" variant="solid" color="primary" size="md"',
  defaultContent: <PvDefaultContent />,
  props: {
    label: { type: 'string', exampleValue: 'Lorem ipsum' },
    variant: { type: 'select', options: ['solid', 'outline', 'ghost'] },
    color: { type: 'select', options: ['primary', 'neutral', 'danger'] },
    size: { type: 'select', options: ['sm', 'md', 'lg'] },
    iconOnly: { type: 'boolean' },
    leftIcon: { type: 'iconSearch', exampleValue: 'edit'},
    rightIcon: { type: 'iconSearch', exampleValue: 'chevron-down'},
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
