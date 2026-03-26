import * as LucideIcons from 'lucide-react';
import React from 'react';

export interface IconProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  color?: string;
}

export function Icon({ name, size = 'md', color, ...props }: IconProps) {
  const LucideIcon = (LucideIcons as any)[name] || LucideIcons.HelpCircle;

  return (
    <div
      data-size={size}
      style={{ color }}
      className="inline-flex items-center justify-center data-[size=xs]:w-3 data-[size=xs]:h-3 data-[size=sm]:w-4 data-[size=sm]:h-4 data-[size=md]:w-5 data-[size=md]:h-5 data-[size=lg]:w-6 data-[size=lg]:h-6 data-[size=xl]:w-8 data-[size=xl]:h-8 data-[size=2xl]:w-10 data-[size=2xl]:h-10"
      {...props}
      data-pv-component-id="Icon"
    >
      <LucideIcon className="w-full h-full" />
    </div>
  );
}

export const pvConfig = {
  name: 'Icon',
  componentId: 'Icon',
  displayName: 'Icon',
  description: 'A lucide-react icon',
  importPath: '@/components/ui/icon',
  snippet: 'name="Star" size="md"',
  defaultContent: '',
  props: {
    name: { type: 'select', options: Object.keys(LucideIcons) },
    size: { type: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    color: { type: 'string', exampleValue: 'Lorem ipsum' },
  },
};
