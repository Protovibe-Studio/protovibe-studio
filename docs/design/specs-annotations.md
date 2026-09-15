# Specs: annotated prototype states

Design document for a new **Specs** tab in the Protovibe editor. A spec is an ordered,
sectioned list of annotations. Each annotation points at a concrete prototype state (a
deep link into the app, optionally pinned to one element) and carries a note plus a
status. Specs are authored in the editor, presented one annotation at a time, exported
to other doc tools, and published next to the prototype as a read-only viewer at
`/specs.html`.

Everything lives in `protovibe-project-template/plugins/protovibe`. Paths below are
relative to that directory unless stated otherwise.

---

## 1. Goals and non-goals

**Goals**

- Author a list of annotated states while clicking through the prototype, exactly the
  way comments are added today (select an element, or just annotate the current screen).
- Reorder annotations, group them under headings, edit everything in place.
- Overview with lazy thumbnails of every state.
- Present: open one annotation, restore its state on the canvas, step Next / Prev.
- Statuses per annotation (`Todo`, `To discuss`, `Verified`, or none).
- Export to Notion / Google Docs via rich-text clipboard, Markdown and HTML download.
- Publish a read-only viewer (`/specs.html`) alongside the prototype on Cloudflare Pages.
- Mirror the comments architecture (one file per item, git-sync friendly) but keep the
  code, endpoints and storage fully separate from comments.

**Non-goals for v1**

- Annotating the Sketchpad or Components surfaces. Specs describe the app prototype.
  The data model leaves room for it (`state.tab`) but the UI only offers it on the App tab.
- Replies / threads. An annotation is a single authored note, not a conversation.
- Image screenshots in exports. See §9 for the follow-up path.
- Rich text. Plain text with line breaks in v1.

---

## 2. Vocabulary

| Term | Meaning |
|---|---|
| **Spec** | One document. A titled, ordered list of items. |
| **Annotation** | An item that captures a prototype state + note + status. |
| **Heading** | An item that only carries a title, used to section annotations. |
| **State** | The deep link that reproduces what the canvas shows: path + query + hash. |
| **Anchor** | Optional element the annotation is pinned to, via a `data-pv-spec-{id}` attribute. |

UI copy: tab label **Specs**, list header **Specs**, primary buttons **New spec**,
**Add annotation**, **Add heading**. Items are called "annotations" in copy; "note" is
avoided so the feature never reads as a second comments system.

---

## 3. Storage

Same principle as comments: anything two people can do concurrently on two machines
must land in *different files*, because git sync rebases with `-X theirs` and a same-file
conflict silently drops one side.

```
src/specs/
  {specId}/
    spec.json          # document metadata only: id, title, createdAt, updatedAt
    {itemId}.json      # one file per annotation or heading
```

- `spec.json` is only rewritten when the title changes. It never lists items.
- Item order is a **fractional rank** string stored on each item (`rank`). Inserting or
  moving an item rewrites only that one file; appending on two machines at once writes
  two new files and both survive. Sorting is `rank`, then `createdAt`, then `id`.
- Ids: spec `makeSpecId()` (10 lowercase alphanumerics), annotations `a-` + 8, headings
  `h-` + 8. The backend validates ids with the same `SAFE_ID` rule as comments and rejects
  `spec` as an item id.
- These files are committed to git, like `src/comments`. `handleHotUpdate` in
  `protovibe-source.ts` gets a second guard so writes under `src/specs` never reload the
  app iframe.

Example files:

