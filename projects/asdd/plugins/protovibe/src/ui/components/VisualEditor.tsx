// plugins/protovibe/src/ui/components/VisualEditor.tsx
import React from 'react';
import { useProtovibe } from '../context/ProtovibeContext';
import { filterClassesByContext, extractVisualValues } from '../utils/tailwind';

import { Spacing } from './visual/Spacing';
import { Layout } from './visual/Layout';
import { Typography } from './visual/Typography';
import { SizePosition } from './visual/SizePosition';
import { Effects } from './visual/Effects';

export const VisualEditor: React.FC = () => {
  const { activeData, activeModifiers } = useProtovibe();

  if (!activeData) return null;

  const flatClasses = activeData.parsedClasses ? Object.values(activeData.parsedClasses).flat().map((c: any) => c.cls) : [];
  const filteredClasses = filterClassesByContext(flatClasses, activeModifiers);
  const v = extractVisualValues(filteredClasses);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <Spacing v={v} />
      <Layout v={v} />
      <SizePosition v={v} />
      <Typography v={v} />
      <Effects v={v} />
    </div>
  );
};
