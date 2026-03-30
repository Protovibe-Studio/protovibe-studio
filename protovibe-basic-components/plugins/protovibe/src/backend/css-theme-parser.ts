import fs from 'fs';

export interface ThemeToken {
  name: string;
  value: string;
  category: string;
}

const CATEGORY_PREFIXES: [string, string][] = [
  ['inset-shadow', 'Inset Shadow'],
  ['drop-shadow', 'Drop Shadow'],
  ['text-shadow', 'Text Shadow'],
  ['font-weight', 'Font Weight'],
  ['shadow', 'Shadow'],
  ['radius', 'Radius'],
  ['blur', 'Blur'],
  ['text', 'Font Size'],
  ['tracking', 'Letter Spacing'],
  ['leading', 'Line Height'],
  ['font', 'Font Family'],
  ['breakpoint', 'Breakpoint'],
  ['container', 'Container'],
  ['perspective', 'Perspective'],
  ['ease', 'Easing'],
  ['animate', 'Animation'],
  ['aspect', 'Aspect Ratio'],
  ['spacing', 'Spacing'],
];

function getTokenCategory(name: string): string {
  for (const [prefix, label] of CATEGORY_PREFIXES) {
    if (name.startsWith(prefix)) return label;
  }
  return 'Other';
}

export function parseThemeTokens(cssFilePath: string): ThemeToken[] {
  const content = fs.readFileSync(cssFilePath, 'utf-8');

  const themeStart = content.indexOf('@theme {');
  if (themeStart === -1) return [];

  let braceDepth = 0;
  let blockStart = -1;
  let blockEnd = -1;
  for (let i = themeStart; i < content.length; i++) {
    if (content[i] === '{') {
      if (braceDepth === 0) blockStart = i + 1;
      braceDepth++;
    } else if (content[i] === '}') {
      braceDepth--;
      if (braceDepth === 0) {
        blockEnd = i;
        break;
      }
    }
  }

  if (blockStart === -1 || blockEnd === -1) return [];

  const block = content.slice(blockStart, blockEnd);
  const varRegex = /^\s*--([\w-]+)\s*:\s*([^;]+?)\s*;/gm;
  const tokens: ThemeToken[] = [];

  let match: RegExpExecArray | null;
  while ((match = varRegex.exec(block)) !== null) {
    const name = match[1].trim();
    const value = match[2].trim();
    if (name.startsWith('color-')) continue;
    if (name.includes('--')) continue;
    tokens.push({ name, value, category: getTokenCategory(name) });
  }

  const categoryOrder = new Map(CATEGORY_PREFIXES.map(([, label], i) => [label, i]));
  tokens.sort((a, b) => {
    const ai = categoryOrder.get(a.category) ?? Infinity;
    const bi = categoryOrder.get(b.category) ?? Infinity;
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });

  return tokens;
}

export function updateCssVariable(css: string, selector: string, varName: string, newValue: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const selectorMatch = new RegExp(escaped + '\\s*\\{').exec(css);
  if (!selectorMatch) throw new Error(`Selector "${selector}" not found in CSS`);

  const idx = selectorMatch.index;
  let braceDepth = 0;
  let blockStart = -1;
  let blockEnd = -1;

  for (let i = idx; i < css.length; i++) {
    if (css[i] === '{') {
      if (braceDepth === 0) blockStart = i + 1;
      braceDepth++;
    } else if (css[i] === '}') {
      braceDepth--;
      if (braceDepth === 0) { blockEnd = i; break; }
    }
  }

  if (blockStart === -1 || blockEnd === -1) throw new Error(`Block for "${selector}" not found`);

  const before = css.slice(0, blockStart);
  const block = css.slice(blockStart, blockEnd);
  const after = css.slice(blockEnd);

  const safeVar = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const varRegex = new RegExp(`(^|[^\\w-])(--${safeVar}\\s*:\\s*)[^;]+`);
  if (!varRegex.test(block)) throw new Error(`Variable "--${varName}" not found in "${selector}" block`);

  return before + block.replace(varRegex, (match, p1, p2) => `${p1}${p2}${newValue}`) + after;
}

