import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import App from './App';
import { StoreProvider } from './store';

export function render(): string {
  return renderToString(
    <StrictMode>
      <StoreProvider>
        <App />
      </StoreProvider>
    </StrictMode>
  );
}
