import { createContext } from 'react';

export interface SelectDropdownSearchContextValue {
  query: string;
  setQuery: (q: string) => void;
}

export const SelectDropdownSearchContext = createContext<SelectDropdownSearchContextValue | null>(null);
