# Skill: authoring Protovibe specs and annotations programmatically

How a coding agent creates, edits and assembles **specs** (annotated prototype
states) by writing files directly, without going through the Specs panel.

Read this before writing anything under `src/specs/`. Only act on it when the
user asks for specs or annotations — never invent or reorganise them on your own.

---

## 1. What a spec is

A **spec** is one document: a titled, ordered list of **items**. An item is
either an **annotation** (a note pinned to a concrete prototype state, optionally
pinned to one element) or a **heading** (a title that sections the list).

The editor shows the list, the published viewer at `/specs.html` shows it
read-only next to the running prototype.

---

## 2. Storage layout

```
src/specs/
  {specId}/
    spec.json          # document metadata ONLY — it never lists items
    {itemId}.json      # one file per annotation or heading
```

These are normal source files and **are committed to git**.

**The one rule that explains the layout:** every mutation must land in exactly
one file. Git sync rebases with last-write-wins, so two people adding items at
once must produce two *different new files*. Never introduce an array of items
in `spec.json`, and never batch several items into one file.

Writes under `src/specs/` do not reload the app iframe, so adding annotations
never disturbs a running prototype.

---

## 3. Ids

| Kind | Format | Example |
|---|---|---|
| Spec | 10 lowercase alphanumerics | `k3f9x2m1qa` |
| Annotation | `a-` + 8 lowercase alphanumerics | `a-9z8y7x6w` |
| Heading | `h-` + 8 lowercase alphanumerics | `h-1a2b3c4d` |

Rules:

- The backend validates ids against `^[A-Za-z0-9][A-Za-z0-9_-]*$` and rejects
  the literal id `spec` (it would collide with `spec.json`). No dots, no slashes.
- **The directory name and the filename are authoritative.** The `id` field
  inside the JSON is ignored on read, so a mismatch silently does nothing.
  Always write them consistently anyway.
- Generate ids randomly. Do not derive them from the annotation text, and do not
  number them sequentially — two agents doing that produce colliding filenames.

---

## 4. File schemas

### `spec.json`

```jsonc
{
  "id": "k3f9x2m1qa",                     // must match the directory name
  "title": "Minion onboarding",
  "createdAt": "2026-09-16T09:00:00.000Z", // ISO
  "updatedAt": "2026-09-16T09:40:00.000Z"  // ISO, optional
}
```

A directory **without** `spec.json` is not a spec: its item files are ignored
(but left alone). Write `spec.json` first.

### Heading — `{h-xxxxxxxx}.json`

```jsonc
{
  "id": "h-1a2b3c4d",
  "type": "heading",
  "rank": "n",
  "title": "Recruiting",
  "level": "big",                          // "big" | "medium"; anything else reads as "big"
  "createdAt": "2026-09-16T09:00:00.000Z",
  "updatedAt": "…"                         // optional
}
```

### Annotation — `{a-xxxxxxxx}.json`

```jsonc
{
  "id": "a-9z8y7x6w",
  "type": "annotation",
  "rank": "s",
  "text": "Division defaults to Field Operations.\nName is required.",
  "status": "discuss",                     // "todo" | "discuss" | "verified"; OMIT for no status
  "wordingStatus": "todo",                 // "todo" | "progress" | "done"; OMIT for no wording check status
  "state": { "tab": "app", "path": "/?page=minions&recruitDialog=true" },
  "anchor": { "file": "src/pages/MinionsPage.tsx" },  // OMIT when not pinned to an element
  "author": { "name": "Jane", "email": "jane@x.com" },
  "createdAt": "2026-09-16T09:00:00.000Z",
  "updatedAt": "…"                         // optional
}
```

Field notes:

- `text` is plain text; `\n` for line breaks. There is no title field and no
  rich text. An old `title` key in a file is ignored.
- `status` is a stable id, never a label. Omit the key entirely for "no status";
  an unknown value reads as no status.
- `wordingStatus` is the separate wording (copy) check track: `todo` = "To
  check", `progress` = "Check in progress", `done` = "Wording check done".
  Same rules as `status` (stable id, omit for none). It is editor-only — never
  shown in the published viewer or the exports.
- `state.path` is pathname + search + hash, relative to the app origin, and
  **must start with `/`**. A missing or non-string path falls back to `"/"`.
- `author.name` is what the viewer shows (emails are never rendered). A missing
  author reads as `Anonymous`.
- A file whose `type` is neither `annotation` nor `heading`, or whose JSON is
  malformed, is dropped silently — the rest of the spec still loads. If an item
  you wrote does not appear, that is the first thing to check.

---

## 5. Ordering: the `rank` field

Order comes from each item's `rank`, **not** from filenames or an array.

- Ranks are base-36 strings compared with **plain string comparison**
  (`"a0" < "a1" < "b"`). Digits `0-9` sort before letters `a-z`.