export interface ThemeColor {
  val: string;
  hex: string;
  /** Resolved value from :root (light mode CSS variables) */
  lightValue?: string;
  /** Resolved value from [data-theme="dark"] (dark mode CSS variables) */
  darkValue?: string;
}

/**
 * Extracts all CSS variable declarations from a specific selector block,
 * e.g. `:root` or `[data-theme="dark"]`.
 * Returns a Map of variable name (without leading --) to raw value string.
 */
function parseVarBlock(content: string, selector: string): Map<string, string> {
  const map = new Map<string, string>();
  // Use a regex requiring `{` after the selector so we skip matches inside comments.
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const selectorMatch = new RegExp(escaped + '\\s*\\{').exec(content);
  if (!selectorMatch) return map;
  const idx = selectorMatch.index;

  let braceDepth = 0;
  let blockStart = -1;
  let blockEnd = -1;
  for (let i = idx; i < content.length; i++) {
    if (content[i] === '{') {
      if (braceDepth === 0) blockStart = i + 1;
      braceDepth++;
    } else if (content[i] === '}') {
      braceDepth--;
      if (braceDepth === 0) {
        blockEnd = i;
        break;
      }
    }
  }

  if (blockStart === -1 || blockEnd === -1) return map;

  const block = content.slice(blockStart, blockEnd);
  const varRegex = /^\s*--([\w-]+)\s*:\s*([^;]+?)\s*;/gm;
  let m: RegExpExecArray | null;
  while ((m = varRegex.exec(block)) !== null) {
    map.set(m[1].trim(), m[2].trim());
  }
  return map;
}

export function parseThemeColors(cssFilePath: string): ThemeColor[] {
  const content = fs.readFileSync(cssFilePath, 'utf-8');

  // Parse light and dark variable maps
  const lightVars = parseVarBlock(content, '[data-theme="light"]');
  const darkVars = parseVarBlock(content, '[data-theme="dark"]');

  // Extract the @theme { ... } block
  const themeStart = content.indexOf('@theme {');
  if (themeStart === -1) return [];

  let braceDepth = 0;
  let blockStart = -1;
  let blockEnd = -1;
  for (let i = themeStart; i < content.length; i++) {
    if (content[i] === '{') {
      if (braceDepth === 0) blockStart = i + 1;
      braceDepth++;
    } else if (content[i] === '}') {
      braceDepth--;
      if (braceDepth === 0) {
        blockEnd = i;
        break;
      }
    }
  }

  if (blockStart === -1 || blockEnd === -1) return [];

  const block = content.slice(blockStart, blockEnd);

  const colorRegex = /^\s*--color-([^:]+):\s*(.+?)\s*;/gm;
  const semanticColors: ThemeColor[] = [];
  const paletteColors: ThemeColor[] = [];

  let match: RegExpExecArray | null;
  while ((match = colorRegex.exec(block)) !== null) {
    const name = match[1].trim();
    const value = match[2].trim();
    const entry: ThemeColor = { val: name, hex: value };

    if (value.startsWith('var(')) {
      // Extract the variable name from var(--varName)
      const varNameMatch = value.match(/^var\(--([\w-]+)\)/);
      if (varNameMatch) {
        const varName = varNameMatch[1];
        // Some @theme entries use a shorter alias (e.g. var(--foreground)) while
        // :root defines the full name (e.g. --foreground-default). Try both forms.
        const lightVal = lightVars.get(varName) ?? lightVars.get(varName + '-default');
        const darkVal = darkVars.get(varName) ?? darkVars.get(varName + '-default');
        if (lightVal) entry.lightValue = lightVal;
        if (darkVal) entry.darkValue = darkVal;
      }
      semanticColors.push(entry);
    } else {
      paletteColors.push(entry);
    }
  }

  return [
    { val: 'transparent', hex: 'transparent' },
    { val: 'current', hex: 'currentColor' },
    ...semanticColors,
    ...paletteColors,
  ];
}
