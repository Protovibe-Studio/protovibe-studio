import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { StoreProvider } from './store.tsx';
import { ToastContainer } from '@/components/ui/toast-container';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
      <ToastContainer />
    </StoreProvider>
  </StrictMode>,
);
