import { Plugin, normalizePath } from 'vite';
import type { HtmlTagDescriptor } from 'vite';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { handleGetSourceInfo, handleUpdateSource, handleGetZones, handleAddBlock, handleWrapBlocks, handleUnwrapBlock, handleDeleteBlocks, handleBlockAction, handleTakeSnapshot, handleUndo, handleRedo, handleUpdateProp, handleGetComponents, handleGetThemeColors, handleUpdateThemeColor, handleGetThemeTokens, handleUpdateThemeToken, handleUpdateFontFamily, handleUploadImage, handleCloudflarePublishMetadata, handleCloudflarePublishSaveName, handleCloudflarePublishStart, handleCloudflarePublishStatus, handleCloudflareLoginStart, handleCloudflareLogout, handleCloudflareAuthStatus } from './backend/server';
import { handleConvertToSketchpad } from './backend/convert-to-sketchpad';
import { registerSketchpadMiddleware } from './sketchpad-source';
import { registerCommentsMiddleware } from './backend/comments-server';
import { registerGitMiddleware } from './backend/git-server';
import { registerProfileMiddleware } from './backend/profile-server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Absolute path to the plugin's source directory (one level above dist/)
const PLUGIN_DIR = path.resolve(__dirname, '..');
const PLUGIN_VERSION = JSON.parse(fs.readFileSync(path.join(PLUGIN_DIR, 'package.json'), 'utf-8')).version as string;

/**
 * Extract the webfont stylesheet URLs the user's app depends on by reading the
 * `@import url('https://fonts.googleapis.com/...')` (and `@import url("...")`)
 * lines from src/index.css.
 *
 * These same fonts are pulled in by index.css inside the sketchpad iframe, but
 * that stylesheet is owned by Tailwind's Vite plugin and gets torn down and
 * re-injected on every mutation's HMR update. With `display=swap` that momentary
 * removal of the `@font-face` makes text flash the fallback font on each move.
 * Injecting the same font stylesheets as plain <link>s in the iframe <head>
 * keeps the @font-face continuously registered (the browser owns these links,
 * not HMR), so the glyphs never fall back between updates.
 */
