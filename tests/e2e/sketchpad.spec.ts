import { test, expect, FrameLocator } from '@playwright/test';

// The Protovibe template dev server runs on http://localhost:3000
// Start it manually before running tests:
//   cd protovibe-project-template && pnpm dev
//
// Then run tests from the repo root:
//   npx playwright test

const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';

/**
 * Wait for the mutation-lock overlay (progress cursor) to disappear.
 * First tries to detect the overlay appearing (it may be very brief), then
 * waits for it to be gone. Handles both fast and slow mutations reliably.
 */
async function waitForUnlock(canvas: FrameLocator) {
  const overlay = canvas.getByTestId('mutation-lock-overlay');
  try {
    await expect(overlay).toBeVisible({ timeout: 500 });
  } catch {
    // Overlay didn't appear — mutation was too fast or already done
  }
  await expect(overlay).not.toBeVisible({ timeout: 15_000 });
}

test.describe('Protovibe Sketchpad E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/protovibe.html');
    await page.getByTestId('tab-sketchpad').click();
  });

  test('should create, manage, and delete frames and a sketchpad', async ({ page }) => {
    const canvas = page.frameLocator('iframe[title="Sketchpad"]');
    const sketchpadName = `E2E Test ${Date.now()}`;

    // Open sketchpad panel and create a new sketchpad
    await canvas.getByTestId('toolbar-sketchpads').click();
    await canvas.getByTestId('btn-new-sketchpad').click();
    await canvas.getByTestId('input-new-sketchpad').fill(sketchpadName);
    await canvas.getByTestId('input-new-sketchpad').press('Enter');
    await waitForUnlock(canvas);
    // The panel remains open after creation — dismiss it by clicking outside
    await canvas.locator('body').click({ position: { x: 600, y: 400 } });

    // Add first frame
    await canvas.getByTestId('toolbar-add').click();
    await canvas.getByTestId('add-menu-new-frame').click();
    await waitForUnlock(canvas);
    const frame1 = canvas.locator('[data-sketchpad-frame]').nth(0);
    await expect(frame1).toBeVisible();

    // Add second frame
    await canvas.getByTestId('toolbar-add').click();
    await canvas.getByTestId('add-menu-new-frame').click();
    await waitForUnlock(canvas);
    const frame2 = canvas.locator('[data-sketchpad-frame]').nth(1);
    await expect(frame2).toBeVisible();

    // Delete second frame via its context menu
    await frame2.locator('..').getByTestId('frame-more-btn').click();
    await canvas.getByTestId('frame-menu-delete').click();
    await waitForUnlock(canvas);
    await expect(frame2).not.toBeVisible();

    // Delete first frame via its context menu
    await frame1.locator('..').getByTestId('frame-more-btn').click();
    await canvas.getByTestId('frame-menu-delete').click();
    await waitForUnlock(canvas);
    await expect(frame1).not.toBeVisible();

    // Delete the sketchpad via the panel — newly created sketchpad is already active
    await canvas.getByTestId('toolbar-sketchpads').click();
    const deleteTestId = `btn-delete-${sketchpadName.toLowerCase().replace(/\s+/g, '-')}`;
    await canvas.getByTestId(deleteTestId).click();

    // Confirm dialog is rendered inside the sketchpad iframe via createPortal
    await canvas.getByTestId('dialog-confirm').click();
    await waitForUnlock(canvas);

    await expect(canvas.getByTestId(deleteTestId)).not.toBeVisible();
  });

  test('should add a frame, add a component, drag it, and undo', async ({ page }) => {
    const canvas = page.frameLocator('iframe[title="Sketchpad"]');
    const sketchpadName = `E2E Drag ${Date.now()}`;

    // Create a fresh isolated sketchpad for this test
    await canvas.getByTestId('toolbar-sketchpads').click();
    await canvas.getByTestId('btn-new-sketchpad').click();
    await canvas.getByTestId('input-new-sketchpad').fill(sketchpadName);
    await canvas.getByTestId('input-new-sketchpad').press('Enter');
    await waitForUnlock(canvas);
    // Dismiss the panel by clicking outside
    await canvas.locator('body').click({ position: { x: 600, y: 400 } });

    // Add a frame — it will be the only frame in this sketchpad
    await canvas.getByTestId('toolbar-add').click();
    await canvas.getByTestId('add-menu-new-frame').click();
    await waitForUnlock(canvas);
    const frame = canvas.locator('[data-sketchpad-frame]').first();
    await expect(frame).toBeVisible();

    // Open the Add menu and go to component palette
    await canvas.getByTestId('toolbar-add').click();
    await canvas.getByTestId('add-menu-add-component').click();

    // Search for Button component and add it
    await canvas.getByTestId('input-component-search').fill('Button');
    await canvas.getByTestId('component-item-Button').click();
    await waitForUnlock(canvas);
    // Close the palette so it doesn't block pointer events on the canvas
    await canvas.getByTestId('btn-close-palette').click();

    // Find by data-pv-sketchpad-el — required for the bridge to treat it as draggable
    const buttonBlock = frame.locator('[data-pv-sketchpad-el]').first();
    await expect(buttonBlock).toBeVisible();

    // Record initial bounding box before drag
    const boxBefore = await buttonBlock.boundingBox();
    expect(boxBefore).not.toBeNull();

    // Drag the component 100px right and 100px down
    await buttonBlock.hover();
    await page.mouse.down();
    await page.mouse.move(
      (boxBefore?.x ?? 0) + (boxBefore?.width ?? 0) / 2 + 100,
      (boxBefore?.y ?? 0) + (boxBefore?.height ?? 0) / 2 + 100,
      { steps: 10 },
    );
    await page.mouse.up();
    await waitForUnlock(canvas);

    // Position should have changed
    const boxAfterDrag = await buttonBlock.boundingBox();
    expect(boxAfterDrag?.x).not.toBeCloseTo(boxBefore?.x ?? 0, -1);

    // Undo the drag (Cmd/Ctrl+Z fires in parent shell which forwards undo to iframe)
    await page.keyboard.press(`${modifier}+z`);
    await waitForUnlock(canvas);
    const boxAfterUndo = await buttonBlock.boundingBox();
    expect(boxAfterUndo?.x).toBeCloseTo(boxBefore?.x ?? 0, -1);
    expect(boxAfterUndo?.y).toBeCloseTo(boxBefore?.y ?? 0, -1);

    // Undo component addition
    await page.keyboard.press(`${modifier}+z`);
    await waitForUnlock(canvas);
    await expect(buttonBlock).not.toBeVisible();

    // Undo frame addition
    await page.keyboard.press(`${modifier}+z`);
    await waitForUnlock(canvas);
    await expect(frame).not.toBeVisible();

    // Clean up: delete the test sketchpad
    await canvas.getByTestId('toolbar-sketchpads').click();
    const deleteTestId = `btn-delete-${sketchpadName.toLowerCase().replace(/\s+/g, '-')}`;
    await canvas.getByTestId(deleteTestId).click();
    await canvas.getByTestId('dialog-confirm').click();
    await waitForUnlock(canvas);
    // Verify the sketchpad was actually deleted
    await canvas.getByTestId('toolbar-sketchpads').click();
    await expect(canvas.getByTestId(deleteTestId)).not.toBeVisible();
    await canvas.locator('body').click({ position: { x: 600, y: 400 } });
  });
});
