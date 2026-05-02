import { StrictMode } from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import { Root } from './Root';
import { StoreProvider } from './store.tsx';
import { ToastContainer } from '@/components/ui/toast-container';
import './index.css';

const container = document.getElementById('root')!;
const path = window.location.pathname;

const tree = (
  <StrictMode>
    <StoreProvider>
      <Root path={path} />
      <ToastContainer />
    </StoreProvider>
  </StrictMode>
);

if (container.hasChildNodes()) {
  hydrateRoot(container, tree);
} else {
  createRoot(container).render(tree);
}
