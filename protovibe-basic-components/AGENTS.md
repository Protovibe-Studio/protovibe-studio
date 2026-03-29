# AGENTS.md

## Floating UI Rules (Dropdowns/Popovers/Anchored Modals)

Problem: inspector containers may clip descendants (`overflow: hidden/auto`).

### Required pattern

1. Keep anchor in normal layout.
2. Render floating surface with `createPortal(..., document.body)`.
3. Position with `position: fixed` from `anchor.getBoundingClientRect()`.
4. Recompute on open, resize, scroll (capture), and floating/anchor size change.
5. Apply viewport constraints:
- flip above when below space is insufficient
- clamp horizontally to viewport padding
- enforce `minWidth >= anchor.width`

### Shared implementation (use first)

- Hook: `plugins/protovibe/src/ui/hooks/useFloatingDropdownPosition.ts`
- Consumer: `plugins/protovibe/src/ui/components/visual/AutocompleteDropdown.tsx`

### API sketch

```tsx
const { style } = useFloatingDropdownPosition({
  isOpen,
  anchorRef,
  dropdownRef,
  preferredPlacement: 'bottom',
  updateDeps: [items.length],
});

{isOpen && createPortal(
  <div ref={dropdownRef} style={{ ...style, zIndex: 9999999 }} />,
  document.body
)}
```

### Constraints

- Do not render floating UI as absolute inside clipped parents.
- Do not hardcode static `top/left` without viewport checks.
- Do not let caller styles override computed `position/top/left/maxHeight/minWidth`.

### Full-screen modal exception

Use fixed overlay (`inset: 0`) in `document.body`; include backdrop, focus management, and Escape close.

## pv-editable-zone Conventions

### ID rules — the one thing to remember

You will see `pv-editable-zone` tags in the codebase that already have IDs (e.g. `{/* pv-editable-zone-start:abc123 */}`). Those IDs were assigned by the Protovibe server — **never by hand**. Always write zones and blocks without IDs:

| Situation | What to write |
|---|---|
| Any zone you write (empty or with children) | Bare form — **no ID** |
| Any block you write | Bare form — **no ID**, empty `data-pv-block=""` |

**Why:** IDs are always assigned by the Protovibe server on first render/registration. Writing IDs by hand causes conflicts and drift. The server handles all ID assignment — never add IDs manually, even when a zone already contains children.

```jsx
// ✅ Correct — always bare, no IDs
{/* pv-editable-zone-start */}
  {/* pv-block-start */}
  <p data-pv-block="">Some content</p>
  {/* pv-block-end */}
{/* pv-editable-zone-end */}

// ❌ Never add IDs by hand — the server does that
{/* pv-editable-zone-start:abc123 */}
  {/* pv-block-start:r2t5lp */}
  <p data-pv-block="r2t5lp">Some content</p>
  {/* pv-block-end:r2t5lp */}
{/* pv-editable-zone-end:abc123 */}
```

### Component source files (`src/components/ui/`)
Always use the **bare ID-less** form. The zone is empty at definition time; the server registers it on first render.

```jsx
{/* pv-editable-zone-start */}
{children}
{/* pv-editable-zone-end */}
```

### `pvConfig.defaultContent`
If the component already has a `pv-editable-zone` in its JSX body, set `defaultContent: ''` — do not duplicate the zone here. Only use a bare zone pair in `defaultContent` when the component is a pure wrapper with **no** hardcoded zone in its JSX:
```js
defaultContent: '{/* pv-editable-zone-start */}\n{/* pv-editable-zone-end */}'
```

## pv-block Tags When Composing Multi-Element JSX

When writing JSX that composes multiple elements (a mix of UI components and plain HTML elements like `div`, `span`, `h1`–`h6`, `p`, `img`, `ul`, `li`, etc.), **every direct child element or component inside a `pv-editable-zone` MUST be wrapped in a `pv-block` comment pair** with a unique random 6-character alphanumeric ID. This is what allows the user to select, move, duplicate, and delete each piece independently in the visual builder.

### Required format

