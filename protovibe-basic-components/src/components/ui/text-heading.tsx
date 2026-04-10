import React from 'react';
import { cn } from '@/lib/utils';

export interface TextHeadingProps extends React.HTMLAttributes<HTMLElement> {
  typography?: 'heading-sm' | 'heading-md' | 'heading-lg' | 'heading-xxl';
}

export function TextHeading({
  typography = 'heading-md',
  className,
  children,
  ...props
}: TextHeadingProps) {
  if (typography === 'heading-sm') {
    return (
      <h1 {...props} data-pv-component-id="TextHeading" className={cn("m-0 text-base text-foreground-default leading-normal font-bold", className)}>
        {children}
      </h1>
    );
  }

  if (typography === 'heading-lg') {
    return (
      <h1 {...props} data-pv-component-id="TextHeading" className={cn("m-0 text-2xl text-foreground-default leading-snug font-bold", className)}>
        {children}
      </h1>
    );
  }

  if (typography === 'heading-xxl') {
    return (
      <h1 {...props} data-pv-component-id="TextHeading" className={cn("m-0 text-4xl text-foreground-default leading-tight font-bold", className)}>
        {children}
      </h1>
    );
  }

  // default: 'heading-md'
  return (
    <h1 {...props} data-pv-component-id="TextHeading" className={cn("m-0 text-xl text-foreground-default leading-snug font-bold", className)}>
      {children}
    </h1>
  );
}

export function PvDefaultContent() {
  return (
    <>Heading</>
  );
}

export const pvConfig = {
  name: 'TextHeading',
  componentId: 'TextHeading',
  displayName: 'Text Heading',
  description: 'A heading element with semantic HTML (h1–h4) and consistent typography scale.',
  importPath: '@/components/ui/text-heading',
  defaultProps: 'typography="heading-md"',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: true,
  props: {
    typography: {
      type: 'select',
      options: ['heading-sm', 'heading-md', 'heading-lg', 'heading-xxl'],
    },
  },
};
