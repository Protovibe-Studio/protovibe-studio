import { useMemo } from 'react';
import { useProtovibe } from '../context/ProtovibeContext';
import { buildScalesFromTokens } from '../constants/tailwind';

export function useScales() {
  const { themeTokens, htmlFontSize } = useProtovibe();
  return useMemo(() => buildScalesFromTokens(themeTokens, htmlFontSize), [themeTokens, htmlFontSize]);
}
