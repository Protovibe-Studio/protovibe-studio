import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SketchpadApp } from './components/SketchpadApp';
import '@/index.css';

createRoot(document.getElementById('sketchpad-root')!).render(
  <StrictMode>
    <SketchpadApp />
  </StrictMode>,
);