```jsx
{/* pv-editable-zone-start */}

  {/* pv-block-start */}
  <h2 data-pv-block="" className="text-xl font-semibold">Heading</h2>
  {/* pv-block-end */}

  {/* pv-block-start */}
  <p data-pv-block="" className="text-foreground-secondary">Body copy goes here.</p>
  {/* pv-block-end */}

  {/* pv-block-start */}
  <Button data-pv-block="" variant="default" label="Click me" />
  {/* pv-block-end */}

{/* pv-editable-zone-end */}
```

### Rules

1. **Every direct sibling inside a zone gets its own `pv-block` pair.** Never place bare elements directly inside a zone without a block fence.
2. **The block ID goes on both the comment tags and the `data-pv-block` attribute of the root element of that block.** If the block's root is a plain HTML element, add `data-pv-block="<id>"` to it. If it is a component that spreads `...props`, the attribute will be forwarded automatically.
3. **Nested children do NOT need their own block tags** unless they are themselves inside a nested `pv-editable-zone`.
4. **IDs are random 6-character lowercase alphanumeric strings** (e.g. `x1y2z3`). All IDs in the file must be unique — do not reuse zone IDs for block IDs or vice versa.
5. **Do not wrap conditional renders or `.map()` calls** in a single block tag — each statically-known element should have its own block. If content is dynamic, omit the block tags for that dynamic section.

### When this rule applies

- Any time you are asked to create a layout, design a section, or compose UI with multiple elements — **in any file**.
- Any time you write or edit JSX that contains more than one child element inside a `pv-editable-zone`, regardless of which file it is in.
- Any time you add elements to an existing zone in any file.
- Does **not** apply inside component source files (`src/components/ui/*.tsx`) — block tags live in usage sites, not in component definitions.

## pvConfig `invalidCombinations`

Use `invalidCombinations` to suppress nonsensical or visually broken prop combos from the Component Playground variant matrix. Each entry is a predicate — if any returns `true` for a combo, that combo is skipped.

```ts
invalidCombinations: [
  // prefix slot takes either an icon or text, not both
  (props) => !!props.prefixIcon && !!props.prefixText,
  // button with no label and no icon is invisible
  (props) => !props.iconOnly && !props.label,
],
```

Common patterns to always apply:
- **Mutually exclusive slots** — `prefixIcon` + `prefixText`, `suffixIcon` + `suffixText`
- **Required content** — filter any combo where the component would render empty (no label, no placeholder, etc.)
- **Co-dependency** — e.g. `iconOnly=true` requires at least one icon prop set

Since `pvConfig` is a JS module (not JSON), predicate functions are fully supported.

## `PvDefaultContent` — Hot-Reloadable Default Content

When a component's `defaultContent` is JSX (React nodes, not a string), it **must** be defined as an exported React component named `PvDefaultContent` in the same file. This gives it its own HMR boundary so class edits on elements inside defaultContent hot-reload instantly in the Component Playground.

### Pattern

```tsx
// 1. Define as a separate exported component BEFORE pvConfig
export function PvDefaultContent() {
  return (
    <>
      {/* pv-editable-zone-start */}
        {/* pv-block-start */}
        <ChildComponent data-pv-block="" label="Example" />
        {/* pv-block-end */}
      {/* pv-editable-zone-end */}
    </>
  );
}

// 2. Reference it in pvConfig
export const pvConfig = {
  ...
  defaultContent: <PvDefaultContent />,
  ...
};
```

### Rules

- **Always name it `PvDefaultContent`** — the server and previewer look for this exact export name.
- **Export it** — `export function PvDefaultContent()` (not `const`, not unexported).
- **Place it before `pvConfig`** in the file so the JSX reference `<PvDefaultContent />` resolves.
- **Only for JSX defaultContent** — if `defaultContent` is a plain string, no change needed.
- **One per file** — matches the one-pvConfig-per-file rule.
- The server extracts the return JSX from `PvDefaultContent` for code injection (same as it previously did from inline `defaultContent: (...)`).
- The previewer renders `<PvDefaultContent />` as a real React component, giving it its own HMR boundary.