```jsonc
// src/specs/k3f9x2m1qa/spec.json
{
  "id": "k3f9x2m1qa",
  "title": "Minion onboarding",
  "createdAt": "2026-09-15T09:00:00.000Z",
  "updatedAt": "2026-09-15T09:40:00.000Z"
}

// src/specs/k3f9x2m1qa/h-1a2b3c4d.json
{ "id": "h-1a2b3c4d", "type": "heading", "rank": "a0", "title": "Recruiting", "createdAt": "…" }

// src/specs/k3f9x2m1qa/a-9z8y7x6w.json
{
  "id": "a-9z8y7x6w",
  "type": "annotation",
  "rank": "a1",
  "title": "Recruit dialog, empty form",           // optional, falls back to first line of text
  "text": "Division defaults to Field Operations.\nName is required.",
  "status": "discuss",                              // "todo" | "discuss" | "verified" | omitted
  "state": { "tab": "app", "path": "/?page=minions&recruitDialog=true" },
  "anchor": { "file": "src/pages/MinionsPage.tsx" }, // omitted when annotating the whole screen
  "author": { "name": "Maciej", "email": "…" },
  "createdAt": "…",
  "updatedAt": "…"
}
```

### Shared types: `src/shared/specs.ts`

Mirrors `shared/comments.ts` and is imported by the backend, the editor UI and the
published viewer. Nothing here imports from `shared/comments.ts`.

```ts
export type SpecStatus = 'todo' | 'discuss' | 'verified';
export const SPEC_STATUSES: SpecStatus[] = ['todo', 'discuss', 'verified'];
export function normalizeSpecStatus(raw: unknown): SpecStatus | undefined;

export interface SpecDoc { id: string; title: string; createdAt: string; updatedAt?: string }
export interface SpecState { tab: 'app'; path: string }           // path = pathname + search + hash
export interface SpecAnchor { file: string }                        // element carries data-pv-spec-{id}
export interface SpecAuthor { name: string; email: string }

interface SpecItemBase { id: string; rank: string; createdAt: string; updatedAt?: string }
export interface SpecHeading extends SpecItemBase { type: 'heading'; title: string }
export interface SpecAnnotation extends SpecItemBase {
  type: 'annotation'; title?: string; text: string; status?: SpecStatus;
  state: SpecState; anchor?: SpecAnchor; author: SpecAuthor;
}
export type SpecItem = SpecHeading | SpecAnnotation;

/** A spec with its items resolved and sorted — the shape every endpoint returns. */
export interface SpecBundle { spec: SpecDoc; items: SpecItem[] }

export const SPECS_DIR_REL = 'src/specs';
export const SPEC_META_FILE = 'spec.json';
export const SPEC_ATTR_PREFIX = 'data-pv-spec-';
export function specIdAttr(id: string): string;        // data-pv-spec-a-9z8y7x6w
export function specIdSelector(id: string): string;    // [data-pv-spec-a-9z8y7x6w]
export function readSpecIds(attrNames: readonly string[]): string[];
export function makeSpecId(): string; makeAnnotationId(); makeHeadingId();
export function sortSpecItems(items: SpecItem[]): SpecItem[];
export function rankBetween(before: string | null, after: string | null): string; // fractional index
```

`rankBetween` is a ~40-line base-36 midpoint helper (no dependency). Ranks only grow when
someone repeatedly inserts at the same spot; the backend can renormalise on a
full-document read if any rank exceeds ~40 chars, which rewrites every item file once.

### Element anchoring

Same scheme as comments, different prefix: a **valueless, uniquely named** attribute
`data-pv-spec-{itemId}` injected onto the element's opening tag at `nameEnd`. An element
can carry any number of comment and spec attributes without collisions. Because it is a
plain JSX attribute it survives `vite build`, which is what lets the published viewer
highlight the element (§7).

The injection / removal regex logic currently sits privately inside
`comments-server.ts`. Extract it into `src/backend/source-attr.ts`
(`injectValuelessAttr(source, nameEnd, attrName)`, `removeValuelessAttr(source, attrName)`)
and have both servers call it. This is the only code the two features share, and it is
a pure string utility. The alternative, copying the two functions, is acceptable if we
want a zero-touch change to comments.

---

## 4. Backend: `src/backend/specs-store.ts` and `src/backend/specs-server.ts`

Split the file IO from the HTTP handlers so the publish step (§7) can reuse the store
without going through middleware.

**`specs-store.ts`** (pure functions, `process.cwd()`-relative like comments):

