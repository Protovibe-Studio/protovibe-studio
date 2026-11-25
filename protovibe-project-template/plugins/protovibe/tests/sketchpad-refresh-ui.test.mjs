import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { build } from 'esbuild';
import { chromium } from 'playwright';

let browser, bundle;
before(async () => {
  bundle = (await build({
    bundle: true, write: false, jsx: 'automatic',
    // Vite normally discovers project components. These sketchpads have no frames.
    define: { 'import.meta.glob': 'emptyGlob' },
    banner: { js: 'function emptyGlob() { return {}; }' },
    stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
      import { createRoot } from 'react-dom/client';
      import { SketchpadApp } from './src/sketchpads/components/SketchpadApp';
      createRoot(document.body).render(<SketchpadApp />);
    ` },
  })).outputFiles[0].text;
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
});
after(async () => { await browser?.close(); });

function registry(...ids) {
  return { sketchpads: ids.map(id => ({ id, name: id, frames: [] })) };
}

async function openList(t) {
  const page = await browser.newPage();
  t.after(() => page.close());
  await page.route('http://editor.test/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/') return route.fulfill({ contentType: 'text/html', body: '<body></body>' });
    return route.fulfill({ json: path === '/__sketchpad-list' ? registry('A', 'B') : {} });
  });
  await page.goto('http://editor.test/');
  await page.addScriptTag({ content: bundle });
  await page.getByTestId('toolbar-sketchpads').click();
  await page.getByTestId('sketchpad-B').waitFor();
  return page;
}

// Hold the actual refresh request until the test has exercised the pending UI.
async function startRefresh(page) {
  const { promise, resolve } = Promise.withResolvers();
  await page.route('**/__sketchpad-list', route => resolve(route), { times: 1 });
  await page.getByRole('button', { name: 'Refresh sketchpads' }).click();
  return promise;
}

test('refresh shows a spinner, preserves the list on failure, and retries', async t => {
  const page = await openList(t);
  const button = page.getByRole('button', { name: 'Refresh sketchpads' });
  await button.locator('.lucide-refresh-cw').waitFor();
  assert.equal(await button.innerText(), '');

  const request = await startRefresh(page);
  await page.waitForFunction(() => document.querySelector('button[aria-busy="true"] svg')?.getAnimations().length > 0);
  assert.ok(await button.isDisabled());
  await request.fulfill({ status: 500, json: { error: 'Failed to read registry' } });
  await page.getByRole('alert').waitFor();
  assert.ok(await page.getByTestId('sketchpad-B').isVisible());

  const retry = await startRefresh(page);
  await retry.fulfill({ json: registry('A', 'C') });
  await page.getByTestId('sketchpad-C').waitFor();
  assert.equal(await page.getByTestId('sketchpad-B').count(), 0);
  assert.equal(await page.getByRole('alert').count(), 0);
  await button.locator('.lucide-refresh-cw').waitFor();
  assert.ok(await button.isEnabled());
});

for (const scenario of [
  { name: 'keeps the newly selected sketchpad when it survives', ids: ['A', 'B', 'C'], expected: 'B' },
  { name: 'selects a remaining sketchpad when the new selection was removed', ids: ['A', 'C'], expected: 'A' },
]) {
  test(scenario.name + ' during refresh', async t => {
    const page = await openList(t);
    const request = await startRefresh(page);
    await page.getByTestId('sketchpad-B').click();
    const waitForSelection = id => page.waitForFunction(expected =>
      JSON.parse(localStorage.getItem('pv-sketchpad-view-state'))?.lastActiveSketchpadId === expected, id);
    await waitForSelection('B');
    await request.fulfill({ json: registry(...scenario.ids) });
    await page.getByTestId('toolbar-sketchpads').click();
    await page.getByTestId('sketchpad-C').waitFor();
    await waitForSelection(scenario.expected);
  });
}
