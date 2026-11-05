// Deterministic browser regressions for the real inspector controls. No dev
// server needed. Use PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH for a system Chromium.
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { build } from 'esbuild';
import { chromium } from 'playwright';

let browser, harness;
before(async () => {
  harness = (await build({
    bundle: true, write: false, format: 'iife',
    stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
      import React, { useState } from 'react';
      import { createRoot } from 'react-dom/client';
      import { ProtovibeProvider } from './src/ui/context/ProtovibeContext';
      import { AutocompleteDropdown } from './src/ui/components/visual/AutocompleteDropdown';
      function App() {
        const [value, setValue] = useState(window.initialValue);
        return <ProtovibeProvider>
          <button data-testid="before">Before</button>
          <AutocompleteDropdown testId="field" value={value} strictOptions={window.strictOptions}
            options={['0', '4', '8', '12', '16', '24', 'px'].map(val => ({ val }))}
            displayLabel={val => val === 'px' ? '1px' : val}
            onCommit={(val, prev, all) => {
              window.commits.push({ val, prev, all: !!all }); setValue(val);
            }} />
          <button data-testid="after">After</button>
        </ProtovibeProvider>;
      }
      createRoot(document.getElementById('root')).render(<App />);
    ` },
  })).outputFiles[0].text;
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
});
after(async () => { await browser?.close(); });

async function openPage(t, value = '12', strictOptions = false) {
  const page = await browser.newPage();
  t.after(() => page.close());
  await page.setContent('<div id="root" style="width:240px"></div>');
  await page.evaluate(({ value, strictOptions }) => {
    window.strictOptions = strictOptions;
    window.initialValue = value;
    window.commits = [];
    window.fetch = async () => new Response('[]', { headers: { 'Content-Type': 'application/json' } });
  }, { value, strictOptions });
  await page.addScriptTag({ content: harness });
  const input = page.getByTestId('field').locator('input');
  await input.waitFor();
  return { page, input };
}
async function committed(page, val, prev = '12', all = false) {
  await page.waitForFunction(() => window.commits.length > 0);
  assert.deepEqual(await page.evaluate(() => window.commits), [{ val, prev, all }]);
}

test('first mouse press selects before fast typing, even before mouse release', async t => {
  const { page, input } = await openPage(t);
  const box = await input.boundingBox();
  await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2);
  await page.mouse.down();
  await page.keyboard.type('1');
  await page.mouse.up();
  await page.keyboard.type('6');
  assert.equal(await input.inputValue(), '16');
  await page.keyboard.press('Enter');
  await committed(page, '16');
});

test('Tab focus selects the editable value after a display label changes', async t => {
  const { page, input } = await openPage(t, 'px');
  assert.equal(await input.inputValue(), '1px');
  await page.getByTestId('before').focus();
  await page.keyboard.press('Tab');
  await page.keyboard.type('37');
  await page.keyboard.press('Enter');
  await committed(page, '37', 'px');
});

test('Enter commits typed text even when another suggestion is hovered', async t => {
  const { page, input } = await openPage(t);
  await input.click();
  await page.keyboard.type('37');
  // A dropdown can move under the stationary pointer as typing scrolls it.
  await page.locator('[data-index]').filter({ has: page.locator('span').filter({ hasText: /^24$/ }) }).hover();
  await page.keyboard.press('Enter');
  await committed(page, '37');
});

test('a blur timeout cannot close a quickly refocused field or change its selection', async t => {
  const { page, input } = await openPage(t, 'px');
  await page.clock.install();
  await input.click();
  await input.evaluate(el => { el.blur(); el.focus(); });
  await page.clock.runFor(250);
  assert.equal(await input.inputValue(), 'px');
  assert.ok(await page.locator('[data-index]').count() > 0);
  await page.keyboard.type('37');
  await page.keyboard.press('Enter');
  await committed(page, '37', 'px');
});

test('normal click replaces, subsequent caret edits remain possible, and blur commits once', async t => {
  const { page, input } = await openPage(t);
  await input.click();
  await page.keyboard.type('37');
  await input.click({ position: { x: 225, y: 10 } });
  await page.keyboard.press('End');
  await page.keyboard.type('5');
  await page.keyboard.press('Tab');
  await committed(page, '375');
});

test('arrow navigation then Enter still selects an option and supports apply-to-all', async t => {
  const { page, input } = await openPage(t);
  await input.click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Control+Enter');
  await committed(page, '16', '12', true);
});

test('Escape discards typing without committing on blur', async t => {
  const { page, input } = await openPage(t);
  await input.click();
  await page.keyboard.type('37');
  await page.keyboard.press('Escape');
  assert.equal(await input.inputValue(), '12');
  assert.deepEqual(await page.evaluate(() => window.commits), []);
});


test('typing after arrow navigation commits all digits, not the previous choice', async t => {
  const { page, input } = await openPage(t);
  await input.click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Control+a');
  await page.keyboard.type('37');
  await page.keyboard.press('Enter');
  await committed(page, '37');
});

test('clicking a suggestion still commits that option exactly once', async t => {
  const { page, input } = await openPage(t);
  await input.click();
  await page.keyboard.type('37');
  await page.locator('[data-index]').filter({ has: page.locator('span').filter({ hasText: /^24$/ }) }).click();
  await committed(page, '24');
});

test('strict options discard invalid text on Enter as well as blur', async t => {
  const { page, input } = await openPage(t, '12', true);
  for (const key of ['Enter', 'Tab']) {
    await input.click();
    await page.keyboard.type('37');
    await page.keyboard.press(key);
    assert.equal(await input.inputValue(), '12');
    assert.deepEqual(await page.evaluate(() => window.commits), []);
  }
});
