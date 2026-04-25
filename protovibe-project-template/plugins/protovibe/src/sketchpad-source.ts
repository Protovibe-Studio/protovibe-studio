import fs from 'fs';
import path from 'path';
import type { ViteDevServer } from 'vite';
import type { HtmlTagDescriptor } from 'vite';
import {
  handleSketchpadList,
  handleSketchpadCreate,
  handleSketchpadDelete,
  handleSketchpadRename,
  handleFrameCreate,
  handleFrameDelete,
  handleFrameDeleteMulti,
  handleFrameDuplicate,
  handleFrameDuplicateMulti,
  handleFrameRename,
  handleFrameResize,
  handleFrameUpdatePosition,
  handleFrameUpdatePositionMulti,
  handleSketchpadUpdateElementPosition,
  handleSketchpadUpdateElementSize,
} from './backend/sketchpad-server';

/**
 * Register all sketchpad-related middleware on the Vite dev server.
 */
export function registerSketchpadMiddleware(server: ViteDevServer) {
  server.middlewares.use('/__sketchpad-list', handleSketchpadList);
  server.middlewares.use('/__sketchpad-create', handleSketchpadCreate);
  server.middlewares.use('/__sketchpad-delete', handleSketchpadDelete);
  server.middlewares.use('/__sketchpad-rename', handleSketchpadRename);
  server.middlewares.use('/__frame-create', handleFrameCreate);
  server.middlewares.use('/__frame-delete', handleFrameDelete);
  server.middlewares.use('/__frame-delete-multi', handleFrameDeleteMulti);
  server.middlewares.use('/__frame-duplicate', handleFrameDuplicate);
  server.middlewares.use('/__frame-duplicate-multi', handleFrameDuplicateMulti);
  server.middlewares.use('/__frame-rename', handleFrameRename);
  server.middlewares.use('/__frame-resize', handleFrameResize);
  server.middlewares.use('/__frame-update-position', handleFrameUpdatePosition);
  server.middlewares.use('/__frame-update-position-multi', handleFrameUpdatePositionMulti);
  server.middlewares.use('/__sketchpad-update-element-position', handleSketchpadUpdateElementPosition);
  server.middlewares.use('/__sketchpad-update-element-size', handleSketchpadUpdateElementSize);
}

/**
 * Return the HTML tag injections for sketchpad.html.
 * Injects the sketchpad-specific bridge and the sketchpad entry point.
 */
export function getSketchpadHtmlInjections(distDir: string, srcDir: string): HtmlTagDescriptor[] {
  const bridgePath = path.resolve(distDir, 'ui/sketchpad-bridge.js');
  if (!fs.existsSync(bridgePath)) {
    console.warn('⚠️ Protovibe sketchpad bridge bundle not found at ' + bridgePath);
    return [];
  }

  const injections: HtmlTagDescriptor[] = [
    {
      tag: 'script',
      attrs: {},
      children: fs.readFileSync(bridgePath, 'utf-8'),
      injectTo: 'body',
    },
  ];

  const sketchpadEntryPath = path.resolve(srcDir, 'sketchpads/sketchpad-main.tsx');
  if (fs.existsSync(sketchpadEntryPath)) {
    injections.push({
      tag: 'script',
      attrs: { type: 'module', src: `/@fs${sketchpadEntryPath}` },
      injectTo: 'body',
    });
  } else {
    console.warn('⚠️ Protovibe sketchpad entry not found at ' + sketchpadEntryPath);
  }

  return injections;
}
