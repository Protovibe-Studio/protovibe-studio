// Run: pnpm exec playwright install chromium && pnpm run test:specs-focus
// PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH may select an existing Chromium install.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { after, before, test } from 'node:test';
import { build } from 'esbuild';
import { chromium } from 'playwright';

let browser, server, origin;
before(async () => {
  const bundle = async (options) => (await build({
    bundle: true, write: false, format: 'iife', ...options,
  })).outputFiles[0].text;
  const bridge = await bundle({ entryPoints: ['src/ui/bridge.ts'] });
  const harness = await bundle({ stdin: {
    resolveDir: process.cwd(), loader: 'tsx', contents: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { SpecThumbnail } from './src/ui/components/specs/SpecThumbnail';
      import { InlineEditable } from './src/ui/components/specs/specsUi';
      const root = createRoot(document.getElementById('root'));
      window.saves = [];
      window.renderThumbnail = (props = {}) => root.render(<>
        <InlineEditable value="" multiline editing placeholder="Write the annotation…"
          onSave={text => window.saves.push(text)} />
        <SpecThumbnail src="/app" {...props} />
        <button id="elsewhere">Elsewhere</button>
      </>);
      window.renderThumbnail({ holdUntil: Date.now() + 1000 });
    `,
  } });
  server = createServer((req, res) => {
    const scripts = { '/bridge.js': bridge, '/harness.js': harness };
    if (scripts[req.url]) {
      res.setHeader('Content-Type', 'text/javascript');
      res.end(scripts[req.url]);
    } else if (req.url === '/app') {
      // Same ordering as the dev HTML: the classic bridge executes before the
      // app's deferred module. Both native and scripted autofocus are exercised.
      res.end(`<html><body><input id="autofocus" autofocus><input id="scripted">
        <script src="/bridge.js"></script>
        <script type="module">
          document.querySelector('#scripted').focus();
          document.body.dataset.mounted = 'true';
        </script></body></html>`);
    } else {
      res.end('<html><body><div id="root"></div><script src="/harness.js"></script></body></html>');
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

test('typing and caret survive delayed thumbnail mount, reload, and late app focus', async () => {
  const page = await browser.newPage();
  try {
    await page.goto(origin);
    const editor = page.locator('textarea');
    await editor.fill('A note');
    await editor.evaluate(el => el.setSelectionRange(2, 2));
    const thumbnail = page.frameLocator('[data-pv-thumbnail]');
    await thumbnail.locator('body[data-mounted="true"]').waitFor();
    assert.equal(await editor.evaluate(el => document.activeElement === el), true);
    assert.equal(await editor.evaluate(el => el.selectionStart), 2);
    await page.keyboard.type('long ');
    assert.equal(await editor.inputValue(), 'A long note');

    const previousFrame = await page.locator('[data-pv-thumbnail]').elementHandle();
    await page.evaluate(() => window.renderThumbnail({ reloadKey: 1 }));
    await page.waitForFunction(el => !el.isConnected, previousFrame);
    await thumbnail.locator('body[data-mounted="true"]').waitFor();
    await thumbnail.locator('#scripted').evaluate(el => el.focus());
    assert.equal(await editor.evaluate(el => document.activeElement === el), true);
    assert.equal(await editor.evaluate(el => el.selectionStart), 7);
    await page.keyboard.type('new ');
    assert.equal(await editor.inputValue(), 'A long new note');
    assert.deepEqual(await page.evaluate(() => window.saves), []);

    // Deliberately leaving the editor must still work and save normally.
    await page.locator('#elsewhere').click();
    await thumbnail.locator('#scripted').evaluate(el => el.focus());
    assert.equal(await page.locator('#elsewhere').evaluate(el => document.activeElement === el), true);
    assert.deepEqual(await page.evaluate(() => window.saves), ['A long new note']);
  } finally { await page.close(); }
});

for (const name of ['canvas', 'pv-spec-viewer']) {
  test(`${name} remains interactive`, async () => {
    const page = await browser.newPage();
    try {
      await page.goto(origin);
      await page.evaluate(name => {
        const frame = document.createElement('iframe');
        frame.name = name;
        frame.src = '/app';
        document.body.append(frame);
      }, name);
      const frame = page.frameLocator(`iframe[name="${name}"]`);
      await frame.locator('body[data-mounted="true"]').waitFor();
      await frame.locator('#scripted').fill('still interactive');
      assert.equal(await frame.locator('html').evaluate(el => el.inert), false);
      assert.equal(await frame.locator('#scripted').inputValue(), 'still interactive');
    } finally { await page.close(); }
  });
}
