import { Icon as IconifyIcon } from '@iconify/react';
import React from 'react';
import { cn } from '@/lib/utils';

/** Fallback collection prefix when the name has no explicit "prefix:name" format. */
const DEFAULT_ICON_PREFIX = 'mdi';

const sizeMap = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
} as const;

export interface IconProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Icon name (e.g. "star", "arrow-right", "ChevronRight") */
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

/** Convert PascalCase (e.g. "ChevronRight") to kebab-case ("chevron-right") for Iconify compat. Already-kebab names pass through unchanged. */
function toKebab(s: string) {
  return s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/** Parse "prefix:name" or bare "name" into [prefix, name], falling back to DEFAULT_ICON_PREFIX. */
function parseIconId(raw: string): [string, string] {
  const colon = raw.indexOf(':');
  if (colon > 0) return [raw.slice(0, colon), raw.slice(colon + 1)];
  return [DEFAULT_ICON_PREFIX, raw];
}

export function Icon({ name, size = 'md', className, ...props }: IconProps) {
  const px = sizeMap[size];
  const [prefix, iconName] = name ? parseIconId(toKebab(name)) : [DEFAULT_ICON_PREFIX, 'circle-help'];

  return (
    <div
      data-size={size}
      style={{ width: px, height: px, minWidth: px, minHeight: px }}
      className={cn("items-center justify-center flex", className)}
      {...props}
      data-pv-component-id="Icon"
    >
      <IconifyIcon icon={`${prefix}:${iconName}`} width={px} height={px} />
    </div>
  );
}

export function PvDefaultContent() {
  return <></>;
}

export const pvConfig = {
  name: 'Icon',
  componentId: 'Icon',
  displayName: 'Icon',
  description: 'An icon from Iconify',
  importPath: '@/components/ui/icon',
  iconifyPrefix: DEFAULT_ICON_PREFIX,
  defaultProps: 'name="star" size="md"',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  props: {
    name: { type: 'iconSearch', exampleValue: 'star' },
    size: { type: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
  },
};
