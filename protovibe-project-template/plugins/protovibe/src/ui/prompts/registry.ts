// plugins/protovibe/src/ui/prompts/registry.ts
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
  /** Lucide icon name (see https://lucide.dev). */
  icon: string;
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
  'Follow all architectural rules from AGENTS.md — especially the zone/block ID conventions, component reuse, semantic color tokens, and static Tailwind class strings. Do not invent new patterns.';

export const PROMPTS: PromptDef[] = [
  {
    id: 'create-view',
    title: 'Create new view or feature',
    description: 'Add a brand-new page or feature to the app, wired into the existing querystring routing.',
    icon: 'LayoutTemplate',
    inputLabel: 'Create a new view or feature that…',
    inputPlaceholder: 'shows a settings page with profile, notifications, and billing sections',
    requiresSelection: false,
    references: [],
    template: `Create a new view or feature in this Protovibe application.

Goal from the user:
{{input}}

Before writing any code:
1. Read \`src/App.tsx\` to understand how views are mounted and how the app is structured.
2. This app uses querystring-based routing (e.g. \`?view=xxx\`). Add the new route by following the existing pattern exactly — do NOT introduce react-router or any other routing library.
3. Browse \`src/components/ui/\` and reuse existing components wherever possible. Only write custom HTML/Tailwind when no existing component fits the need.
4. Use mock data held in React state (e.g. \`useState\` with a seeded default). The data should persist while navigating within the app but reset on full page refresh — do not write to localStorage, files, or any backend.

${AGENTS_RULES_SUFFIX}`,
  },
  {
    id: 'generate-inside-selection',
    title: 'Generate inside selection',
    description: 'Fill the currently selected element with new content or child components.',
    icon: 'Wand',
    inputLabel: 'Inside this element, generate…',
    inputPlaceholder: 'a 3-column pricing grid with Starter, Pro, and Enterprise cards',
    references: ['file', 'blockId', 'lineRange', 'code'],
    template: `Generate content inside the selected element.

Target: data-pv-block="{{blockId}}" in \`{{file}}\` (lines {{startLine}}–{{endLine}}).

Current source of the target block:
\`\`\`tsx
{{code}}
\`\`\`

What to generate: {{input}}

Reuse components from \`@/components/ui/\` whenever possible. ${AGENTS_RULES_SUFFIX}`,
  },
  {
    id: 'sketchpad-to-app',
    title: 'Convert sketchpad to app',
    description: 'Turn a rough sketchpad element into a real, production-ready piece of the App.tsx layout.',
    icon: 'Rocket',
    inputLabel: 'Extra instructions (optional)…',
    inputPlaceholder: 'place it inside the dashboard main column, above the stats cards',
    references: ['file', 'blockId', 'lineRange', 'code'],
    template: `The selected element comes from the Protovibe sketchpad. Treat it as a rough visual sketch, NOT as final code.

Your job: convert this sketch into a clean, production-quality implementation inside \`src/App.tsx\` (or the appropriate view file if routing is already set up).

Source element: data-pv-block="{{blockId}}" in \`{{file}}\` (lines {{startLine}}–{{endLine}}).

Sketch source:
\`\`\`tsx
{{code}}
\`\`\`

Conversion rules:
- Preserve the intent of the sketch's styling, visual hierarchy, and element ordering.
- The sketchpad uses absolute positioning for layout. Convert every \`position: absolute\` / top/left/width/height placement into normal document flow using Flexbox, Grid, padding, margin, and gap. Infer reasonable spacing values from the visual gaps in the sketch.
- Replace sketch-only primitives like "rectangle" with the proper components from \`@/components/ui/\` where equivalents exist.
- Rebuild the pv-block / pv-editable-zone structure with granular blocks per the AGENTS.md conventions so the result is editable in the normal app canvas.
- Keep text content identical to the sketch unless the user asks otherwise.
- Add any interactions or dynamic behavior needed to make this a real, working part of the app — but do not add extra features beyond what the user asked for.

Additional user instructions: {{input}}

${AGENTS_RULES_SUFFIX}`,
  },
  {
    id: 'element-to-sketchpad',
    title: 'Convert element to sketchpad',
    description: 'Take the selected element and create a new sketchpad version of it for freeform editing.',
    icon: 'PencilRuler',
    inputLabel: 'Extra instructions (optional)…',
    inputPlaceholder: 'simplify the header to just a title and a button',
    references: ['file', 'blockId', 'lineRange', 'code'],
    template: `Create a new sketchpad out of the selected element. The goal is to give the user a simplified, freely-editable sketch version of this UI that they can tweak in the Protovibe sketchpad.

Source element: data-pv-block="{{blockId}}" in \`{{file}}\` (lines {{startLine}}–{{endLine}}).

Source code:
\`\`\`tsx
{{code}}
\`\`\`

Rules for the sketchpad version:
- Strip out ALL special logic: event handlers, hooks, state, conditional rendering, data mapping, API calls. The result should be a static visual mock.
- Keep only the visual structure and representative text/content. Hard-code any data that was dynamic.
- Use normal document flow for layout (Flexbox/Grid/padding/gap). Do NOT use \`position: absolute\` even though this is going into the sketchpad.
- Follow the sketchpad styling conventions used by the other files in \`src/sketchpad/\` (or wherever sketchpads live in this project) — read a couple before writing.
- Wrap the result in pv-editable-zone / pv-block tags with HIGH granularity: every direct child the user might want to reorder, delete, or edit independently must be its own pv-block with a fresh 6-char id. Err on the side of more blocks rather than fewer.

Additional user instructions: {{input}}

${AGENTS_RULES_SUFFIX}`,
  },
  {
    id: 'new-component',
    title: 'New component',
    description: 'Create a new reusable UI component in components/ui, following project conventions.',
    icon: 'Blocks',
    inputLabel: 'Create a new component that…',
    inputPlaceholder: 'is a Stat tile showing a label, large value, and optional trend indicator',
    requiresSelection: false,
    references: [],
    template: `Create a new reusable UI component in \`src/components/ui/\`.

Component description from the user: {{input}}

Before writing any code:
1. Read the "Components Editing" section of AGENTS.md end-to-end — the new file MUST conform to every rule there (pvConfig, data-pv-component-id, PvDefaultContent, static Tailwind strings, safe prop types, etc.).
2. Browse a few existing files in \`src/components/ui/\` (e.g. button, card, textblock) to match the conventions for prop naming, typing, file layout, and variant handling.
3. Expose only string / boolean / select prop types via \`pvConfig.props\`. Never expose functions, children, or asChild.
4. Use semantic color tokens from \`src/index.css\` — never raw palette colors or hex values.

Output: a single new file in \`src/components/ui/\` that exports the component, its \`PvDefaultContent\`, and a valid \`pvConfig\`.

${AGENTS_RULES_SUFFIX}`,
  },
  {
    id: 'edit-component',
    title: 'Edit component',
    description: 'Modify the component definition of the currently selected element.',
    icon: 'SquarePen',
    inputLabel: 'Edit this component so that…',
    inputPlaceholder: 'the outline variant uses a dashed border and a smaller hover shadow',
    references: ['file', 'blockId', 'lineRange', 'code'],
    template: `Edit the component backing the currently selected element.

Selection: data-pv-block="{{blockId}}" in \`{{file}}\` (lines {{startLine}}–{{endLine}}).

Relevant source:
\`\`\`tsx
{{code}}
\`\`\`

Figure out which component in \`src/components/ui/\` renders this element (follow the import in \`{{file}}\` if needed, or match by the \`data-pv-component-id\` attribute). Then apply this change to that component's source file: {{input}}

Requirements:
- Respect every rule in AGENTS.md — especially: one pvConfig per file, explicit data-pv-component-id, safe prop types, static Tailwind class strings, semantic color tokens, and \`...props\` spread on the root element.
- If the change introduces a new variant/prop, add it to \`pvConfig.props\` and add any needed \`invalidCombinations\` filters.
- Keep existing usages working — do not rename or remove props unless the user asked for it.

${AGENTS_RULES_SUFFIX}`,
  },
  {
    id: 'restyle-element',
    title: 'Restyle element',
    description: 'Adjust the visual design of the selected element using only Tailwind utilities and semantic tokens.',
    icon: 'Palette',
    inputLabel: 'Restyle this element to…',
    inputPlaceholder: 'feel more compact with a softer secondary background',
    references: ['file', 'blockId', 'code'],
    template: `Restyle the selected element. This task is STYLING ONLY — do not change markup structure, props, or behavior beyond what is needed to apply the new classes.

Target: data-pv-block="{{blockId}}" in \`{{file}}\`.

Current source:
\`\`\`tsx
{{code}}
\`\`\`

Desired style: {{input}}

Hard constraints:
- Use ONLY Tailwind utility classes. No inline \`style={{}}\`, no CSS modules.
- Use ONLY semantic color tokens defined in \`src/index.css\` (e.g. \`bg-background-secondary\`, \`text-foreground-default\`, \`border-border-default\`). NEVER use default Tailwind palette colors (\`bg-blue-500\`) or hex values.
- Keep all className strings fully static so the AST parser can read them — no template literals, no ternaries inside className, no cva. Express variants via \`data-*\` attributes and \`data-[...]\` modifiers as shown in AGENTS.md.

${AGENTS_RULES_SUFFIX}`,
  },
  {
    id: 'add-interaction',
    title: 'Add interaction',
    description: 'Add a small, specific piece of interactivity to the selected element.',
    icon: 'MousePointerClick',
    inputLabel: 'Add this interaction:',
    inputPlaceholder: 'clicking the Actions button opens a dropdown with Edit and Delete',
    references: ['file', 'blockId', 'lineRange', 'code'],
    template: `Add a small, specific interaction to the selected element. Scope is tight: only implement what is asked, nothing more.

Target: data-pv-block="{{blockId}}" in \`{{file}}\` (lines {{startLine}}–{{endLine}}).

Current source:
\`\`\`tsx
{{code}}
\`\`\`

Interaction to add: {{input}}

Guidelines:
- Do NOT expand scope. If the user asks for "open a dialog on click", just wire the click → dialog — do not add extra buttons, extra content, or refactor the surrounding layout.
- Before implementing, look up how this interaction pattern is already done in the codebase for common cases: tooltips, dropdowns, dialogs, popovers, forms, toasts. Read at least one example file (e.g. \`src/components/ui/dialog.tsx\`, \`dropdown.tsx\`, \`tooltip.tsx\` — whichever is relevant) and follow that convention. Do not invent a new pattern.
- Prefer existing components from \`@/components/ui/\` over raw HTML elements.
- Floating UI (dropdowns, tooltips, popovers) must use \`createPortal\` + fixed positioning so it escapes any overflow-hidden inspectors — see AGENTS.md.

${AGENTS_RULES_SUFFIX}`,
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