function getWebfontHrefs(): string[] {
  try {
    const cssPath = path.resolve(process.cwd(), 'src/index.css');
    const css = fs.readFileSync(cssPath, 'utf-8');
    const hrefs: string[] = [];
    const importRegex = /@import\s+url\(\s*(['"]?)(https:\/\/fonts\.googleapis\.com\/[^'")]+)\1\s*\)/g;
    let m: RegExpExecArray | null;
    while ((m = importRegex.exec(css)) !== null) {
      hrefs.push(m[2]);
    }
    return hrefs;
  } catch {
    return [];
  }
}

export function protovibeSourcePlugin(): Plugin {
  return {
    name: 'vite-plugin-protovibe-source',
    apply: 'serve',

    config() {
      // Prevent Vite from reloading the page when protovibe-data.json is written
      return {
        server: {
          watch: {
            ignored: ['**/protovibe-data.json'],
          },
        },
      };
    },

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

      // Timestamp of the last watched-source change. The shell polls this
      // during a crash episode to keep the loading cover up while an agent is
      // still editing (see ProtovibeApp's crash-episode machine).
      let lastSourceChangeAt = 0;
      server.watcher.on('change', (changedFile) => {
        if (changedFile === inspectorPath || changedFile === bridgePath || changedFile === pluginIndexPath) return;
        // The sketchpad registry is rewritten by the plugin itself on ordinary
        // requests — it is not a code edit and must not prolong a crash episode.
        if (changedFile.endsWith(path.join('sketchpads', '_registry.json'))) return;
        lastSourceChangeAt = Date.now();
      });
      server.middlewares.use('/__hmr-activity', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({
          msSinceLastChange: lastSourceChangeAt ? Date.now() - lastSourceChangeAt : null,
        }));
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

      // Inject plugin version into protovibe-data.json responses
      server.middlewares.use('/protovibe-data.json', (req, res) => {
        const dataPath = path.resolve(process.cwd(), 'protovibe-data.json');
        let data: Record<string, any> = {};
        if (fs.existsSync(dataPath)) {
          try { data = JSON.parse(fs.readFileSync(dataPath, 'utf-8')); } catch { /* serve empty */ }
        }
        data['plugin-version'] = PLUGIN_VERSION;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify(data));
      });

      // API middleware
      server.middlewares.use('/__get-source-info', (req, res) => handleGetSourceInfo(req, res, server));
      server.middlewares.use('/__update-source', handleUpdateSource);
      server.middlewares.use('/__get-zones', handleGetZones);
      server.middlewares.use('/__add-block', handleAddBlock);
      server.middlewares.use('/__wrap-blocks', handleWrapBlocks);
      server.middlewares.use('/__unwrap-block', handleUnwrapBlock);
      server.middlewares.use('/__delete-blocks', handleDeleteBlocks);
      server.middlewares.use('/__block-action', handleBlockAction);
      server.middlewares.use('/__convert-to-sketchpad', (req, res) => handleConvertToSketchpad(req, res, server));
      server.middlewares.use('/__take-snapshot', handleTakeSnapshot);
      server.middlewares.use('/__undo', handleUndo);
      server.middlewares.use('/__redo', handleRedo);
      server.middlewares.use('/__update-prop', handleUpdateProp);
      server.middlewares.use('/__get-components', (req, res) => handleGetComponents(req, res, server));
      server.middlewares.use('/__get-theme-colors', handleGetThemeColors);
      server.middlewares.use('/__update-theme-color', handleUpdateThemeColor);
      server.middlewares.use('/__get-theme-tokens', handleGetThemeTokens);
      server.middlewares.use('/__update-theme-token', handleUpdateThemeToken);
      server.middlewares.use('/__update-font-family', handleUpdateFontFamily);
      server.middlewares.use('/__upload-image', handleUploadImage);
      server.middlewares.use('/__cloudflare-publish-metadata', handleCloudflarePublishMetadata);
      server.middlewares.use('/__cloudflare-publish-save-name', handleCloudflarePublishSaveName);
      server.middlewares.use('/__cloudflare-publish-start', handleCloudflarePublishStart);
      server.middlewares.use('/__cloudflare-publish-status', handleCloudflarePublishStatus);
      server.middlewares.use('/__cloudflare-login-start', handleCloudflareLoginStart);
      server.middlewares.use('/__cloudflare-logout', handleCloudflareLogout);
      server.middlewares.use('/__cloudflare-auth-status', handleCloudflareAuthStatus);

      // Resolve a relative file path to its absolute path on disk
      server.middlewares.use('/__resolve-file-path', (req, res) => {
        const url = new URL(req.url || '', 'http://localhost');
        const file = url.searchParams.get('file') || '';
        const absolutePath = path.resolve(process.cwd(), file);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ absolutePath }));
      });

      // Read a project file by relative path (restricted to within project root)
      server.middlewares.use('/__read-project-file', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        try {
          const url = new URL(req.url || '', 'http://localhost');
          const file = url.searchParams.get('file') || '';
          const root = process.cwd();
          const absolute = path.resolve(root, file);
          if (!absolute.startsWith(root)) {
            res.statusCode = 403;
            res.end(JSON.stringify({ ok: false, error: 'Access denied' }));
            return;
          }
          if (!fs.existsSync(absolute)) {
            res.statusCode = 404;
            res.end(JSON.stringify({ ok: false, error: 'File not found' }));
            return;
          }
          const content = fs.readFileSync(absolute, 'utf-8');
          res.end(JSON.stringify({ ok: true, content }));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ ok: false, error: err?.message ?? 'Failed to read file' }));
        }
      });

      // Reveal a folder in the OS file manager (Finder / Explorer / xdg-open)
      server.middlewares.use('/__reveal-folder', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        try {
          const url = new URL(req.url || '', 'http://localhost');
          const targetRaw = url.searchParams.get('path') || process.cwd();
          const target = path.resolve(targetRaw);
          if (!fs.existsSync(target)) {
            res.statusCode = 404;
            res.end(JSON.stringify({ ok: false, error: 'Path does not exist' }));
            return;
          }
          const platform = process.platform;
          const cmd = platform === 'darwin' ? 'open'
                    : platform === 'win32' ? 'explorer'
                    : 'xdg-open';
          spawn(cmd, [target], { detached: true, stdio: 'ignore' }).unref();
          res.end(JSON.stringify({ ok: true }));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ ok: false, error: err?.message ?? 'Failed to reveal folder' }));
        }
      });

      // Sketchpad endpoints
      registerSketchpadMiddleware(server);

      // Comments & Notes endpoints
      registerCommentsMiddleware(server);

      // Shared comment-author profile (~/.protovibe/profile.json)
      registerProfileMiddleware(server);

      // Git sync endpoints
      registerGitMiddleware(server);

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

          const tags: HtmlTagDescriptor[] = [];

          // Persistent webfont links so the custom font never flashes to a
          // fallback during the CSS HMR swap that follows each canvas mutation.
          const webfontHrefs = getWebfontHrefs();
          if (webfontHrefs.length > 0) {
            tags.push(
              { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' }, injectTo: 'head-prepend' },
              { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }, injectTo: 'head-prepend' },
            );
            for (const href of webfontHrefs) {
              tags.push({ tag: 'link', attrs: { rel: 'stylesheet', href }, injectTo: 'head-prepend' });
            }
          }

          tags.push({
            tag: 'script',
            attrs: {},
            children: fs.readFileSync(sketchpadBridgePath, 'utf-8'),
            injectTo: 'body',
          });

          return tags;
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
      // Comment thread JSON files are pure data — writing one must not reload
      // the user's app iframe (the anchor attribute change in the .tsx will
      // hot-reload on its own).
      const commentsDir = normalizePath(path.resolve(process.cwd(), 'src/comments'));
      if (file.startsWith(commentsDir)) {
        return [];
      }
    },
  };
}
