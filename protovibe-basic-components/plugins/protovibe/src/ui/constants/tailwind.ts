// plugins/protovibe/src/ui/constants/tailwind.ts
import type { ThemeToken } from '../api/client';

function cssValueToPx(value: string, htmlFontSize: number): number {
  if (value.endsWith('rem')) return parseFloat(value) * htmlFontSize;
  if (value.endsWith('px')) return parseFloat(value);
  return parseFloat(value) * htmlFontSize;
}

function fmtPx(n: number): string {
  const r = Math.round(n * 10) / 10;
  return `${r}px`;
}

const sizingScale = [
  { val: 'auto', desc: 'auto' }, { val: 'full', desc: '100%' }, { val: 'screen', desc: '100vw/vh' }, 
  { val: 'min-content', desc: '' }, { val: 'max-content', desc: '' }, { val: 'fit-content', desc: '' },
  { val: '1/2', desc: '50%' }, { val: '1/3', desc: '33%' }, { val: '2/3', desc: '66%' },
  { val: '1/4', desc: '25%' }, { val: '3/4', desc: '75%' },
  { val: '0', desc: '0px' }, { val: 'px', desc: '1px' }, { val: '1', desc: '4px' }, { val: '2', desc: '8px' }, 
  { val: '4', desc: '16px' }, { val: '6', desc: '24px' }, { val: '8', desc: '32px' }, { val: '12', desc: '48px' }, 
  { val: '16', desc: '64px' }, { val: '24', desc: '96px' }, { val: '32', desc: '128px' }, { val: '48', desc: '192px' },
  { val: '64', desc: '256px' }, { val: '96', desc: '384px' }
];

export const SCALES = {
  spacing: [
    { val: '0', desc: '0px' }, { val: 'px', desc: '1px' }, { val: '0.5', desc: '2px' }, { val: '1', desc: '4px' }, 
    { val: '1.5', desc: '6px' }, { val: '2', desc: '8px' }, { val: '2.5', desc: '10px' }, { val: '3', desc: '12px' }, 
    { val: '4', desc: '16px' }, { val: '5', desc: '20px' }, { val: '6', desc: '24px' }, { val: '7', desc: '28px' }, { val: '8', desc: '32px' },
    { val: '10', desc: '40px' }, { val: '12', desc: '48px' }, { val: '16', desc: '64px' }, { val: '20', desc: '80px' }, 
    { val: '24', desc: '96px' }, { val: '32', desc: '128px' }, { val: '40', desc: '160px' }, { val: '48', desc: '192px' }, 
    { val: '64', desc: '256px' }, { val: 'auto', desc: 'auto' }
  ],
  fontFamily: [{ val: 'sans', desc: 'Sans' }, { val: 'serif', desc: 'Serif' }, { val: 'mono', desc: 'Mono' }],
  textSize: [
    { val: 'xs', desc: '12px' }, { val: 'sm', desc: '13px' }, { val: 'base', desc: '14px' }, { val: 'lg', desc: '18px' },
    { val: 'xl', desc: '20px' }, { val: '2xl', desc: '24px' }, { val: '3xl', desc: '30px' }, { val: '4xl', desc: '36px' },
    { val: '5xl', desc: '48px' }, { val: '6xl', desc: '60px' }, { val: '7xl', desc: '72px' }, { val: '8xl', desc: '96px' }
  ],
  size: sizingScale,
  radius: [
    { val: 'none', desc: '0px' }, { val: 'sm', desc: '4px' }, { val: 'DEFAULT', desc: '8px' },
    { val: 'md', desc: '12px' }, { val: 'lg', desc: '16px' }, { val: 'xl', desc: '20px' },
    { val: '2xl', desc: '24px' }, { val: '3xl', desc: '28px' }, { val: 'full', desc: '9999px' }
  ],
  borderWidth: [{ val: '0', desc: '0px' }, { val: 'DEFAULT', desc: '1px' }, { val: '2', desc: '2px' }, { val: '4', desc: '4px' }, { val: '8', desc: '8px' }],
  shadow: [{ val: 'sm', desc: 'Small' }, { val: 'DEFAULT', desc: 'Normal' }, { val: 'md', desc: 'Medium' }, { val: 'lg', desc: 'Large' }, { val: 'xl', desc: 'Extra Large' }, { val: '2xl', desc: '2XL' }, { val: 'inner', desc: 'Inner' }, { val: 'none', desc: 'None' }],
  opacity: [{ val: '0', desc: '0%' }, { val: '10', desc: '10%' }, { val: '25', desc: '25%' }, { val: '50', desc: '50%' }, { val: '75', desc: '75%' }, { val: '90', desc: '90%' }, { val: '100', desc: '100%' }],
  zIndex: [{ val: '0', desc: '' }, { val: '10', desc: '' }, { val: '20', desc: '' }, { val: '30', desc: '' }, { val: '40', desc: '' }, { val: '50', desc: '' }, { val: 'auto', desc: '' }],
  leading: [
    { val: 'none', desc: '1' }, { val: 'tight', desc: '1.25' }, { val: 'snug', desc: '1.375' },
    { val: 'normal', desc: '1.5' }, { val: 'relaxed', desc: '1.625' }, { val: 'loose', desc: '2' },
    { val: '3', desc: '12px' }, { val: '4', desc: '16px' }, { val: '5', desc: '20px' },
    { val: '6', desc: '24px' }, { val: '7', desc: '28px' }, { val: '8', desc: '32px' },
    { val: '9', desc: '36px' }, { val: '10', desc: '40px' },
  ],
  tracking: [
    { val: 'tighter', desc: '-0.05em' }, { val: 'tight', desc: '-0.025em' },
    { val: 'normal', desc: '0em' }, { val: 'wide', desc: '0.025em' },
    { val: 'wider', desc: '0.05em' }, { val: 'widest', desc: '0.1em' },
  ],
};

