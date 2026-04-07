import React from 'react';
import { cn } from '@/lib/utils';

export interface TextBlockProps extends React.HTMLAttributes<HTMLElement> {
  typography?: 'regular' | 'secondary' | 'small' | 'heading-sm' | 'heading-md' | 'heading-lg' | 'heading-xxl' | 'all-caps';
}

export function TextBlock({
  typography = 'regular',
  className,
  children,
  ...props
}: TextBlockProps) {
  if (typography === 'secondary') {
    return (
      <p {...props} data-pv-component-id="TextBlock" className={cn("m-0 text-base text-foreground-secondary leading-normal font-normal", className)}>
        <span>{children}</span>
      </p>
    );
  }

  if (typography === 'small') {
    return (
      <p {...props} data-pv-component-id="TextBlock" className={cn("m-0 text-sm text-foreground-secondary leading-tight font-normal", className)}>
        <span>{children}</span>
      </p>
    );
  }

  if (typography === 'heading-sm') {
    return (
      <h4 {...props} data-pv-component-id="TextBlock" className={cn("m-0 text-base text-foreground-default leading-normal font-bold", className)}>
        <span>{children}</span>
      </h4>
    );
  }

  if (typography === 'heading-md') {
    return (
      <h3 {...props} data-pv-component-id="TextBlock" className={cn("m-0 text-xl text-foreground-default leading-snug font-bold", className)}>
        <span>{children}</span>
      </h3>
    );
  }

  if (typography === 'heading-lg') {
    return (
      <h2 {...props} data-pv-component-id="TextBlock" className={cn("m-0 text-2xl text-foreground-default leading-snug font-bold", className)}>
        <span>{children}</span>
      </h2>
    );
  }

  if (typography === 'heading-xxl') {
    return (
      <h1 {...props} data-pv-component-id="TextBlock" className={cn("m-0 text-4xl text-foreground-default leading-tight font-bold", className)}>
        <span>{children}</span>
      </h1>
    );
  }

  if (typography === 'all-caps') {
    return (
      <p {...props} data-pv-component-id="TextBlock" className={cn("m-0 text-xs text-foreground-secondary leading-normal font-medium tracking-widest uppercase", className)}>
        <span>{children}</span>
      </p>
    );
  }

  // default: 'regular'
  return (
    <p {...props} data-pv-component-id="TextBlock" className={cn("m-0 text-base text-foreground-default leading-normal font-normal", className)}>
      <span>{children}</span>
    </p>
  );
}

export function PvDefaultContent() {
  return (
    <>Text block</>
  );
}

export const pvConfig = {
  name: 'TextBlock',
  componentId: 'TextBlock',
  displayName: 'Text Block',
  description: 'A text element with typography style variants, different heading sizes, body text, secondary text.',
  importPath: '@/components/ui/text-block',
  defaultProps: 'typography="regular"',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: true,
  props: {
    typography: {
      type: 'select',
      options: ['regular', 'secondary', 'small', 'heading-sm', 'heading-md', 'heading-lg', 'heading-xxl', 'all-caps'],
    },
  },
};
