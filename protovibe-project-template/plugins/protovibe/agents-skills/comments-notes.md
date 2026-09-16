# Skill: reading and writing Protovibe comments programmatically

How a coding agent reads, adds and triages **comments** (element-level
collaborative feedback) by writing files directly, without going through the
Comments panel.

Read this before touching anything under `src/comments/`. Comments are the
user's conversation — **read them for context freely, but only create, edit or
resolve them when the user asks you to.**

Comments and Specs are separate features with separate storage, endpoints and
UI. They share only the anchoring scheme. For specs, see
[specs-annotations.md](./specs-annotations.md).

---

## 1. What a comment is

A **thread** is one conversation anchored to one element on the canvas. It holds
a triage **status**, the **context** it was authored in (which surface, which
URL / component / sketchpad frame), and a list of **messages**. A message
carries its author, text, optional image attachments, optional wording
suggestions and read receipts.

---

## 2. Storage layout

```
src/comments/
  {threadId}/
    thread.json        # thread metadata ONLY — never any messages
    {commentId}.json   # one file per message
  attachments/
    {name}             # compressed images referenced by message files
```

These are normal source files and **are committed to git**.

**The one rule that explains the layout:** messages live in their own files on
purpose. Two people replying to the same thread on different machines create two
*different new files*, so git sync merges them cleanly instead of a same-file
conflict silently dropping one reply. Never append to an array of messages.

Writes under `src/comments/` do not reload the app iframe.

---

## 3. Ids

| Kind | Format | Example |
|---|---|---|
| Thread | ~10 lowercase alphanumerics, no prefix | `ab12cd34ef` |
| Message | `c-` + ~10 lowercase alphanumerics | `c-x7y8z9a1b2` |
| Attachment | `a-` + ~10, plus the original extension | `a-k3f9x2m1qa.png` |

Rules:

- Ids are validated against `^[A-Za-z0-9][A-Za-z0-9_-]*$`. No dots, no slashes.
- **The directory name and the filename are authoritative.** The `id` field
  inside the JSON is ignored on read for the thread, so writes always land back
  in the file they were read from. Keep them consistent anyway. A message file's
  `id` field *does* matter — it is how a split file shadows a legacy inline copy
  (§6), so it must match its filename.
- Generate ids randomly. Never derive them from the comment text.

---

## 4. File schemas

### `thread.json`

```jsonc
{
  "id": "ab12cd34ef",                       // must match the directory name
  "status": "review",                       // optional — see below; omit while untriaged
  "context": {
    "tab": "app",                           // "app" | "components" | "sketchpad"
    "file": "src/pages/DashboardPage.tsx",  // source file the anchored element lives in
    "pathname": "/dashboard",               // app context
    "url": "http://localhost:3000/dashboard"
  },
  "createdAt": "2026-06-27T10:00:00.000Z",  // ISO
  "anchorFile": "src/pages/DashboardPage.tsx"
}
```

`context` only carries the fields relevant to its `tab`:

| `tab` | Fields |
|---|---|
| `app` | `file`, `url`, `pathname` |
| `components` | `file`, `componentName` |
| `sketchpad` | `sketchpadId`, `sketchpadName`, `frameId`, `frameName`, `position` |

**Status** is a stable id, never a label: `minor`, `todo`, `review`, `closed`.
Omit the key entirely while untriaged. Labels and colours live in the UI's
`STATUS_CONFIG` — never write a label like `"To review"` into a file. Older
files that hold labels are remapped on read, but new writes must use ids.

### Message — `{c-xxxxxxxxxx}.json`

```jsonc
{
  "id": "c-x7y8z9a1b2",                     // must match the filename
  "author": { "name": "Jane", "email": "jane@x.com" },
  "content": "Tighten this spacing",
  "createdAt": "2026-06-27T10:00:00.000Z",  // ISO
  "updatedAt": "…",                         // optional, set when edited
  "seenBy": ["Jane", "Alex"],               // optional read receipts — display names only
  "attachments": ["a-k3f9x2m1qa.png"],      // optional, filenames in src/comments/attachments/
  "suggestions": [                          // optional, see §7
    { "original": "Sign up", "suggested": "Create account" }
  ]
}
```