### Why

Previously, JSX `defaultContent` was a static value inside the `pvConfig` object. When Protovibe's inspector edited classes on elements within that JSX, the file changed but React HMR couldn't update the static object — only real React components get HMR boundaries. By making it a component, class edits hot-reload immediately.

## Inspector Mutation Locking

- When adding inspector buttons/inputs that mutate code (backend write), run them through `runLockedMutation` from `plugins/protovibe/src/ui/context/ProtovibeContext.tsx`.
- New controls must respect `isMutationLocked` (disable interaction while locked).
- While locked, inspector should show progress cursor only (no extra blocking message).

## Reuse Existing Components

Never create custom `<button>`, `<input>`, or other interactive HTML elements when an existing component (`Button`, `Input`, etc.) can achieve the same result. For example, use `<Button variant="ghost-neutral" size="icon" leftIcon="X" />` for icon-only close buttons instead of a raw `<button>` with manual styling.

# Component Architecture Rules (Visual Editor)

Our custom visual editor parses the AST to read and write raw Tailwind strings directly. To maintain compatibility, all React components MUST adhere to these strict rules:

## 0. Never Use Inline Styles — Always Use Tailwind

**Never** use the `style` prop for visual styling in any component or demo. Always use Tailwind utility classes instead.

* **BAD:** `<h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Title</h2>`
* **GOOD:** `<h2 className="text-xl font-semibold">Title</h2>`

This project's Tailwind theme (defined in `src/index.css`) maps semantic design tokens to Tailwind utilities via `@theme`.

**⚠️ CRITICAL: Always read `src/index.css` before using any color-related Tailwind classes.** The `@theme {}` block defines all available semantic color variables. Color variables follow a `role-variant` naming pattern (e.g., `background-default`, `foreground-secondary`, `border-destructive-subtle`). Never hardcode color names in this file—always look them up in `index.css` to ensure consistency and correctness.

**Never use hardcoded palette colors.** Always prefer semantic token classes from the theme:
* **BAD:** `bg-gray-500`, `text-red-400`, `border-blue-600`, `text-[#6b7280]`
* **GOOD:** `bg-background-secondary`, `text-foreground-destructive`, `border-border-primary`

Hardcoded colors bypass the theme system and will not respond to dark mode or theme changes. The ONLY exception is when using colors inside the `:root` or `[data-theme="dark"]` CSS rule definitions in `src/index.css` itself.

The only acceptable use of `style` is for **computed / dynamic values that cannot be expressed as static Tailwind classes** (e.g. `style={{ maxWidth: props.maxWidth }}` where `maxWidth` is a runtime prop). Even then, prefer a Tailwind arbitrary-value class if the value is static.

## 1. No `cva` or JS Conditionals in `className`
Do not use `cva`, `clsx`, or ternaries for Tailwind classes. All possible classes (across all variants and sizes) must be written out in a single concatenated string.

* **BAD:** `className={cva("base", { variants: { variant: { default: "bg-blue" } } })}`
* **GOOD:** `className={"base-classes data-[variant=default]:bg-blue"}`

## 1.5. Never Use Palette Colors — Only Semantic Tokens

Always use semantic color tokens defined in `src/index.css`. Never use Tailwind's default palette colors, arbitrary hex values, or direct color names.

* **BAD:** `text-gray-600`, `bg-blue-300`, `border-red-500`, `bg-[#9CA3AF]`, `text-[rgb(107,113,128)]`
* **GOOD:** `text-foreground-secondary`, `bg-background-tertiary`, `border-border-destructive`

The semantic token system ensures colors respect dark mode, theme changes, and design consistency across the entire application. Read `src/index.css` to find the correct token for your use case.

## 2. Expose Variant Props to the DOM
Every prop that dictates a visual variant (e.g., `variant`, `size`, `orientation`) MUST be explicitly passed to the root DOM element as a `data-*` attribute. This allows the editor to read the active state.

* **GOOD:** `<button data-variant={variant} data-size={size} className="...">`

