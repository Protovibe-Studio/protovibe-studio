// plugins/protovibe/src/ui/theme.ts
export const theme = {
  // Typography
  font_ui: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',

  // Backgrounds
  bg_default: '#212121',       // Main panels & sidebar
  bg_secondary: '#282828',     // Inputs, dropdowns, hover states
  bg_tertiary: '#3b3b3b',      // Active Segmented / Lighter elements
  bg_strong: '#1b1b1b',        // Headers, deep backgrounds
  bg_sunken: '#191919',        // Deepest backgrounds for containers that need to be darker than bg_strong
  bg_low: 'rgba(255, 255, 255, 0.05)',

  // Text
  text_default: '#eaeaea',     // Active/Primary text
  text_secondary: '#b0b0b0',   // Standard text, labels
  text_tertiary: '#7c7c7c',    // Muted text, placeholders
  text_low: '#6d6d6d',         // Lowest text

  // Accents (Figma Blue)
  accent_default: '#39a9ff',
  accent_secondary: '#386ad1',
  accent_tertiary: '#1745a8',
  accent_low: 'rgba(61, 123, 255, 0.14)',

  // Primary solid — high-contrast blue for filled CTAs (Add comment, submit, save).
  // hover is one step lighter, pressed one step darker (same hue/chroma).
  primary_solid: 'oklch(0.6159 0.20711 262.9)',
  primary_solid_hover: 'oklch(0.6859 0.20711 262.9)',
  primary_solid_pressed: 'oklch(0.5359 0.20711 262.9)',

  // Borders
  border_default: '#333',   // Standard dividers
  border_secondary: '#383838', // Subtle dividers
  border_tertiary: '#222222',  // Blended dividers
  border_accent: '#0092ff',    // Focused borders
  border_strong: '#6a6a6a',    // High contrast borders

  // Warnings (Yellow/Orange)
  warning_primary: '#F2C94C',
  warning_secondary: '#E2B022',
  warning_low: 'rgba(242, 201, 76, 0.15)',

  // Destructive (Figma Red)
  destructive_default: '#F24822',
  destructive_secondary: '#DC3411',
  destructive_low: 'rgba(242, 72, 34, 0.15)',

  // Success (Green)
  success_default: '#1ABC9C',
  success_secondary: '#14A085',
  success_tertiary: '#0E856E',
  success_low: 'rgba(26, 188, 156, 0.15)',
};

// Hover/pressed handlers for a filled `primary_solid` button. Follows the inline
// `currentTarget.style` convention used across the inspector UI. When `enabled`
// is false the button keeps its disabled background, so no handlers are attached.
type StyledTarget = { currentTarget: HTMLElement };
export function primarySolidHover(enabled: boolean): {
  onMouseEnter?: (e: StyledTarget) => void;
  onMouseLeave?: (e: StyledTarget) => void;
  onMouseDown?: (e: StyledTarget) => void;
  onMouseUp?: (e: StyledTarget) => void;
} {
  if (!enabled) return {};
  return {
    onMouseEnter: (e) => { e.currentTarget.style.background = theme.primary_solid_hover; },
    onMouseLeave: (e) => { e.currentTarget.style.background = theme.primary_solid; },
    onMouseDown: (e) => { e.currentTarget.style.background = theme.primary_solid_pressed; },
    onMouseUp: (e) => { e.currentTarget.style.background = theme.primary_solid_hover; },
  };
}
