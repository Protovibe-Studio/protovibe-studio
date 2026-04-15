import { Plugin, normalizePath } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleGetSourceInfo, handleUpdateSource, handleGetZones, handleAddBlock, handleWrapBlocks, handleBlockAction, handleTakeSnapshot, handleUndo, handleRedo, handleUpdateProp, handleGetComponents, handleGetThemeColors, handleUpdateThemeColor, handleGetThemeTokens, handleUpdateThemeToken, handleUploadImage } from './backend/server';
import { registerSketchpadMiddleware } from './sketchpad-source';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Absolute path to the plugin's source directory (one level above dist/)
const PLUGIN_DIR = path.resolve(__dirname, '..');

export function protovibeSourcePlugin(): Plugin {
  return {
    name: 'vite-plugin-protovibe-source',
    apply: 'serve',

    configureServer(server) {
      const originalPrintUrls = server.printUrls.bind(server);
      server.printUrls = () => {
        originalPrintUrls();
        const local = server.resolvedUrls?.local?.[0];
        if (local) {
          const url = `${local.replace(/\/$/, '')}/protovibe.html`;
          const bar = '─'.repeat(url.length + 4);
          const cyan = '\x1b[36m';
          const bold = '\x1b[1m';
          const reset = '\x1b[0m';
          console.log(`\n${cyan}┌${bar}┐${reset}`);
          console.log(`${cyan}│${reset}  ${bold}Protovibe editor:${reset}${' '.repeat(Math.max(0, url.length - 17))}  ${cyan}│${reset}`);
          console.log(`${cyan}│${reset}  ${cyan}${url}${reset}  ${cyan}│${reset}`);
          console.log(`${cyan}└${bar}┘${reset}\n`);
        }
      };

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

      // Skip the first plugin-index change event: tsup's watch mode always does an
      // initial rebuild right after startup, which would race with the inspector's
      // component scan (ssrLoadModule) and disconnect its transport mid-Promise.all.
      const startupGraceUntil = Date.now() + 3000;

      server.watcher.on('change', async (changedFile) => {
        if (changedFile === inspectorPath || changedFile === bridgePath) {
          // UI-only change: just reload the browser so the new inlined script is served
          server.ws.send({ type: 'full-reload' });
        } else if (changedFile === pluginIndexPath) {
          if (Date.now() < startupGraceUntil) {
            return;
          }
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

      // When a file is deleted, aggressively wipe it from Vite's module graph to prevent errors about missing files or stale cache entries. This is especially important for sketchpad data files that aren't HMR-able and would otherwise require a full server restart to clear out stale data.
      // server.watcher.on('unlink', (deletedFile) => {
      //   const mod = server.moduleGraph.getModuleById(deletedFile);
      //   if (mod) {
      //     server.moduleGraph.invalidateModule(mod);
      //     console.log(`[protovibe] File deleted, clearing cache: ${path.relative(process.cwd(), deletedFile)}`);
      //   }
      // });

      // --- Serve editor HTML pages from the plugin directory ---
      const editorPages: Record<string, string> = {
        '/protovibe.html': path.resolve(PLUGIN_DIR, 'src/ui/protovibe.html'),
        '/components.html': path.resolve(PLUGIN_DIR, 'src/ui/components.html'),
        '/sketchpad.html': path.resolve(PLUGIN_DIR, 'src/ui/sketchpad.html'),
      };

      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        // Strip query string for matching
        const pathname = url.split('?')[0];
        const htmlFile = editorPages[pathname];
        if (!htmlFile) return next();

        try {
          let html = fs.readFileSync(htmlFile, 'utf-8');
          // Replace the placeholder with the actual plugin directory path
          html = html.replace(/\[PLUGIN_DIR\]/g, PLUGIN_DIR);
          // Let Vite process the HTML (applies transformIndexHtml hooks, etc.)
          html = await server.transformIndexHtml(url, html);
          res.setHeader('Content-Type', 'text/html');
          res.statusCode = 200;
          res.end(html);
        } catch (e) {
          console.error(`[protovibe] Error serving ${pathname}:`, e);
          next(e);
        }
      });

      // API middleware
      server.middlewares.use('/__get-source-info', (req, res) => handleGetSourceInfo(req, res, server));
      server.middlewares.use('/__update-source', handleUpdateSource);
      server.middlewares.use('/__get-zones', handleGetZones);
      server.middlewares.use('/__add-block', handleAddBlock);
      server.middlewares.use('/__wrap-blocks', handleWrapBlocks);
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
      server.middlewares.use('/__upload-image', handleUploadImage);

      // Resolve a relative file path to its absolute path on disk
      server.middlewares.use('/__resolve-file-path', (req, res) => {
        const url = new URL(req.url || '', 'http://localhost');
        const file = url.searchParams.get('file') || '';
        const absolutePath = path.resolve(process.cwd(), file);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ absolutePath }));
      });

      // Sketchpad endpoints
      registerSketchpadMiddleware(server);

      // Manual server restart endpoint (triggered by error banner in UI)
      server.middlewares.use('/__restart-server', async (req, res) => {
        if (req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true }));
          console.log('[protovibe] Manual server restart triggered from UI...');
          await server.restart();
        }
      });
    },

    transformIndexHtml: {
      order: 'pre',
      handler(_html, ctx) {
        const filename = ctx?.filename ?? '';
        const isIndexHtml = filename.endsWith('index.html');
        const isComponentsHtml = filename.endsWith('components.html');
        const isSketchpadHtml = filename.endsWith('sketchpad.html');

        // Inject bridge.js into the user app (index.html) and components.html
        if (isIndexHtml || isComponentsHtml) {
          const bridgePath = path.resolve(__dirname, 'ui/bridge.js');
          if (!fs.existsSync(bridgePath)) {
            console.warn('⚠️ Protovibe bridge bundle not found at ' + bridgePath);
            return [];
          }

          return [
            {
              tag: 'script',
              attrs: {},
              children: fs.readFileSync(bridgePath, 'utf-8'),
              injectTo: 'body',
            },
          ];
        }

        // Inject sketchpad-bridge.js into sketchpad.html
        if (isSketchpadHtml) {
          const sketchpadBridgePath = path.resolve(__dirname, 'ui/sketchpad-bridge.js');
          if (!fs.existsSync(sketchpadBridgePath)) {
            console.warn('⚠️ Protovibe sketchpad bridge bundle not found at ' + sketchpadBridgePath);
            return [];
          }

          return [
            {
              tag: 'script',
              attrs: {},
              children: fs.readFileSync(sketchpadBridgePath, 'utf-8'),
              injectTo: 'body',
            },
          ];
        }

        return [];
      },
    },

    // Suppress full-page reloads for non-HMR-able sketchpad data files
    // (e.g. _registry.json) while letting frame .tsx files hot-reload normally.
    // Use normalizePath so the forward-slash form from Vite matches on Windows too.
    handleHotUpdate({ file }) {
      const sketchpadsDir = normalizePath(path.resolve(process.cwd(), 'src/sketchpads'));
      if (file.startsWith(sketchpadsDir) && !file.endsWith('.tsx') && !file.endsWith('.jsx')) {
        return [];
      }
    },
  };
}
