import { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleGetSourceInfo, handleUpdateSource, handleGetZones, handleAddBlock, handleBlockAction, handleTakeSnapshot, handleUndo, handleRedo, handleUpdateProp, handleGetComponents, handleGetThemeColors, handleUpdateThemeColor, handleGetThemeTokens, handleUpdateThemeToken } from './backend/server';
import { registerSketchpadMiddleware, getSketchpadHtmlInjections } from './sketchpad-source';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function protovibeSourcePlugin(): Plugin {
  return {
    name: 'vite-plugin-protovibe-source',
    apply: 'serve',

    configureServer(server) {
      // Watch the compiled inspector UI bundle — send a full reload when esbuild rebuilds it
      const inspectorPath = path.resolve(__dirname, 'ui/inspector.js');
      const bridgePath = path.resolve(__dirname, 'ui/bridge.js');
      if (fs.existsSync(inspectorPath)) {
        server.watcher.add(inspectorPath);
      }
      if (fs.existsSync(bridgePath)) {
        server.watcher.add(bridgePath);
      }

      // Watch the compiled plugin entry — restart the Vite server when tsup rebuilds it
      // so middleware / transform changes are picked up without manually stopping `npm run dev`
      const pluginIndexPath = path.resolve(__dirname, 'index.js');
      if (fs.existsSync(pluginIndexPath)) {
        server.watcher.add(pluginIndexPath);
      }

      server.watcher.on('change', async (changedFile) => {
        if (changedFile === inspectorPath || changedFile === bridgePath) {
          // UI-only change: just reload the browser so the new inlined script is served
          server.ws.send({ type: 'full-reload' });
        } else if (changedFile === pluginIndexPath) {
          // Backend / plugin code changed: restart the whole Vite server
          console.log('[protovibe] Plugin code changed — restarting Vite server…');
          await server.restart();
        }
      });

      const srcPath = path.resolve(process.cwd(), 'src');

      // When a new component file is added, invalidate its SSR cache entry so
      // the next /__get-components request picks it up via ssrLoadModule cleanly.
      server.watcher.on('add', (addedFile) => {
        if (
          addedFile.startsWith(srcPath) &&
          (addedFile.endsWith('.tsx') || addedFile.endsWith('.jsx'))
        ) {
          const mod = server.moduleGraph.getModuleById(addedFile);
          if (mod) server.moduleGraph.invalidateModule(mod);
          console.log(`[protovibe] New component file detected: ${path.relative(process.cwd(), addedFile)}`);
        }
      });

      // Pass the Vite server instance to handleGetSourceInfo so we can use its resolver
      server.middlewares.use('/__get-source-info', (req, res) => handleGetSourceInfo(req, res, server));
      server.middlewares.use('/__update-source', handleUpdateSource);
      server.middlewares.use('/__get-zones', handleGetZones);
      server.middlewares.use('/__add-block', handleAddBlock);
      server.middlewares.use('/__block-action', handleBlockAction);
      server.middlewares.use('/__take-snapshot', handleTakeSnapshot);
      server.middlewares.use('/__undo', handleUndo);
      server.middlewares.use('/__redo', handleRedo);
      server.middlewares.use('/__update-prop', handleUpdateProp);
      server.middlewares.use('/__get-components', (req, res) => handleGetComponents(req, res, server));
      server.middlewares.use('/__get-theme-colors', handleGetThemeColors);
      server.middlewares.use('/__update-theme-color', handleUpdateThemeColor);
      server.middlewares.use('/__get-theme-tokens', handleGetThemeTokens);
      server.middlewares.use('/__update-theme-token', handleUpdateThemeToken);

      // Sketchpad endpoints
      registerSketchpadMiddleware(server);
    },

    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const filename = ctx?.filename ?? '';
        const isAppHtml = filename.endsWith('app.html');
        const isComponentsHtml = filename.endsWith('components.html');
        const isSketchpadHtml = filename.endsWith('sketchpad.html');
        const isIndexHtml = !isAppHtml && !isComponentsHtml && !isSketchpadHtml && filename.endsWith('index.html');

        if (isAppHtml || isComponentsHtml) {
          // Inject the bridge script into the app/components iframe
          const bridgePath = path.resolve(__dirname, 'ui/bridge.js');
          if (!fs.existsSync(bridgePath)) {
            console.warn('⚠️ Protovibe bridge bundle not found at ' + bridgePath);
            return [];
          }

          const injections: any[] = [
            {
              tag: 'script',
              attrs: {},
              children: fs.readFileSync(bridgePath, 'utf-8'),
              injectTo: 'body',
            },
          ];

          if (isComponentsHtml) {
            // Inject the component previewer overlay.
            // The source file lives next to the dist output (../src/ui/), and Vite
            // serves it via @fs so that import.meta.glob and JSX transforms are applied.
            const previewerEntryPath = path.resolve(__dirname, '../src/ui/previewer-entry.tsx');
            if (fs.existsSync(previewerEntryPath)) {
              injections.push({
                tag: 'script',
                attrs: { type: 'module', src: `/@fs${previewerEntryPath}` },
                injectTo: 'body',
              });
            } else {
              console.warn('⚠️ Protovibe previewer entry not found at ' + previewerEntryPath);
            }
          }

          return injections;
        }

        if (isSketchpadHtml) {
          return getSketchpadHtmlInjections(__dirname, path.resolve(__dirname, '../src'));
        }

        if (isIndexHtml) {
          // Inject the Protovibe shell (inspector) into the parent page
          const inspectorPath = path.resolve(__dirname, 'ui/inspector.js');
          if (!fs.existsSync(inspectorPath)) {
            console.warn('⚠️ Visual Editor UI bundle not found at ' + inspectorPath);
            return [];
          }
          return [
            {
              tag: 'script',
              attrs: {},
              children: fs.readFileSync(inspectorPath, 'utf-8'),
              injectTo: 'body',
            },
          ];
        }

        return [];
      },
    },

    // Suppress full-page reloads for sketchpad data files (_registry.json,
    // frame .tsx files). These are written by the sketchpad backend and should
    // Suppress full-page reloads for non-HMR-able sketchpad data files
    // (e.g. _registry.json) while letting frame .tsx files hot-reload normally.
    handleHotUpdate({ file }) {
      const sketchpadsDir = path.resolve(process.cwd(), 'src/sketchpads');
      if (file.startsWith(sketchpadsDir) && !file.endsWith('.tsx') && !file.endsWith('.jsx')) {
        return [];
      }
    },
  };
}