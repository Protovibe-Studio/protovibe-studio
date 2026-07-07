import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { protovibePlugin } from 'vite-plugin-protovibe';

export default defineConfig(({ command }) => {
  return {
    plugins: [react() as any, tailwindcss(), protovibePlugin()],
    
    // Only apply pre-bundling rules when running the dev server
    optimizeDeps: command === 'serve' ? {
      entries: [
        'index.html',
        'plugins/protovibe/src/ui/inspector.tsx',
        'plugins/protovibe/src/ui/previewer-entry.tsx',
        'plugins/protovibe/src/sketchpads/sketchpad-main.tsx'
      ],
      include: [
        'react', 
        'react-dom', 
        'react-dom/client', 
        'react/jsx-runtime', 
        'react/jsx-dev-runtime'
      ],
    } : undefined,

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});