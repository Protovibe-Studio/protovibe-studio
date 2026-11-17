// Real editor + app, with an image held pending after React renders.
// PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node --test tests/app-preview-loading.test.mjs
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const templateRoot = fileURLToPath(new URL('../../../', import.meta.url));
let server, browser, origin;
before(async () => {
  process.chdir(templateRoot);
  server = await createServer({ server: { port: 0, host: '127.0.0.1' } });
  await server.listen();
  origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
});
after(async () => {
  await browser?.close();
  await server?.close();
});

for (const missReadyMessage of [false, true]) {
  test(missReadyMessage
    ? 'a missed readiness message cannot hide or block rendered content'
    : 'rendered content dismisses the spinner before a delayed iframe load', async t => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    let releaseHtml, releaseImage;
    const htmlGate = new Promise(resolve => { releaseHtml = resolve; });
    const imageGate = new Promise(resolve => { releaseImage = resolve; });
    t.after(async () => { releaseHtml(); releaseImage(); await page.close(); });
    await page.route('**/__cloudflare-auth-status*', route => route.fulfill({ json: {} }));
    if (missReadyMessage) await page.addInitScript(() => {
      if (window === window.top) window.addEventListener('message', event => {
        if (event.data?.type === 'PV_APP_PREVIEW_READY') event.stopImmediatePropagation();
      });
    });
    let imageRequested = false;
    await page.route('**/__slow-preview-image', async route => {
      imageRequested = true;
      await imageGate;
      await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>' });
    });
    await page.route(url => url.origin === origin && url.pathname === '/', async route => {
      await htmlGate;
      const response = await route.fetch();
      // Infrastructure is excluded from the content-ready check. This image
      // delays window.load while the real template app can render normally.
      const body = (await response.text()).replace('</body>', '<img data-pv-ui hidden src="/__slow-preview-image" alt=""></body>');
      await route.fulfill({ response, body });
    });
    await page.goto(`${origin}/protovibe.html`, { waitUntil: 'domcontentloaded' });
    const loading = page.getByRole('status', { name: 'Loading app', exact: true });
    await loading.waitFor();
    releaseHtml();
    const frame = await (await page.getByTestId('app-preview').elementHandle()).contentFrame();
    await frame.locator('#root > *').first().waitFor();
    assert.ok(imageRequested);
    assert.notEqual(await frame.evaluate(() => document.readyState), 'complete');
    if (missReadyMessage) {
      assert.equal(await loading.isVisible(), true);
      assert.deepEqual(await loading.evaluate(el => {
        const style = getComputedStyle(el);
        return { background: style.backgroundColor, pointerEvents: style.pointerEvents };
      }), { background: 'rgba(0, 0, 0, 0)', pointerEvents: 'none' });
    } else {
      await loading.waitFor({ state: 'detached' });
    }
    // Put a native control directly beneath the spinner to prove ordinary
    // pointer interaction works even if the readiness message was missed.
    await frame.evaluate(() => {
      const button = document.createElement('button');
      button.dataset.pvUi = '';
      button.id = 'preview-interaction-check';
      button.textContent = 'Check interaction';
      button.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:10000';
      button.onclick = () => { button.textContent = 'Interaction succeeded'; };
      document.body.append(button);
    });
    await frame.locator('#preview-interaction-check').click();
    assert.equal(await frame.locator('#preview-interaction-check').textContent(), 'Interaction succeeded');
    assert.notEqual(await frame.evaluate(() => document.readyState), 'complete');
    await frame.locator('#preview-interaction-check').evaluate(el => el.remove());
    if (!missReadyMessage && process.env.PV_LOADING_SCREENSHOTS_DIR) {
      await mkdir(process.env.PV_LOADING_SCREENSHOTS_DIR, { recursive: true });
      await page.screenshot({ path: path.join(process.env.PV_LOADING_SCREENSHOTS_DIR, 'rendered-before-load.png') });
    }
    if (!missReadyMessage) {
      // Navigate before the original load ever finishes. The next document
      // should show its own spinner, then dismiss it on content again.
      let releaseModule;
      const moduleGate = new Promise(resolve => { releaseModule = resolve; });
      t.after(() => releaseModule());
      await page.route('**/src/App.tsx', async route => {
        await moduleGate;
        await route.continue();
      });
      const nextModule = page.waitForRequest('**/src/App.tsx');
      await frame.evaluate(() => { location.href = '/?navigation-before-load'; });
      await nextModule;
      await loading.waitFor();
      releaseModule();
      await frame.locator('#root > *').first().waitFor();
      await loading.waitFor({ state: 'detached' });
      assert.notEqual(await frame.evaluate(() => document.readyState), 'complete');
    }
    releaseImage();
    await frame.waitForLoadState('load');
    await loading.waitFor({ state: 'detached' });
  });
}
