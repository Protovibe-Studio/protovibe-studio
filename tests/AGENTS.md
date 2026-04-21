# AGENTS.md: E2E Test Engineering Rules for Protovibe

## Architecture overview

The Protovibe shell (`protovibe.html`) loads a NavBar in the parent page and renders three iframes:
- `iframe[title="App Preview"]` — the user's React app
- `iframe[title="Sketchpad"]` — the canvas (SketchpadApp + sketchpad-bridge)
- `iframe[title="Components Preview"]` — the component playground

All canvas interactions happen inside the **Sketchpad iframe**. Use `page.frameLocator('iframe[title="Sketchpad"]')` and scope every canvas locator to it.

---

## Selectors

**Never use `getByTitle`, `getByPlaceholder`, or `getByText` for Protovibe UI elements.** Add `data-testid` attributes to the source component and use `getByTestId`.

Files with testids already added:
- `ShellNavBar.tsx` — `tab-app`, `tab-sketchpad`, `tab-components`
- `SketchpadApp.tsx` — `toolbar-sketchpads`, `toolbar-add`, `add-menu-new-frame`, `add-menu-add-component`, `mutation-lock-overlay`
- `SketchpadOverlayPanel.tsx` — `btn-new-sketchpad`, `input-new-sketchpad`, `btn-delete-{name-slug}`
- `ConfirmDialog.tsx` — `dialog-confirm`
- `ComponentPalette.tsx` — `input-component-search`, `component-item-{ComponentName}`, `btn-close-palette`
- `FrameContainer.tsx` — `frame-more-btn`, `frame-menu-rename`, `frame-menu-duplicate`, `frame-menu-delete`

---

## Iframe scoping rules

```ts
const canvas = page.frameLocator('iframe[title="Sketchpad"]');
// All canvas queries must be scoped to canvas:
await canvas.getByTestId('toolbar-add').click();

// The ConfirmDialog uses createPortal to the iframe's document.body — it is
// INSIDE the iframe, not in the parent page:
await canvas.getByTestId('dialog-confirm').click();  // ✅
await page.getByTestId('dialog-confirm').click();    // ❌ wrong frame
```

---

## Mutation lock

Every server-mutating action (create/delete frame, create/delete sketchpad, add component) sets a full-screen transparent overlay (`data-testid="mutation-lock-overlay"`) that blocks all pointer events while in flight. Always wait for it after mutations:

```ts
async function waitForUnlock(canvas: FrameLocator) {
  const overlay = canvas.getByTestId('mutation-lock-overlay');
  try {
    await expect(overlay).toBeVisible({ timeout: 500 });
  } catch {
    // mutation was too fast to observe
  }
  await expect(overlay).not.toBeVisible({ timeout: 15_000 });
}
```

The try/catch is necessary: the lock sometimes appears and disappears faster than the 500 ms poll, and omitting it causes the second `not.toBeVisible` to see a stale "not visible" state and return early, then the real lock appears and blocks the next action.

---

## Panel lifecycle

**The sketchpad panel stays open after creating a sketchpad.** After pressing Enter in `input-new-sketchpad`, the panel backdrop (z-index 9996) covers the entire iframe and blocks all toolbar clicks. Always dismiss it before continuing:

```ts
await canvas.getByTestId('input-new-sketchpad').press('Enter');
await waitForUnlock(canvas);
await canvas.locator('body').click({ position: { x: 600, y: 400 } });
```

Similarly, **the component palette stays open after clicking a component item**. Close it with `btn-close-palette` before any drag or canvas interaction.

---

## Keyboard events inside the iframe

`page.keyboard.press(key)` fires in the **parent page**, not inside the Sketchpad iframe. This means:

- **Undo/Redo (Cmd+Z / Ctrl+Z):** Works — the parent shell's keyboard handler calls the undo API and posts `PV_UNDO_REDO_COMPLETE` back to the iframe.
- **Backspace to delete a selected frame:** Does NOT work from the parent page. The SketchpadApp listens on `window` inside the iframe. Use the frame's `frame-more-btn` context menu → `frame-menu-delete` instead.

```ts
// ✅ Reliable frame deletion
await frame.locator('..').getByTestId('frame-more-btn').click();
await canvas.getByTestId('frame-menu-delete').click();
await waitForUnlock(canvas);

// ❌ This fires in the parent — the iframe's keydown handler never sees it
await page.keyboard.press('Backspace');
```

To fire a key inside the iframe: `await canvas.locator('body').press('Backspace')`. This is only needed for keys that the iframe handles but are not forwarded from the parent shell (most shortcuts are forwarded by `sketchpad-bridge.ts`).

---

## Dragging components

Components added to a sketchpad frame get `data-pv-sketchpad-el` on their root DOM element. The sketchpad bridge only drags elements that have this attribute (checked via `isAppLevel`). Use `[data-pv-sketchpad-el]` as the selector, not `[data-pv-component-id]`:

```ts
const buttonBlock = frame.locator('[data-pv-sketchpad-el]').first();
```

Drag with raw mouse events using page-coordinate bounding boxes (Playwright's `boundingBox()` already accounts for iframe offset):

```ts
const box = await buttonBlock.boundingBox();
await buttonBlock.hover();
await page.mouse.down();
await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 100, { steps: 10 });
await page.mouse.up();
await waitForUnlock(canvas);
```

Verify the drag with bounding-box comparison, not style attribute comparison (the button may not have an inline style initially):

```ts
const boxAfter = await buttonBlock.boundingBox();
expect(boxAfter?.x).not.toBeCloseTo(box.x, -1);
```

---

## Test isolation

Each test must create its own named sketchpad and delete it at the end. Never rely on pre-existing sketchpad state (e.g. the default "Sketchpad 1"). The default sketchpad may have existing frames that shift nth() indices and break locators.

```ts
const sketchpadName = `E2E Test ${Date.now()}`;
// ... create, use, then at end:
await canvas.getByTestId('toolbar-sketchpads').click();
const deleteTestId = `btn-delete-${sketchpadName.toLowerCase().replace(/\s+/g, '-')}`;
await canvas.getByTestId(deleteTestId).click();
await canvas.getByTestId('dialog-confirm').click();
await waitForUnlock(canvas);
```


---

## Running tests

The dev server must be running first:

```bash
cd protovibe-project-template && pnpm dev
```

Then from the repo root:

```bash
npx playwright test --config=playwright.config.ts tests/e2e/sketchpad.spec.ts
```

Traces, screenshots, and videos are written to `test-results/artifacts/` on failure. Open the HTML report with:

```bash
npx playwright show-report test-results/html-report
```