- `listSpecs(): SpecDoc[]` and `listSpecsWithCounts()`.
- `readSpec(id): SpecBundle | null` (reads `spec.json`, every `*.json` sibling, drops
  malformed files, sorts). Like `readThread`, the directory name wins over the `id` field.
- `writeSpecMeta`, `writeItem`, `deleteItem`, `deleteSpec`.
- `readAllSpecs(): SpecBundle[]` for the viewer payload.

**`specs-server.ts`** registers middleware with a `/__specs-` prefix. Every handler
returns the full `SpecBundle` after a mutation, so the UI never has to merge patches.

| Endpoint | Body | Effect |
|---|---|---|
| `/__specs-list` | `{}` | `{ specs: (SpecDoc & { itemCount })[] }` |
| `/__specs-get` | `{ specId }` | `{ spec, items }` |
| `/__specs-create` | `{ title }` | writes `spec.json` |
| `/__specs-update` | `{ specId, title }` | rename |
| `/__specs-delete` | `{ specId }` | strips every `data-pv-spec-*` attribute of the spec's annotations from their anchor files, then `rm -rf` the directory |
| `/__specs-item-create` | `{ specId, item, file?, nameEnd? }` | writes the item; when `file` + `nameEnd` are present injects the anchor attribute (JSON first, then source, same ordering rationale as comments) |
| `/__specs-item-update` | `{ specId, itemId, patch }` | `patch` may contain `title`, `text`, `status` (`null` clears), `rank`, `state` (used by "Update state to current view") |
| `/__specs-item-reanchor` | `{ specId, itemId, file?, nameEnd? }` | removes the old attribute, injects the new one (or none, to unpin) |
| `/__specs-item-delete` | `{ specId, itemId }` | removes the attribute (best effort) and the file |
| `/__specs-export` | `{ specId, format: 'markdown' \| 'html' }` | `{ content, filename }` — see §8 |
| `/__specs-viewer-data` | GET | the same JSON the publish step writes to `dist/specs-data.json`, for the dev preview of the viewer |

`registerSpecsMiddleware(server)` is called from `protovibe-source.ts` next to the
comments registration. No comments endpoint changes.

---

## 5. Editor UI

### Files

```
src/ui/api/specs.ts                    # fetch wrappers, one per endpoint (mirrors api/comments.ts)
src/ui/components/SpecsTab.tsx         # container: data, view state, navigation events
src/ui/components/specs/
  SpecsDocList.tsx                     # level 1: list of specs
  SpecDocView.tsx                      # level 2: items of one spec (list + drag reorder + search)
  SpecItemRow.tsx                      # annotation row with lazy thumbnail
  SpecHeadingRow.tsx                   # inline-editable heading row
  SpecAnnotationView.tsx               # level 3: one annotation, edit in place, Prev/Next
  SpecThumbnail.tsx                    # lazy scaled iframe
  SpecStatusPicker.tsx                 # STATUS_CONFIG lives here (labels, colours)
  SpecExportMenu.tsx                   # copy / download actions
  InlineEditable.tsx                   # hover-to-edit text that saves on blur
src/ui/hooks/useSpecThumbnails.ts      # IntersectionObserver bookkeeping + mount cap
```

`SpecsTab` is mounted in `ProtovibeApp.tsx` exactly like `CommentsTab` (always mounted,
`display: none` when inactive, receives `activeIframeTab` and `isActive`).
`ShellNavBar.tsx` gets `{ id: 'specs', icon: BookOpen, label: 'Specs' }` appended after
Comments and `SidebarTab` gains `'specs'`.

Reused as-is from the shell: `theme.ts`, `ConfirmDialog`, `Tooltip` (`data-tooltip`),
`ToastViewport` events, `useCommentUser` for author attribution (it is a profile hook,
not a comments hook; if that name is uncomfortable, rename it to `useAuthorProfile` in a
separate commit), `runLockedMutation` and `takeSnapshot` from `ProtovibeContext`.

### View state

```ts
type SpecsView =
  | { level: 'docs' }
  | { level: 'doc'; specId: string }
  | { level: 'item'; specId: string; itemId: string };
```

