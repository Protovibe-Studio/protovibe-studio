import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { test } from 'node:test';
import { chromium } from 'playwright';

// Run against the template dev server after building the plugin.
test('state combinations are explicit, exclusive, deduplicated, and temporary until styled', async () => {
  const source = new URL('../../../src/pages/DashboardPage.tsx', import.meta.url);
  const original = await readFile(source, 'utf8');
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(`${process.env.PROTOVIBE_TEST_URL || 'http://localhost:3000'}/protovibe.html`);
    const canvas = page.frameLocator('iframe').first();
    const target = canvas.locator('[data-pv-block="lf7bog"]');
    await target.click({ position: { x: 10, y: 80 } });
    const all = page.getByRole('radio', { name: 'All states', exact: true });
    await all.waitFor();
    assert.equal(await all.getAttribute('aria-checked'), 'true');
    assert.equal(await all.locator('[data-label-secondary]').count(), 0);
    const add = page.getByRole('button', { name: 'Add hover or variant modifier....', exact: true });
    const submit = page.getByRole('button', { name: 'Add state', exact: true });
    const dialog = page.getByRole('dialog', { name: 'Add state' });
    const screenshots = process.env.PROTOVIBE_SCREENSHOT_DIR;
    if (screenshots) await page.screenshot({ path: `${screenshots}/all-states.png` });
    await add.click();
    assert.equal(await submit.isDisabled(), true);
    await dialog.getByRole('button', { name: 'Hover', exact: true }).click();
    await dialog.getByRole('button', { name: '768', exact: true }).click();
    assert.equal(await all.getAttribute('aria-checked'), 'true');
    if (screenshots) await page.screenshot({ path: `${screenshots}/add-state.png` });
    await page.keyboard.press('Escape');
    assert.equal(await dialog.count(), 0);
    await add.click();
    assert.equal(await submit.isDisabled(), true);
    await dialog.getByRole('button', { name: 'Hover', exact: true }).click();
    await dialog.getByRole('button', { name: '768', exact: true }).click();
    await submit.click();
    const combination = page.getByRole('radio', { name: 'Hover & Md', exact: true });
    await combination.waitFor();
    assert.equal(await combination.getAttribute('aria-checked'), 'true');
    assert.equal(await all.getAttribute('aria-checked'), 'false');
    await combination.click();
    assert.equal(await combination.getAttribute('aria-checked'), 'true');
    if (screenshots) {
      await page.mouse.move(500, 100);
      await page.screenshot({ path: `${screenshots}/selected-state.png` });
    }
    await all.click();
    await add.click();
    await dialog.getByRole('button', { name: '768', exact: true }).click();
    await dialog.getByRole('button', { name: 'Hover', exact: true }).click();
    await submit.click();
    assert.equal(await combination.count(), 1);
    assert.equal(await page.locator('[role=radio][aria-checked=true]').count(), 1);
    await combination.press('Home');
    assert.equal(await all.getAttribute('aria-checked'), 'true');
    await page.reload();
    await target.click({ position: { x: 10, y: 80 } });
    await all.waitFor();
    assert.equal(await combination.count(), 0);
    assert.equal(await all.getAttribute('aria-checked'), 'true');
    await add.click();
    await dialog.getByRole('button', { name: 'Hover', exact: true }).click();
    await dialog.getByRole('button', { name: '768', exact: true }).click();
    await submit.click();
    const saved = page.waitForResponse(response => response.url().endsWith('/__update-source') && response.request().method() === 'POST');
    await page.getByTestId('essentials-mt').locator('input').fill('8');
    await page.getByTestId('essentials-mt').locator('input').press('Enter');
    assert.equal((await saved).ok(), true);
    assert.match(await readFile(source, 'utf8'), /md:hover:mt-8/);
    await page.reload();
    await target.click({ position: { x: 10, y: 80 } });
    await all.waitFor();
    const savedState = page.getByRole('radio', { name: /Md & Hover/ });
    await savedState.waitFor({ timeout: 5000 });
    assert.equal(await savedState.locator('[data-label-secondary]').innerText(), 'mt-8');
    assert.equal(await all.getAttribute('aria-checked'), 'true');
  } finally {
    await browser.close();
    await writeFile(source, original);
  }
});
