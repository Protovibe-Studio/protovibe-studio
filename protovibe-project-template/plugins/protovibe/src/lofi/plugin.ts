import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

// Like the editor assets, these sources ship alongside the bundled dist/index.js.
const assetDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/lofi');

/** The same isolated overlay runs in canvas iframes and in published builds. */
export function lofiPlugin(): Plugin {
  return {
    name: 'vite-plugin-protovibe-lofi',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const page = path.basename(ctx.path.split('?')[0]);
        if (page === 'protovibe.html' || page === 'specs.html') return [];

        return [
          { tag: 'style', attrs: { id: 'pv-lofi-style' }, children: fs.readFileSync(path.join(assetDir, 'lofi.css'), 'utf8'), injectTo: 'head' },
          // Appended after theme-manager.js, before the app's first render.
          { tag: 'script', attrs: { id: 'pv-lofi-runtime' }, children: fs.readFileSync(path.join(assetDir, 'runtime.js'), 'utf8'), injectTo: 'head' },
        ];
      },
    },
  };
}