- Sort key is `rank`, then `createdAt`, then `id`. Ties are broken stably, so
  two items with identical ranks still get a deterministic order — but give
  every item its own rank anyway.
- A missing or empty rank reads as `"n"`, which is also the rank the editor
  gives the first item of an empty list (mid-alphabet, so items can be inserted
  both before and after it).

**Assembling a list from scratch.** Emit equal-length, ascending keys — the
simplest correct scheme:

```
item 1 → "a0"    item 5 → "a4"
item 2 → "a1"    …
item 3 → "a2"    item 37 → "b0"   (roll over the first character)
item 4 → "a3"
```

You do not need to leave gaps. Inserting later works by extending the key.

**Inserting between two items.** Take a key strictly between the neighbours.
The project already has the helper — import it rather than reimplementing:

```ts
import { rankBetween, INITIAL_RANK } from '@/…/shared/specs'; // plugins/protovibe/src/shared/specs.ts

rankBetween("a0", "a1")   // "a0i"  — between two adjacent keys
rankBetween(null, "a0")   // "5"    — before the first item
rankBetween("a3", null)   // "n"    — after the last item
rankBetween(null, null)   // "i"    — first item of an empty list
```

`rankBetween(before, after)` throws when `before >= after`, so pass the
neighbours in document order.

**Reordering an existing item:** rewrite only that one item's `rank`. Never
renumber the whole list — that rewrites every file and is exactly the
same-file conflict the layout exists to avoid.

---

## 6. Pinning an annotation to an element

An annotation may point at one element on the screen. Two things must agree:

1. **The source element** carries a valueless JSX attribute named after the
   item id, injected on the opening tag:

   ```jsx
   <Button data-pv-spec-a-9z8y7x6w variant="solid" label="Recruit" />
   ```

   Valueless means the bare attribute name — no `=""`, no `={true}`. Because it
   is a plain JSX attribute it survives `vite build`, which is how the published
   viewer highlights the element.

2. **The annotation file** records which file it landed in:
   `"anchor": { "file": "src/pages/MinionsPage.tsx" }`.

Rules:

- One attribute per annotation. An element can carry any number of
  `data-pv-spec-*` and `data-pv-comment-*` attributes without collision —
  never merge them into a list-valued attribute.
- An annotation with no pinned element simply omits `anchor` and gets no
  attribute. This is the normal case for "this whole screen" notes.
- **Never remove a `data-pv-spec-*` attribute** during refactors unless you are
  deleting the element itself — then also drop the `anchor` key from the
  matching item file (the annotation keeps working, unpinned).
- When extracting an element into a new component, carry every
  `data-pv-spec-*` attribute onto the new root element.
- Deleting an annotation means deleting its JSON file **and** removing its
  attribute from the anchor file.

---

## 7. Making `state.path` reproducible

An annotation restores its state purely by navigating to `state.path`. That only
works if the screen is reachable from the URL. Keep dialogs, tabs, toggles and
selections in the query string, per the "Deep-linkable UI state" rule in
`PROTOVIBE_AGENTS.md`.

If you are writing annotations for a screen whose state lives in `useState`,
the deep link cannot reproduce it. Move that state into the query string first,
or annotate the screen at its default state and say so in the text.

Scroll position and hover are not captured.

---

## 8. Recipe: create a whole spec

1. Pick a spec id and create `src/specs/{specId}/`.
2. Write `spec.json` with `id`, `title`, `createdAt` (ISO, now).
3. Walk the prototype's routes and decide the item order on paper first.
4. For each item, in order, assign an ascending rank (`a0`, `a1`, `a2`, …) and
   write one file:
   - heading → `h-` id, `type: "heading"`, `title`, `level`.
   - annotation → `a-` id, `type: "annotation"`, `text`, `state.path`, `author`,
     plus `status` only if the user asked for one.
5. For each annotation that should be pinned, add `data-pv-spec-{itemId}` to the
   target element's opening tag and set `anchor.file` to that file's path.
6. Re-read what you wrote: every file is valid JSON, every `type` is spelled
   correctly, every `state.path` starts with `/`, every ranks ascends, and every
   `anchor.file` really contains the matching attribute.
7. Tell the user the spec is in the Specs tab and ships at `/specs.html` when
   they publish.

The Specs panel re-reads from disk when it refreshes, so a spec written this way
shows up without restarting anything.

---

## 9. Never

- Never put an items array in `spec.json`, or several items in one file.
- Never renumber every rank to reorder one item.
- Never reuse an id, or derive ids from text.
- Never write `"status": null` or `"status": ""` — omit the key.
- Never strip a `data-pv-spec-*` attribute you did not intend to unpin.
- Never create or edit spec files unless the user asked you to.
