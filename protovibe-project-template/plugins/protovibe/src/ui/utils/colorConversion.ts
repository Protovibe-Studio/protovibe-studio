// plugins/protovibe/src/ui/utils/colorConversion.ts
// All color-space conversion utilities. Browser-only (uses canvas).

// ─── Internal helpers ─────────────────────────────────────────────────────────

function toLinear(v: number): number {
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearRgbToOklch(r: number, g: number, b: number): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const bk = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  const C = Math.sqrt(a * a + bk * bk);
  let H = Math.atan2(bk, a) * (180 / Math.PI);
  if (H < 0) H += 360;
  return [L, C, H];
}

function canvasRgbToOklch(r: number, g: number, b: number): [number, number, number] {
  return linearRgbToOklch(toLinear(r / 255), toLinear(g / 255), toLinear(b / 255));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Convert any valid CSS color string (hex, rgb, hsl, oklch, named, …) to OKLCH.
 * Returns [L 0-1, C, H, A 0-1] or null if the browser does not recognise the value.
 * Uses a two-sentinel strategy to avoid false-positives on the exact sentinel color.
 */
export function cssColorToOklch(cssColor: string): [number, number, number, number] | null {
  if (!cssColor.trim()) return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d')!;

    // Two distinct sentinels so we don't fail when the user enters the sentinel itself
    const SENTINEL_A = 'rgba(3, 14, 15, 0.9265)';
    const SENTINEL_B = 'rgba(161, 80, 33, 0.577)';

    ctx.fillStyle = SENTINEL_A;
    const beforeA = ctx.fillStyle;
    ctx.fillStyle = cssColor;
    const afterA = ctx.fillStyle;

    if (afterA !== beforeA) {
      // Color was accepted – render and sample
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      const [L, C, H] = canvasRgbToOklch(d[0], d[1], d[2]);
      return [L, C, H, d[3] / 255];
    }

    // Edge case: the user might have typed the exact same color as sentinel A.
    // Try sentinel B.
    ctx.fillStyle = SENTINEL_B;
    const beforeB = ctx.fillStyle;
    ctx.fillStyle = cssColor;
    const afterB = ctx.fillStyle;

    if (afterB !== beforeB) {
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      const [L, C, H] = canvasRgbToOklch(d[0], d[1], d[2]);
      return [L, C, H, d[3] / 255];
    }

    return null; // Both sentinels unchanged — color is invalid
  } catch {
    return null;
  }
}

/**
 * Convert any valid CSS color string to a #rrggbb hex string via canvas.
 * Returns '' for invalid or var(…) values.
 */
export function cssColorToHex(cssColor: string): string {
  if (!cssColor || cssColor.startsWith('var(')) return '';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = cssColor;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return `#${d[0].toString(16).padStart(2, '0')}${d[1].toString(16).padStart(2, '0')}${d[2].toString(16).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

/**
 * Convert OKLCH [L 0-1, C 0-0.4, H 0-360] to a hex string via canvas.
 * Returns #rrggbb for full opacity, #rrggbbaa when alpha < 1.
 */
export function oklchToHex(L: number, C: number, H: number, A: number = 1): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = `oklch(${L} ${C} ${H} / ${A})`;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    const hex = `#${d[0].toString(16).padStart(2, '0')}${d[1].toString(16).padStart(2, '0')}${d[2].toString(16).padStart(2, '0')}`;
    if (A < 0.9999) {
      const alpha = Math.round(A * 255).toString(16).padStart(2, '0');
      return hex + alpha;
    }
    return hex;
  } catch {
    return '#000000';
  }
}

/**
 * Parse an OKLCH CSS string — both percentage and decimal forms, with optional alpha:
 *   "oklch(99% 0.006 260)"  or  "oklch(0.99 0.006 260 / 0.8)"
 * Returns [L 0-1, C, H, A 0-1] or null.
 */
export function parseOklch(value: string): [number, number, number, number] | null {
  const m = value.match(/oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)/);
  if (!m) return null;
  let L = parseFloat(m[1]);
  if (m[2] === '%') L /= 100;
  const A = m[5] ? parseFloat(m[5]) : 1;
  return [L, parseFloat(m[3]), parseFloat(m[4]), A];
}

/**
 * Serialise OKLCH values to a CSS string using the percentage form.
 * Includes alpha if it's less than 1.
 */
export function formatOklch(L: number, C: number, H: number, A: number = 1): string {
  const lPct = Math.round(L * 10000) / 100;   // up to 2 decimal places
  const cFmt = Math.round(C * 100000) / 100000; // up to 5 significant digits
  const hFmt = Math.round(H * 10) / 10;
  const aFmt = Math.round(A * 100) / 100;
  if (A < 0.9999) {
    return `oklch(${lPct}% ${cFmt} ${hFmt} / ${aFmt})`;
  }
  return `oklch(${lPct}% ${cFmt} ${hFmt})`;
}
