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
   * Final prompt template. Supports the placeholders listed at the top of
   * this file. Indentation inside the backticks is preserved verbatim.
   */
  template: string;
}

const AGENTS_RULES_SUFFIX =
  'Follow all architectural rules from AGENTS.md — especially the zone/block ID conventions, component reuse, semantic color tokens, and static Tailwind class strings. Do not invent new patterns.';

export const PROMPTS: PromptDef[] = [
  {
    id: 'generate-content',
    title: 'Generate content',
    description: 'Fill an element with new content or child components.',
    icon: 'Wand',
    inputLabel: 'In this element, generate…',
    inputPlaceholder: 'a 3-column pricing grid with Starter, Pro, and Enterprise cards',
    references: ['file', 'blockId', 'lineRange', 'code'],
    template: `In file \`{{file}}\` (lines {{startLine}}–{{endLine}}), within the element whose data-pv-block="{{blockId}}", generate: {{input}}

Current source of the target block:
\`\`\`tsx
{{code}}
\`\`\`

${AGENTS_RULES_SUFFIX}`,
  },
  {
    id: 'refactor-element',
    title: 'Refactor element',
    description: 'Restructure or clean up the selected block without changing its behavior.',
    icon: 'Sparkles',
    inputLabel: 'Refactor this element so that…',
    inputPlaceholder: 'it uses Card + TextBlock instead of raw divs, keeping the same layout',
    references: ['file', 'blockId', 'lineRange', 'code'],
    template: `Refactor the element with data-pv-block="{{blockId}}" in \`{{file}}\` (lines {{startLine}}–{{endLine}}).

Requested change: {{input}}

Current source:
\`\`\`tsx
{{code}}
\`\`\`

Preserve existing behavior and props. ${AGENTS_RULES_SUFFIX}`,
  },
  {
    id: 'fix-bug',
    title: 'Fix a bug',
    description: 'Describe a bug in the selected element and have the agent fix it.',
    icon: 'Bug',
    inputLabel: 'This element has a bug:',
    inputPlaceholder: 'clicking the button does nothing when the form is empty',
    references: ['file', 'blockId', 'lineRange', 'code'],
    template: `There is a bug in the element with data-pv-block="{{blockId}}" in \`{{file}}\` (lines {{startLine}}–{{endLine}}).

Bug description: {{input}}

Current source of the affected block:
\`\`\`tsx
{{code}}
\`\`\`

Diagnose the root cause first, then apply a minimal fix. ${AGENTS_RULES_SUFFIX}`,
  },
  {
    id: 'restyle',
    title: 'Restyle element',
    description: 'Adjust visual design of the selected element using semantic tokens.',
    icon: 'Palette',
    inputLabel: 'Restyle this element to…',
    inputPlaceholder: 'feel more compact and use the secondary background token',
    references: ['file', 'blockId', 'code'],
    template: `Restyle the element with data-pv-block="{{blockId}}" in \`{{file}}\`.

Desired style: {{input}}

Current source:
\`\`\`tsx
{{code}}
\`\`\`

Use only semantic color tokens and static Tailwind strings. ${AGENTS_RULES_SUFFIX}`,
  },
  {
    id: 'add-interaction',
    title: 'Add interaction',
    description: 'Wire up click/hover/keyboard behavior on the selected element.',
    icon: 'MousePointerClick',
    inputLabel: 'Add this interaction:',
    inputPlaceholder: 'clicking the card opens a dropdown with three actions',
    references: ['file', 'blockId', 'lineRange', 'code'],
    template: `Add interactive behavior to the element with data-pv-block="{{blockId}}" in \`{{file}}\` (lines {{startLine}}–{{endLine}}).

Requested interaction: {{input}}

Current source:
\`\`\`tsx
{{code}}
\`\`\`

Prefer existing components from @/components/ui over raw HTML. ${AGENTS_RULES_SUFFIX}`,
  },
  {
    id: 'explain',
    title: 'Explain this code',
    description: 'Ask the agent to walk through the selected block for learning.',
    icon: 'BookOpen',
    inputLabel: 'Explain focused on…',
    inputPlaceholder: 'how the variant prop drives the data-attributes',
    references: ['file', 'blockId', 'code'],
    template: `Explain the element with data-pv-block="{{blockId}}" in \`{{file}}\`.

Focus the explanation on: {{input}}

Source:
\`\`\`tsx
{{code}}
\`\`\`

Be concise and point to specific lines when useful.`,
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
