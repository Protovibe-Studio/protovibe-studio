import { Icon as IconifyIcon, loadIcons } from '@iconify/react';
import React, { useEffect, useState } from 'react';
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
  /** Icon name (e.g. "star", "arrow-right", "chevron-right") */
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

/** Convert PascalCase/camelCase (e.g. "chevron-right", "edit") to kebab-case ("chevron-right", "edit-2") for Iconify compat. Already-kebab names pass through unchanged. */
function toKebab(s: string) {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2') // camelCase boundary: chevronRight → chevron-Right
    .replace(/([a-z])([0-9])/g, '$1-$2')     // letter-digit boundary: edit2 → edit-2
    .toLowerCase();
}

/** Parse "prefix:name" or bare "name" into [prefix, name], falling back to DEFAULT_ICON_PREFIX. */
function parseIconId(raw: string): [string, string] {
  const colon = raw.indexOf(':');
  if (colon > 0) return [raw.slice(0, colon), raw.slice(colon + 1)];
  return [DEFAULT_ICON_PREFIX, raw];
}

/** Module-level cache so repeated renders of the same missing icon don't re-fetch. */
const fallbackCache = new Map<string, string>();

async function searchFallback(iconId: string): Promise<string | null> {
  if (fallbackCache.has(iconId)) return fallbackCache.get(iconId)!;
  // Derive a human search query from the icon name (e.g. "mdi:chevron-right" → "chevron right")
  const [, namePart] = parseIconId(iconId);
  const query = namePart.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  try {
    const res = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=1`);
    const data = await res.json();
    const first: string | undefined = data.icons?.[0];
    const result = first ?? null;
    fallbackCache.set(iconId, result ?? '');
    return result;
  } catch {
    fallbackCache.set(iconId, '');
    return null;
  }
}

export function Icon({ name, size = 'md', className, ...props }: IconProps) {
  const px = sizeMap[size];
  const [prefix, iconName] = name ? parseIconId(toKebab(name)) : [DEFAULT_ICON_PREFIX, 'circle-help'];
  const iconId = `${prefix}:${iconName}`;

  const [resolvedIcon, setResolvedIcon] = useState(iconId);

  useEffect(() => {
    setResolvedIcon(iconId);
    // Check if the icon actually exists; if missing, search for the best match
    loadIcons([iconId], (_loaded, missing) => {
      if (missing.length > 0) {
        searchFallback(iconId).then(fallback => {
          if (fallback) setResolvedIcon(fallback);
        });
      }
    });
  }, [iconId]);

  return (
    <div
      data-size={size}
      style={{ width: px, height: px, minWidth: px, minHeight: px }}
      className={cn("items-center justify-center flex", className)}
      {...props}
      data-pv-component-id="Icon"
    >
      <IconifyIcon icon={resolvedIcon} width={px} height={px} />
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
