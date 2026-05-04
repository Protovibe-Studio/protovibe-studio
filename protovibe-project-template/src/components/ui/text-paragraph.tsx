import React from 'react';
import { cn } from '@/lib/utils';

export interface TextParagraphProps extends React.HTMLAttributes<HTMLElement> {
  typography?: 'regular' | 'secondary' | 'small' | 'all-caps' | 'bold-primary' | 'semibold-secondary' | 'semibold-primary';
}

export function TextParagraph({
  typography = 'regular',
  className,
  children,
  ...props
}: TextParagraphProps) {
  if (typography === 'secondary') {
    return (
      <p {...props} data-pv-component-id="TextParagraph" className={cn("m-0 text-base text-foreground-secondary leading-normal font-normal", className)}>
        {children}
      </p>
    );
  }

  if (typography === 'small') {
    return (
      <p {...props} data-pv-component-id="TextParagraph" className={cn("m-0 text-sm text-foreground-secondary font-normal leading-snug", className)}>
        {children}
      </p>
    );
  }

  if (typography === 'bold-primary') {
    return (
      <p {...props} data-pv-component-id="TextParagraph" className={cn("m-0 text-base text-foreground-default leading-normal font-bold", className)}>
        {children}
      </p>
    );
  }

  if (typography === 'semibold-secondary') {
    return (
      <p {...props} data-pv-component-id="TextParagraph" className={cn("m-0 text-base text-foreground-secondary leading-normal font-semibold", className)}>
        {children}
      </p>
    );
  }

  if (typography === 'semibold-primary') {
    return (
      <p {...props} data-pv-component-id="TextParagraph" className={cn("m-0 text-base text-foreground-default leading-normal font-semibold", className)}>
        {children}
      </p>
    );
  }

  if (typography === 'all-caps') {
    return (
      <p {...props} data-pv-component-id="TextParagraph" className={cn("m-0 text-xs text-foreground-secondary leading-normal font-medium tracking-widest uppercase", className)}>
        {children}
      </p>
    );
  }

  // default: 'regular'
  return (
    <p {...props} data-pv-component-id="TextParagraph" className={cn("m-0 text-base text-foreground-default leading-normal font-normal", className)}>
      {children}
    </p>
  );
}

export function PvDefaultContent() {
  return (
    <>Paragraph text</>
  );
}

export const pvConfig = {
  name: 'TextParagraph',
  componentId: 'TextParagraph',
  displayName: 'Text Paragraph',
  description: 'A paragraph element with body text variants including regular, secondary, small, and all-caps styles.',
  importPath: '@/components/ui/text-paragraph',
  defaultProps: 'typography="regular"',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: true,
  props: {
    typography: {
      type: 'select',
      options: ['regular', 'secondary', 'small', 'all-caps', 'bold-primary', 'semibold-secondary', 'semibold-primary'],
    },
  },
};
