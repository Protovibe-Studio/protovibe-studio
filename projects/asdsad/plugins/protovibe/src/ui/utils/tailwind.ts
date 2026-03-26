// plugins/protovibe/src/ui/utils/tailwind.ts

export interface ClassInfo {
  modifiers: string[];
  base: string;
  original: string;
}

export function parseModifiers(cls: string): ClassInfo {
  const parts = cls.split(':');
  const base = parts.pop() || '';
  return { modifiers: parts, base, original: cls };
}

export function extractAvailableModifiers(classesArray: string[]) {
  const dataAttrs: Record<string, string[]> = {}; 
  
  classesArray.forEach(cls => {
    const { modifiers } = parseModifiers(cls);
    modifiers.forEach(mod => {
      const match = mod.match(/^data-\[([^=]+)=([^\]]+)\]$/);
      if (match) {
        const key = match[1];
        const val = match[2];
        if (!dataAttrs[key]) dataAttrs[key] = [];
        if (!dataAttrs[key].includes(val)) dataAttrs[key].push(val);
      }
    });
  });
  
  return dataAttrs;
}

export interface ActiveModifiers {
  interaction: string[];
  breakpoint: string | null;
  dataAttrs: Record<string, string>;
}

export function filterClassesByContext(classesArray: string[], activeModifiers: ActiveModifiers) {
  const expectedDataMods = Object.entries(activeModifiers.dataAttrs)
    .filter(([k, v]) => v !== null && v !== 'none')
    .map(([k, v]) => `data-[${k}=${v}]`);
    
  const expectedBp = activeModifiers.breakpoint && activeModifiers.breakpoint !== 'none' ? activeModifiers.breakpoint : null;
  const expectedInteractions = activeModifiers.interaction || []; 
  
  return classesArray.filter(cls => {
    const { modifiers } = parseModifiers(cls);
    
    // 1. Check breakpoint
    const bps = ['sm', 'md', 'lg', 'xl', '2xl'];
    const clsBp = modifiers.find(m => bps.includes(m));
    if ((expectedBp && clsBp !== expectedBp) || (!expectedBp && clsBp)) return false;
    
    // 2. Check data attrs
    const clsDataMods = modifiers.filter(m => m.startsWith('data-['));
    if (expectedDataMods.length !== clsDataMods.length) return false;
    const hasAllDataMods = expectedDataMods.every(m => clsDataMods.includes(m));
    if (!hasAllDataMods) return false;
    
    // 3. Check interactions
    const interactions = ['hover', 'active', 'focus', 'visited', 'disabled'];
    const clsInteractions = modifiers.filter(m => interactions.includes(m));
    if (expectedInteractions.length !== clsInteractions.length) return false;
    const hasAllInteractions = expectedInteractions.every(m => clsInteractions.includes(m));
    if (!hasAllInteractions) return false;
    
    return true;
  }).map(cls => parseModifiers(cls)); 
}

export function buildContextPrefix(activeModifiers: ActiveModifiers) {
  let p = '';
  if (activeModifiers.breakpoint && activeModifiers.breakpoint !== 'none') {
    p += `${activeModifiers.breakpoint}:`;
  }
  for (const [k, v] of Object.entries(activeModifiers.dataAttrs)) {
    if (v && v !== 'none') p += `data-[${k}=${v}]:`;
  }
  if (activeModifiers.interaction && activeModifiers.interaction.length > 0) {
    activeModifiers.interaction.forEach(i => p += `${i}:`);
  }
  return p;
}

