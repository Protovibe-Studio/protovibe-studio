// plugins/protovibe/src/ui/constants/googleFonts.ts

export type GoogleFontCategory = 'sans-serif' | 'serif' | 'monospace' | 'display';

export interface GoogleFont {
  name: string;
  category: GoogleFontCategory;
}

export const GOOGLE_FONTS: GoogleFont[] = [
  // Sans-serif
  { name: 'Inter', category: 'sans-serif' },
  { name: 'Roboto', category: 'sans-serif' },
  { name: 'Open Sans', category: 'sans-serif' },
  { name: 'Lato', category: 'sans-serif' },
  { name: 'Montserrat', category: 'sans-serif' },
  { name: 'Poppins', category: 'sans-serif' },
  { name: 'Raleway', category: 'sans-serif' },
  { name: 'Nunito', category: 'sans-serif' },
  { name: 'Source Sans 3', category: 'sans-serif' },
  { name: 'DM Sans', category: 'sans-serif' },
  { name: 'Figtree', category: 'sans-serif' },
  { name: 'Plus Jakarta Sans', category: 'sans-serif' },
  { name: 'Outfit', category: 'sans-serif' },
  { name: 'Geist', category: 'sans-serif' },
  // Serif
  { name: 'Playfair Display', category: 'serif' },
  { name: 'Lora', category: 'serif' },
  { name: 'Merriweather', category: 'serif' },
  { name: 'PT Serif', category: 'serif' },
  { name: 'Libre Baskerville', category: 'serif' },
  { name: 'Cormorant Garamond', category: 'serif' },
  { name: 'EB Garamond', category: 'serif' },
  { name: 'Crimson Text', category: 'serif' },
  { name: 'DM Serif Display', category: 'serif' },
  // Monospace
  { name: 'JetBrains Mono', category: 'monospace' },
  { name: 'Fira Code', category: 'monospace' },
  { name: 'Source Code Pro', category: 'monospace' },
  { name: 'IBM Plex Mono', category: 'monospace' },
  { name: 'Space Mono', category: 'monospace' },
  // Display
  { name: 'Space Grotesk', category: 'display' },
  { name: 'Sora', category: 'display' },
  { name: 'Josefin Sans', category: 'display' },
  { name: 'Bebas Neue', category: 'display' },
  { name: 'Oswald', category: 'display' },
];

/** Build a Google Fonts CSS URL that loads all curated fonts in one request. */
export function buildGoogleFontsPreviewUrl(): string {
  const families = GOOGLE_FONTS.map(f => `family=${encodeURIComponent(f.name)}:wght@400;700`).join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

/** Build the Google Fonts import URL for a single font (used in index.css). */
export function buildGoogleFontImportUrl(fontName: string): string {
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;700&display=swap`;
}

/** Default fallback stacks for each font slot. */
export const FONT_SLOT_FALLBACKS: Record<string, string> = {
  'font-sans': 'ui-sans-serif, system-ui, sans-serif',
  'font-serif': 'ui-serif, Georgia, Cambria, serif',
  'font-mono': 'ui-monospace, SFMono-Regular, Menlo, monospace',
};

/** System font options shown in the picker (slot-agnostic). */
export const SYSTEM_FONTS = [
  { label: 'System UI (sans)', value: 'ui-sans-serif, system-ui, sans-serif' },
  { label: 'Georgia (serif)', value: 'ui-serif, Georgia, Cambria, serif' },
  { label: 'Courier New (mono)', value: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
];
