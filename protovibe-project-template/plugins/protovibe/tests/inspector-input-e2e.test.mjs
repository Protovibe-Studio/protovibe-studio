// Build the plugin and run the template dev server before running this suite.
// Exercises canvas selection -> inspector -> source update request. Mutations
// are intercepted so tests never alter the template or its undo history.
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
  await page.route('**/__take-snapshot', route => route.fulfill({ json: { success: true } }));
  await page.route('**/__block-action', route => route.fulfill({ json: { success: true } }));
  await page.route('**/__update-source', route => route.fulfill({ json: { success: true } }));
  await page.goto(`${process.env.PROTOVIBE_TEST_URL || 'http://localhost:3000'}/protovibe.html`);
  const canvas = page.frameLocator('iframe').first();
  return { page, canvas };
}

for (const [name, testId, block, initial, expected] of [
  ['height', 'control-height', 'hd5001', '12', 'h-37'],
  ['padding', 'essentials-pt', 'nv2005', '4', 'pt-37'],
  ['inherited padding', 'essentials-pt', 'lf7bog', '', 'pt-37'],
]) {
  test(`${name}: select an element, click, type and immediately Enter replaces the value`, async t => {
    const { page, canvas } = await openEditor(t);
    await canvas.locator(`[data-pv-block="${block}"]`).click({ position: { x: 10, y: 10 } });
    const input = page.getByTestId(testId).locator('input');
    await input.click();
    assert.equal(await input.inputValue(), initial);
    await page.keyboard.type('37');
    const saved = page.waitForRequest('**/__update-source');
    await page.keyboard.press('Enter');
    const update = (await saved).postDataJSON();
    assert.equal(update.newClass.split(' ').includes(expected), true, update.newClass);
  });
}

test('height: a hovered suggestion must not replace a typed custom value on Enter', async t => {
  const { page, canvas } = await openEditor(t);
  await canvas.locator('[data-pv-block="hd5001"]').click({ position: { x: 10, y: 10 } });
  const input = page.getByTestId('control-height').locator('input');
  await input.click();
  await page.keyboard.type('37');
  await page.locator('[data-index]').filter({ has: page.locator('span').filter({ hasText: /^16$/ }) }).hover();
  const saved = page.waitForRequest('**/__update-source');
  await page.keyboard.press('Enter');
  assert.equal((await saved).postDataJSON().newClass, 'h-37');
});


test('height: typing 16 across mouse release retains both digits', async t => {
  const { page, canvas } = await openEditor(t);
  await canvas.locator('[data-pv-block="hd5001"]').click({ position: { x: 10, y: 10 } });
  const input = page.getByTestId('control-height').locator('input');
  await input.scrollIntoViewIfNeeded();
  const box = await input.boundingBox();
  await page.mouse.move(box.x + box.width - 5, box.y + box.height / 2);
  await page.mouse.down();
  await page.keyboard.type('1');
  await page.mouse.up();
  await page.keyboard.type('6');
  assert.equal(await input.inputValue(), '16');
  const saved = page.waitForRequest('**/__update-source');
  await page.keyboard.press('Enter');
  assert.equal((await saved).postDataJSON().newClass, 'h-16');
});


test('rich text: typing immediately after canvas double-click keeps the full value', async t => {
  const { page, canvas } = await openEditor(t);
  const heading = canvas.locator('[data-pv-block="hzrzb5"]');
  await heading.click();
  await page.getByTestId('text-content-editor').waitFor();
  await heading.dblclick();
  await page.keyboard.type('16');
  const saved = page.waitForRequest('**/__block-action');
  await page.keyboard.press('Enter');
  assert.equal((await saved).postDataJSON().text, '16');
});
