import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { Root } from './Root';
import { StoreProvider } from './store';

export type RouteMeta = {
  title: string;
  description: string;
  canonical: string;
};

export const ROUTES: Record<string, RouteMeta> = {
  '/': {
    title: 'Protovibe — Design pixel-perfect prototypes with AI',
    description:
      'Protovibe is a free, open-source visual builder for product designers. Design pixel-perfect apps in React. Prototype with AI coding agents.',
    canonical: 'https://protovibe.studio/',
  },
  '/docs': {
    title: 'Protovibe Documentation',
    description:
      'Install Protovibe, design on the canvas, and ship a real React app. Conventions, pv-blocks, styling rules and more.',
    canonical: 'https://protovibe.studio/docs',
  },
};

export function render(path: string): string {
  return renderToString(
    <StrictMode>
      <StoreProvider>
        <Root path={path} />
      </StoreProvider>
    </StrictMode>
  );
}
