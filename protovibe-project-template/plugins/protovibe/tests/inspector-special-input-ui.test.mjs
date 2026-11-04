// Browser tests for the inspector's custom editors; no dev server required.
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { build } from 'esbuild';
import { chromium } from 'playwright';

let browser, harness;
before(async () => {
  harness = (await build({
    bundle: true, write: false, format: 'iife',
    plugins: [{ name: 'context-fixture', setup(build) {
      build.onResolve({ filter: /context\/ProtovibeContext$/ }, () => ({ path: 'context', namespace: 'fixture' }));
      build.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const useProtovibe = () => window.context;' }));
    } }],
    stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
      import React, { useState } from 'react';
      import { createRoot } from 'react-dom/client';
      import { flushSync } from 'react-dom';
      import { IconSearchInput } from './src/ui/components/IconSearchInput';
      import { ColorPicker } from './src/ui/components/ColorPicker';
      import { GradientPicker } from './src/ui/components/GradientPicker';
      import { ShadowEditor } from './src/ui/components/ShadowEditor';
      import { BlockEditor } from './src/ui/components/BlockEditor';
      const props = { tokenName: 'test', themeMode: 'light', anchorRect: new DOMRect(20, 20, 20, 20),
        onCancel: () => {}, onSave: value => window.saves.push(value) };
      function App() {
        const [icon, setIcon] = useState('mdi:old');
        if (window.kind === 'icon') return <IconSearchInput value={icon} onCommit={v => { window.saves.push(v); setIcon(v); }} />;
        if (window.kind === 'color') return <ColorPicker {...props} initialValue="oklch(0.5 0.1 200)" />;
        if (window.kind === 'gradient') return <GradientPicker {...props} initialValue="linear-gradient(90deg, #112233 0%, #ffffff 100%)" />;
        if (window.kind === 'shadow') return <ShadowEditor {...props} initialValue="0px 2px 4px 0px #112233" />;
        return <BlockEditor />;
      }
      const root = createRoot(document.getElementById('root'));
      window.updateContext = patch => {
        window.context = { ...window.context, ...patch };
        flushSync(() => root.render(<App />));
      };
      root.render(<App />);
    ` },
  })).outputFiles[0].text;
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
});
after(async () => { await browser?.close(); });

async function open(t, kind) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  t.after(() => page.close());
  await page.setContent('<div id="root" style="width:300px"></div><button data-testid="outside" style="position:absolute;right:10px">Outside</button>');
  await page.evaluate(kind => {
    window.kind = kind;
    window.saves = [];
    window.requests = [];
    const target = document.createElement('span');
    target.setAttribute('data-pv-block', 'text01');
    window.context = { currentBaseTarget: target, activeData: { code: '<span>Old text</span>', file: 'fixture.tsx' },
      activeSourceId: 'text01', runLockedMutation: fn => fn(), isMutationLocked: false, isLoading: false };
    window.fetch = async (url, options) => {
      if (url.includes('/search?')) {
        if (!url.includes('mdi%3Aold')) return new Promise(() => {}); // Keep the new query pending.
        return new Response(JSON.stringify({ icons: ['mdi:old-result', 'mdi:other-result'] }));
      }
      if (url.endsWith('.svg?color=white')) return new Response('<svg xmlns="http://www.w3.org/2000/svg"/>');
      window.requests.push({ url, body: JSON.parse(options.body) });
      return new Response('{}');
    };
  }, kind);
  await page.addScriptTag({ content: harness });
  return page;
}

for (const action of ['ArrowDown', 'hover']) {
  test(`icon search: ${action} cannot commit results from the previous query`, async t => {
    const page = await open(t, 'icon');
    const input = page.getByTestId('icon-search');
    await input.click();
    await page.getByTestId('icon-option-mdi:old-result').waitFor();
    await page.keyboard.type('mdi:new');
    if (action === 'hover') await page.getByTestId('icon-option-mdi:old-result').hover();
    else await page.keyboard.press(action);
    await page.keyboard.press('Enter');
    assert.deepEqual(await page.evaluate(() => window.saves), ['mdi:new']);
  });
}

test('icon search: clicking a result commits once without reverting on blur', async t => {
  const page = await open(t, 'icon');
  await page.getByTestId('icon-search').click();
  await page.getByTestId('icon-option-mdi:old-result').click();
  await page.getByTestId('icon-results').waitFor({ state: 'hidden' });
  assert.deepEqual(await page.evaluate(() => window.saves), ['mdi:old-result']);
});

test('icon search: refocus cancels the old close operation', async t => {
  const page = await open(t, 'icon');
  await page.clock.install();
  const input = page.getByTestId('icon-search');
  await input.click();
  await input.evaluate(el => { el.blur(); el.focus(); });
  await page.clock.runFor(250);
  assert.equal(await page.getByTestId('icon-results').isVisible(), true);
});

for (const [field, text] of [['color-channel-l', '16'], ['color-channel-h', '16'], ['color-conversion-hex', '#abcdef']]) {
  test(`color picker: ${field} replaces the value without losing characters`, async t => {
    const page = await open(t, 'color');
    const input = page.getByTestId(field);
    await input.click();
    await page.keyboard.type(text);
    assert.equal(await input.inputValue(), text);
    await page.keyboard.press('Enter');
    await page.getByTestId('color-save').click();
    const saved = await page.evaluate(() => window.saves);
    assert.equal(saved.length, 1);
    if (field === 'color-channel-l') assert.match(saved[0], /^oklch\(16% /);
    if (field === 'color-channel-h') assert.match(saved[0], / 16\)/);
    if (field === 'color-conversion-hex') assert.equal(await input.inputValue(), '#abcdef');
  });
}

test('gradient stop: fast typing replaces the color and normalizes bare hex on Enter', async t => {
  const page = await open(t, 'gradient');
  const input = page.getByTestId('gradient-stop-0');
  await input.click();
  await page.keyboard.type('abcdef');
  await page.keyboard.press('Enter');
  await page.getByTestId('gradient-save').click();
  assert.match((await page.evaluate(() => window.saves))[0], /#abcdef 0%/);
});

test('shadow color: all six typed hex digits survive intermediate invalid values', async t => {
  const page = await open(t, 'shadow');
  const input = page.getByTestId('shadow-color');
  await input.click();
  await page.keyboard.press('Control+a');
  await page.keyboard.type('abcdef');
  assert.equal(await input.inputValue(), 'abcdef');
  await page.keyboard.press('Enter');
  assert.equal(await input.inputValue(), '#abcdef');
  await page.getByTestId('shadow-save').click();
  assert.match((await page.evaluate(() => window.saves))[0], /171,\s*205,\s*239|#abcdef/i);
});

for (const kind of ['gradient', 'shadow']) {
  test(`${kind} custom CSS preserves rapid replacement and multiline editing`, async t => {
    const page = await open(t, kind);
    const input = page.getByTestId(`${kind}-css`);
    await input.click();
    await page.keyboard.press('Control+a');
    const value = kind === 'gradient' ? 'linear-gradient(red, blue)' : '0 16px 6px red';
    await page.keyboard.type(value);
    await page.keyboard.press('Enter'); // These are intentionally multiline editors.
    await page.getByTestId(`${kind}-save`).click();
    assert.equal((await page.evaluate(() => window.saves))[0], value + '\n');
  });
}

test('rich text: delayed focus must not reselect the first typed character', async t => {
  const page = await open(t, 'text');
  await page.clock.install();
  const input = page.getByTestId('text-content-editor');
  await input.click();
  await page.keyboard.press('Control+a');
  await page.evaluate(() => window.dispatchEvent(new Event('pv-focus-text-content')));
  await page.keyboard.type('1');
  await page.clock.runFor(100);
  await page.keyboard.type('6');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.requests.some(r => r.url === '/__block-action'));
  assert.equal(await page.evaluate(() => window.requests.find(r => r.url === '/__block-action').body.text), '16');
});

test('rich text: ordinary caret insertion preserves surrounding text', async t => {
  const page = await open(t, 'text');
  const input = page.getByTestId('text-content-editor');
  await input.click();
  await page.keyboard.press('End');
  await page.keyboard.type('16');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.requests.some(r => r.url === '/__block-action'));
  assert.equal(await page.evaluate(() => window.requests.find(r => r.url === '/__block-action').body.text), 'Old text16');
});


test('icon search: keyboard navigation still selects a current result', async t => {
  const page = await open(t, 'icon');
  await page.getByTestId('icon-search').click();
  await page.getByTestId('icon-option-mdi:old-result').waitFor();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  assert.deepEqual(await page.evaluate(() => window.saves), ['mdi:old-result']);
});

test('icon search: Escape discards typing without saving during blur', async t => {
  const page = await open(t, 'icon');
  await page.getByTestId('icon-search').click();
  await page.keyboard.type('mdi:new');
  await page.keyboard.press('Escape');
  assert.deepEqual(await page.evaluate(() => window.saves), []);
  assert.equal(await page.getByTestId('icon-search').inputValue(), 'mdi:old');
});

test('icon search: stale results cannot be clicked while searching', async t => {
  const page = await open(t, 'icon');
  await page.getByTestId('icon-search').click();
  await page.getByTestId('icon-option-mdi:old-result').waitFor();
  await page.keyboard.type('mdi:new');
  await page.getByTestId('icon-option-mdi:old-result').click();
  assert.deepEqual(await page.evaluate(() => window.saves), []);
  await page.keyboard.press('Enter');
  assert.deepEqual(await page.evaluate(() => window.saves), ['mdi:new']);
});

test('color channel: typing across mouse release retains both digits', async t => {
  const page = await open(t, 'color');
  const input = page.getByTestId('color-channel-l');
  await input.waitFor();
  const box = await input.boundingBox();
  await page.mouse.move(box.x + box.width - 5, box.y + box.height / 2);
  await page.mouse.down();
  await page.keyboard.type('1');
  await page.mouse.up();
  await page.keyboard.type('6');
  assert.equal(await input.inputValue(), '16');
  await page.keyboard.press('Enter');
  await page.getByTestId('color-save').click();
  assert.match((await page.evaluate(() => window.saves))[0], /^oklch\(16% /);
});


test('rich text: a late source refresh cannot clear or replace an active draft', async t => {
  const page = await open(t, 'text');
  const input = page.getByTestId('text-content-editor');
  await input.click();
  await page.keyboard.press('Control+a');
  await page.keyboard.type('1');
  await page.evaluate(() => window.updateContext({ isLoading: true }));
  assert.equal(await input.innerText(), '1');
  await page.evaluate(() => window.updateContext({ isLoading: false, activeData: { ...window.context.activeData, code: '<span>Refreshed text</span>' } }));
  await page.keyboard.type('6');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.requests.some(r => r.url === '/__block-action'));
  assert.equal(await page.evaluate(() => window.requests.find(r => r.url === '/__block-action').body.text), '16');
});

test('rich text: source refresh preserves the draft and selection while editing a link', async t => {
  const page = await open(t, 'text');
  const input = page.getByTestId('text-content-editor');
  await input.click();
  await page.keyboard.press('Control+a');
  await page.keyboard.type('Draft text');
  await page.keyboard.press('Control+a');
  await page.locator('button[data-tooltip="Link"]').click();
  const url = page.getByPlaceholder('https://example.com');
  await url.fill('https://example.com');
  await page.evaluate(() => window.updateContext({ isLoading: true }));
  await page.evaluate(() => window.updateContext({ isLoading: false, activeData: { ...window.context.activeData, code: '<span>Refreshed text</span>' } }));
  assert.equal(await input.innerText(), 'Draft text');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.waitForFunction(() => window.requests.some(r => r.url === '/__block-action'));
  const saved = await page.evaluate(() => window.requests.find(r => r.url === '/__block-action').body.text);
  assert.match(saved, /<a href="https:\/\/example.com\/?">Draft text<\/a>/);
});

test('icon search: cancelling a pending search cannot repopulate an empty refocused field', async t => {
  const page = await open(t, 'icon');
  await page.clock.install();
  const input = page.getByTestId('icon-search');
  await input.click();
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Enter');
  await input.click();
  await page.keyboard.type('mdi:old');
  await page.keyboard.press('Escape');
  await input.click();
  await page.clock.runFor(1000);
  assert.equal(await input.inputValue(), '');
  assert.equal(await page.getByTestId('icon-results').locator('[data-index]').count(), 0);
});
