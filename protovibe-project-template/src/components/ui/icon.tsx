import { Icon as IconifyIcon } from '@iconify/react';
import React from 'react';
import { cn } from '@/lib/utils';

const sizeMap = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
} as const;

export const collectionMap = {
  'Lucide': 'lucide',
  'Material Design Icons': 'mdi',
  'Material Symbols Outlined': 'material-symbols',
  'Material Symbols Rounded': 'material-symbols-rounded',
  'Phosphor': 'ph',
  'Phosphor Bold': 'ph-bold',
  'Phosphor Fill': 'ph-fill',
  'Phosphor Duotone': 'ph-duotone',
  'Tabler': 'tabler',
  'Heroicons Outline': 'heroicons-outline',
  'Heroicons Solid': 'heroicons-solid',
  'Remix Icon': 'ri',
  'Font Awesome Solid': 'fa-solid',
  'Font Awesome Regular': 'fa-regular',
  'Font Awesome Brands': 'fa-brands',
  'Bootstrap Icons': 'bi',
  'Feather': 'feather',
  'Iconoir': 'iconoir',
  'Solar Linear': 'solar-linear',
  'Solar Bold': 'solar-bold',
  'Fluent': 'fluent',
  'Fluent Filled': 'fluent-filled',
  'Carbon': 'carbon',
  'Octicons': 'octicon',
  'Radix Icons': 'radix-icons',
  'Simple Icons': 'simple-icons',
} as const;

export type CollectionName = keyof typeof collectionMap;

export interface IconProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Icon name within the collection (e.g. "star", "arrow-right") */
  name: string;
  /** Icon collection. Defaults to "Lucide". */
  collection?: CollectionName;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

/** Convert PascalCase (e.g. "ChevronRight") to kebab-case ("chevron-right") for Iconify compat. Already-kebab names pass through unchanged. */
function toKebab(s: string) {
  return s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

export function Icon({ name, collection = 'Lucide', size = 'md', className, ...props }: IconProps) {
  const px = sizeMap[size];
  const iconName = name ? toKebab(name) : 'circle-help';
  const prefix = collectionMap[collection] ?? 'lucide';

  return (
    <div
      data-size={size}
      data-collection={collection}
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
  description: 'An icon from Iconify (any collection)',
  importPath: '@/components/ui/icon',
  defaultProps: 'name="star" size="md"',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  props: {
    name: { type: 'string', exampleValue: 'star' },
    collection: { type: 'select', options: Object.keys(collectionMap) },
    size: { type: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
  },
};
