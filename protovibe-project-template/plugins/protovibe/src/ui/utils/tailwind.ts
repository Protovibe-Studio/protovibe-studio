// plugins/protovibe/src/ui/utils/tailwind.ts

export interface ClassInfo {
  modifiers: string[];
  base: string;
  original: string;
}

export function parseModifiers(cls: string): ClassInfo {
  // Split on ':' only when NOT inside square brackets (arbitrary values like
  // bg-[length:100px_100px] or bg-[url('...')] contain colons that must be preserved).
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  for (let i = 0; i < cls.length; i++) {
    const ch = cls[i];
    if (ch === '[') depth++;
    else if (ch === ']') depth--;

    if (ch === ':' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);

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

export function extractVisualValues(classesArray: (string | ClassInfo)[], textSizes?: string[]) {
  const v: Record<string, any> = {
    mt: '-', mr: '-', mb: '-', ml: '-', pt: '-', pr: '-', pb: '-', pl: '-',
    display: '', direction: '', justify: '', align: '', wrap: '', gap: '', spaceX: '', spaceY: '',
    gridCols: '', gridRows: '', gridFlow: '', justifyItems: '', alignContent: '',
    w: '', h: '', minW: '', minH: '', maxW: '', maxH: '', aspectRatio: '',
    position: '', top: '', right: '', bottom: '', left: '', z: '',
    fontFamily: '', fontWeight: '', textAlign: '', textDecoration: '', fontStyle: '', textTransform: '', textWrap: '', textSize: '', textColor: '', leading: '', tracking: '',
    bg: '', bgImage: '', bgSize: '', bgPosition: '', bgRepeat: '', fill: '', radius: '', radiusTL: '', radiusTR: '', radiusBR: '', radiusBL: '', borderWidth: '', borderT: '', borderR: '', borderB: '', borderL: '', borderColor: '', borderColorT: '', borderColorR: '', borderColorB: '', borderColorL: '', opacity: '', shadow: '', insetShadow: '',
    flex: '', flexGrow: '', flexShrink: '', selfAlign: ''
  };
  
  const orig: Record<string, any> = { margin: [], padding: [] };
  const weights = ['thin', 'extralight', 'light', 'normal', 'medium', 'semibold', 'bold', 'extrabold', 'black'];
  const textAligns = ['left', 'center', 'right', 'justify', 'start', 'end'];
  const decors = ['underline', 'overline', 'line-through', 'no-underline'];
  const sizes = textSizes ?? ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl'];
  
  const displays = ['inline-block', 'inline-flex', 'inline-grid', 'inline', 'block', 'flex', 'grid', 'hidden'];
  const directions = ['flex-row', 'flex-col', 'flex-row-reverse', 'flex-col-reverse'];
  const justifies = ['justify-start', 'justify-end', 'justify-center', 'justify-between', 'justify-around', 'justify-evenly'];
  const justifyItems = ['justify-items-start', 'justify-items-end', 'justify-items-center', 'justify-items-stretch'];
  const alignContents = ['content-start', 'content-end', 'content-center', 'content-between', 'content-around', 'content-evenly', 'content-stretch', 'content-normal'];
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

    const isNegMargin = cls.startsWith('-m');
    const mCls = isNegMargin ? cls.slice(1) : cls;
    if (/^m[trblxy]?-/.test(mCls) || mCls.startsWith('m-')) {
      orig.margin.push(originalClass);
      const sign = isNegMargin ? '-' : '';
      if (mCls.startsWith('m-')) { const val = sign + mCls.slice(2); v.mt=val; v.mr=val; v.mb=val; v.ml=val; }
      else if (mCls.startsWith('my-')) { const val = sign + mCls.slice(3); v.mt=val; v.mb=val; }
      else if (mCls.startsWith('mx-')) { const val = sign + mCls.slice(3); v.ml=val; v.mr=val; }
      else if (mCls.startsWith('mt-')) v.mt = sign + mCls.slice(3);
      else if (mCls.startsWith('mr-')) v.mr = sign + mCls.slice(3);
      else if (mCls.startsWith('mb-')) v.mb = sign + mCls.slice(3);
      else if (mCls.startsWith('ml-')) v.ml = sign + mCls.slice(3);
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
    else if (cls.startsWith('aspect-')) { v.aspectRatio = cls; orig.aspectRatio_original = originalClass; }
    else if (positions.includes(cls)) { v.position = cls; orig.position_original = originalClass; }
    else if (/^-?top-/.test(cls)) { v.top = cls.replace(/^-?top-/, cls.startsWith('-') ? '-' : ''); orig.top_original = originalClass; }
    else if (/^-?right-/.test(cls)) { v.right = cls.replace(/^-?right-/, cls.startsWith('-') ? '-' : ''); orig.right_original = originalClass; }
    else if (/^-?bottom-/.test(cls)) { v.bottom = cls.replace(/^-?bottom-/, cls.startsWith('-') ? '-' : ''); orig.bottom_original = originalClass; }
    else if (/^-?left-/.test(cls)) { v.left = cls.replace(/^-?left-/, cls.startsWith('-') ? '-' : ''); orig.left_original = originalClass; }
    else if (/^-?z-/.test(cls)) { v.z = cls.replace(/^-?z-/, cls.startsWith('-') ? '-' : ''); orig.z_original = originalClass; }
    else if (displays.includes(cls)) { v.display = cls; orig.display_original = originalClass; }
    else if (flexes.includes(cls)) { v.flex = cls; orig.flex_original = originalClass; }
    else if (grows.includes(cls)) { v.flexGrow = cls; orig.flexGrow_original = originalClass; }
    else if (shrinks.includes(cls)) { v.flexShrink = cls; orig.flexShrink_original = originalClass; }
    else if (directions.includes(cls)) { v.direction = cls; orig.direction_original = originalClass; }
    else if (justifies.includes(cls)) { v.justify = cls; orig.justify_original = originalClass; }
    else if (aligns.includes(cls)) { v.align = cls; orig.align_original = originalClass; }
    else if (selfAligns.includes(cls)) { v.selfAlign = cls; orig.selfAlign_original = originalClass; }
    else if (wraps.includes(cls)) { v.wrap = cls; orig.wrap_original = originalClass; }
    else if (cls.startsWith('grid-cols-')) { v.gridCols = cls; orig.gridCols_original = originalClass; }
    else if (cls.startsWith('grid-rows-')) { v.gridRows = cls; orig.gridRows_original = originalClass; }
    else if (cls.startsWith('grid-flow-')) { v.gridFlow = cls; orig.gridFlow_original = originalClass; }
    else if (justifyItems.includes(cls)) { v.justifyItems = cls; orig.justifyItems_original = originalClass; }
    else if (alignContents.includes(cls)) { v.alignContent = cls; orig.alignContent_original = originalClass; }
    else if (cls.startsWith('gap-')) { v.gap = cls.replace('gap-', ''); orig.gap_original = originalClass; }
    else if (cls.startsWith('space-x-')) { v.spaceX = cls.replace('space-x-', ''); orig.spaceX_original = originalClass; }
    else if (cls.startsWith('space-y-')) { v.spaceY = cls.replace('space-y-', ''); orig.spaceY_original = originalClass; }
    else if (decors.includes(cls)) { v.textDecoration = cls; orig.textDecoration_original = originalClass; }
    else if (cls === 'italic' || cls === 'not-italic') { v.fontStyle = cls; orig.fontStyle_original = originalClass; }
    else if (['uppercase', 'lowercase', 'capitalize', 'normal-case'].includes(cls)) { v.textTransform = cls; orig.textTransform_original = originalClass; }
    else if (cls.startsWith('font-')) {
      const val = cls.replace('font-', '');
      if (weights.includes(val) || val.startsWith('[')) { v.fontWeight = val; orig.fontWeight_original = originalClass; }
      else { v.fontFamily = val; orig.fontFamily_original = originalClass; }
    }
    else if (cls.startsWith('leading-')) { v.leading = cls.replace('leading-', ''); orig.leading_original = originalClass; }
    else if (cls.startsWith('tracking-')) { v.tracking = cls.replace('tracking-', ''); orig.tracking_original = originalClass; }
    else if (cls.startsWith('text-')) {
      const val = cls.replace('text-', '');
      if (textAligns.includes(val)) { v.textAlign = val; orig.textAlign_original = originalClass; }
      else if (sizes.includes(val) || /^\[[0-9.]+(px|rem|em|%)\]$/.test(val)) { v.textSize = val; orig.textSize_original = originalClass; }
      else if (['balance', 'pretty', 'nowrap', 'wrap'].includes(val)) { v.textWrap = val; orig.textWrap_original = originalClass; }
      else { v.textColor = val; orig.textColor_original = originalClass; }
    }
    else if (['bg-auto', 'bg-cover', 'bg-contain'].includes(cls) || cls.startsWith('bg-[length:')) { v.bgSize = cls; orig.bgSize_original = originalClass; }
    else if (['bg-bottom', 'bg-center', 'bg-left', 'bg-left-bottom', 'bg-left-top', 'bg-right', 'bg-right-bottom', 'bg-right-top', 'bg-top'].includes(cls)) { v.bgPosition = cls; orig.bgPosition_original = originalClass; }
    else if (['bg-repeat', 'bg-no-repeat', 'bg-repeat-x', 'bg-repeat-y', 'bg-repeat-round', 'bg-repeat-space'].includes(cls)) { v.bgRepeat = cls; orig.bgRepeat_original = originalClass; }
    else if (cls.startsWith('bg-[url(')) { const match = cls.match(/^bg-\[url\(['"]?(.*?)['"]?\)\]$/); if (match) { v.bgImage = match[1]; orig.bgImage_original = originalClass; } }
    else if (cls.startsWith('bg-')) { v.bg = cls.replace('bg-', ''); orig.bg_original = originalClass; }
    else if (cls.startsWith('fill-')) { v.fill = cls.replace('fill-', ''); orig.fill_original = originalClass; }
    else if (cls.startsWith('rounded-tl-')) { v.radiusTL = cls.replace('rounded-tl-', ''); orig.radiusTL_original = originalClass; }
    else if (cls.startsWith('rounded-tr-')) { v.radiusTR = cls.replace('rounded-tr-', ''); orig.radiusTR_original = originalClass; }
    else if (cls.startsWith('rounded-br-')) { v.radiusBR = cls.replace('rounded-br-', ''); orig.radiusBR_original = originalClass; }
    else if (cls.startsWith('rounded-bl-')) { v.radiusBL = cls.replace('rounded-bl-', ''); orig.radiusBL_original = originalClass; }
    else if (cls.startsWith('rounded')) { v.radius = cls === 'rounded' ? 'DEFAULT' : cls.replace('rounded-', ''); orig.radius_original = originalClass; }
    else if (cls.startsWith('border')) {
      if (/^border-(0|2|4|8)$/.test(cls) || cls === 'border' || /^border-\[.*(?:px|rem|em)\]$/.test(cls)) {
        v.borderWidth = cls === 'border' ? 'DEFAULT' : cls.replace('border-', '');
        orig.borderWidth_original = originalClass;
      } else if (/^border-[trbl]$/.test(cls) || /^border-[trbl]-(0|2|4|8)$/.test(cls)) {
        const parts = cls.split('-');
        const side = parts[1];
        const val = parts.length === 3 ? parts[2] : 'DEFAULT';
        const key = side === 't' ? 'borderT' : side === 'r' ? 'borderR' : side === 'b' ? 'borderB' : 'borderL';
        v[key] = val;
        orig[`${key}_original`] = originalClass;
      } else if (/^border-[trbl]-/.test(cls)) {
        // per-side border color: border-t-red-500 → borderColorT = 'red-500'
        const side = cls[7];
        const color = cls.slice(9);
        const key = side === 't' ? 'borderColorT' : side === 'r' ? 'borderColorR' : side === 'b' ? 'borderColorB' : 'borderColorL';
        v[key] = color;
        orig[`${key}_original`] = originalClass;
      } else if (cls.startsWith('border-')) { v.borderColor = cls.replace('border-', ''); orig.borderColor_original = originalClass; }
    }
    else if (cls.startsWith('opacity-')) { v.opacity = cls.replace('opacity-', ''); orig.opacity_original = originalClass; }
    else if (cls.startsWith('shadow')) {
      if (cls === 'shadow-inner') { v.insetShadow = 'inner'; orig.insetShadow_original = originalClass; }
      else { v.shadow = cls === 'shadow' ? 'DEFAULT' : cls.replace('shadow-', ''); orig.shadow_original = originalClass; }
    }
  });

  return { ...v, ...orig, origMargin: orig.margin, origPadding: orig.padding };
}

export function computeOptimalBorder(t: string, r: string, b: string, l: string): string {
  const toClass = (side: string, val: string) => {
    if (!val) return '';
    if (side === '') return val === 'DEFAULT' ? 'border' : `border-${val}`;
    return val === 'DEFAULT' ? `border-${side}` : `border-${side}-${val}`;
  };
  if (t && t === r && t === b && t === l) return toClass('', t);
  const classes: string[] = [];
  if (t) classes.push(toClass('t', t));
  if (r) classes.push(toClass('r', r));
  if (b) classes.push(toClass('b', b));
  if (l) classes.push(toClass('l', l));
  return classes.join(' ');
}

export function computeOptimalSpacing(prefix: string, t: string, r: string, b: string, l: string) {
  const toClass = (infix: string, val: string) => {
    if (!val) return '';
    const isNeg = val.startsWith('-');
    const coreVal = isNeg ? val.slice(1) : val;
    const sign = isNeg ? '-' : '';
    return `${sign}${prefix}${infix}-${coreVal}`;
  };

  let classes = [];
  if (t && t === r && t === b && t === l) classes.push(toClass('', t));
  else {
    if (t && t === b) classes.push(toClass('y', t));
    else {
      if (t) classes.push(toClass('t', t));
      if (b) classes.push(toClass('b', b));
    }
    if (l && l === r) classes.push(toClass('x', l));
    else {
      if (l) classes.push(toClass('l', l));
      if (r) classes.push(toClass('r', r));
    }
  }
  return classes.join(' ');
}

export const makeSafe = (v: string) => {
  if (!v) return null;
  const s = String(v).trim();
  if (!s || s === '-') return null;

  const isNeg = s.startsWith('-');
  const core = isNeg ? s.slice(1) : s;
  const sign = isNeg ? '-' : '';

  if (/^[0-9.]+(px|rem|em|vh|vw|%)$/.test(core)) return `${sign}[${core}]`;
  if (/^(#|rgb|rgba|hsl)/.test(core)) return `${sign}[${core}]`;
  return s;
};

export const cleanVal = (val: string) => {
  if (!val || val === '-') return '';
  const isNeg = val.startsWith('-');
  const core = isNeg ? val.slice(1) : val;
  const cleaned = core.replace(/^\[|\]$/g, '');
  return isNeg ? `-${cleaned}` : cleaned;
};
