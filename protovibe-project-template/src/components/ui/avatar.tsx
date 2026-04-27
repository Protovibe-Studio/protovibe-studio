import React from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type AvatarBgColor = 'default' | 'primary' | 'destructive' | 'success' | 'warning' | 'info';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: AvatarSize;
  initials?: string;
  bgColor?: AvatarBgColor;
  imageSrc?: string;
  outline?: boolean;
  icon?: string;
}

export function Avatar({
  size = 'md',
  initials,
  bgColor = 'default',
  imageSrc,
  outline = false,
  icon,
  className,
  ...props
}: AvatarProps) {
  const upperInitials = initials ? initials.toUpperCase().slice(0, 2) : '';

  return (
    <div
      data-size={size}
      data-bg-color={bgColor}
      data-outline={outline}
      className={cn("relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 font-semibold select-none data-[size=xs]:w-6 data-[size=xs]:h-6 data-[size=xs]:text-[10px] data-[size=sm]:w-8 data-[size=sm]:h-8 data-[size=sm]:text-xs data-[size=md]:w-10 data-[size=md]:h-10 data-[size=md]:text-sm data-[size=lg]:w-12 data-[size=lg]:h-12 data-[size=lg]:text-base data-[size=xl]:w-16 data-[size=xl]:h-16 data-[size=xl]:text-xl data-[size=2xl]:w-20 data-[size=2xl]:h-20 data-[size=2xl]:text-2xl data-[bg-color=destructive]:bg-background-destructive-subtle data-[bg-color=destructive]:text-foreground-destructive data-[bg-color=success]:bg-background-success-subtle data-[bg-color=success]:text-foreground-success data-[bg-color=warning]:bg-background-warning-subtle data-[bg-color=warning]:text-foreground-warning data-[bg-color=info]:bg-background-info-subtle data-[bg-color=info]:text-foreground-info data-[outline=true]:ring-2 data-[outline=true]:ring-background-default data-[bg-color=default]:bg-background-accent-soft data-[bg-color=default]:text-foreground-inverse data-[bg-color=primary]:bg-background-primary-soft data-[bg-color=primary]:text-foreground-inverse", className)}
      {...props}
      data-pv-component-id="Avatar"
    >
      {/* Initials or icon — the base layer */}
      {icon ? (
        <Icon iconSymbol={icon} size={size} />
      ) : (
        <span aria-hidden="true">{upperInitials}</span>
      )}

      {/* Image layer — sits above initials/icon, covers when loaded */}
      {imageSrc && (
        <img
          src={imageSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export function PvDefaultContent() {
  return <></>;
}

export const pvConfig = {
  name: 'Avatar',
  componentId: 'Avatar',
  displayName: 'Avatar',
  description: 'A circular avatar with initials, icon, or image. Supports six sizes, semantic background colors, and an optional outline ring.',
  importPath: '@/components/ui/avatar',
  defaultProps: 'initials="AB" size="md" bgColor="default" imageSrc="https://i.pravatar.cc/60"',
  defaultContent: <PvDefaultContent />,
  props: {
    size: { type: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    initials: { type: 'string', exampleValue: 'MS' },
    bgColor: { type: 'select', options: ['default', 'primary', 'destructive', 'success', 'warning', 'info'] },
      imageSrc: { type: 'string', exampleValue: 'https://i.pravatar.cc/60' },
    outline: { type: 'boolean' },
    icon: { type: 'iconSearch', exampleValue: 'cog' },
  },
  invalidCombinations: [
    (props: Record<string, unknown>) => !props.imageSrc && !props.initials && !props.icon,
  ],
};
