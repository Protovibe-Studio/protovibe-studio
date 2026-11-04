# Sketchpad e2e tests

Build the template plugin and start the template's Vite server before running:

```sh
cd protovibe-project-template
pnpm install
pnpm dev
```

From the repository root, with the root test dependencies installed:

```sh
npx playwright install chromium
npx playwright test tests/e2e/sketchpad.spec.ts --workers=1
```

Rebuild `protovibe-project-template/plugins/protovibe` after changing the bridge
or shell: those scripts are served from `dist`. Restart the Vite server after
rebuilding backend handlers as well. Sketchpad React components use Vite's
source modules directly.

The fixture creates a uniquely named sketchpad with a small frame using the real
backend, then exercises operations through the UI. It deletes only its own
sketchpads in teardown, including after assertion failures. Tests use the same
server-side clipboard and undo history, so run against a dedicated template dev
server and do not run multiple Sketchpad workers concurrently. Tests never depend
on the default sketchpad's contents.

Canvas locators belong to `iframe[title="Sketchpad"]`. The component palette is
open on initial load; the fixture closes it before interacting with the toolbar.
Plain paste inserts into a container; Shift+paste inserts after a selected item.
Keyboard tests explicitly focus the iframe, with an additional parent-shell zoom
check. Redo uses uppercase `Z` to match a physical Shift shortcut. Escape is
covered in both the iframe and shell, and copy/cut tests verify that a new item
clipboard supersedes an older frame clipboard. History assertions wait for the
API response and rendered state; movement checks also verify saved state after
reload. Frame positions are rounded to whole
canvas pixels by the backend.

Failure traces, screenshots and videos are in `test-results/artifacts/`.

Additional regressions cover horizontal and corner element resizing as a single
undo step, multi-item drag undo/redo, inspector width edits, palette drops at
non-default zoom (including the bottom of a frame), flow-to-absolute reparenting,
clipboard preservation during internal duplicate/reparent operations, and styled
cut/paste plus keyboard duplication across frames. Geometry checks include reload
persistence. The fixture also fails on unsuccessful canvas mutation responses so
optimistic DOM movement cannot hide a failed save.

The review regressions also exercise all eight resize edges/corners, keyboard
nudging of a selection as one undo step, frame clipboard precedence over an older
item clipboard, and group copy/cut/paste with preserved spacing and fresh IDs.
Inspector dimensions and box shadows are checked after pointer resizing, moving,
duplicating and reloading. A nested absolute-layout fixture verifies that moving
its container into flow layout preserves the children's editing markers, so those
children can still be moved and resized after the transfer.

Backend regressions (`pnpm --dir plugins/protovibe test:sketchpad-position` from
the template) cover nested editing markers and inspector dimensions overriding
saved inline sizes, including typed objects, spreads, removal, and reapplying the
same size class. Ordinary app styles and conditional size classes are preserved.

Same-frame reparenting uses one backend write for insertion and source removal,
so HMR cannot stop at an intermediate duplicate. The flow-to-frame e2e verifies
both moves use that atomic path; backend checks verify one write and no partial
changes for invalid moves. Cross-frame transfers still save the destination
before removing the source.
