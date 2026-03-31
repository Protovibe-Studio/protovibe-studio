// plugins/protovibe/src/ui/components/VisualEditor.tsx
import React, { useEffect, useState } from 'react';
import { useProtovibe } from '../context/ProtovibeContext';
import { filterClassesByContext, extractVisualValues } from '../utils/tailwind';

import { Spacing } from './visual/Spacing';
import { Layout } from './visual/Layout';
import { Typography } from './visual/Typography';
import { SizePosition } from './visual/SizePosition';
import { Position } from './visual/Position';
import { Effects } from './visual/Effects';

export const VisualEditor: React.FC = () => {
  const { activeData, activeModifiers, currentBaseTarget } = useProtovibe();

  // Re-render whenever the target element's class attribute changes (e.g. after HMR),
  // so domV never goes stale after a class is added or removed from source.
  const [, setDomTick] = useState(0);
  useEffect(() => {
    if (!currentBaseTarget) return;
    const observer = new MutationObserver(() => setDomTick(n => n + 1));
    observer.observe(currentBaseTarget, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [currentBaseTarget]);

  if (!activeData) return null;

  const flatClasses = activeData.parsedClasses ? Object.values(activeData.parsedClasses).flat().map((c: any) => c.cls) : [];
  const filteredClasses = filterClassesByContext(flatClasses, activeModifiers);
  const v = extractVisualValues(filteredClasses);

  const domClasses = currentBaseTarget?.getAttribute('class')?.split(/\s+/).filter(Boolean) || [];
  const filteredDomClasses = filterClassesByContext(domClasses, activeModifiers);
  const domV = extractVisualValues(filteredDomClasses);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <Layout v={v} domV={domV} />
      <Spacing v={v} domV={domV} />
      <Typography v={v} domV={domV} />
      <SizePosition v={v} domV={domV} />
      <Position v={v} domV={domV} />
      <Effects v={v} domV={domV} />
    </div>
  );
};
