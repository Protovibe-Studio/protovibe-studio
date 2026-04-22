// plugins/protovibe/src/ui/prompts/prompts-registry.ts
//
// Registry of prompt templates shown in the Protovibe "Prompts" sidebar tab.
// Edit this file to add, remove, or tweak prompts. Each entry is self-contained
// data — no React, no imports from the UI — so designers can touch it safely.
//
// Template placeholders resolved at copy-time:
//   {{input}}       — free-text the user typed into the textarea
//   {{file}}        — current file path, e.g. "src/pages/Dashboard.tsx"
//   {{startLine}}   — starting line of the current selection
//   {{endLine}}     — ending line of the current selection
//   {{blockId}}     — nearest `data-pv-block` id to the current selection
//   {{code}}        — source code of the currently selected block
//   {{agentsRules}} — standard reminder to follow AGENTS.md rules
//
// When a reference is missing (e.g. no selection), the placeholder is
// replaced with a readable fallback like "(no file selected)".

import type { LucideIcon } from 'lucide-react';
import {
  LayoutTemplate,
  Wand,
  Rocket,
  PencilRuler,
  Blocks,
  Component,
  SquarePen,
  Palette,
  MousePointerClick,
  Pipette,
} from 'lucide-react';

export type PromptFieldRef =
  | 'file'
  | 'code'
  | 'blockId'
  | 'lineRange';

export interface PromptDef {
  /** Stable id, used as React key and for analytics. */
  id: string;
  /** Name shown in the list and as the step 1 heading. */
  title: string;
  /** One-line description shown under the title. */
  description: string;
  /** Lucide icon component. Only the icons listed here are bundled. */
  icon: LucideIcon;
  /** Label rendered above the textarea on step 1. */
  inputLabel: string;
  /** Placeholder inside the textarea. */
  inputPlaceholder?: string;
  /** References surfaced as metadata chips beneath the textarea. */
  references: PromptFieldRef[];
  /**
   * Whether the prompt needs a canvas selection to make sense. Defaults to
   * true. Set to false for prompts that operate at the app/component level
   * (e.g. "Create new view") — the empty-state banner will be suppressed.
   */
  requiresSelection?: boolean;
  /**
   * Final prompt template. Supports the placeholders listed at the top of
   * this file. Indentation inside the backticks is preserved verbatim.
   */
  template: string;
}

const AGENTS_RULES_SUFFIX =
  'Follow all architectural rules from AGENTS.md — especially the pv-zone/pv-block ID conventions, component reuse, semantic color tokens, and static Tailwind class strings. Do not invent new patterns.';

