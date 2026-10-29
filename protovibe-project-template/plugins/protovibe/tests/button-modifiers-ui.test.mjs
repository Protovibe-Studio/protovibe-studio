import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from 'playwright';

test('Button shows matching states and collapses other variants under Show more', async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    await page.goto(`${process.env.PROTOVIBE_TEST_URL || 'http://localhost:3000'}/protovibe.html`);
    await page.getByTestId('tab-components').click();
    const canvas = page.frameLocator('iframe[src="/components.html"]');
    await canvas.getByRole('button', { name: 'Open Button variants', exact: true }).click();
    await canvas.getByPlaceholder('Filter variants…').fill('solid primary md');
    const button = canvas.locator('button[data-pv-component-id="Button"][data-variant="solid"][data-color="primary"][data-size="md"]:not([disabled]):not([data-icon-only="true"]):visible').first();
    await button.click({ position: { x: 4, y: 4 } });
    const list = page.getByRole('radiogroup', { name: 'Which state to style?' });
    const show = page.getByRole('button', { name: /^Show \d+ more$/ });
    await show.waitFor();
    const labels = () => list.getByRole('radio').evaluateAll(elements => elements.map(el => el.getAttribute('aria-label')));
    const collapsed = await labels();
    assert.deepEqual(collapsed, [
      'All states', 'Size: md', 'Variant: solid & Color: primary', 'Disabled',
      'Hover & Variant: solid & Color: primary', 'Active & Variant: solid & Color: primary', 'Variant: solid',
    ]);
    assert.equal(await show.innerText(), 'Show 30 more');
    assert.equal(await list.getByRole('radio', { name: 'All states', exact: true }).getAttribute('aria-checked'), 'true');
    const summary = list.getByRole('radio', { name: 'All states', exact: true }).locator('[data-label-secondary]');
    assert.equal(await summary.evaluate(el => el.scrollWidth > el.clientWidth && getComputedStyle(el).textOverflow === 'ellipsis'), true);
    const screenshotDir = process.env.PROTOVIBE_SCREENSHOT_DIR;
    if (screenshotDir) {
      await page.mouse.move(500, 100);
      await page.screenshot({ path: `${screenshotDir}/button-collapsed.png` });
    }
    await show.click();
    assert.equal(await list.getByRole('radio').count(), 37);
    assert.equal(await list.getByRole('radio', { name: 'Variant: outline & Color: danger', exact: true }).count(), 1);
    const hide = page.getByRole('button', { name: 'Hide 30 more', exact: true });
    await page.setViewportSize({ width: 1440, height: 1800 });
    if (screenshotDir) {
      await page.mouse.move(500, 100);
      await page.screenshot({ path: `${screenshotDir}/button-expanded.png` });
    }
    await hide.click();
    assert.deepEqual(await labels(), collapsed);
    await show.click();
    await list.getByRole('radio', { name: 'Variant: outline & Color: danger', exact: true }).click();
    assert.equal(await list.locator('[role=radio][aria-checked=true]').count(), 1);
    await page.getByRole('button', { name: 'Hide 29 more', exact: true }).click();
    const selectedOther = list.getByRole('radio', { name: 'Variant: outline & Color: danger', exact: true });
    assert.equal(await selectedOther.getAttribute('aria-checked'), 'true');
    assert.equal(await selectedOther.getAttribute('tabindex'), '0');
    assert.equal(await list.getByRole('radio').count(), 8);
    assert.equal(await show.innerText(), 'Show 29 more');
    await selectedOther.press('Home');
    assert.equal(await list.getByRole('radio', { name: 'All states', exact: true }).getAttribute('aria-checked'), 'true');
    assert.deepEqual(await labels(), collapsed);
    assert.equal(await show.innerText(), 'Show 30 more');
    // Loading another Button resets expansion and matches that element's attributes.
    await canvas.getByPlaceholder('Filter variants…').fill('outline danger sm');
    await canvas.locator('button[data-pv-component-id="Button"][data-variant="outline"][data-color="danger"][data-size="sm"]:not([disabled]):not([data-icon-only="true"]):visible').first().click({ position: { x: 4, y: 4 } });
    await show.waitFor();
    const other = await labels();
    assert.ok(other.includes('Size: sm'));
    assert.ok(other.includes('Variant: outline & Color: danger'));
    assert.ok(!other.includes('Size: md'));
    assert.ok(!other.includes('Variant: solid & Color: primary'));
    assert.equal(await list.getByRole('radio', { name: 'All states', exact: true }).getAttribute('aria-checked'), 'true');
    if (screenshotDir) {
      await page.setViewportSize({ width: 1440, height: 1100 });
      await page.mouse.move(500, 100);
      await page.screenshot({ path: `${screenshotDir}/button-other-variant.png` });
    }
  } finally { await browser.close(); }
});

