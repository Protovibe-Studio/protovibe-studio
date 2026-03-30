// plugins/protovibe/src/ui/inspector.tsx
import './shell.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ProtovibeProvider } from './context/ProtovibeContext';
import { ProtovibeApp } from './ProtovibeApp';

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
