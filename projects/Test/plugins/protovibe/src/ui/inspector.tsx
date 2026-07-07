// plugins/protovibe/src/ui/inspector.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ProtovibeProvider } from './context/ProtovibeContext';
import { ProtovibeApp } from './ProtovibeApp';
import { TooltipLayer } from './components/Tooltip';

function init() {

  // Mount into the dedicated shell div in index.html
  let root = document.getElementById('protovibe-shell');
  if (!root) {
    // Fallback: create our own root (backwards-compat if index.html not updated yet)
    root = document.createElement('div');
    root.id = 'protovibe-shell';
    document.body.appendChild(root);
  }
  root.setAttribute('data-pv-ui', 'true');

  // Global styles scoped to the Protovibe inspector shell only. Keeps the
  // canvas / preview iframe untouched. Used by the rich-text BlockEditor so
  // <a> tags inside the inspector are legible on a dark background.
  if (!document.getElementById('protovibe-shell-styles')) {
    const style = document.createElement('style');
    style.id = 'protovibe-shell-styles';
    style.textContent = `
      [data-pv-ui] a,
      [data-pv-ui] a:visited {
        color: #18A0FB;
        text-decoration: underline;
        text-underline-offset: 2px;
      }
      [data-pv-ui] a:hover {
        color: #0D8CE6;
      }
    `;
    document.head.appendChild(style);
  }

  const reactRoot = createRoot(root);
  reactRoot.render(
    <ProtovibeProvider>
      <ProtovibeApp />
      <TooltipLayer />
    </ProtovibeProvider>
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