Kept in `SpecsTab` state and mirrored to `sessionStorage` so a shell refresh reopens the
same place (the same convenience `CommentsTab` gets through `listScrollTop`).

### Level 1: docs list (`SpecsDocList`)

```
┌ Specs ───────────────────────────────── [+ New spec] ┐
│ ⓘ Specs are published with your prototype at        │
│   https://protovibe-app.pages.dev/specs.html  ↗      │
│                                                      │
│ Minion onboarding            12 annotations  ⋯       │
│ KPI dashboard review          4 annotations  ⋯       │
└──────────────────────────────────────────────────────┘
```

- Rows sorted by `createdAt`. Click opens the doc. `⋯` menu: Rename (inline), Export…,
  Delete (ConfirmDialog, names the annotation count).
- "New spec" creates `Untitled spec` and opens it with the title in edit mode.
- The info banner reads the published URL from `/__cloudflare-publish-metadata`. Without
  a published URL it says "When you publish, specs are included at /specs.html" and links
  the local preview `/specs.html` (§7).
- Empty state: "No specs yet. A spec is a walkthrough of annotated prototype states."

### Level 2: doc view (`SpecDocView`)

```
┌ ‹ Specs   Minion onboarding (click to rename)   ⋯ ┐
│ [🔍 Search annotations         ] [Todo][Discuss][Verified] │
│ ┌────────────────────────────────────────────────┐ │
│ │ ▸ Recruiting                                 ⋮ │ │  ← heading, click to edit
│ │ ┌────────┐ 1 Recruit dialog, empty form       │ │
│ │ │ thumb  │   Division defaults to Field…  ●To discuss │
│ │ └────────┘   /?page=minions&recruitDialog=true│ │
│ │ ┌────────┐ 2 Validation errors                │ │
│ │ │ thumb  │   Name is required…           ●Todo│ │
│ └────────────────────────────────────────────────┘ │
│ [+ Add annotation]  [+ Add heading]                 │
└─────────────────────────────────────────────────────┘
```

- **Add annotation**: opens a composer at the end of the list (or after the currently
  highlighted item). It captures the state immediately on open and shows it: "Pinned to
  `<Button>` on /?page=minions&recruitDialog=true" when an element is selected on the
  canvas, or "Current screen: /?page=…" when nothing is selected. A "Unpin" link drops
  the element anchor before saving. The text field is required; status is optional.
  The pinned-element case snapshots only the anchor source file (`takeSnapshot`) so undo
  removes the attribute and never deletes the JSON, exactly like comments.
- **Add heading**: inserts a heading row in edit mode at the end.
- **Row click** on an annotation: opens level 3 *and* restores the state on the canvas.
  Row click on a heading: edit in place.
- **Reorder**: HTML5 drag and drop, same approach as `PromptsTab` (`draggable`,
  `onDragOver` computing the insertion index, `onDrop`). Headings and annotations share
  one list, so a heading can be dragged between annotations. Drop computes
  `rankBetween(prev.rank, next.rank)` and calls `/__specs-item-update` with the new rank;
  the list re-sorts optimistically. Keyboard alternative in the row menu: Move up / Move
  down.
- **Search** filters rows by title, text, status label and state path. Headings stay
  visible when any child matches. Status pills toggle filters, like the comments list.
- **Numbering** counts annotations only (headings are not numbered) and is what the
  presentation view shows as "3 of 12".
- The `⋯` menu: Rename, Export…, Delete spec.

### Level 3: annotation view (`SpecAnnotationView`)

```
┌ ‹ Minion onboarding                    ‹ 3 / 12 › ┐
│ Recruit dialog, empty form          (hover → edit) │
│ ● To discuss ▾                                     │
│                                                    │
│ Division defaults to Field Operations.             │
│ Name is required.                (hover → edit)    │
│                                                    │
│ State  /?page=minions&recruitDialog=true  [Locate] │
│ Pinned to <Button> in MinionsPage.tsx              │
│ [Update state to current view]  [Re-pin to selection] │
│                                          [Delete]  │
└────────────────────────────────────────────────────┘
```

