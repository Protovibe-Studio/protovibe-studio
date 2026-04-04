import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ToastVariant = 'success' | 'destructive' | 'neutral' | 'warning';

export type ToastOptions = {
  variant: ToastVariant;
  heading: string;
  secondaryText?: string;
  actionLabel?: string;
  onAction?: () => void;
  persistent?: boolean;
};

type State = {
  path: string;
  toast: ToastOptions | null;
};

type StoreContextType = {
  state: State;
  navigate: (path: string) => void;
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
};

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const knownPages = ['dashboard', 'employees', 'positions', 'departments'];

  const getPageFromURL = () => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    return page && knownPages.includes(page) ? `/${page}` : '/dashboard';
  };

  const [path, setPath] = useState(getPageFromURL);
  const [toast, setToast] = useState<ToastOptions | null>(null);

  useEffect(() => {
    const handlePopState = () => {
      setPath(getPageFromURL());
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'PV_URL_CHANGE',
          path: window.location.pathname + window.location.search + window.location.hash,
        }, '*');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (newPath: string) => {
    const page = newPath.replace('/', '');
    const url = new URL(window.location.href);
    url.searchParams.set('page', page);
    window.history.pushState({}, '', url.toString());
    setPath(newPath);
    // Notify parent frame (Protovibe toolbar) of URL change
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'PV_URL_CHANGE', path: url.pathname + url.search + url.hash }, '*');
    }
  };

  const showToast = useCallback((options: ToastOptions) => {
    setToast(options);
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <StoreContext.Provider value={{ state: { path, toast }, navigate, showToast, hideToast }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};