Messages are ordered by `createdAt` (ISO strings sort lexicographically), so
always write a real timestamp.

---

## 5. The `data-pv-comment-{id}` attribute

A thread is anchored by a **valueless** JSX attribute named after the thread id,
on the element's opening tag:

```jsx
<div data-pv-comment-ab12cd34ef className="flex items-center gap-2">
```

Valueless means the bare attribute name — no `=""`, no `={true}`.

- One attribute per thread. An element can anchor **several** threads, each with
  its own attribute (`data-pv-comment-id1 data-pv-comment-id2`), and can carry
  `data-pv-spec-*` attributes at the same time. The names are unique, so they
  never collide.
- **Never write** the old list form `data-pv-comment-thread="id1 id2"`. It is
  read defensively for compatibility and nothing else; it caused duplicate
  attributes when a second thread failed to merge into the list.
- Match one thread's element with the CSS selector `[data-pv-comment-{id}]`.
- `thread.json`'s `anchorFile` records which source file the attribute went into.
  Keep the two in sync.

---

## 6. The legacy single-file format

Older projects store a whole thread as one file,
`src/comments/comment-{threadId}.json`, with an inline `comments` array.

- These are still **read**, and merged with any split-layout files for the same
  thread id: a `{threadId}/{commentId}.json` file shadows the inline message with
  the same id, and `thread.json` wins over the legacy file for metadata.
- **Never create a new thread in this format.**
- **Never append to a legacy file's inline `comments` array** — that reintroduces
  the sync conflict the split layout exists to avoid. Add new messages as
  separate `src/comments/{threadId}/{commentId}.json` files even when the thread
  itself is a legacy file.

---

## 7. Wording suggestions are advisory, not source edits

A message may carry a `suggestions` array of `{ original, suggested }` pairs — a
UX writer proposing replacement copy for exact strings on the anchored element.
Optional `replaceAll: true` widens the swap from the anchor's subtree to every
occurrence on the page.

These are **advisory metadata only**. The UI previews them by find/replacing the
string in the live canvas DOM and never touches source. The presence of a
suggestion is not permission to change code.

If the user asks you to *apply* one, make the real edit in the JSX (respecting
the pv-block rules in `PROTOVIBE_AGENTS.md`) and **leave the `suggestions` entry
in place** as the record of what was requested.

---

## 8. Recipes

**Read comments for context.** Walk `src/comments/*/thread.json` plus each
directory's message files, and any legacy `comment-*.json`. Sort messages by
`createdAt`. This needs no permission — it is how you learn what the team wants.

**Reply to a thread.** Create one new file
`src/comments/{threadId}/{c-xxxxxxxxxx}.json` with a fresh id, the author, the
text and an ISO `createdAt`. Never rewrite an existing message file to append.

**Change a thread's status.** Edit `status` in
`src/comments/{threadId}/thread.json`. If the thread is legacy and has no
directory yet, create the directory and write a `thread.json` (copying `id`,
`context`, `createdAt` and `anchorFile` from the legacy file) with the new
status — once `thread.json` exists it is authoritative for metadata.

**Anchor a brand-new thread.** Create `src/comments/{threadId}/` with a
`thread.json` and the first message file, **and** add the valueless
`data-pv-comment-{threadId}` attribute to the target element so the two stay in
sync.

**Delete a thread.** Remove its directory (and the legacy `comment-{id}.json` if
present) **and** the matching attribute from the anchor file. When you delete an
element, do this for every `data-pv-comment-*` attribute it carried.

---

## 9. Never

- Never put messages in `thread.json`, or several messages in one file.
- Never append to a legacy inline `comments` array.
- Never write a status label (`"To review"`) instead of an id (`"review"`).
- Never write the `data-pv-comment-thread="…"` list attribute.
- Never strip a `data-pv-comment-*` attribute you did not intend to unanchor.
- Never create, edit or resolve comments unless the user asked you to.