export const PROMPTS: PromptDef[] = [
  {
    id: 'create-view',
    title: 'Create new view or feature',
    description: 'Add a brand-new page or feature to the app, wired into the existing querystring routing.',
    icon: LayoutTemplate,
    inputLabel: 'Create a new view or feature that…',
    inputPlaceholder: 'shows a settings page with profile, notifications, and billing sections',
    requiresSelection: false,
    references: [],
    template: `Goal from the user:
  {{input}}
  
  Create a new view or feature in this Protovibe application.
  
  Before writing any code:
  1. Read AGENTS.md and \`src/App.tsx\` to understand how views are mounted and how the app is structured.
  2. This app uses querystring-based routing (e.g. \`?view=xxx\`). Add the new route by following the existing pattern exactly — do NOT introduce react-router or any other routing library. Consider using queryStrings for dialogs also (separate key for each dialog like employeeDialog=true (so that visible dialog layer gets it's own key set to true, but don't set the key to false for non visible dialogs, just remove the key from URL).
  3. Browse \`src/components/ui/\` and reuse existing components wherever possible. Only write custom HTML/Tailwind when no existing component fits the need.
  4. Use mock data held in React state (e.g. \`useState\` with a seeded default). The data should persist while navigating within the app but reset on full page refresh — do not write to localStorage, files, or any backend.
  
  {{agentsRules}}`,
  },
  {
    id: 'generate-inside-selection',
    title: 'Generate inside selection',
    description: 'Fill the currently selected element with new content or child components.',
    icon: Wand,
    inputLabel: 'Inside this element, generate…',
    inputPlaceholder: 'a 3-column pricing grid with Starter, Pro, and Enterprise cards',
    references: ['file', 'blockId', 'lineRange', 'code'],
    template: `What to generate: 
  {{input}}
  
  Generate content inside the selected element.
  
  Target element: data-pv-block="{{blockId}}" (lines {{startLine}}–{{endLine}})
  File: \`{{file}}\`
  
  Current source:
  \`\`\`tsx
  {{code}}
  \`\`\`
  
  Before writing any code, read AGENTS.md to understand the zone/block ID conventions and component rules. Reuse components from \`@/components/ui/\` whenever possible.
  
  {{agentsRules}}`,
  },
  {
    id: 'edit-selection',
    title: 'Edit selection',
    description: 'Modify the selected element — change content, tweak props, restructure, or adjust layout.',
    icon: SquarePen,
    inputLabel: 'Edit this element so that…',
    inputPlaceholder: 'the card shows an avatar on the left and stacks the name and role vertically on the right',
    references: ['file', 'blockId', 'lineRange', 'code'],
    template: `What to change: 
  {{input}}
  
  Edit the selected element in place.
  
  Target element: data-pv-block="{{blockId}}" (lines {{startLine}}–{{endLine}})
  File: \`{{file}}\`
  
  Current source:
  \`\`\`tsx
  {{code}}
  \`\`\`
  
  Before writing any code, read AGENTS.md — especially the zone/block ID conventions, component reuse rules, and static Tailwind class strings.
  
  Guidelines:
  - Keep changes scoped to the selected element and its children. Do not restructure surrounding layout unless the user explicitly asks.
  - Reuse existing components from \`@/components/ui/\` wherever possible.
  - Preserve the existing pv-editable-zone / pv-block structure and IDs. Only add new IDs when inserting new blocks.
  - Do not change props or behaviour that are not mentioned in the user's request.
  
  {{agentsRules}}`,
  },
  {
    id: 'sketchpad-to-app',
    title: 'Convert sketchpad to app',
    description: 'Turn a rough sketchpad element into a real, production-ready piece of the App.tsx layout.',
    icon: Rocket,
    inputLabel: 'Extra instructions (optional)…',
    inputPlaceholder: 'place it inside the dashboard main column, above the stats cards',
    references: ['file', 'blockId', 'lineRange', 'code'],
    template: `Additional user instructions: 
  {{input}}
  
  The selected element comes from the Protovibe sketchpad. Treat it as a rough visual sketch, NOT as final code.
  
  Your job: convert this sketch into a clean, production-quality implementation inside \`src/App.tsx\` (or the appropriate view file if routing is already set up).
  
  Source element: data-pv-block="{{blockId}}" (lines {{startLine}}–{{endLine}})
  File: \`{{file}}\`
  
  Sketch source:
  \`\`\`tsx
  {{code}}
  \`\`\`
  
  Before writing any code, read AGENTS.md to understand the zone/block ID conventions and component rules.
  
  Conversion rules:
  - Preserve the intent of the sketch's styling, visual hierarchy, and element ordering.
  - The sketchpad uses absolute positioning for layout. Convert every \`position: absolute\` / top/left/width/height placement into normal document flow using Flexbox, Grid, padding, margin, and gap. Infer reasonable spacing values from the visual gaps in the sketch.
  - Replace sketch-only primitives like "rectangle" with the proper components from \`@/components/ui/\` where equivalents exist.
  - Rebuild the pv-block / pv-editable-zone structure with granular blocks per the AGENTS.md conventions so the result is editable in the normal app canvas.
  - Keep text content identical to the sketch unless the user asks otherwise.
  - Add any interactions or dynamic behavior needed to make this a real, working part of the app — but do not add extra features beyond what the user asked for.
  
  {{agentsRules}}`,
  },
  {
    id: 'element-to-sketchpad',
    title: 'Convert element to sketchpad',
    description: 'Take the selected element and create a new sketchpad version of it for freeform editing.',
    icon: PencilRuler,
    inputLabel: 'Extra instructions (optional)…',
    inputPlaceholder: 'simplify the header to just a title and a button',
    references: ['file', 'blockId', 'lineRange', 'code'],
    template: `Additional user instructions: 
  {{input}}
  
  Create a new sketchpad out of the selected element. The goal is to give the user a simplified, freely-editable sketch version of this UI that they can tweak in the Protovibe sketchpad.
  
  Source element: data-pv-block="{{blockId}}" (lines {{startLine}}–{{endLine}})
  File: \`{{file}}\`
  
  Source code:
  \`\`\`tsx
  {{code}}
  \`\`\`
  
  Before writing any code, read AGENTS.md to understand the zone/block ID conventions and component rules.
  
  Rules for the sketchpad version:
  - Strip out ALL special logic: event handlers, hooks, state, conditional rendering, data mapping, API calls. The result should be a static visual mock.
  - Keep only the visual structure and representative text/content. Hard-code any data that was dynamic.
  - Use normal document flow for layout (Flexbox/Grid/padding/gap). Do NOT use \`position: absolute\` even though this is going into the sketchpad.
  - Follow the sketchpad styling conventions used by the other files in \`src/sketchpad/\` (or wherever sketchpads live in this project) — read a couple before writing.
  - Wrap the result in pv-editable-zone / pv-block tags with HIGH granularity: every direct child the user might want to reorder, delete, or edit independently must be its own pv-block with a fresh 6-char id. Err on the side of more blocks rather than fewer.
  
  {{agentsRules}}`,
  },
  {
    id: 'new-component',
    title: 'New component',
    description: 'Create a new reusable UI component in components/ui, following project conventions.',
    icon: Blocks,
    inputLabel: 'Create a new component that…',
    inputPlaceholder: 'is a Stat tile showing a label, large value, and optional trend indicator',
    requiresSelection: false,
    references: [],
    template: `Component description from the user: 
  {{input}}
  
  Create a new reusable UI component in \`src/components/ui/\`.
  
  Before writing any code:
  1. Read the "Components Editing" section of AGENTS.md end-to-end — the new file MUST conform to every rule there (pvConfig, data-pv-component-id, PvDefaultContent, static Tailwind strings, safe prop types, etc.).
  2. READ several existing files in \`src/components/ui/\` before writing anything — at minimum open button.tsx, card.tsx, and textblock.tsx, plus one compound component like tabs.tsx or select.tsx. Match their conventions for prop naming, typing, file layout, variant handling, and \`pvConfig\` shape. Do not guess structure from memory.
  3. If the component is non-atomic (it has internal parts users will want to reorder, swap, or style independently — like tabs with a list + triggers + panels, or a select with trigger + items), decompose it into multiple smaller components in separate files, each with its own \`pvConfig\`. Follow exactly how \`tabs.tsx\` / \`select.tsx\` split parent and child components and share state via React Context.
  4. Expose only string / boolean / select prop types via \`pvConfig.props\`. Never expose functions, children, or asChild.
  5. Use semantic color tokens from \`src/index.css\` — never raw palette colors or hex values.
  
  Output: a single new file in \`src/components/ui/\` that exports the component, its \`PvDefaultContent\`, and a valid \`pvConfig\`.
  
  {{agentsRules}}`,
  },
  {
    id: 'convert-to-component',
    title: 'Convert to component',
    description: 'Extract the selected element(s) into a new reusable component in components/ui, inferring props from variants.',
    icon: Component,
    inputLabel: 'Extra instructions (optional)…',
    inputPlaceholder: 'name it StatTile; treat the trend arrow as optional',
    references: ['file', 'blockId', 'lineRange', 'code'],
    template: `Additional user instructions: 
  {{input}}
  
  Extract the currently selected element(s) into a new reusable component (or a set of components) inside \`src/components/ui/\`, then replace the original call site(s) with the new component.
  
  Source element: data-pv-block="{{blockId}}" (lines {{startLine}}–{{endLine}})
  File: \`{{file}}\`
  
  Source code of the selection:
  \`\`\`tsx
  {{code}}
  \`\`\`
  
  Before writing any code:
  1. Read the "Components Editing" section of AGENTS.md end-to-end — every new file MUST conform (pvConfig, data-pv-component-id, PvDefaultContent, static Tailwind strings, safe prop types, semantic tokens, ...props on root).
  2. READ several existing files in \`src/components/ui/\` before writing anything — at minimum button.tsx, card.tsx, textblock.tsx, and one compound component like tabs.tsx or select.tsx. Match their prop naming, typing, file layout, variant handling, and \`pvConfig\` shape. Do not guess structure from memory.
  
  How to infer the component API:
  - If the selection contains MULTIPLE variants of the same thing (e.g. two cards where one has an icon and one does not, or three buttons with different colors and sizes), DIFF them to figure out which parts vary. Each varying aspect becomes a prop:
    • differing strings → \`string\` props (label, heading, description…)
    • differing booleans (present/absent elements) → \`boolean\` props
    • differing sets of discrete values (color, size, layout) → \`select\` props with the observed values as options
  - Everything that is identical across variants becomes hard-coded structure inside the component.
  - Expose only \`string\` / \`boolean\` / \`select\` props via \`pvConfig.props\`. Never expose functions, children, or asChild.
  - Add \`invalidCombinations\` filters for any prop combinations that would obviously break visually.
  
  Decomposition — when to create more than one component:
  - If the selection is non-atomic (parent + repeated or swappable children the user will want to reorder, delete, or edit independently — e.g. a tab strip with triggers and panels, a dropdown with items, a sidebar with nav links), split it into multiple components in separate files, each with its own \`pvConfig\`, EXACTLY the way \`tabs.tsx\` / \`select.tsx\` are structured in this project. Parent owns layout and context; children own their own editable content.
  - Share state between parent and child via React Context (see tabs.tsx for the pattern). Do NOT pass callbacks or controlled state through props that the editor would need to manage.
  - If the selection is a single cohesive atom (e.g. a stat tile, a badge), keep it as one file.
  
  Replacing the original usage:
  - After creating the component(s), replace the selected markup in \`{{file}}\` with calls to the new component(s). Preserve the surrounding pv-editable-zone / pv-block tags and their IDs.
  - For each original variant in the selection, set the props so the rendered output matches the original visually.
  
  {{agentsRules}}`,
  },
  {
    id: 'edit-component',
    title: 'Edit component',
    description: 'Modify the component definition of the currently selected element.',
    icon: SquarePen,
    inputLabel: 'Edit this component so that…',
    inputPlaceholder: 'the outline variant uses a dashed border and a smaller hover shadow',
    references: ['file', 'blockId', 'lineRange', 'code'],
    template: `Apply this change: 
  {{input}}
  
  Edit the component backing the currently selected element.
  
  Selection: data-pv-block="{{blockId}}" (lines {{startLine}}–{{endLine}})
  File: \`{{file}}\`
  
  Relevant source:
  \`\`\`tsx
  {{code}}
  \`\`\`
  
  Before writing any code, read AGENTS.md end-to-end. Then figure out which component in \`src/components/ui/\` renders this element (follow the import in \`{{file}}\` if needed, or match by the \`data-pv-component-id\` attribute). Then apply the requested change to that component's source file.
  
  Requirements:
  - Respect every rule in AGENTS.md — especially: one pvConfig per file, explicit data-pv-component-id, safe prop types, static Tailwind class strings, semantic color tokens, and \`...props\` spread on the root element.
  - If the change introduces a new variant/prop, add it to \`pvConfig.props\` and add any needed \`invalidCombinations\` filters.
  - Keep existing usages working — do not rename or remove props unless the user asked for it.
  - If needed update the consumer files
  
  {{agentsRules}}`,
  },
  {
    id: 'restyle-element',
    title: 'Restyle element',
    description: 'Adjust the visual design of the selected element using only Tailwind utilities and semantic tokens.',
    icon: Palette,
    inputLabel: 'Restyle this element to…',
    inputPlaceholder: 'feel more compact with a softer secondary background',
    references: ['file', 'blockId', 'code'],
    template: `Desired style: 
  {{input}}
  
  Restyle the selected element. This task is STYLING ONLY — do not change markup structure, props, or behavior beyond what is needed to apply the new classes.
  
  Target element: data-pv-block="{{blockId}}"
  File: \`{{file}}\`
  
  Current source:
  \`\`\`tsx
  {{code}}
  \`\`\`
  
  Before writing any code, read AGENTS.md — especially the styling rules for static Tailwind strings and semantic color tokens.
  
  Hard constraints:
  - Use ONLY Tailwind utility classes. No inline \`style={{}}\`, no CSS modules.
  - Use ONLY semantic color tokens defined in \`src/index.css\` (e.g. \`bg-background-secondary\`, \`text-foreground-default\`, \`border-border-default\`). NEVER use default Tailwind palette colors (\`bg-blue-500\`) or hex values.
  - Keep all className strings fully static so the AST parser can read them — no template literals, no ternaries inside className, no cva. Express variants via \`data-*\` attributes and \`data-[...]\` modifiers as shown in AGENTS.md.
  
  {{agentsRules}}`,
  },
  {
    id: 'edit-tokens',
    title: 'Edit tokens',
    description: 'Modify the design token values in index.css — colors, borders, backgrounds — for light and/or dark theme.',
    icon: Pipette,
    inputLabel: 'Change the tokens so that…',
    inputPlaceholder: 'the primary color becomes a warm amber, and the dark theme background is slightly warmer',
    requiresSelection: false,
    references: [],
    template: `What to change: 
  {{input}}
  
  Edit the design tokens in \`src/index.css\`.
  
  Before touching any code, open and read \`src/index.css\` in full so you understand its exact structure. Here is a summary of what you will find:
  
  - \`[data-theme="light"]\` and \`[data-theme="dark"]\` blocks each define raw CSS custom properties (e.g. \`--background-primary\`, \`--foreground-default\`, \`--border-default\`). These are the values to edit.
  - The \`@theme\` block below them maps each raw property to a Tailwind color token via \`var()\` (e.g. \`--color-background-primary: var(--background-primary)\`). Do NOT edit this section — it is indirection only.
  - All color values use \`oklch(lightness% chroma hue)\` syntax. Hover/pressed/subtle variants are derived from the base by adjusting lightness and/or chroma; keep the same hue unless the user explicitly asks to change it.
  
  Token groups (edit the ones relevant to the request):
  - **Backgrounds** — \`--background-default/subtle/secondary/tertiary/elevated/strong/overlay/disabled/transparent\` plus accent fills \`--background-primary/destructive/success/warning/info\` and their \`-hover\`/\`-pressed\`/\`-subtle\` variants.
  - **Foregrounds (text)** — \`--foreground-default/secondary/tertiary/strong/disabled/inverse/on-primary/primary/destructive/success/warning/info\`.
  - **Borders** — \`--border-default/secondary/strong/focus/primary/destructive/success/warning/info\`.
  
  Rules:
  - Edit ONLY the raw properties inside \`[data-theme="light"]\` and/or \`[data-theme="dark"]\`. Never touch the \`@theme\` block.
  - Use the exact color value the user provided. Do not convert it to another format.
  - When changing a base color (e.g. \`--background-primary\`), update its \`-hover\`, \`-pressed\`, \`-subtle\`, \`-subtle-hover\`, and \`-subtle-pressed\` variants proportionally: hover = base lightness +5–8%, pressed = base lightness −10–15%, subtle = very high lightness low chroma version of the hue.
  - If the user asks to change the primary/accent color, update the matching foreground and border tokens at the same hue too (\`--foreground-primary\`, \`--border-primary\`, \`--border-focus\`).
  - If the user provides a specific color value without mentioning which theme it targets, assume it is for **light mode**. Derive a matching dark-mode equivalent automatically (typically: invert the lightness curve — light-mode light backgrounds become dark-mode dark backgrounds, and vice versa — while preserving chroma and hue). Then **inform the user** at the start of your response that you assumed light mode for the provided value and auto-generated the dark-mode counterpart, and show both values so they can adjust if needed.
  - If the user explicitly mentions only one theme, apply changes only to that theme and leave the other untouched.
  - Do not change the \`@theme\` mappings, fonts, spacing, radius, or shadow variables unless the user explicitly asks.`,
  },
  {
    id: 'add-interaction',
    title: 'Add interaction',
    description: 'Add a small, specific piece of interactivity to the selected element.',
    icon: MousePointerClick,
    inputLabel: 'Add this interaction:',
    inputPlaceholder: 'clicking the Actions button opens a dropdown with Edit and Delete',
    references: ['file', 'blockId', 'lineRange', 'code'],
    template: `Interaction to add: 
  {{input}}
  
  Add a small, specific interaction to the selected element. Scope is tight: only implement what is asked, nothing more.
  
  Target element: data-pv-block="{{blockId}}" (lines {{startLine}}–{{endLine}})
  File: \`{{file}}\`
  
  Current source:
  \`\`\`tsx
  {{code}}
  \`\`\`
  
  Before writing any code, read AGENTS.md — especially the interaction rules for Floating UI, portals, and compound components.
  
  Guidelines:
  - Do NOT expand scope. If the user asks for "open a dialog on click", just wire the click → dialog — do not add extra buttons, extra content, or refactor the surrounding layout.
  - Before implementing, look up how this interaction pattern is already done in the codebase for common cases: tooltips, dropdowns, dialogs, popovers, forms, toasts. Read at least one example file (e.g. \`src/components/ui/dialog.tsx\`, \`dropdown.tsx\`, \`tooltip.tsx\` — whichever is relevant) and follow that convention. Do not invent a new pattern.
  - Prefer existing components from \`@/components/ui/\` over raw HTML elements.
  - Floating UI (dropdowns, tooltips, popovers) must use \`createPortal\` + fixed positioning so it escapes any overflow-hidden inspectors — see AGENTS.md.
  
  {{agentsRules}}`,
  },
];

export interface PromptRenderContext {
  file: string | null;
  startLine: number | null;
  endLine: number | null;
  blockId: string | null;
  code: string | null;
}

function fallback(value: string | number | null, label: string): string {
  if (value === null || value === undefined || value === '') return `(no ${label})`;
  return String(value);
}

export function renderPrompt(
  def: PromptDef,
  ctx: PromptRenderContext,
  userInput: string,
): string {
  const map: Record<string, string> = {
    input: userInput.trim() || '(user input missing)',
    file: fallback(ctx.file, 'file selected'),
    startLine: fallback(ctx.startLine, 'start line'),
    endLine: fallback(ctx.endLine, 'end line'),
    blockId: fallback(ctx.blockId, 'block id'),
    code: ctx.code?.trim() || '(no code captured)',
    agentsRules: AGENTS_RULES_SUFFIX,
  };
  return def.template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    key in map ? map[key] : `{{${key}}}`,
  );
}
