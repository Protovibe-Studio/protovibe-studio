// Integration test against the template editor: build the plugin, run `npm run
// dev` in protovibe-project-template, then run this file from plugins/protovibe.
// Override PROTOVIBE_TEST_URL or PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH if needed.
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { chromium } from 'playwright';

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
});
after(async () => { await browser?.close(); });

async function openEditor(t) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  t.after(() => page.close());
  const base = process.env.PROTOVIBE_TEST_URL || 'http://localhost:3000';
  await page.goto(`${base}/protovibe.html`);
  const canvas = page.frameLocator('iframe').first();
  // Select the tutorial card, which contains children and exposes both actions.
  await canvas.locator('[data-pv-block="lf7bog"]').click({ position: { x: 10, y: 10 } });
  await page.getByTestId('btn-add-menu').waitFor();
  return page;
}
async function assertFocus(page, testId) {
  assert.equal(await page.getByTestId(testId).evaluate(el => el === document.activeElement), true);
}
async function assertSingleSelection(page) {
  assert.equal(await page.getByTestId('btn-add-menu').isVisible(), true);
  assert.equal(await page.getByRole('button', { name: /^Wrap \d+ elements$/ }).count(), 0);
}

test('menu focuses its options and supports navigation, Escape and Tab', async t => {
  const page = await openEditor(t);
  const add = page.getByTestId('btn-add-menu');
  await add.click();
  await assertFocus(page, 'item-add-child');
  for (const [key, item] of [['ArrowDown', 'after'], ['ArrowDown', 'child'], ['ArrowUp', 'after'], ['Home', 'child'], ['End', 'after']]) {
    await page.keyboard.press(key);
    await assertFocus(page, `item-add-${item}`);
  }
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('menu').count(), 0);
  await assertFocus(page, 'btn-add-menu');
  await assertSingleSelection(page);
  await page.keyboard.press('ArrowDown');
  await assertFocus(page, 'item-add-child');
  await page.keyboard.press('Shift+Tab');
  await assertFocus(page, 'btn-add-menu');
  assert.equal(await page.getByRole('menu').count(), 0);
  await add.click();
  await page.keyboard.press('Tab');
  assert.equal(await page.getByRole('menu').count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Wrap', exact: true }).evaluate(el => el === document.activeElement), true);
  await assertSingleSelection(page);
});

test('Enter and Space open the menu and activate either option without selecting children', async t => {
  const page = await openEditor(t);
  const add = page.getByTestId('btn-add-menu');
  for (const key of ['Enter', 'Space']) {
    for (const mode of ['child', 'after']) {
      await add.focus();
      await page.keyboard.press(key);
      await assertFocus(page, 'item-add-child');
      if (mode === 'after') await page.keyboard.press('ArrowDown');
      await page.keyboard.press(key);
      await page.getByTestId('input-add-search').waitFor();
      await assertFocus(page, 'input-add-search');
      assert.equal(await page.getByRole('menu').count(), 0);
      await assertSingleSelection(page);
      await page.keyboard.press('Escape');
    }
  }
});

test('direct shortcuts still bypass the focused menu', async t => {
  const page = await openEditor(t);
  for (const key of ['Control+e', 'Control+Shift+e', 'Meta+e', 'Meta+Shift+e']) {
    await page.getByTestId('btn-add-menu').click();
    await assertFocus(page, 'item-add-child');
    await page.keyboard.press(key);
    await page.getByTestId('input-add-search').waitFor();
    assert.equal(await page.getByRole('menu').count(), 0);
    await assertSingleSelection(page);
    await page.keyboard.press('Escape');
  }
});
