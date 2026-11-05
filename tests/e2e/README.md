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

Structural regressions cover wrapping a multi-selection, moving flow children up
and down, unwrapping without a visual jump, bringing an item past multiple siblings
to the front, sending it backward, and moving a marquee-selected group. Wrap and
unwrap preserve editing markers on nested absolute children; the tests move those
children after reload and exercise undo/redo. Unwrap geometry is also checked
inside a bordered absolute parent at non-default zoom. Mutation checks include
wrap/unwrap/delete endpoints and JSON-level failures, even with HTTP 200.

Shared-editor regressions in `app-editor.spec.ts` check App clipboard operations,
uppercase redo, inspector dimensions (including ordinary inline-style precedence),
flow reordering, wrapping/unwrapping, and Escape. These temporarily replace the
local tutorial page and restore its exact contents in fixture teardown. Run them
on the same dedicated template server, serially with Sketchpad:

```sh
npx playwright test tests/e2e/sketchpad.spec.ts tests/e2e/app-editor.spec.ts --workers=1
```

The bordered-container checks cover both unwrap and drag reparenting, including
zoom, undo/redo and reload persistence.

Cross-frame coverage includes selections spanning two frames: dragging from either
selected item and keyboard nudging must persist both frames and undo as one step.
The backend prepares all affected files before writing, so an invalid target
cannot leave a partially moved group. Absolute-layout containers keep their size
and a relative containing block when wrapped or moved into flow, preserving their
absolute children's coordinate system. Overlapping ancestor/descendant selections
operate on each subtree once; cut, delete and duplicate are covered through the
UI, with backend checks for copy/read and repeated block IDs as well.

Flow-to-absolute group transfers cover drag, cut/paste and copy/paste for columns
and grids, into both frames and bordered nested containers at non-default zoom.
The checks preserve rendered size and relative offsets, even when selection order
is reversed, through undo/redo and reload. A missing-coordinate case verifies the
vertical fallback uses each item's height plus a gap. Backend cases also exercise
legacy payloads without geometry and incomplete or invalid measurements.