## 3. Style Using Tailwind Data Modifiers
Because we do not use JS conditionals, map all variant styles using Tailwind's native data-attribute modifiers. Stack them with interaction modifiers when necessary.

* **GOOD:** `data-[size=sm]:h-8`
* **GOOD:** `hover:data-[variant=ghost]:bg-[semantic-color]` (refer to `src/index.css` for available color tokens)
* **GOOD:** Use `data-*` modifiers with semantic color classes defined in theme

## 4. Strict Composition (No Style Exports)
Do not export variant functions (e.g., no `export { buttonVariants }`). Components must be entirely independent. If Component B needs Component A's styles, it must import Component A and use the `asChild` prop (via Radix UI's `<Slot>`) to wrap its own primitive.

* **BAD:** `<AlertDialog.Action className={buttonVariants({ variant: "outline" })} />`
* **GOOD:** `<Button asChild variant="outline"><AlertDialog.Action /></Button>`



# pvConfig Rules

## One `pvConfig` per file — named exactly `pvConfig`

The Protovibe scanner in `plugins/protovibe/src/backend/server.ts` detects components using **two hard-coded checks**:

1. A fast string search: `content.includes('export const pvConfig')`
2. A direct property access: `mod.pvConfig`

This means:
- The export **must** be named exactly `pvConfig` — nothing else (`dropdownItemPvConfig`, `pvConfigDefault`, etc.) will be found.
- **Only one `pvConfig` can exist per file.** The scanner sees the fast-check pass but only reads `mod.pvConfig` — if a file has `dropdownListPvConfig` and `dropdownItemPvConfig`, neither will be found; if it has two exports both renamed to `pvConfig`, only one survives at runtime.
- **If you need multiple Protovibe-registered components (e.g. DropdownList + DropdownItem), put each in its own file.** Use a barrel `index.ts` or pass-through file for convenience re-exports if needed.

```
// ✅ Good — one pvConfig per file
// src/components/ui/dropdown-list.tsx
export const pvConfig = { name: 'DropdownList', ... };

// src/components/ui/dropdown-item.tsx
export const pvConfig = { name: 'DropdownItem', ... };
```

```
// ❌ Bad — multiple named configs in one file; none will be visible in inspector
export const dropdownListPvConfig = { ... };
export const dropdownItemPvConfig = { ... };
```

## Component Identity: `componentId` + `data-pv-component-id`

The Protovibe inspector resolves `pvConfig` (and therefore the props panel) by scanning all `src/` files for a matching `pvConfig.componentId`. This avoids the barrel-import problem where importing from a re-export file would make config invisible.

**Every component with a pvConfig MUST:**
1. Add `componentId: 'ComponentName'` to `pvConfig` — must exactly match `pvConfig.name`.
2. Render `data-pv-component-id="ComponentName"` on the root DOM element, placed **after** `{...props}` so it cannot be overridden by consumers.

```tsx
// ✅ Good
export function DropdownItem({ ..., ...props }: DropdownItemProps) {
  return (
    <div
      {...props}
      data-pv-component-id="DropdownItem"   // ← after {...props}
    />
  );
}

export const pvConfig = {
  name: 'DropdownItem',
  componentId: 'DropdownItem',   // ← must match name
  ...
};
```

```tsx
// ❌ Bad — missing componentId; inspector props panel stays empty for barrel-imported components
export const pvConfig = {
  name: 'DropdownItem',
  // no componentId
};
```

## Import Paths: always use `@/` alias

The `@` alias maps to `src/` (configured in `vite.config.ts` and `tsconfig.json`).

- **All application imports** must use `@/` — never relative paths like `./components/ui/button` or `../../lib/utils`.
- **All `pvConfig.importPath` values** must use `@/` (e.g., `"@/components/ui/button"`) so Protovibe injects the correct import statement into user files.
- Do NOT use bare relative paths starting with `./` or `../` anywhere in `src/`.

```ts
// ✅ Good
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
export const pvConfig = { importPath: '@/components/ui/button', ... };

// ❌ Bad
import { Button } from './components/ui/button';
import { cn } from '../../lib/utils';
export const pvConfig = { importPath: 'components/ui/button', ... };
```