- Opening the view (and every Prev / Next) dispatches the navigation event (§6).
- Title and text are `InlineEditable`: a `div` that renders the text; on hover shows a
  subtle border; click turns it into an auto-growing `textarea`; blur or `Cmd/Ctrl+Enter`
  saves via `/__specs-item-update` when the value changed; `Esc` reverts. The same
  component powers heading rows in level 2.
- Status picker is a small popover (portal, fixed positioning, like the comments status
  menu). "No status" clears it.
- "Update state to current view" re-captures `state.path` from the app iframe.
  "Re-pin to selection" calls `/__specs-item-reanchor` with the selected element (enabled
  only when the canvas selection is on the App tab). "Unpin" is in the same row when an
  anchor exists.
- Keyboard while the Specs panel is active and focus is not in an input: `←` / `→` step,
  `Esc` goes back to the list. Wired through the panel's own `keydown` listener, not
  `useKeyboardShortcuts`, so nothing global changes.
- Prev / Next operate on the filtered, ordered annotation list (headings skipped), so a
  status filter turns the walkthrough into "only the Todo items".

### Thumbnails (`SpecThumbnail` + `useSpecThumbnails`)

Each annotation row shows a live miniature of its state. Implementation:

- Wrapper `div` with fixed size (e.g. 160×100) and `overflow: hidden`; inside it an
  `iframe` sized to a fixed virtual viewport (1280×800) with
  `transform: scale(0.125); transform-origin: 0 0`. `transform` is preferred over CSS
  `zoom` because it behaves identically in Chromium, Firefox and Safari; `zoom` on an
  iframe has historically been Chromium-only.
- `src` is the state path (`/?page=minions&recruitDialog=true`) on the same dev origin.
  Because the engineering rules require dialogs, tabs and toggles to live in the query
  string, the deep link alone reproduces the state. Scroll position and hover are not
  captured (documented limitation).
- `pointer-events: none` on the iframe, `tabindex="-1"`, `aria-hidden`.
- **Lazy loading**: rows render a placeholder; `useSpecThumbnails` holds one
  `IntersectionObserver` on the list scroller (`rootMargin: '50% 0px'`). A thumbnail
  mounts its iframe when it enters the margin and unmounts it when it leaves, so the
  number of live app instances stays bounded (hard cap of 8 mounted at once, oldest
  unmounted first). Each dev iframe is a full Vite client with its own HMR socket, which
  is why the cap matters.
- **Marking thumbnails**: the iframe gets `name="pv-spec-thumbnail"` and
  `data-pv-thumbnail`. Two existing helpers scan `document.querySelectorAll('iframe')`
  and must skip them: `findIframeForTab` in `useViewportCommentIds.ts` and the
  selection-lookup loops in `ProtovibeContext.tsx`. `bridge.ts` checks
  `window.name === 'pv-spec-thumbnail'` on boot and returns early, so thumbnails never
  post `PV_ELEMENT_CLICK`, never install pointer handlers and never get the inspector
  outline. `hmr-liveness.ts` does the same check and skips its ping loop.
- Thumbnails re-mount (fresh `src`) when the annotation's `state.path` changes.
- A tiny "refresh" affordance on hover reloads one thumbnail; the doc header `⋯` menu has
  "Reload thumbnails" for all mounted ones.

---

## 6. Restoring a state on the canvas

`CommentsTab` uses a `pv-comment-navigate` event that `ProtovibeApp` handles by switching
tabs, navigating the app iframe and focusing `[data-pv-comment-{id}]` with a retry loop
(`focusThreadElement`). Specs need the same thing with a different selector and no
sketchpad / components branches.

Rather than teaching the comments handler about specs, add one small generic handler:

```ts
// dispatched by SpecsTab
window.dispatchEvent(new CustomEvent('pv-canvas-navigate', {
  detail: { path: '/?page=minions&recruitDialog=true', selector: '[data-pv-spec-a-9z8y7x6w]' },
}));
```

