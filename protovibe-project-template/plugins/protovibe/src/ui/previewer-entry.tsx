// plugins/protovibe/src/ui/previewer-entry.tsx
// Injected as a module script into components.html by protovibe-source.ts.
// Creates an isolated React root for the ProtovibePreviewer overlay so it
// doesn't interfere with the user's own React tree but still runs inside
// the same Vite context (allowing import.meta.glob and shared React instance).
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ProtovibePreviewer } from './ProtovibePreviewer';
import '@/index.css';

createRoot(document.getElementById('pv-previewer-root')!).render(<ProtovibePreviewer />);
