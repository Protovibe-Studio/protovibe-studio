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
  expectedValue: string | RegExp,
) {
  // Click into the autocomplete
  const input = editorPage.getByTestId(testId).locator('input');
  await input.click();
  await input.fill(inputValue);
  await input.press('Enter');
  await waitForUnlock(editorPage);

  // Assert class applied
  const escapedClass = expectedClass.replace('[', '\\[').replace(']', '\\]');
  await expect(targetLocator).toHaveClass(new RegExp(`\\b${escapedClass}\\b`));

  // Assert style applied on the specific selected element in the iframe
  await expect(targetLocator).toHaveCSS(cssProperty, expectedValue);
}

/**
 * Helper to set a value in a VisualControl by its label and assert
 */
async function setControlStyle(
  editorPage: Page,
  targetLocator: Locator,
  label: string,
  inputValue: string,
  expectedClass: string,
  cssProperty: string,
  expectedValue: string | RegExp,
) {
  const controlTestId = `control-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const control = editorPage.getByTestId(controlTestId);
  const input = control.locator('input');
  
  await input.click();
  await input.fill(inputValue);
  await input.press('Enter');
  await waitForUnlock(editorPage);

  const escapedClass = expectedClass.replace('[', '\\[').replace(']', '\\]');
  await expect(targetLocator).toHaveClass(new RegExp(`\\b${escapedClass}\\b`));
  await expect(targetLocator).toHaveCSS(cssProperty, expectedValue);
}

/**
 * Resiliently click an element and wait for toolbar to be visible
 */
async function selectAndCheckToolbar(editorPage: Page, targetLocator: Locator) {
  const toolbar = editorPage.getByTestId('floating-toolbar');
  const addChildBtn = editorPage.getByTestId('btn-add-child');

  let attempts = 0;
  while (attempts < 5) {
    try {
      await targetLocator.click();
      await expect(addChildBtn).toBeVisible({ timeout: 2000 });
      return;
    } catch {
      attempts++;
      await editorPage.waitForTimeout(500);
    }
  }
  // Final attempt with full timeout
  await targetLocator.click();
  await expect(addChildBtn).toBeVisible({ timeout: 5000 });
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

    await expect(page.getByTestId('btn-open-editor')).toBeVisible({ timeout: 300_000 });

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

    const appTab = editorPage.getByTestId('tab-app');
    if (await appTab.isVisible()) {
      await appTab.click();
    }

    // ── 4. Select the E2E test container ────────────────────────────────────
    const appFrame = editorPage.frameLocator('iframe[title="App Preview"]');
    const containerText = appFrame.getByText('Container for testing adding and styling elements');
    await containerText.click();
    
    // Press W to traverse up to the div container
    await editorPage.keyboard.press('w');
    
    const container = appFrame.getByTestId('e2e-pv-block');
    await expect(container).toBeVisible();
    
    const addChildBtn = editorPage.getByTestId('btn-add-child');

    // Ensure selection is active and toolbar is shown
    await selectAndCheckToolbar(editorPage, container);

    // ── 5. Add an Empty Div Block INSIDE the container ──────────────────────
    await addChildBtn.dispatchEvent('click');

    await expect(editorPage.getByTestId('input-add-search')).toBeVisible();
    await editorPage.getByTestId('item-builtin-block').click();
    await waitForUnlock(editorPage);

    // Wait for the new element to appear and be stable
    const newDiv = container.locator('> [data-pv-block]').last();
    await expect(newDiv).toBeVisible();
    const newDivId = await newDiv.getAttribute('data-pv-block');
    expect(newDivId).not.toBeNull();
    
    // ── 7. Add Empty Text Span INSIDE the new div ───────────────────────────
    await selectAndCheckToolbar(editorPage, newDiv);
    await addChildBtn.dispatchEvent('click');

    await expect(editorPage.getByTestId('input-add-search')).toBeVisible();
    await editorPage.getByTestId('item-builtin-text').click();
    await waitForUnlock(editorPage);

    // ── 8. Navigate back to the div (W = parent) ─────────────────────────────
    const stableNewDiv = appFrame.locator(`[data-pv-block="${newDivId}"]`);
    await editorPage.keyboard.press('w');
    
    // Verify selection by checking if Essentials section is visible for the stableNewDiv
    await expect(editorPage.getByTestId('section-essentials')).toBeVisible({ timeout: 20_000 });

    // ── 9. Test Essentials (Spacing, Radius, BG) ─────────────────────────────
    // Padding
    await setAndAssertStyle(editorPage, stableNewDiv, 'essentials-pt', '4', 'pt-4', 'padding-top', '16px');
    
    // Background Color
    await setAndAssertStyle(editorPage, stableNewDiv, 'essentials-bg', 'foreground-primary', 'bg-foreground-primary', 'background-color', /oklch|rgb/);

    // Border Radius
    await setAndAssertStyle(editorPage, stableNewDiv, 'essentials-border-radius', 'lg', 'rounded-lg', 'border-radius', '16px');

    // ── 10. Test Typography ──────────────────────────────────────────────────
    const typographySection = editorPage.getByTestId('section-typography');
    await typographySection.scrollIntoViewIfNeeded();

    // Text Align via SegmentedControl
    await typographySection.getByTitle('Center').click();
    await waitForUnlock(editorPage);
    await expect(stableNewDiv).toHaveClass(/\btext-center\b/);
    await expect(stableNewDiv).toHaveCSS('text-align', 'center');

    await typographySection.getByTitle('Right').click();
    await waitForUnlock(editorPage);
    await expect(stableNewDiv).toHaveClass(/\btext-right\b/);
    await expect(stableNewDiv).toHaveCSS('text-align', 'right');

    // Font Weight via VisualControl (input)
    await setControlStyle(editorPage, stableNewDiv, 'Weight', 'bold', 'font-bold', 'font-weight', /700|bold/);

    // Font Size (text-lg is 1rem = 16px in this project)
    await setControlStyle(editorPage, stableNewDiv, 'Font size', 'lg', 'text-lg', 'font-size', '16px');

    // ── 11. Test Effects ─────────────────────────────────────────────────────
    const effectsSection = editorPage.getByTestId('section-effects');
    await effectsSection.scrollIntoViewIfNeeded();

    // Box shadow
    await setControlStyle(editorPage, stableNewDiv, 'Box shadow', 'lg', 'shadow-lg', 'box-shadow', /rgba?\(0, 0, 0, 0\.1\)/);

    // Unset via clear button
    {
      const control = editorPage.getByTestId('control-box-shadow');
      const input = control.locator('input');
      await input.click();
      await input.fill('');
      await input.press('Enter');
      await waitForUnlock(editorPage);
      await expect(stableNewDiv).not.toHaveClass(/\bshadow-lg\b/);
    }

    // ── 12. Test Layout (Display, Flex) ──────────────────────────────────────
    const layoutSection = editorPage.getByTestId('section-display-and-layout');
    await layoutSection.scrollIntoViewIfNeeded();

    // Open Layout popover using data-testid
    await editorPage.getByTestId('layout-trigger').click();
    const layoutPopover = editorPage.locator('[data-pv-overlay="true"]').last();
    await expect(layoutPopover).toBeVisible();

    // Set Display to Flex
    await layoutPopover.getByText('Flex', { exact: true }).click();
    await waitForUnlock(editorPage);
    await expect(stableNewDiv).toHaveClass(/\bflex\b/);
    await expect(stableNewDiv).toHaveCSS('display', 'flex');

    // Set Direction to Col
    await layoutPopover.getByText('Col ↓').click();
    await waitForUnlock(editorPage);
    await expect(stableNewDiv).toHaveClass(/\bflex-col\b/);
    await expect(stableNewDiv).toHaveCSS('flex-direction', 'column');

    // Set Align to Center
    await layoutPopover.getByText('Center', { exact: true }).click();
    await waitForUnlock(editorPage);
    await expect(stableNewDiv).toHaveClass(/\bitems-center\b/);
    await expect(stableNewDiv).toHaveCSS('align-items', 'center');

    // Close popover
    await editorPage.keyboard.press('Escape');
    await expect(layoutPopover).not.toBeVisible();

    // ── 13. Final cleanup / Close ────────────────────────────────────────────
    await editorPage.close();
    await page.bringToFront();

    // ── 14. Stop the project ─────────────────────────────────────────────────
    const stopBtn = page.getByTestId('btn-stop');
    if (await stopBtn.isVisible()) {
      await stopBtn.click();
      await expect(page.getByTestId('btn-run')).toBeVisible({ timeout: 30_000 });
    }

    // ── 15. Go back to project list ───────────────────────────────────────────
    await page.goto(PM_URL);

    // ── 16. Delete the project ───────────────────────────────────────────────
    const card = page.locator(`[data-project-name="${PROJECT_NAME}"]`);
    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.locator('[data-testid="btn-card-menu"]').click();
    await page.locator('button', { hasText: 'Delete' }).click();
    await page.getByTestId('btn-confirm-delete').click();
    await expect(card).not.toBeVisible({ timeout: 120_000 });
  });
});