export function extractVisualValues(classesArray: (string | ClassInfo)[]) {
  const v: Record<string, any> = {
    mt: '-', mr: '-', mb: '-', ml: '-', pt: '-', pr: '-', pb: '-', pl: '-',
    display: '', direction: '', justify: '', align: '', wrap: '', gap: '', spaceX: '', spaceY: '',
    w: '', h: '', minW: '', minH: '', maxW: '', maxH: '',
    position: '', top: '', right: '', bottom: '', left: '', z: '',
    fontFamily: '', fontWeight: '', textAlign: '', textDecoration: '', textSize: '', textColor: '',
    bg: '', fill: '', radius: '', borderWidth: '', borderColor: '', opacity: '', shadow: '',
    flex: '', flexGrow: '', flexShrink: '', selfAlign: ''
  };
  
  const orig: Record<string, any> = { margin: [], padding: [] };
  const weights = ['thin', 'extralight', 'light', 'normal', 'medium', 'semibold', 'bold', 'extrabold', 'black'];
  const textAligns = ['left', 'center', 'right', 'justify', 'start', 'end'];
  const decors = ['underline', 'overline', 'line-through', 'no-underline'];
  const sizes = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl'];
  
  const displays = ['block', 'flex', 'grid', 'inline-block', 'hidden', 'inline-flex', 'inline'];
  const directions = ['flex-row', 'flex-col', 'flex-row-reverse', 'flex-col-reverse'];
  const justifies = ['justify-start', 'justify-end', 'justify-center', 'justify-between', 'justify-around'];
  const aligns = ['items-start', 'items-end', 'items-center', 'items-baseline', 'items-stretch'];
  const selfAligns = ['self-auto', 'self-start', 'self-center', 'self-end', 'self-stretch'];
  const wraps = ['flex-wrap', 'flex-nowrap', 'flex-wrap-reverse'];
  const positions = ['static', 'relative', 'absolute', 'fixed', 'sticky'];

  const flexes = ['flex-1', 'flex-auto', 'flex-initial', 'flex-none'];
  const grows = ['grow', 'grow-0'];
  const shrinks = ['shrink', 'shrink-0'];

  classesArray.forEach(classObj => {
    const cls = typeof classObj === 'string' ? classObj : classObj.base;
    const originalClass = typeof classObj === 'string' ? classObj : classObj.original;

    if (/^m[trblxy]?-/.test(cls) || cls.startsWith('m-')) {
      orig.margin.push(originalClass);
      if (cls.startsWith('m-')) { const val = cls.slice(2); v.mt=val; v.mr=val; v.mb=val; v.ml=val; }
      else if (cls.startsWith('my-')) { const val = cls.slice(3); v.mt=val; v.mb=val; }
      else if (cls.startsWith('mx-')) { const val = cls.slice(3); v.ml=val; v.mr=val; }
      else if (cls.startsWith('mt-')) v.mt = cls.slice(3);
      else if (cls.startsWith('mr-')) v.mr = cls.slice(3);
      else if (cls.startsWith('mb-')) v.mb = cls.slice(3);
      else if (cls.startsWith('ml-')) v.ml = cls.slice(3);
    }
    else if (/^p[trblxy]?-/.test(cls) || cls.startsWith('p-')) {
      orig.padding.push(originalClass);
      if (cls.startsWith('p-')) { const val = cls.slice(2); v.pt=val; v.pr=val; v.pb=val; v.pl=val; }
      else if (cls.startsWith('py-')) { const val = cls.slice(3); v.pt=val; v.pb=val; }
      else if (cls.startsWith('px-')) { const val = cls.slice(3); v.pl=val; v.pr=val; }
      else if (cls.startsWith('pt-')) v.pt = cls.slice(3);
      else if (cls.startsWith('pr-')) v.pr = cls.slice(3);
      else if (cls.startsWith('pb-')) v.pb = cls.slice(3);
      else if (cls.startsWith('pl-')) v.pl = cls.slice(3);
    }
    else if (cls.startsWith('w-')) { v.w = cls.replace('w-', ''); orig.w_original = originalClass; }
    else if (cls.startsWith('h-')) { v.h = cls.replace('h-', ''); orig.h_original = originalClass; }
    else if (cls.startsWith('min-w-')) { v.minW = cls.replace('min-w-', ''); orig.minW_original = originalClass; }
    else if (cls.startsWith('min-h-')) { v.minH = cls.replace('min-h-', ''); orig.minH_original = originalClass; }
    else if (cls.startsWith('max-w-')) { v.maxW = cls.replace('max-w-', ''); orig.maxW_original = originalClass; }
    else if (cls.startsWith('max-h-')) { v.maxH = cls.replace('max-h-', ''); orig.maxH_original = originalClass; }
    else if (positions.includes(cls)) { v.position = cls; orig.position_original = originalClass; }
    else if (cls.startsWith('top-')) { v.top = cls.replace('top-', ''); orig.top_original = originalClass; }
    else if (cls.startsWith('right-')) { v.right = cls.replace('right-', ''); orig.right_original = originalClass; }
    else if (cls.startsWith('bottom-')) { v.bottom = cls.replace('bottom-', ''); orig.bottom_original = originalClass; }
    else if (cls.startsWith('left-')) { v.left = cls.replace('left-', ''); orig.left_original = originalClass; }
    else if (cls.startsWith('z-')) { v.z = cls.replace('z-', ''); orig.z_original = originalClass; }
    else if (displays.includes(cls)) { v.display = cls; orig.display_original = originalClass; }
    else if (flexes.includes(cls)) { v.flex = cls; orig.flex_original = originalClass; }
    else if (grows.includes(cls)) { v.flexGrow = cls; orig.flexGrow_original = originalClass; }
    else if (shrinks.includes(cls)) { v.flexShrink = cls; orig.flexShrink_original = originalClass; }
    else if (directions.includes(cls)) { v.direction = cls; orig.direction_original = originalClass; }
    else if (justifies.includes(cls)) { v.justify = cls; orig.justify_original = originalClass; }
    else if (aligns.includes(cls)) { v.align = cls; orig.align_original = originalClass; }
    else if (selfAligns.includes(cls)) { v.selfAlign = cls; orig.selfAlign_original = originalClass; }
    else if (wraps.includes(cls)) { v.wrap = cls; orig.wrap_original = originalClass; }
    else if (cls.startsWith('gap-')) { v.gap = cls.replace('gap-', ''); orig.gap_original = originalClass; }
    else if (cls.startsWith('space-x-')) { v.spaceX = cls.replace('space-x-', ''); orig.spaceX_original = originalClass; }
    else if (cls.startsWith('space-y-')) { v.spaceY = cls.replace('space-y-', ''); orig.spaceY_original = originalClass; }
    else if (decors.includes(cls)) { v.textDecoration = cls; orig.textDecoration_original = originalClass; }
    else if (cls.startsWith('font-')) {
      const val = cls.replace('font-', '');
      if (weights.includes(val) || val.startsWith('[')) { v.fontWeight = val; orig.fontWeight_original = originalClass; }
      else { v.fontFamily = val; orig.fontFamily_original = originalClass; }
    }
    else if (cls.startsWith('text-')) {
      const val = cls.replace('text-', '');
      if (textAligns.includes(val)) { v.textAlign = val; orig.textAlign_original = originalClass; }
      else if (sizes.includes(val) || /^\[[0-9.]+(px|rem|em|%)\]$/.test(val)) { v.textSize = val; orig.textSize_original = originalClass; }
      else { v.textColor = val; orig.textColor_original = originalClass; }
    }
    else if (cls.startsWith('bg-')) { v.bg = cls.replace('bg-', ''); orig.bg_original = originalClass; }
    else if (cls.startsWith('fill-')) { v.fill = cls.replace('fill-', ''); orig.fill_original = originalClass; }
    else if (cls.startsWith('rounded')) { v.radius = cls === 'rounded' ? 'DEFAULT' : cls.replace('rounded-', ''); orig.radius_original = originalClass; }
    else if (cls.startsWith('border')) {
      if (/^border-(0|2|4|8)$/.test(cls) || cls === 'border' || /^border-\[.*(?:px|rem|em)\]$/.test(cls)) {
        v.borderWidth = cls === 'border' ? 'DEFAULT' : cls.replace('border-', '');
        orig.borderWidth_original = originalClass;
      } else if (cls.startsWith('border-')) { v.borderColor = cls.replace('border-', ''); orig.borderColor_original = originalClass; }
    }
    else if (cls.startsWith('opacity-')) { v.opacity = cls.replace('opacity-', ''); orig.opacity_original = originalClass; }
    else if (cls.startsWith('shadow')) { v.shadow = cls === 'shadow' ? 'DEFAULT' : cls.replace('shadow-', ''); orig.shadow_original = originalClass; }
  });

  return { ...v, ...orig, origMargin: orig.margin, origPadding: orig.padding };
}

export function computeOptimalSpacing(prefix: string, t: string, r: string, b: string, l: string) {
  let classes = [];
  if (t && t === r && t === b && t === l) classes.push(`${prefix}-${t}`);
  else {
    if (t && t === b) classes.push(`${prefix}y-${t}`);
    else {
      if (t) classes.push(`${prefix}t-${t}`);
      if (b) classes.push(`${prefix}b-${b}`);
    }
    if (l && l === r) classes.push(`${prefix}x-${l}`);
    else {
      if (l) classes.push(`${prefix}l-${l}`);
      if (r) classes.push(`${prefix}r-${r}`);
    }
  }
  return classes.join(' ');
}

export const makeSafe = (v: string) => {
  if (!v) return null;
  const s = String(v).trim();
  if (!s || s === '-') return null;
  
  if (/^[0-9.]+(px|rem|em|vh|vw|%)$/.test(s)) return `[${s}]`;
  if (/^(#|rgb|rgba|hsl)/.test(s)) return `[${s}]`;
  return s;
};

export const cleanVal = (val: string) => (val && val !== '-') ? val.replace(/^\[|\]$/g, '') : '';