# Protovibe Component Guidelines
When creating or modifying React components in this project, you MUST ensure they are compatible with the Protovibe visual builder by adhering to these strict rules:

* **Always Maintain `pvConfig`**: Every editable UI component must export a `pvConfig` object defining its visual editor schema (`name`, `displayName`, `description`, `importPath`, `snippet`, `defaultContent`, and `props`). If you modify the TypeScript interface, you MUST update `pvConfig` to match.
* **Spread `...props` to the Root**: You must spread `...props` onto the outermost HTML/DOM element of the component (e.g., `<button {...props}>`). Protovibe strictly relies on this to inject the `data-pv-loc` tracking attributes.
* **Expose ALL Text as Props**: Never hardcode text labels inside a component's JSX. All text (labels, titles, descriptions, button text) MUST be exposed as `string` props (e.g., `label="Click me"`) and added to the `props` schema in `pvConfig` so they can be edited directly from the visual inspector.
* **Understand Injection Strings (`snippet` vs `defaultContent`)**: 
  * `snippet`: A string of default **props** injected into the opening tag when the component is first added via the UI (e.g., `variant="default" label="New Button"`). Do not include angle brackets.
  * `defaultContent`: A string representing the **inner JSX children**. In almost all cases where a component acts as a wrapper (like a Button, Card, or Container), this should default to a pristine `pv-editable-zone` pair (e.g., `'{/* pv-editable-zone-start */}\n{/* pv-editable-zone-end */}'`) so the user can immediately drop other blocks inside it. If `defaultContent` is provided, the builder injects open/close tags. If empty, it injects a self-closing tag.
* **No Complex Props in Config**: Never expose functions (e.g., `onClick`), React nodes, or dangerous render props (like `asChild`) inside `pvConfig`. The visual builder can only serialize and edit `string`, `boolean`, and `select` (string enums).
* **Use the Unified `<Icon />` Component**: Do NOT import individual icons directly (e.g., `import { Download } from 'lucide-react'`). Instead, always use the unified wrapper (`import { Icon } from '@/components/ui/icon'`) and pass the icon name as a string (`<Icon name="Download" />`). This ensures the visual builder can swap icons dynamically via dropdowns.
Always include by default the pv-editable-zone pair inside defaultContent. 

*** Example pvConfig ***
export const pvConfig = {
  name: "Button",
  displayName: "Interactive Button",
  description: "A standard button with Lucide icon support.",
  importPath: "@/components/ui/button",
  snippet: `label="New Button" variant="default"`,
  defaultContent: `{/* pv-editable-zone-start */}
{/* pv-editable-zone-end */}`,
  props: {
    variant: { 
      type: "select", 
      options: ["default", "destructive", "outline", "secondary", "ghost", "link"] 
    },
    size: { 
      type: "select", 
      options: ["default", "sm", "lg", "icon"] 
    },
    disabled: { type: "boolean" },
    label: { type: "string" },
    // 1. Expose the icon props, dynamically pulling all Lucide icon names
    prefixIcon: { type: "select", options: Object.keys(icons) },
    suffixIcon: { type: "select", options: Object.keys(icons) }
  }
};

# Protovibe Component Guide

Protovibe bridges the gap between a standard React codebase and a visual, no-code builder. To make a React component appear in the Protovibe "+ Add element" menu and make its props editable in the visual inspector, you must export a `pvConfig` object from the component's file.

This document outlines how to configure your components and the strict rules you must follow when writing them.

---

## 1. The `pvConfig` Object

To register a component, export a named constant called `pvConfig` from your component file (e.g., `src/components/ui/button.tsx`). 

Protovibe's Vite plugin scans your source code for this export, registers the component in memory, and uses it to generate the UI inspector and safely inject imports.