In `ProtovibeApp.tsx`: switch to the App tab, set `win.location.href = path` when it
differs from the current `pathname + search`, then, if a selector was given, run the
existing retry loop. `focusThreadElement(threadId)` becomes
`focusCanvasElement(selector)` with the comments handler passing
`commentIdSelector(threadId)`; that is the only touch to the comments path and it is a
mechanical rename. The comments handler can migrate to the generic event later or never.

Selecting the anchored element (rather than only outlining it) is intentional: it gives
the Design tab context and makes "Re-pin to selection" a two-click operation. When the
element is gone (deleted from source), the annotation view shows "Pinned element not
found on this screen" in muted text and still restores the URL.

---

## 7. Publishing the read-only viewer

### What gets published

`pnpm build` runs the user's Vite build into `dist/`. A new build-only plugin adds three
files next to `index.html` without touching the app's Rollup inputs:

```
dist/
  index.html            # the prototype, unchanged
  specs.html            # viewer shell
  specs-viewer.js       # prebuilt viewer bundle (React included, like inspector.js)
  specs-data.json       # { generatedAt, specs: SpecBundle[] }
```

Files:

- `src/specs-viewer/specs.html` — static shell: `<div id="pv-specs-root">` and
  `<script src="./specs-viewer.js">`. No `[PLUGIN_DIR]` placeholder; all references are
  relative so the folder works on Cloudflare Pages or any static host.
- `src/specs-viewer/main.tsx` → bundled by esbuild to `dist/ui/specs-viewer.js` in the
  plugin's `build` and `watch-ui` scripts (fourth entry next to inspector, bridge and
  sketchpad bridge).
- `src/specs-viewer/SpecsViewerApp.tsx` and siblings — the viewer.
- `src/backend/specs-publish.ts` — `specsPublishPlugin(): Plugin` with `apply: 'build'`
  and a `closeBundle` hook: if `readAllSpecs()` returns at least one spec, copy
  `specs.html` and `dist/ui/specs-viewer.js` into the output dir and write
  `specs-data.json`. With zero specs nothing is emitted, so projects that never use the
  feature publish exactly what they do today. Registered in `src/index.ts` as the third
  plugin.

The Cloudflare publish flow in `server.ts` needs no change: it runs `pnpm build` and
deploys `./dist`.

### Dev preview

`protovibe-source.ts` adds `/specs.html` to `editorPages`, and `/specs-viewer.js` and
`/specs-data.json` are served by `specs-server.ts` (the JS from the plugin's `dist/ui`,
the JSON compiled live from `src/specs`). The docs-list banner and the doc `⋯` menu link
to it as "Preview viewer", so authors can check the presentation before publishing.

