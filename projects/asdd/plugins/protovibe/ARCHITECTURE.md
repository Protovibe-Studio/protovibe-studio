# vite-plugin-protovibe — Architecture & Core Concepts
 
## Table of Contents
 
1. [Overview](#overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Build Pipeline & Plugin Entry](#build-pipeline--plugin-entry)
4. [The `pv-` Naming Convention](#the-pv--naming-convention)
5. [Phase 1 — Compile-Time: The JSX Locator](#phase-1--compile-time-the-jsx-locator)
6. [Phase 2 — Runtime: The Inspector UI](#phase-2--runtime-the-inspector-ui)
7. [Phase 3 — Edit-Time: The Backend Server](#phase-3--edit-time-the-backend-server)
8. [Data Flow: Click to Edit](#data-flow-click-to-edit)
9. [Blocks & Zones](#blocks--zones)
10. [Tailwind Class Management](#tailwind-class-management)
11. [State Management](#state-management)
12. [The `pvConfig` Component Contract](#the-pvconfig-component-contract)
13. [Undo / Redo / Clipboard](#undo--redo--clipboard)
14. [File & Directory Structure](#file--directory-structure)
 
---
 
## Overview
 
`vite-plugin-protovibe` is a **dev-only Vite plugin** that turns your running app into a visual editor. It works by:
 
1. **Instrumenting** every JSX element at compile time with a unique DOM attribute that encodes its source location.
2. **Injecting** a React-powered inspector sidebar into the page at runtime.
3. **Serving** a set of HTTP endpoints on the Vite dev server that read and rewrite source files in response to user actions in the sidebar.
 
No build output is affected. Everything is gated behind `apply: 'serve'` and only runs during development.
 
---
 
## High-Level Architecture
 
```
┌─────────────────────────────────────────────────────────────┐
│  Vite Dev Server (Node.js)                                   │
│                                                             │
│  ┌──────────────────────┐    ┌───────────────────────────┐  │
│  │  jsxLocatorPlugin    │    │  protovibeSourcePlugin    │  │
│  │  (enforce: 'pre')    │    │  (apply: 'serve')         │  │
│  │                      │    │                           │  │
│  │  Babel AST transform │    │  Registers HTTP endpoints │  │
│  │  on every .jsx/.tsx  │    │  Injects inspector.js     │  │
│  │                      │    │  into HTML                │  │
│  │  → data-pv-loc-{id}  │    │                           │  │
│  │    injected into DOM │    │  /__get-source-info        │  │
│  │                      │    │  /__update-source          │  │
│  │  → locatorMap in     │    │  /__get-zones              │  │
│  │    server memory     │    │  /__add-block              │  │
│  └──────────────────────┘    │  /__block-action           │  │
│                              │  /__update-prop            │  │
│                              │  /__get-components         │  │
│                              │  /__take-snapshot          │  │
│                              │  /__undo  /__redo          │  │
│                              └───────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │  HMR (file writes trigger automatic reload)
         ▼
┌──────────────────────────────────┐
│  Browser (user's app + inspector)│
│                                  │
│  ┌───────────────┐  ┌─────────┐  │
│  │  User's app   │  │ Sidebar │  │
│  │  DOM          │  │  React  │  │
│  │               │  │  App    │  │
│  │ data-pv-loc-* │  │         │  │
│  │ data-pv-block │  │         │  │
│  └───────────────┘  └─────────┘  │
└──────────────────────────────────┘
```
 
---
 
## Build Pipeline & Plugin Entry
 
`src/index.ts` exports a single factory function `protovibePlugin()` that returns **two Vite plugins** as an array:
 
```typescript
export function protovibePlugin(): Plugin[] {
  return [
    jsxLocatorPlugin(),      // enforce: 'pre' — runs before other transforms
    protovibeSourcePlugin(), // apply: 'serve'  — dev-server only
  ];
}
```
 
The plugin itself is built with `tsup` (producing ESM + CJS outputs) and a **separate esbuild step** for the UI bundle:
 
```
src/index.ts            → dist/index.js / dist/index.cjs  (Node, consumed by Vite)
src/ui/inspector.tsx    → dist/ui/inspector.js             (Browser bundle, injected into pages)
```
 
The UI bundle is injected into every HTML page via `transformIndexHtml` as an inline `<script>` tag at the end of `<body>`. This means the inspector React app mounts on top of the user's app without any module bundler coordination.
 
---
 
## The `pv-` Naming Convention
 
All identifiers, DOM attributes, JSX comments, and custom events use the `pv-` prefix. This namespace ensures zero collision with user code.
 
### DOM Attributes
 
| Attribute | Set by | Purpose |
|---|---|---|
| `data-pv-loc-{id}` | `jsxLocatorPlugin` at compile time | Links a DOM element to its source location. The `{id}` portion is a deterministic hash of `filepath:line:column`. Valueless (boolean attribute). |
| `data-pv-block` | Developer (user writes this in source) | Marks a JSX element as a named, moveable "block". Value is a 6-char random alphanumeric ID. |
 
### JSX Source Comments
 
These are JSX block comments (`{/* ... */}`) embedded directly in source files to define editable regions. They are not rendered into the DOM.
 
| Comment Syntax | Meaning |
|---|---|
| `{/* pv-editable-zone-start */}` | A pristine drop zone — an ID-less start tag. Paired with a matching `{/* pv-editable-zone-end */}`. When the first block is inserted the server assigns a permanent ID to both tags. |
| `{/* pv-editable-zone-end */}` | The ID-less end tag of a pristine zone. |
| `{/* pv-editable-zone-start:name */}` | The opening boundary of a permanent, named drop zone. Blocks are inserted immediately before `pv-editable-zone-end`. |
| `{/* pv-editable-zone-end:name */}` | The closing boundary of a named drop zone. |
| `{/* pv-block-start:id */}` | Opening boundary of a block. The `id` is a 6-char alphanumeric string. |
| `{/* pv-block-end:id */}` | Closing boundary of a block. Matched with its `pv-block-start` by the same `id`. |
 
### Custom DOM Events
 
| Event | Dispatched on | Payload |
|---|---|---|
| `pv-toast` | `window` | `string \| { message: string; durationMs?: number; variant?: 'info' \| 'success' \| 'error' }` — global toast event consumed by the `ToastViewport` UI. |
 
### UI IDs
 
| ID | Element |
|---|---|
| `protovibe-root` | The `<div>` that the inspector React app is mounted into. |
| `pv-visual-toggle-btn` | The floating toggle button shown when the inspector is closed. |
 
---
 
## Phase 1 — Compile-Time: The JSX Locator
 
**File:** `src/preprocessing/jsx-locator.ts`
 
This plugin runs `enforce: 'pre'` meaning it executes before any other Vite transform. For every `.jsx` and `.tsx` file (excluding `node_modules`), it:
 
1. Parses the file into a Babel AST.
2. Visits every `JSXElement` node.
3. For the opening element, it records:
   - `file` — relative path from the project root
   - `bStart` / `bEnd` — `[line, column]` of the JSX element's start and end
   - `cStart` / `cEnd` — `[line, column]` of the `className` attribute value (if present)
   - `nameEnd` — `[line, column]` of the end of the tag name (used to insert `className` on elements that don't have one yet)
   - `comp` — the component or HTML tag name
   - `hasClass` — boolean indicating whether a `className` attribute exists
 
4. Generates a **deterministic ID** by hashing `filepath:line:column` using a simple djb2-style hash, then converting to base-36. This means the ID is stable across re-renders as long as the source hasn't changed.
 
5. Stores the full location payload in the in-memory `locatorMap` (`Map<id, payload>`) shared across the Node.js process.
 
6. Injects a **valueless** `data-pv-loc-{id}` attribute onto the opening JSX element. It is valueless because the actual location data lives in the server's memory — the DOM attribute is just a key.
 
The result is that every rendered DOM element carries a reference back to its exact source position, without storing any source-path strings in the browser.
 
---
 
## Phase 2 — Runtime: The Inspector UI
 
**Entry:** `src/ui/inspector.tsx` → compiled to `dist/ui/inspector.js`
 
When the page loads, `inspector.js` creates a `<div id="protovibe-root">` at the end of `<body>` and mounts a React application into it. The React tree is:
 
```
ProtovibeProvider          ← global state context
  └─ ProtovibeApp
       ├─ useCanvasInterceptor()   ← click interception hook
       ├─ useKeyboardShortcuts()   ← keyboard navigation hook
       ├─ FloatingToggleButton     ← when inspector is closed
       └─ Sidebar                  ← when inspector is open
            ├─ Header              ← file path, undo/redo buttons
            ├─ Tabs                ← one tab per source location on element
            ├─ BlockEditor         ← add / move / delete / paste blocks
            ├─ ComponentProps      ← edit JSX props via pvConfig schema
            ├─ Modifiers           ← breakpoint / interaction / data-attr selectors
            ├─ VisualEditor        ← Tailwind visual controls (spacing, layout, etc.)
            └─ ClassesRaw          ← raw class list with per-class editing
```
 
### useCanvasInterceptor
 
Listens for `click` events on the document using **capture phase** (`addEventListener(..., true)`). When a click occurs outside the inspector root, it:
 
1. Walks up the DOM from the clicked element looking for any `data-pv-loc-*` attribute.
2. Collects all matching IDs from the first element that has them (an element can have multiple if it renders in multiple files via composition).
3. Sets `currentBaseTarget` (the selected DOM element) and `sources` (the set of locator IDs).
4. Prevents the original click from propagating so it doesn't trigger user-land click handlers.
 
### useKeyboardShortcuts
 
When the inspector is open, intercepts global `keydown` events for:
 
- `Escape` — close inspector
- `Cmd/Ctrl+Z` — undo
- `Cmd/Ctrl+Shift+Z` — redo
- `Cmd/Ctrl+C/X/V/D` — block copy/cut/paste/duplicate (when a block is focused)
- `Arrow keys` — navigate the DOM tree (Up = parent, Down = first child, Left/Right = siblings)
- `Backspace/Delete` — delete the focused block
 
---
 
## Phase 3 — Edit-Time: The Backend Server
 
**File:** `src/backend/server.ts`
 
`protovibeSourcePlugin` registers Connect middleware on the Vite dev server. All endpoints accept JSON bodies via POST and respond with JSON. Every file-writing endpoint uses Node's synchronous `fs.writeFileSync`, which Vite's file watcher picks up immediately and triggers HMR.
 
### Endpoint Reference
 
| Endpoint | Purpose |
|---|---|
| `/__get-source-info` | Given a locator `id`, looks up the location payload in `locatorMap`, reads the source file, parses it with Babel, and returns the element's code block, className string, parsed classes, component props, and `pvConfig` schema (if available). |
| `/__update-source` | Rewrites a `className` attribute in a source file. Supports `add`, `edit`, `remove`, and `replace-multiple` actions. After writing, normalises whitespace in className strings. |
| `/__get-zones` | Scans a source file for `pv-editable-zone-start` comments within given line bounds and returns the list of available zones. |
| `/__add-block` | Inserts a new block (div, span, component, or paste) into a zone. Handles import injection for component blocks. Promotes pristine zones to permanent zones on first use. |
| `/__block-action` | Performs in-place block operations: `copy`, `cut`, `paste`, `duplicate`, `delete`, `move-up`, `move-down`, `edit-text`. |
| `/__update-prop` | Adds, edits, or removes a JSX prop by rewriting the exact character range returned by Babel's AST. |
| `/__get-components` | Walks `src/` recursively, finds files exporting `pvConfig`, loads them via `server.ssrLoadModule`, and returns the component catalogue. |
| `/__take-snapshot` | Reads the current file content and pushes it onto the `undoStack`. Clears the `redoStack`. |
| `/__undo` | Pops the `undoStack`, writes the saved content back to disk, pushes the current content to `redoStack`. Returns the `activeId` so the UI can re-focus the right element. |
| `/__redo` | Mirror of `/__undo`. |
 
### Shared Server State (`src/shared/state.ts`)
 
Three module-level variables are shared across the Node.js process lifetime:
 
```typescript
locatorMap  // Map<string, LocationPayload> — populated at compile time
undoStack   // { file, content, activeId }[] — file snapshots
redoStack   // { file, content, activeId }[] — redo stack
clipboard   // { data: { file, content } | null } — server-side clipboard
```
 
The clipboard living on the server is what allows block copy/cut/paste to reconstruct pasted JSX with fresh IDs — all ID remapping happens in Node before the file is written.
 
---
 
## Data Flow: Click to Edit
 
This is the end-to-end sequence for selecting an element and changing a Tailwind class.
 
```
1. User clicks element on page
   └─ useCanvasInterceptor fires (capture phase)
      ├─ Walks DOM ancestors for data-pv-loc-* attributes
      ├─ Calls setSources(ids)        → triggers refreshActiveData()
      └─ Calls setCurrentBaseTarget() → renders Sidebar
 
2. refreshActiveData() runs
   ├─ For each id in sources:
   │    POST /__get-source-info { id }
   │    ← { code, classNameStr, parsedClasses, componentProps,
   │         file, startLine, endLine, compName, configSchema }
   ├─ Sorts results (consumer components first)
   ├─ Sets sourceDataList and activeSourceId
   └─ POST /__get-zones { file, startLine, endLine }
      └─ Sets zones[]
 
3. Sidebar renders
   └─ VisualEditor reads activeData.parsedClasses
      ├─ filterClassesByContext(classes, activeModifiers) → classes for current variant
      └─ extractVisualValues(filtered) → { mt, mr, display, bg, ... }
 
4. User changes a value in VisualControl (e.g. bg color)
   ├─ POST /__take-snapshot { file, activeId }    (saves undo state)
   └─ POST /__update-source {
        file, startLine, endLine,
        oldClass: "bg-slate-800",
        newClass: "lg:bg-blue-500",     (includes modifier prefix from activeModifiers)
        action: "edit"
      }
      └─ Server rewrites file
         └─ Vite HMR triggers → DOM updates
            └─ refreshActiveData() re-fetches updated classes
```
 
---
 
## Blocks & Zones
 
Blocks and zones are the core mechanism for **structural editing** — adding, removing, and reordering whole sections of JSX.
 
### Zones
 
A zone is a place in your JSX where content can be inserted. There are two kinds:
 
**Pristine zones** are ID-less start/end pairs you write by hand when building a layout or placing inside a `pvConfig.defaultContent`. They have no children yet:
 
```jsx
<div className="flex flex-col">
  {/* pv-editable-zone-start */}
  {/* pv-editable-zone-end */}
</div>
```
 
**Permanent zones** are created the first time you insert something into a pristine zone. The server assigns a 6-char random ID to both tags and places the new block between them:
 
```jsx
<div className="flex flex-col">
  {/* pv-editable-zone-start:a3f9x2 */}
  {/* pv-block-start:7k2m9p */}
  <div className="flex flex-col min-h-4" data-pv-block="7k2m9p">
    {/* pv-editable-zone-start:inside-7k2m9p */}
    {/* pv-editable-zone-end:inside-7k2m9p */}
  </div>
  {/* pv-block-end:7k2m9p */}
  {/* pv-editable-zone-end:a3f9x2 */}
</div>
```
 
New blocks are always inserted **before the `pv-editable-zone-end` comment**, so zones grow downward.
 
The server constrains zone discovery to the **line bounds of the selected element** (`startLine`/`endLine` from the locator payload). This prevents zones from sibling or parent components from appearing in the picker.
 
### Blocks
 
Every insertable piece of content is wrapped in a `pv-block-start`/`pv-block-end` comment envelope:
 
```jsx
{/* pv-block-start:7k2m9p */}
<div className="..." data-pv-block="7k2m9p">
  ...
</div>
{/* pv-block-end:7k2m9p */}
```
 
The `data-pv-block` attribute on the root element of a block **is the runtime link between the DOM and the source comment envelope**. The sidebar reads `currentBaseTarget.closest('[data-pv-block]')` to find which block the user is interacting with, and all block operations use the resulting `blockId` to locate the right `pv-block-start`/`pv-block-end` pair via regex.
 
Block IDs are **6-character random base-36 strings** (`Math.random().toString(36).substring(2, 8)`). When duplicating or pasting, all IDs within the copied content are remapped to fresh IDs before writing.
 
### Move Up / Move Down
 
The server builds a full block hierarchy tree by scanning all `pv-block-start`/`pv-block-end` tags in the file with a stack-based parser. It finds the target block's siblings (the array it belongs to in the tree), and swaps the character ranges of adjacent sibling blocks in the file content string.
 
---
 
## Tailwind Class Management
 
Three layers of utilities manage Tailwind classes.
 
### Parsing — `parseTailwindClasses` (`src/shared/utils.ts`)
 
Parses a raw `className` attribute value (which may be a string literal, template literal, or conditional expression) by scanning for quoted strings with a regex. For each class token it extracts:
 
- `cls` — the full class string including modifiers (e.g. `lg:hover:bg-blue-500`)
- `baseClass` — the class without modifiers
- `category` — one of: Layout & Sizing, Typography, Backgrounds & Colors, Borders & Shadows, Interactivity & Effects, Misc / Custom
- `appliedWhen` — array of conditions (`{ type: 'tailwind' | 'logic', text: string }`)
 
### Filtering — `filterClassesByContext` (`src/ui/utils/tailwind.ts`)
 
Given the full list of parsed classes and the current `activeModifiers` state, returns only the classes that match the active breakpoint, interaction pseudo-classes, and `data-*` variant selectors. This is what makes the visual controls reflect what's visible *right now* in the active state.
 
### Extracting values — `extractVisualValues`
 
Maps a flat array of classes to a structured object `v` with keys like `mt`, `mr`, `bg`, `display`, `fontWeight`, etc. This is what the visual sub-panels (`Spacing`, `Layout`, `Typography`, etc.) consume.
 
### Modifying — `buildContextPrefix`
 
Constructs the Tailwind variant prefix string from the current `activeModifiers` so that edits are written back with the correct modifier. For example, if the user is editing in `lg` breakpoint with `hover` interaction, changes produce classes like `lg:hover:bg-blue-500`.
 
### Writing back — `computeOptimalSpacing` / `makeSafe`
 
`computeOptimalSpacing` collapses individual directional margin/padding values into shorthand (e.g. if all four sides are `4`, write `m-4` not `mt-4 mr-4 mb-4 ml-4`).
 
`makeSafe` wraps arbitrary values in Tailwind's bracket notation if they look like raw CSS units (e.g. `24px` → `[24px]`, `#ff0000` → `[#ff0000]`).
 
---
 
## State Management
 
All inspector state lives in `ProtovibeContext` (a React context). There is no external state library.
 
| State | Type | Description |
|---|---|---|
| `inspectorOpen` | `boolean` | Whether the sidebar is visible. |
| `currentBaseTarget` | `HTMLElement \| null` | The DOM element the user has selected. |
| `highlightedElement` | `HTMLElement \| null` | The element with the blue outline. Managed via imperative DOM style mutation to avoid React re-render overhead. |
| `sources` | `string[]` | The set of `data-pv-loc-*` IDs found on the selected element. An element can have multiple IDs if it is rendered by multiple component files (e.g. a wrapper and a definition). |
| `sourceDataList` | `SourceData[]` | The fetched source info for each ID in `sources`. Each entry maps an `id` to the full payload from `/__get-source-info`. |
| `activeSourceId` | `string \| null` | Which of the multiple sources (tabs) is currently shown in the sidebar. |
| `activeData` | derived | `sourceDataList.find(s => s.id === activeSourceId)?.data`. The payload currently shown. |
| `activeModifiers` | `ActiveModifiers` | `{ breakpoint, interaction[], dataAttrs }` — the current editing context for Tailwind variant filtering. |
| `zones` | `Zone[]` | The drop zones available for the selected element's file bounds. |
| `availableComponents` | `any[]` | All `pvConfig`-exported components found in the project, fetched once on mount. |
 
`refreshActiveData` is the main data-fetch function. It is called whenever `sources` changes (via a `useEffect`) and can also be called explicitly after a write operation with a short `setTimeout` to give HMR time to update the DOM.
 
---
 
## The `pvConfig` Component Contract
 
Any component can opt into first-class inspector support by exporting a `pvConfig` constant from its source file:
 
```typescript
export const pvConfig = {
  name: 'Button',
  displayName: 'Button',
  description: 'A clickable button',
  importPath: '@/components/ui/Button',   // must be resolvable by Vite
  snippet: 'variant="solid"',              // default props string for insertion
  defaultContent: 'Click me',             // inner children for non-self-closing insertion
  props: {
    variant: {
      type: 'select',
      options: ['solid', 'outline', 'ghost']
    },
    disabled: {
      type: 'boolean'
    }
  }
};
```
 
The server discovers these via `/__get-components`, which walks `src/` looking for files containing the string `export const pvConfig` (fast pre-filter), then loads them with `server.ssrLoadModule`.
 
When the user selects an instance of a component that has `pvConfig`, the server also loads the schema from `__get-source-info` and returns it as `configSchema`. The `ComponentProps` panel merges the schema's prop definitions with the actual prop values from the AST to build a typed editing UI (select dropdowns, checkboxes, text fields).
 
---
 
## Undo / Redo / Clipboard
 
**Undo/Redo** is file-snapshot based, not operation-based. Before every write, the UI calls `/__take-snapshot` which pushes the full current file content onto `undoStack`. Undo pops that snapshot and writes it back. This means undo is always a clean revert regardless of how complex the edit was.
 
The stacks are arrays of `{ file, content, activeId }` tuples. `activeId` is included so the UI can re-focus the correct element after an undo/redo by querying `[data-pv-loc-${activeId}]`.
 
**Clipboard** is a single server-side slot `{ data: { file, content } | null }`. The `content` is the raw JSX source text of the copied block comment envelope. On paste, the server remaps all `data-pv-block` IDs in the content to fresh IDs before inserting — this prevents duplicate IDs in the DOM.
 
---