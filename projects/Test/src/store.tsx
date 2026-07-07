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

export type Minion = {
  id: string;
  name: string;
  division: string;
  background: string;
  specialty: string;
  assignments: number;
  recruited: string;
  status: 'Active' | 'On Mission' | 'Recovering';
};

export type NewMinionInput = {
  name: string;
  division: string;
  background: string;
  specialty: string;
};

type State = {
  path: string;
  queryParams: Record<string, string>;
  toast: ToastOptions | null;
  minions: Minion[];
};

type StoreContextType = {
  state: State;
  navigate: (path: string) => void;
  setQueryParams: (params: Record<string, string | null>) => void;
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
  addMinion: (input: NewMinionInput) => void;
  updateMinion: (id: string, patch: Partial<Omit<Minion, 'id'>>) => void;
};

const DIVISION_LABELS: Record<string, string> = {
  'field-ops': 'Field Operations',
  'laser-div': 'Laser Division',
  'espionage': 'Espionage',
  'software-dev': 'Software Development',
  'doomsday-rd': 'Doomsday R&D',
  'lair-maint': 'Lair Maintenance',
};

const DEFAULT_MINIONS: Minion[] = [
  { id: 'm1', name: 'Bob #427', division: 'Field Operations', background: 'Former mall security guard with a passion for cone-shaped hats.', specialty: 'Henchwork', assignments: 3, recruited: '12/02/2025', status: 'Active' },
  { id: 'm2', name: 'Dr. Klaus Vexler', division: 'Doomsday R&D', background: 'Disgraced physicist obsessed with weather control devices.', specialty: 'Mad Science', assignments: 2, recruited: '04/01/2025', status: 'On Mission' },
  { id: 'm3', name: 'Mira "Whisper" Kovac', division: 'Espionage', background: 'Ex-circus contortionist turned infiltration specialist.', specialty: 'Stealth', assignments: 5, recruited: '21/03/2025', status: 'Active' },
  { id: 'm4', name: 'Greg the Reliable', division: 'Lair Maintenance', background: 'Plumber by day, lava-pit technician by night.', specialty: 'Maintenance', assignments: 1, recruited: '08/04/2025', status: 'Recovering' },
  { id: 'm5', name: 'Captain Zara Flux', division: 'Laser Division', background: 'Decommissioned naval officer with a flair for theatrical lighting.', specialty: 'Beam Calibration', assignments: 4, recruited: '17/02/2025', status: 'Active' },
];

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
  const [minions, setMinions] = useState<Minion[]>(DEFAULT_MINIONS);

  const updateMinion = useCallback((id: string, patch: Partial<Omit<Minion, 'id'>>) => {
    setMinions(prev => prev.map(m => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const addMinion = useCallback((input: NewMinionInput) => {
    const today = new Date();
    const recruited = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const division = DIVISION_LABELS[input.division] || input.division;
    setMinions(prev => [
      {
        id: `m${Date.now()}`,
        name: input.name,
        division,
        background: input.background,
        specialty: input.specialty,
        assignments: 0,
        recruited,
        status: 'Active',
      },
      ...prev,
    ]);
  }, []);

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
    <StoreContext.Provider value={{ state: { path, queryParams, toast, minions }, navigate, setQueryParams, showToast, hideToast, addMinion, updateMinion }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};
