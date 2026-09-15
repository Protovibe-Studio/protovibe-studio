// plugins/protovibe/src/backend/specs-publish.ts
// Build-only plugin: after the user's Vite build finishes, copy the read-only
// specs viewer next to the built prototype so publishing the app also
// publishes its specs at /specs.html.
//
//   dist/specs.html        — viewer shell (static, relative references only)
//   dist/specs-viewer.js   — prebuilt viewer bundle (React included)
//   dist/specs-data.json   — every spec, compiled from src/specs
//
// Nothing is emitted when the project has no specs, so projects that never use
// the feature publish exactly what they do today. The user's Rollup inputs are
// never touched.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Plugin, ResolvedConfig } from 'vite';
import { readAllSpecs, buildViewerData } from './specs-store';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Compiled plugin lives in dist/; the viewer html in src/specs-viewer/.
const PLUGIN_DIR = path.resolve(__dirname, '..');

export const SPECS_VIEWER_HTML_PATH = path.resolve(PLUGIN_DIR, 'src/specs-viewer/specs.html');
export const SPECS_VIEWER_BUNDLE_PATH = path.resolve(__dirname, 'ui/specs-viewer.js');

export function specsPublishPlugin(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'vite-plugin-protovibe-specs-publish',
    apply: 'build',
    configResolved(resolved) {
      config = resolved;
    },
    closeBundle() {
      try {
        if (readAllSpecs().length === 0) return;
        const outDir = path.resolve(config.root, config.build.outDir);
        if (!fs.existsSync(outDir)) return;
        if (!fs.existsSync(SPECS_VIEWER_BUNDLE_PATH)) {
          console.warn('[protovibe] Specs viewer bundle not found at ' + SPECS_VIEWER_BUNDLE_PATH + ' — specs not published.');
          return;
        }
        fs.copyFileSync(SPECS_VIEWER_HTML_PATH, path.join(outDir, 'specs.html'));
        fs.copyFileSync(SPECS_VIEWER_BUNDLE_PATH, path.join(outDir, 'specs-viewer.js'));
        fs.writeFileSync(path.join(outDir, 'specs-data.json'), JSON.stringify(buildViewerData(), null, 2), 'utf-8');
        console.log('[protovibe] Specs viewer published to ' + path.relative(config.root, outDir) + '/specs.html');
      } catch (err) {
        console.warn('[protovibe] Failed to publish specs viewer:', err);
      }
    },
  };
}
