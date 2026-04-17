import { Icon as IconifyIcon } from '@iconify/react';
import React from 'react';
import { cn } from '@/lib/utils';

/**
 * ── Icon library ────────────────────────────────────────────────────
 * Change this value to switch the icon set used across the entire app.
 * The value must be a valid Iconify collection prefix.
 * Browse available sets at https://icon-sets.iconify.design/
 *
 * Examples: 'lucide', 'mdi', 'ph', 'tabler', 'heroicons-outline',
 *           'solar-linear', 'ri', 'feather', 'iconoir', 'carbon'
 * ────────────────────────────────────────────────────────────────────
 */
const ICON_LIBRARY = 'mdi';

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

export function Icon({ name, size = 'md', className, ...props }: IconProps) {
  const px = sizeMap[size];
  const iconName = name ? toKebab(name) : 'circle-help';

  return (
    <div
      data-size={size}
      style={{ width: px, height: px, minWidth: px, minHeight: px }}
      className={cn("items-center justify-center flex", className)}
      {...props}
      data-pv-component-id="Icon"
    >
      <IconifyIcon icon={`${ICON_LIBRARY}:${iconName}`} width={px} height={px} />
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
  iconifyPrefix: ICON_LIBRARY,
  defaultProps: 'name="star" size="md"',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  props: {
    name: { type: 'iconSearch' },
    size: { type: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
  },
};
