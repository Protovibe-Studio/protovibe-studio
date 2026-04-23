import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

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
  queryParams: Record<string, string>;
  toast: ToastOptions | null;
};

type StoreContextType = {
  state: State;
  navigate: (path: string) => void;
  setQueryParams: (params: Record<string, string | null>) => void;
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
};

const StoreContext = createContext<StoreContextType | null>(null);

const getQueryParamsFromURL = (): Record<string, string> => {
  const params = new URLSearchParams(window.location.search);
  const obj: Record<string, string> = {};
  params.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
};

export const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [queryParams, setQueryParamsState] = useState<Record<string, string>>(getQueryParamsFromURL);
  const [toast, setToast] = useState<ToastOptions | null>(null);

  // Derive the active path from the 'page' query param
  const path = useMemo(() => {
    const page = queryParams.page;
    return page && /^[a-zA-Z0-9-]+$/.test(page) ? `/${page}` : '/dashboard';
  }, [queryParams.page]);

  const setQueryParams = useCallback((updates: Record<string, string | null>) => {
    const url = new URL(window.location.href);
    let changed = false;

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        if (url.searchParams.has(key)) {
          url.searchParams.delete(key);
          changed = true;
        }
      } else {
        if (url.searchParams.get(key) !== value) {
          url.searchParams.set(key, value);
          changed = true;
        }
      }
    });

    if (changed) {
      window.history.pushState({}, '', url.toString());
      setQueryParamsState(getQueryParamsFromURL());
      
      // Notify parent frame (Protovibe toolbar) of URL change
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'PV_URL_CHANGE', path: url.pathname + url.search + url.hash }, '*');
      }
    }
  }, []);

  const navigate = useCallback((newPath: string) => {
    const page = newPath.replace('/', '');
    setQueryParams({ page });
  }, [setQueryParams]);

  useEffect(() => {
    const handlePopState = () => {
      setQueryParamsState(getQueryParamsFromURL());
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

  const showToast = useCallback((options: ToastOptions) => {
    setToast(options);
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <StoreContext.Provider value={{ state: { path, queryParams, toast }, navigate, setQueryParams, showToast, hideToast }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};
