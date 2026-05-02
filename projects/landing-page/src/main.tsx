import { StrictMode } from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import App from './App.tsx';
import { StoreProvider } from './store.tsx';
import { ToastContainer } from '@/components/ui/toast-container';
import './index.css';

const container = document.getElementById('root')!;

const tree = (
  <StrictMode>
    <StoreProvider>
      <App />
      <ToastContainer />
    </StoreProvider>
  </StrictMode>
);

if (container.hasChildNodes()) {
  hydrateRoot(container, tree);
} else {
  createRoot(container).render(tree);
}
