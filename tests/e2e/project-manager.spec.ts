import { test, expect, Page, Locator } from '@playwright/test';

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

/**
 * Apply a value to an Essentials autocomplete field and assert:
 * 1. The expected Tailwind class is added to the element.
 * 2. The computed CSS property matches the expected value.
 */
async function setAndAssertStyle(
  editorPage: Page,
  targetLocator: Locator,
  testId: string,
  inputValue: string,
  expectedClass: string,
  cssProperty: string,
  expectedValue: string,
) {
  // Click into the autocomplete
  const input = editorPage.getByTestId(testId).locator('input');
  await input.click();
  await input.fill(inputValue);
  await input.press('Enter');
  await waitForUnlock(editorPage);

  // Assert class applied
  // Escape square brackets for arbitrary values if they appear in expectedClass
  const escapedClass = expectedClass.replace('[', '\\[').replace(']', '\\]');
  await expect(targetLocator).toHaveClass(new RegExp(`\\b${escapedClass}\\b`));

  // Assert style applied on the specific selected element in the iframe
  await expect(targetLocator).toHaveCSS(cssProperty, expectedValue);
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

    // ── 4. Select the E2E test container ────────────────────────────────────
    const appFrame = editorPage.frameLocator('iframe[title="App Preview"]');
    const containerText = appFrame.getByText('Container for testing adding and styling elements');
    await containerText.click();
    
    // Press W to traverse up to the div container (data-testid="e2e-pv-block")
    await editorPage.keyboard.press('w');
    
    const container = appFrame.getByTestId('e2e-pv-block');
    await expect(container).toBeVisible();
    await expect(editorPage.getByTestId('floating-toolbar')).toBeVisible({ timeout: 10_000 });

    // ── 5. Add an Empty Div Block INSIDE the container ──────────────────────
    await editorPage.getByTestId('floating-toolbar').getByText(/Add (child|inside)/i).click();
    await expect(editorPage.getByTestId('input-add-search')).toBeVisible();
    await editorPage.getByTestId('item-builtin-block').click();
    await waitForUnlock(editorPage);

    // ── 6. Identify our newly focused Div ───────────────────────────────────
    // We get the ID to create a stable locator that won't shift when we add children
    const newDivId = await container.locator('> [data-pv-block]').last().getAttribute('data-pv-block');
    expect(newDivId).not.toBeNull();
    const newDiv = appFrame.locator(`[data-pv-block="${newDivId}"]`);
    await expect(newDiv).toBeVisible();

    // ── 7. Add Empty Text Span INSIDE the new div ───────────────────────────
    await editorPage.getByTestId('floating-toolbar').getByText(/Add (child|inside)/i).click();
    await expect(editorPage.getByTestId('input-add-search')).toBeVisible();
    await editorPage.getByTestId('item-builtin-text').click();
    await waitForUnlock(editorPage);

    // ── 8. Navigate back to the div (W = parent) ─────────────────────────────
    await editorPage.keyboard.press('w');

    // Ensure inspector is showing the Essentials section
    await expect(editorPage.getByTestId('section-essentials')).toBeVisible({ timeout: 10_000 });

    // ── 9. Test padding-top ──────────────────────────────────────────────────
    // Note: We pass just the value '4', the plugin adds 'pt-' prefix.
    await setAndAssertStyle(editorPage, newDiv, 'essentials-pt', '4', 'pt-4', 'padding-top', '16px');

    // Unset padding-top via "Unset" option
    {
      const input = editorPage.getByTestId('essentials-pt').locator('input');
      await input.click();
      const dropdown = editorPage.locator('[data-pv-overlay="true"]').last();
      await expect(dropdown).toBeVisible();
      await dropdown.getByText('Unset').click();
      await waitForUnlock(editorPage);
      await expect(newDiv).not.toHaveClass(/\bpt-4\b/);
    }

    // ── 10. Test padding-bottom ───────────────────────────────────────────────
    await setAndAssertStyle(editorPage, newDiv, 'essentials-pb', '4', 'pb-4', 'padding-bottom', '16px');
    {
      const input = editorPage.getByTestId('essentials-pb').locator('input');
      await input.click();
      await editorPage.locator('[data-pv-overlay="true"]').last().getByText('Unset').click();
      await waitForUnlock(editorPage);
    }

    // ── 11. Test padding-left ─────────────────────────────────────────────────
    await setAndAssertStyle(editorPage, newDiv, 'essentials-pl', '4', 'pl-4', 'padding-left', '16px');
    {
      const input = editorPage.getByTestId('essentials-pl').locator('input');
      await input.click();
      await editorPage.locator('[data-pv-overlay="true"]').last().getByText('Unset').click();
      await waitForUnlock(editorPage);
    }

    // ── 12. Test padding-right ────────────────────────────────────────────────
    await setAndAssertStyle(editorPage, newDiv, 'essentials-pr', '4', 'pr-4', 'padding-right', '16px');
    {
      const input = editorPage.getByTestId('essentials-pr').locator('input');
      await input.click();
      await editorPage.locator('[data-pv-overlay="true"]').last().getByText('Unset').click();
      await waitForUnlock(editorPage);
    }

    // ── 13. Test margin-top ───────────────────────────────────────────────────
    await setAndAssertStyle(editorPage, newDiv, 'essentials-mt', '4', 'mt-4', 'margin-top', '16px');
    {
      const input = editorPage.getByTestId('essentials-mt').locator('input');
      await input.click();
      await editorPage.locator('[data-pv-overlay="true"]').last().getByText('Unset').click();
      await waitForUnlock(editorPage);
    }

    // ── 14. Test margin-bottom ────────────────────────────────────────────────
    await setAndAssertStyle(editorPage, newDiv, 'essentials-mb', '4', 'mb-4', 'margin-bottom', '16px');
    {
      const input = editorPage.getByTestId('essentials-mb').locator('input');
      await input.click();
      await editorPage.locator('[data-pv-overlay="true"]').last().getByText('Unset').click();
      await waitForUnlock(editorPage);
    }

    // ── 15. Test border-radius ────────────────────────────────────────────────
    // In this project's scale, 'lg' corresponds to '16px'. 'DEFAULT' is '8px'.
    await setAndAssertStyle(editorPage, newDiv, 'essentials-border-radius', 'lg', 'rounded-lg', 'border-radius', '16px');
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
    // Click Delete using locator by text, because List view Menu items don't natively pass the testId prop
    await page.locator('button', { hasText: 'Delete' }).click();
    // Confirm deletion — this can take a long time
    await page.getByTestId('btn-confirm-delete').click();
    // Wait for the card to disappear — delete may take a while
    await expect(card).not.toBeVisible({ timeout: 120_000 });
  });
});