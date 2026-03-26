// plugins/protovibe/src/ui/inspector.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ProtovibeProvider } from './context/ProtovibeContext';
import { ProtovibeApp } from './ProtovibeApp';

function init() {
  // Inject scoped box-sizing reset so the inspector layout is not affected by
  // whatever the host page sets (or omits) for box-sizing.
  if (!document.getElementById('pv-box-sizing-reset')) {
    const style = document.createElement('style');
    style.id = 'pv-box-sizing-reset';
    style.textContent = `[data-pv-ui="true"], [data-pv-ui="true"] *, [data-pv-ui="true"] *::before, [data-pv-ui="true"] *::after { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }`;
    document.head.appendChild(style);
  }

  // Mount into the dedicated shell div in index.html
  let root = document.getElementById('protovibe-shell');
  if (!root) {
    // Fallback: create our own root (backwards-compat if index.html not updated yet)
    root = document.createElement('div');
    root.id = 'protovibe-shell';
    document.body.appendChild(root);
  }
  root.setAttribute('data-pv-ui', 'true');

  const reactRoot = createRoot(root);
  reactRoot.render(
    <ProtovibeProvider>
      <ProtovibeApp />
    </ProtovibeProvider>
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
