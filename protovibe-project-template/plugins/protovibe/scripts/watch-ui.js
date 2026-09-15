import * as esbuild from 'esbuild';

function makeWatchPlugin(label) {
  return {
    name: 'watch-plugin',
    setup(build) {
      build.onStart(() => {
        console.log(`[${new Date().toLocaleTimeString()}] [${label}] Build started...`);
      });
      build.onEnd(result => {
        if (result.errors.length > 0) {
          console.error(`[${new Date().toLocaleTimeString()}] [${label}] Build failed:`, result.errors);
        } else {
          console.log(`[${new Date().toLocaleTimeString()}] [${label}] Build succeeded`);
        }
      });
    },
  };
}

async function watch() {
  const inspectorCtx = await esbuild.context({
    entryPoints: ['src/ui/inspector.tsx'],
    bundle: true,
    minify: false,
    outfile: 'dist/ui/inspector.js',
    define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [makeWatchPlugin('inspector')],
  });

  const bridgeCtx = await esbuild.context({
    entryPoints: ['src/ui/bridge.ts'],
    bundle: true,
    minify: false,
    outfile: 'dist/ui/bridge.js',
    define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [makeWatchPlugin('bridge')],
  });

  const sketchpadBridgeCtx = await esbuild.context({
    entryPoints: ['src/ui/sketchpad-bridge.ts'],
    bundle: true,
    minify: false,
    outfile: 'dist/ui/sketchpad-bridge.js',
    define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [makeWatchPlugin('sketchpad-bridge')],
  });

  const specsViewerCtx = await esbuild.context({
    entryPoints: ['src/specs-viewer/main.tsx'],
    bundle: true,
    minify: false,
    outfile: 'dist/ui/specs-viewer.js',
    define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [makeWatchPlugin('specs-viewer')],
  });

  await inspectorCtx.watch();
  await bridgeCtx.watch();
  await sketchpadBridgeCtx.watch();
  await specsViewerCtx.watch();
  console.log('Watching for UI changes (inspector + bridge + sketchpad-bridge + specs-viewer)...');
}

watch().catch(err => {
  console.error(err);
  process.exit(1);
});
