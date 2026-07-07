import React from 'react';
import { cn } from '@/lib/utils';

export interface ImageProps extends React.HTMLAttributes<HTMLDivElement> {
  randomImage?: boolean;
}

export function Image({ className, children, randomImage, ...props }: ImageProps) {
  const pvBlock = (props as Record<string, unknown>)['data-pv-block'];
  const fallbackRef = React.useRef(Math.random());
  const seed = pvBlock ?? fallbackRef.current;

  return (
    <div
      className={cn('relative min-h-2', className)}
      data-random-image={randomImage}
      {...props}
      data-pv-component-id="Image"
    >
      {randomImage && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('https://picsum.photos/600/400?r=${seed}')` }}
        />
      )}
      {children}
    </div>
  );
}

export function PvDefaultContent() {
  return <></>;
}

export const pvConfig = {
  name: 'Image',
  componentId: 'Image',
  displayName: 'Image',
  description: 'A background-image container for static images.',
  importPath: '@/components/ui/image',
  defaultProps: `className="bg-[url('/src/images/from-protovibe/image-placeholder.svg')] bg-cover bg-center bg-no-repeat aspect-video w-full"`,
  defaultContent: <PvDefaultContent />,
  props: {
    randomImage: { type: 'boolean' },
  },
};