### Example Configuration
\`\`\`typescript
import { icons } from 'lucide-react';

export const pvConfig = {
  name: "Button", 
  displayName: "Button", 
  description: "A standard button with variants and icon support.",
  importPath: "@/components/ui/button", 
  snippet: `variant="default" label="Click me"`, 
  defaultContent: `{/* pv-editable-zone-start */}
{/* pv-editable-zone-end */}`,
  props: {
    variant: { type: "select", options: ["default", "destructive", "outline", "ghost"] },
    size: { type: "select", options: ["default", "sm", "lg", "icon"] },
    disabled: { type: "boolean" },
    label: { type: "string" },
    suffixIcon: { type: "select", options: Object.keys(icons) },
  }
};
\`\`\`

### Configuration Fields

| Field | Type | Description |
| :--- | :--- | :--- |
| **`name`** | `string` | The exact exported name of the React component (e.g., `"Button"`). Used for AST matching. |
| **`displayName`** | `string` | The human-readable name shown in the Protovibe component menu. |
| **`description`** | `string` | A short subtitle explaining what the component does in the menu. |
| **`importPath`** | `string` | The absolute or aliased path to inject into the file when adding the component (e.g., `"@/components/ui/button"`). |
| **`snippet`** | `string` | A string of default **props** injected into the opening tag when the component is inserted (e.g., `variant="outline" label="New"`). *Do not include angle brackets.* |
| **`defaultContent`**| `string` | The **inner JSX children** injected when the component is added. Use a pristine `pv-editable-zone` pair (e.g., `'{/* pv-editable-zone-start */}\n{/* pv-editable-zone-end */}'`) to allow dropping nested blocks. If provided, Protovibe injects open/close tags; if empty, it injects a self-closing tag. |
| **`props`** | `object` | A schema defining which props are editable in the UI and what UI control to render. |

---

## 2. Supported Prop Types

The `props` object defines how Protovibe renders the right-hand inspector panel. 

* **`string`**: Renders a standard text input. (e.g., `label: { type: "string" }`)
    * *Note: If you want the inner text of the component to be editable, use the special `children` key: `children: { type: "string" }`.*
* **`boolean`**: Renders a True/False dropdown. When True, Protovibe injects the valueless shorthand (e.g., `<Button disabled />`). When False, it injects the explicit boolean (e.g., `<Button disabled={false} />`).
* **`select`**: Renders a dropdown menu. Requires an `options` array of strings. (e.g., `variant: { type: "select", options: ["solid", "outline"] }`).

---

## 3. Strict Rules for Components

To ensure your components do not break the visual builder or crash the React application, you must adhere to the following rules.

### Rule 1: You MUST spread `...props` to the root HTML element
Protovibe tracks elements in the DOM by injecting a unique `data-pv-loc-xxxx` attribute into your JSX via Babel. If your component does not spread `...props` down to the actual HTML element (like `<button>` or `<div>`), the inspector will not be able to "see" or click your component.

**❌ Bad:**
\`\`\`tsx
function Badge({ variant, label }) {
  // The Protovibe locator attribute is lost!
  return <span className={variant}>{label}</span> 
}
\`\`\`

**✅ Good:**
\`\`\`tsx
function Badge({ variant, label, ...props }) {
  // The Protovibe locator successfully attaches to the DOM
  return <span className={variant} {...props}>{label}</span> 
}
\`\`\`

#### ⚠️ Critical: Wrapper-div components (`...props` must NOT go on an inner element)

When a component renders a **wrapper div containing a native element** (e.g. a styled `<div>` wrapping a native `<input>` or `<textarea>`), **never** spread `{...props}` on the inner native element. The Babel locator injects `data-pv-loc-*` as a prop from the consumer file — if that ends up on the inner element instead of the outer root div, clicking the outer div in the inspector will only show the component-file source, not the consumer-file source.

**❌ Bad — {...props} on inner element: consumer's pv-loc ends up on the wrong element:**
\`\`\`tsx
function Input({ error, disabled, placeholder, onChange, ...props }: InputProps) {
  return (
    <div className="border ..."> {/* ← only has its own (component-file) pv-loc */}
      <input placeholder={placeholder} onChange={onChange} {...props} /> {/* ← consumer's pv-loc ends up here */}
    </div>
  );
}
\`\`\`

**✅ Good — {...rest} on outer div, explicit props on inner element:**
\`\`\`tsx
// Props interface extends HTMLAttributes<HTMLDivElement> (NOT HTMLInputElement),
// so that {...rest} is div-safe and consumer's pv-loc lands on the root wrapper.
export interface InputProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'onFocus' | 'onBlur'> {
  // Declare native input props explicitly so they can be forwarded
  placeholder?: string;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  // ...other input props
}

function Input({ error, disabled, placeholder, value, onChange, onFocus, onBlur, ...rest }: InputProps) {
  return (
    <div {...rest} className="border ..."> {/* ← {...rest} carries the consumer's pv-loc here ✓ */}
      <input placeholder={placeholder} value={value} onChange={onChange} /> {/* ← only input-specific props */}
    </div>
  );
}
\`\`\`

The rule: **`InputProps` (and any similar wrapper-component props interface) must extend `React.HTMLAttributes<HTMLDivElement>` instead of `React.InputHTMLAttributes<HTMLInputElement>`**. All element-specific props are then enumerated explicitly in the interface and forwarded explicitly to the inner element. `{...rest}` on the root div will only contain generic/unknown HTML attributes (including `data-pv-loc-*`), which are safe to apply to any HTML element.

### Rule 2: Expose ALL Text as Props & Protect Internals
Never hardcode text labels inside a component's JSX. All text (labels, titles, descriptions, button text) MUST be exposed as `string` props (e.g., `label="Click me"`) and added to the `props` schema in `pvConfig` so they can be edited directly from the visual inspector.

Furthermore, if your component wraps `children` in complex logic (like an icon next to text), use a `label` prop instead of exposing `children` to the config. If you expose `children` as a string, Protovibe will overwrite whatever internal elements are nested inside the component. Only expose `children: { type: "string" }` if the component is a simple text wrapper.

### Rule 3: NEVER expose complex or dangerous props
Do not expose props in `pvConfig` that accept functions, React nodes, or complex objects. Only expose plain strings, booleans, and simple enums. 
* **Do not expose `asChild`:** Radix's `asChild` requires a valid React element child. If a user toggles this in the UI without understanding it, the app will crash.
* **Do not expose function props:** e.g., `onClick`. These cannot be safely serialized or edited visually.

### Rule 4: Use the Unified `<Icon />` Component
Do NOT import individual icons directly (e.g., `import { Download } from 'lucide-react'`). Instead, always use the unified wrapper (`import { Icon } from '@/components/ui/icon'`) and pass the icon name as a string (`<Icon name="Download" />`). 

This ensures the visual builder can swap icons dynamically via `select` dropdowns mapped to `Object.keys(icons)`.

### Rule 5: Utilize `pv-editable-zone` pairs for default content
When configuring wrapper components (like Cards, Containers, or Buttons), `defaultContent` should almost always be set to a pristine `pv-editable-zone` pair (e.g., `defaultContent: "{/* pv-editable-zone-start */}\n{/* pv-editable-zone-end */}"`). This ensures that as soon as the element is added to the page, the user can immediately drop other visual blocks inside it.

### Rule 6: Keep the config in the same file
The Vite backend scanner looks for `export const pvConfig` inside your component files. Do not separate the config into a different file or a global registry, otherwise the live-reloading scanner will not find it.

### Rule 7: Avoid Dynamic Tailwind String Interpolation
Tailwind CSS scans your files at build time to generate styles. It cannot execute Javascript. If you dynamically construct class names, Tailwind will not generate them, and the visual builder will appear broken when a user changes a prop.

**❌ Bad:**
\`\`\`tsx
// Tailwind cannot see "bg-red-500" here at build time
<div className={\`bg-\${color}-500\`}> 
\`\`\`

**✅ Good:**
Use full class names via lookup maps, `data-[variant]` attribute selectors, or `cva()` (Class Variance Authority) definitions.
\`\`\`tsx
// Using Radix-style data attributes
<div data-variant={variant} className="data-[variant=destructive]:bg-red-500">
\`\`\`