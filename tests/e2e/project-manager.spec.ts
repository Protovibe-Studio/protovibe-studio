import { test, expect, Page } from '@playwright/test';

// Project Manager runs on localhost:5173
// Protovibe template dev server (for created projects) runs on a dynamic port
// Run project manager before this test:
//   cd protovibe-project-manager && pnpm dev

const PM_URL = 'http://localhost:5173';
const PROJECT_NAME = `E2E-Test-${Date.now()}`;

// Wait for the mutation-lock overlay to clear in the editor page
async function waitForUnlock(page: Page) {
  const overlay = page.frameLocator('iframe[title="App Preview"]').getByTestId('mutation-lock-overlay');
  try {
    await expect(overlay).toBeVisible({ timeout: 500 });
  } catch {
    // fast mutation — overlay may not appear
  }
  await expect(overlay).not.toBeVisible({ timeout: 15_000 });
}

// Apply a value to an Essentials autocomplete field and assert inline style is set
async function setAndAssertStyle(
  editorPage: Page,
  testId: string,
  value: string,
  cssProperty: string,
  expectedValue: string,
) {
  const appFrame = editorPage.frameLocator('iframe[title="App Preview"]');

  // Click into the autocomplete
  const input = editorPage.getByTestId(testId).locator('input');
  await input.click();
  await input.fill(value);
  await input.press('Enter');
  await waitForUnlock(editorPage);

  // Assert style applied on the selected element in the iframe
  const el = appFrame.locator('[data-pv-block]').first();
  await expect(el).toHaveCSS(cssProperty, expectedValue);
}

// Unset a style by selecting "Unset" in the autocomplete
async function unsetStyle(editorPage: Page, testId: string) {
  const input = editorPage.getByTestId(testId).locator('input');
  await input.click();
  // Click the "Unset" option (noneLabel) at top of dropdown
  await editorPage.getByTestId(testId).locator('..').getByText('Unset').first().click();
  await waitForUnlock(editorPage);
}