export function buildScalesFromTokens(tokens: ThemeToken[], htmlFontSize = 16): typeof SCALES {
  // ── Spacing ────────────────────────────────────────────────────────────────
  const spacingToken = tokens.find(t => t.name === 'spacing');
  const unit = spacingToken ? cssValueToPx(spacingToken.value, htmlFontSize) : 4;

  const spacingEntries: [string, number | null][] = [
    ['0', 0], ['px', 1], ['0.5', unit * 0.5], ['1', unit], ['1.5', unit * 1.5],
    ['2', unit * 2], ['2.5', unit * 2.5], ['3', unit * 3], ['4', unit * 4],
    ['5', unit * 5], ['6', unit * 6], ['7', unit * 7], ['8', unit * 8], ['10', unit * 10],
    ['12', unit * 12], ['16', unit * 16], ['20', unit * 20], ['24', unit * 24],
    ['32', unit * 32], ['40', unit * 40], ['48', unit * 48], ['64', unit * 64],
    ['auto', null],
  ];
  const spacing = spacingEntries.map(([val, px]) => ({
    val,
    desc: px === null ? 'auto' : fmtPx(px),
  }));

  const sizingNumeric: [string, number | null][] = [
    ['0', 0], ['px', 1], ['1', unit], ['2', unit * 2], ['4', unit * 4],
    ['6', unit * 6], ['8', unit * 8], ['12', unit * 12], ['16', unit * 16],
    ['24', unit * 24], ['32', unit * 32], ['48', unit * 48], ['64', unit * 64], ['96', unit * 96],
  ];
  const size = [
    { val: 'auto', desc: 'auto' }, { val: 'full', desc: '100%' }, { val: 'screen', desc: '100vw/vh' },
    { val: 'min-content', desc: '' }, { val: 'max-content', desc: '' }, { val: 'fit-content', desc: '' },
    { val: '1/2', desc: '50%' }, { val: '1/3', desc: '33%' }, { val: '2/3', desc: '66%' },
    { val: '1/4', desc: '25%' }, { val: '3/4', desc: '75%' },
    ...sizingNumeric.map(([val, px]) => ({ val, desc: px === null ? '' : fmtPx(px) })),
  ];

  // ── Radius ─────────────────────────────────────────────────────────────────
  // Token names: --radius (DEFAULT), --radius-sm, --radius-md, …
  const radiusTokens = tokens.filter(t => t.category === 'Radius');
  const radiusMap: Record<string, string> = {};
  radiusTokens.forEach(t => {
    const suffix = t.name.replace('radius', ''); // '' | '-sm' | '-md' …
    const val = suffix === '' ? 'DEFAULT' : suffix.slice(1);
    radiusMap[val] = t.value;
  });

  const radiusOrder = ['none', 'sm', 'DEFAULT', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', 'full'];
  const radius = radiusTokens.length > 0
    ? radiusOrder
        .filter(val => val === 'none' || val === 'full' || radiusMap[val])
        .map(val => {
          if (val === 'none') return { val: 'none', desc: '0px' };
          if (val === 'full') return { val: 'full', desc: '9999px' };
          return { val, desc: fmtPx(cssValueToPx(radiusMap[val], htmlFontSize)) };
        })
    : SCALES.radius;

  // ── Text size ──────────────────────────────────────────────────────────────
  // Token names: --text-xs, --text-sm, --text-base, …
  const textSizeTokens = tokens.filter(t => t.category === 'Font Size');
  const textSizeMap: Record<string, string> = {};
  textSizeTokens.forEach(t => { textSizeMap[t.name.replace('text-', '')] = t.value; });

  const textSizeOrder = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl'];
  const textSize = textSizeTokens.length > 0
    ? textSizeOrder
        .filter(val => textSizeMap[val])
        .map(val => ({ val, desc: fmtPx(cssValueToPx(textSizeMap[val], htmlFontSize)) }))
    : SCALES.textSize;

  // ── Leading (line-height) ──────────────────────────────────────────────────
  const leadingTokens = tokens.filter(t => t.name.startsWith('leading-'));
  const leadingMap: Record<string, string> = {};
  leadingTokens.forEach(t => { leadingMap[t.name.replace('leading-', '')] = t.value; });
  const leadingOrder = ['none', 'tight', 'snug', 'normal', 'relaxed', 'loose', '3', '4', '5', '6', '7', '8', '9', '10'];
  const leading = leadingTokens.length > 0
    ? leadingOrder
        .filter(val => val === 'none' || leadingMap[val])
        .map(val => ({ val, desc: val === 'none' ? '1' : (leadingMap[val] ?? val) }))
    : SCALES.leading;

  // ── Tracking (letter-spacing) ──────────────────────────────────────────────
  const trackingTokens = tokens.filter(t => t.name.startsWith('tracking-'));
  const trackingMap: Record<string, string> = {};
  trackingTokens.forEach(t => { trackingMap[t.name.replace('tracking-', '')] = t.value; });
  const trackingOrder = ['tighter', 'tight', 'normal', 'wide', 'wider', 'widest'];
  const tracking = trackingTokens.length > 0
    ? trackingOrder
        .filter(val => trackingMap[val])
        .map(val => ({ val, desc: trackingMap[val] ?? '' }))
    : SCALES.tracking;

  return { ...SCALES, spacing, size, radius, textSize, leading, tracking };
}

/** Re-orders a color options array so tokens whose `val` starts with `prefix` appear first. */
export function prioritizeColors<T extends { val: string }>(colors: T[], prefix: string): T[] {
  const top = colors.filter(c => c.val.startsWith(prefix));
  const rest = colors.filter(c => !c.val.startsWith(prefix));
  return [...top, ...rest];
}
