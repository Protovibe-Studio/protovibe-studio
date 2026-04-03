import React from 'react';
import { cn } from '@/lib/utils';

export interface TextBlockProps extends React.HTMLAttributes<HTMLParagraphElement> {
  label?: string;
  typography?: 'regular' | 'secondary' | 'small' | 'heading-sm' | 'heading-md' | 'heading-lg' | 'heading-xxl' | 'all-caps';
}

export function TextBlock({
  label,
  typography = 'regular',
  className,
  children,
  ...props
}: TextBlockProps) {
  return (
    <p
      data-typography={typography}
      className={cn(
        "data-[typography=regular]:text-base data-[typography=regular]:text-foreground-default data-[typography=regular]:leading-normal data-[typography=regular]:font-normal",
        "data-[typography=secondary]:text-base data-[typography=secondary]:text-foreground-secondary data-[typography=secondary]:leading-normal data-[typography=secondary]:font-normal",
        "data-[typography=small]:text-sm data-[typography=small]:text-foreground-secondary data-[typography=small]:leading-tight data-[typography=small]:font-normal",
        "data-[typography=heading-sm]:text-base data-[typography=heading-sm]:text-foreground-default data-[typography=heading-sm]:leading-normal data-[typography=heading-sm]:font-bold",
        "data-[typography=heading-md]:text-xl data-[typography=heading-md]:text-foreground-default data-[typography=heading-md]:leading-snug data-[typography=heading-md]:font-bold",
        "data-[typography=heading-lg]:text-2xl data-[typography=heading-lg]:text-foreground-default data-[typography=heading-lg]:leading-snug data-[typography=heading-lg]:font-bold",
        "data-[typography=heading-xxl]:text-4xl data-[typography=heading-xxl]:text-foreground-default data-[typography=heading-xxl]:leading-tight data-[typography=heading-xxl]:font-bold",
        "data-[typography=all-caps]:text-xs data-[typography=all-caps]:text-foreground-secondary data-[typography=all-caps]:leading-normal data-[typography=all-caps]:font-medium data-[typography=all-caps]:tracking-widest data-[typography=all-caps]:uppercase",
        className
      )}
      {...props}
      data-pv-component-id="TextBlock"
    >
      <span>{label || children}</span>
    </p>
  );
}

export const pvConfig = {
  name: 'TextBlock',
  componentId: 'TextBlock',
  displayName: 'Text Block',
  description: 'A text element with typography style variants, different heading sizes, body text, secondary text.',
  importPath: '@/components/ui/text-block',
  defaultProps: 'typography="regular"',
  defaultContent: 'Text block',
  allowTextInChildren: true,
  props: {
    label: { type: 'string' },
    typography: {
      type: 'select',
      options: ['regular', 'secondary', 'small', 'heading-sm', 'heading-md', 'heading-lg', 'heading-xxl', 'all-caps'],
    },
  },
};
