import { createContext, useContext } from 'react';

export const PathContext = createContext<string>('/');
export const usePath = () => useContext(PathContext);