### Viewer UX (`SpecsViewerApp`)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Minion onboarding ▾              3 / 12   ‹ Prev   Next ›   [Open app ↗] │
├──────────────────┬──────────────────────────────────────────────────┤
│ Recruiting       │                                                  │
│  1 Recruit dialog│                                                  │
│ ▶2 Validation    │          <iframe src="./index.html?page=…">      │
│  3 Success toast │                                                  │
│ Reporting        │                                                  │
│  4 …             │                                                  │
├──────────────────┤                                                  │
│ Validation errors│                                                  │
│ ● Todo           │                                                  │
│ Name is required │                                                  │
│ …                │                                                  │
└──────────────────┴──────────────────────────────────────────────────┘
```

- Loads `./specs-data.json`. If there are several specs, a dropdown in the header
  switches; with one spec the header shows the title only.
- Routing in the viewer's own URL: `specs.html?spec={id}&item={id}`. Every annotation is
  therefore shareable, and exports (§8) link straight to it. Back / forward work through
  `popstate`.
- Selecting an annotation sets the iframe `src` to `./index.html` + `state.path` only
  when the path differs (avoids a reload between two annotations on the same screen),
  then, if the annotation has an anchor, waits for `[data-pv-spec-{id}]` to appear in the
  same-origin iframe document (poll up to ~4 s, like the editor), scrolls it into view
  and draws a highlight: a positioned overlay `div` appended to the iframe's `body` with
  an accent outline and the annotation number. The published app has no bridge script,
  so the viewer does this DOM work directly; nothing is injected at build time.
- Left list shows headings and numbered annotations with status dots, optional
  thumbnails (same `SpecThumbnail` component, which lives in `src/specs-shared/` so both
  bundles can import it; the viewer passes `./index.html` as the base).
- Keyboard: `←` / `→`, and `1`–`9` jump within the current heading.
- "Open app" opens `./index.html` + current state in a new tab.
- Read only. No editing affordances at all, no author emails rendered (name only).
- Styling reuses `theme.ts` and inline styles so it looks like the editor without
  pulling Tailwind or the user's CSS into the viewer bundle.

### Telling the user

- Docs list banner (§5, level 1).
- `PublishButton.tsx`: both the "Your app is published" success view and the "Published
  to" home section get one extra line under the main link when the project has at least
  one spec: **Specs viewer:** `{url}/specs.html` with its own copy button. The count
  comes from `fetchSpecsList()` in `api/specs.ts`, requested when the popover opens (the
  same moment it refreshes auth). Zero specs: no line, nothing else changes.

---

## 8. Export

Users want the content in Notion, Google Docs or a Word file. Both accept rich HTML from
the clipboard, so the primary path is a clipboard write; files are a secondary path.

`SpecExportMenu` (in the doc header `⋯` and the docs-list row menu):

- **Copy for Notion / Google Docs** — `navigator.clipboard.write` with a `text/html` part
  and a `text/plain` Markdown part. Structure: `<h1>` spec title, `<h2>` per heading,
  `<h3>` per annotation ("3. Validation errors"), status as a bold prefix line, the note as
  paragraphs, then a link line: *Open state* → `{publishedUrl}{state.path}` and *Open in
  viewer* → `{publishedUrl}/specs.html?spec=…&item=…`. When the project is not published
  the links are omitted and the state path is printed as plain text.
- **Download Markdown (.md)** and **Download HTML (.html)** — same content from
  `/__specs-export`, saved through a blob link. The HTML file opens in Word and pastes
  into Google Docs; that covers the "docx/rtf" ask without a dependency.
- **Later**: a real `.docx` (via the `docx` package server-side) once the HTML path
  proves insufficient, and thumbnails in exports (§9).

Rendering is done by one pure function `renderSpecExport(bundle, { publishedUrl, format })`
in `src/shared/specs-export.ts`, used by both the endpoint and the clipboard action so the
two never drift.

---

## 9. Follow-ups considered and deferred

- **Screenshots** in thumbnails and exports. Same-origin iframes make client-side
  rasterisation possible (`html-to-image` on `iframe.contentDocument.body`); a hidden
  full-size iframe per annotation, sequentially, could produce PNGs for the export. Worth
  a spike after v1, not before.
- **Scroll position** as part of `state`. Needs the app to expose its main scroller;
  skip until asked.
- **Sketchpad / Components states.** `SpecState.tab` is typed as `'app'` only; widening it
  is a data-compatible change.
- **Attachments and rich text** on annotations, reusing the comments attachment pipeline
  (would require moving `compressAttachment` into a shared backend util).
- **Spec ordering** by drag on the docs list (`rank` on `SpecDoc`).
- **Global search** across specs from the docs list.

---

## 10. Implementation plan

Each phase is shippable on its own.

**Phase 1: storage, API, tab skeleton**
1. `shared/specs.ts` (types, ids, attribute helpers, `rankBetween`, `sortSpecItems`).
2. `backend/source-attr.ts` extracted from `comments-server.ts` (no behaviour change).
3. `backend/specs-store.ts`, `backend/specs-server.ts`, registration in
   `protovibe-source.ts`, `handleHotUpdate` guard for `src/specs`.
4. `ui/api/specs.ts`.
5. `ShellNavBar` tab, `SpecsTab` mount in `ProtovibeApp`, `pv-canvas-navigate` handler,
   `focusCanvasElement` rename.
6. `SpecsDocList`, `SpecDocView` (no thumbnails, no drag yet), `SpecAnnotationView`,
   `InlineEditable`, `SpecStatusPicker`. Add / edit / status / delete / Prev / Next /
   Locate all working.
7. Section in `PROTOVIBE_AGENTS.md` ("Specs") describing the files and the attribute,
   mirroring the comments section, so coding agents preserve `data-pv-spec-*` attributes.

**Phase 2: organisation and overview**
1. Headings (`SpecHeadingRow`), drag reorder, Move up / down.
2. Search and status filters.
3. `SpecThumbnail` + `useSpecThumbnails`; the `pv-spec-thumbnail` guards in `bridge.ts`,
   `hmr-liveness.ts`, `useViewportCommentIds.ts`, `ProtovibeContext.tsx`.
4. Re-pin / unpin / update state.

**Phase 3: publishing**
1. `src/specs-viewer/*`, esbuild entry in `package.json` scripts and `watch-ui.js`.
2. `backend/specs-publish.ts`, registration in `index.ts`.
3. Dev preview routes, docs-list banner, `PublishButton` specs line.

**Phase 4: export**
1. `shared/specs-export.ts`, `/__specs-export`, `SpecExportMenu`.

**Tests**: a Playwright spec in `tests/e2e/specs.spec.ts` following the existing
`sketchpad.spec.ts` style: create a spec, add an annotation from a selected element,
verify the `data-pv-spec-*` attribute landed in the source file and the JSON files exist,
reorder, open the annotation and assert the canvas iframe URL changed, delete and verify
cleanup. Plus a build test that runs `pnpm build` on a project with one spec and asserts
`dist/specs.html`, `dist/specs-viewer.js` and `dist/specs-data.json` exist, and that they
do not exist when `src/specs` is empty.

---

## 11. Implementation notes (as built)

The feature was implemented as designed, with these additions requested after
the design review:

- **Insert lines.** Hovering between two rows (and above the first / below the
  last) reveals a line with a "+" button; clicking it opens a menu to insert an
  annotation, a big heading or a medium heading at that position. The same slot
  is the drop indicator while dragging.
- **Two heading sizes.** Headings carry `level: "big" | "medium"`; the row's ⋯
  menu switches between them. Exports map big → `<h2>` / `##`, medium → `<h3>` /
  `###`.
- **⋯ menu on every row.** Annotations: Delete. Headings: size switch + Delete.
  The annotation view's ⋯ menu adds Update state, Pin to selection, Unpin.
- **Everything is undoable.** Every spec mutation snapshots the exact files it
  touches (the item's JSON, `spec.json`, the anchored source file) through the
  generic `/__take-snapshot` endpoint before writing, so Cmd+Z / Cmd+Shift+Z
  restore text edits, status changes, reorders, inserts, deletions and whole
  spec deletions. The shell dispatches `pv-specs-refresh` after undo / redo /
  git sync so the panel re-reads disk.
- **Adding an annotation creates it immediately** with the captured state (and
  the pinned element when one is selected) and opens it with the text editor
  focused, instead of a separate composer. Undo removes it.
- **Thumbnails** have no hard mount cap; the observer's root margin keeps only
  rows near the viewport live. Add a cap if very long specs prove heavy.

## 12. Decisions to confirm

1. **Tab name "Specs" and item name "annotation"**. The alternative "Notes" is avoided to
   keep it distinct from Comments & Notes.
2. **Fractional `rank` on each item** instead of an `order` array in `spec.json`. Rank
   keeps every mutation in one file, which is the property that makes git sync safe.
3. **Anchoring injects `data-pv-spec-{id}` into source**, same as comments. The
   alternative (no source change, store a CSS path) breaks as soon as the page is edited
   and cannot survive to the published build.
4. **App tab only** in v1.
5. **`transform: scale()` thumbnails** rather than CSS `zoom`, for cross-browser parity.
6. **Viewer ships as a prebuilt bundle copied into `dist/`**, not as a second Vite entry,
   so the user's build config is untouched and the viewer cannot break their app build.
7. **Export is clipboard HTML + `.md` / `.html` files** first; `.docx` and screenshots
   are follow-ups.
