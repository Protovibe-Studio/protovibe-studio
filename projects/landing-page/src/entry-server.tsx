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
    title: 'Protovibe — Visual builder for React apps',
    description:
      'Protovibe is an AST-based visual builder that reads and writes React code directly. Design on a canvas, ship real code.',
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