test.describe('Project Manager + Editor E2E', () => {
  test.setTimeout(600_000);

  let editorPage: Page;
  let projectPort: number;

  test('full flow: create project, edit, check styles, delete', async ({ page, context }) => {
    // ── 1. Open project manager ─────────────────────────────────────────────
    await page.goto(PM_URL);
    await expect(page).toHaveURL(PM_URL + '/');

    // ── 2. Create a new project ─────────────────────────────────────────────
    await page.getByTestId('btn-new-project').first().click();
    await page.getByTestId('input-project-name').fill(PROJECT_NAME);
    await page.getByTestId('btn-create-project').click();

    // Setup screen: wait through installing → starting → running
    // pnpm install can take several minutes
    await expect(page.getByTestId('btn-open-editor')).toBeVisible({ timeout: 300_000 });

    // Extract the port from the "Open Protovibe editor" link
    const href = await page.getByTestId('btn-open-editor').getAttribute('href') ?? '';
    const portMatch = href.match(/:(\d+)\//);
    expect(portMatch).not.toBeNull();
    projectPort = parseInt(portMatch![1], 10);

    // ── 3. Open the editor in a new tab ─────────────────────────────────────
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByTestId('btn-open-editor').click(),
    ]);
    editorPage = newPage;
    await editorPage.waitForLoadState('networkidle', { timeout: 60_000 });

    // Switch to App Preview tab if needed
    const appTab = editorPage.getByTestId('tab-app');
    if (await appTab.isVisible()) {
      await appTab.click();
    }

    // ── 4. Select the first pv-editable block in the app ────────────────────
    const appFrame = editorPage.frameLocator('iframe[title="App Preview"]');
    const firstBlock = appFrame.locator('[data-pv-block]').first();
    await firstBlock.click();
    await expect(editorPage.getByTestId('floating-toolbar')).toBeVisible({ timeout: 10_000 });

    // ── 5. Add an Empty Div Block as a child ─────────────────────────────────
    await editorPage.getByTestId('btn-add-child').click();
    await expect(editorPage.getByTestId('input-add-search')).toBeVisible();
    await editorPage.getByTestId('item-builtin-block').click();
    await waitForUnlock(editorPage);

    // ── 6. Navigate to the new div (last child) ──────────────────────────────
    // Press S to go into child
    await editorPage.keyboard.press('s');
    await editorPage.keyboard.press('s');  // keep pressing until we reach it or use D
    // Actually use W to go to parent first, then S to go into correct child
    // The new div is the last block; navigate via D sibling traversal
    // Reset: press W to go back to parent
    await editorPage.keyboard.press('w');
    await editorPage.keyboard.press('s');  // first child
    // Move to last sibling using D repeatedly (up to 20 times)
    for (let i = 0; i < 20; i++) {
      const toolbar = editorPage.getByTestId('floating-toolbar');
      const prevText = await toolbar.textContent();
      await editorPage.keyboard.press('d');
      const newText = await toolbar.textContent();
      // If text didn't change, we're at the last sibling
      if (newText === prevText) break;
    }

    // ── 7. Add Empty Text Span inside the div ────────────────────────────────
    await editorPage.getByTestId('btn-add-child').click();
    await expect(editorPage.getByTestId('input-add-search')).toBeVisible();
    await editorPage.getByTestId('item-builtin-text').click();
    await waitForUnlock(editorPage);

    // ── 8. Navigate back to the div (W = parent) ─────────────────────────────
    await editorPage.keyboard.press('w');

    // Ensure inspector is showing the Essentials section
    await expect(editorPage.getByTestId('section-essentials')).toBeVisible({ timeout: 10_000 });

    // ── 9. Test padding-top ──────────────────────────────────────────────────
    await setAndAssertStyle(editorPage, 'essentials-pt', 'pt-4', 'padding-top', '16px');

    // Unset padding-top via "Unset" option
    {
      const input = editorPage.getByTestId('essentials-pt').locator('input');
      await input.click();
      const dropdown = editorPage.locator('[data-pv-overlay="true"]').last();
      await expect(dropdown).toBeVisible();
      await dropdown.getByText('Unset').click();
      await waitForUnlock(editorPage);
    }

    // ── 10. Test padding-bottom ───────────────────────────────────────────────
    await setAndAssertStyle(editorPage, 'essentials-pb', 'pb-4', 'padding-bottom', '16px');
    {
      const input = editorPage.getByTestId('essentials-pb').locator('input');
      await input.click();
      await editorPage.locator('[data-pv-overlay="true"]').last().getByText('Unset').click();
      await waitForUnlock(editorPage);
    }

    // ── 11. Test padding-left ─────────────────────────────────────────────────
    await setAndAssertStyle(editorPage, 'essentials-pl', 'pl-4', 'padding-left', '16px');
    {
      const input = editorPage.getByTestId('essentials-pl').locator('input');
      await input.click();
      await editorPage.locator('[data-pv-overlay="true"]').last().getByText('Unset').click();
      await waitForUnlock(editorPage);
    }

    // ── 12. Test padding-right ────────────────────────────────────────────────
    await setAndAssertStyle(editorPage, 'essentials-pr', 'pr-4', 'padding-right', '16px');
    {
      const input = editorPage.getByTestId('essentials-pr').locator('input');
      await input.click();
      await editorPage.locator('[data-pv-overlay="true"]').last().getByText('Unset').click();
      await waitForUnlock(editorPage);
    }

    // ── 13. Test margin-top ───────────────────────────────────────────────────
    await setAndAssertStyle(editorPage, 'essentials-mt', 'mt-4', 'margin-top', '16px');
    {
      const input = editorPage.getByTestId('essentials-mt').locator('input');
      await input.click();
      await editorPage.locator('[data-pv-overlay="true"]').last().getByText('Unset').click();
      await waitForUnlock(editorPage);
    }

    // ── 14. Test margin-bottom ────────────────────────────────────────────────
    await setAndAssertStyle(editorPage, 'essentials-mb', 'mb-4', 'margin-bottom', '16px');
    {
      const input = editorPage.getByTestId('essentials-mb').locator('input');
      await input.click();
      await editorPage.locator('[data-pv-overlay="true"]').last().getByText('Unset').click();
      await waitForUnlock(editorPage);
    }

    // ── 15. Test border-radius ────────────────────────────────────────────────
    await setAndAssertStyle(editorPage, 'essentials-border-radius', 'rounded-lg', 'border-radius', '8px');
    {
      const input = editorPage.getByTestId('essentials-border-radius').locator('input');
      await input.click();
      await editorPage.locator('[data-pv-overlay="true"]').last().getByText('Unset').click();
      await waitForUnlock(editorPage);
    }

    // ── 16. Close editor tab and return to project manager ───────────────────
    await editorPage.close();
    await page.bringToFront();

    // ── 17. Stop the project ─────────────────────────────────────────────────
    const stopBtn = page.getByTestId('btn-stop');
    if (await stopBtn.isVisible()) {
      await stopBtn.click();
      await expect(page.getByTestId('btn-run')).toBeVisible({ timeout: 30_000 });
    }

    // ── 18. Go back to project list ───────────────────────────────────────────
    const backBtn = page.locator('[data-testid="btn-back"], a[href="/"], button:has-text("Back")').first();
    if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backBtn.click();
    } else {
      await page.goto(PM_URL);
    }

    // ── 19. Delete the project via the card menu ──────────────────────────────
    const card = page.locator(`[data-project-name="${PROJECT_NAME}"]`);
    await expect(card).toBeVisible({ timeout: 10_000 });

    // Open the three-dot menu on the card
    await card.locator('[data-testid="btn-card-menu"]').click();
    // Click Delete
    await page.getByTestId('menu-delete').click();
    // Confirm deletion — this can take a long time
    await page.getByTestId('btn-confirm-delete').click();
    // Wait for the card to disappear — delete may take a while
    await expect(card).not.toBeVisible({ timeout: 120_000 });
  });
});
