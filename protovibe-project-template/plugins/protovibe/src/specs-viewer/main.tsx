// plugins/protovibe/src/specs-viewer/main.tsx
// Entry of the read-only specs viewer, bundled by esbuild (React included) to
// dist/ui/specs-viewer.js and copied into the published site as
// /specs-viewer.js by backend/specs-publish.ts.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { SpecsViewerApp } from './SpecsViewerApp';

const root = document.getElementById('pv-specs-root') || document.body.appendChild(document.createElement('div'));
createRoot(root).render(<SpecsViewerApp />);
