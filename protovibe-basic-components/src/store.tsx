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
  const knownPaths = ['/dashboard', '/employees', '/positions', '/departments'];
  const initialPath = knownPaths.includes(window.location.pathname) ? window.location.pathname : '/dashboard';
  const [path, setPath] = useState(initialPath);
  const [toast, setToast] = useState<ToastOptions | null>(null);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (newPath: string) => {
    window.history.pushState({}, '', newPath);
    setPath(newPath);
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
