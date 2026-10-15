// Run after pnpm run build. Select an installed browser with
// PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, or run pnpm exec playwright install chromium.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { after, before, test } from 'node:test';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { protovibePlugin } from '../dist/index.js';

let browser, server, origin, overlayTags;
const overlay = protovibePlugin().find(plugin => plugin.name === 'vite-plugin-protovibe-lofi');
const tagsFor = path => overlay.transformIndexHtml.handler('', { path });

async function newPage(options) {
  const page = await browser.newPage(options);
  // Keep the tests independent of Google's availability. Verify the real
  // stylesheet URL and loading behavior without bundling a test font.
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({
    contentType: 'text/css', body: ':root { --google-font-stylesheet-loaded: 1; }',
  }));
  return page;
}

before(async () => {
  overlayTags = tagsFor('/index.html').map(tag =>
    `<${tag.tag} id="${tag.attrs.id}">${tag.children}</${tag.tag}>`).join('\n');
  const helpers = (await build({
    entryPoints: ['src/lofi/preview-mode.ts'], bundle: true, write: false,
    format: 'iife', globalName: 'preview',
  })).outputFiles[0].text;
  const themeManager = readFileSync('../../public/theme-manager.js', 'utf8');
  server = createServer((_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(`<!doctype html><html><head><script>${themeManager}</script>${overlayTags}
      <style>
        [data-theme="light"] { --foreground-default: purple; --border-default: pink; --background-default: ivory; }
        [data-theme="dark"] { --foreground-default: white; --border-default: gray; --background-default: black; }
        :root { --color-foreground-default: var(--foreground-default); --color-border-default: var(--border-default); --font-sans: Arial; }
        body { color: var(--color-foreground-default); background: var(--background-default); font-family: Arial; }
        #sample { border: 2px solid var(--color-border-default); border-radius: 12px; padding: 16px; box-shadow: 1px 2px 3px gray; }
        .font-sans { font-family: var(--font-sans); }
      </style></head><body>
        <div id="sample" class="font-sans">Zażółć gęślą jaźń <b>Prototype</b></div>
        <input value="Form field"><button>Action</button>
        <script>${helpers}</script>
      </body></html>`);
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

test('lofi assets are available in app and canvas HTML, isolated from editor and specs UI', () => {
  for (const path of ['/index.html', '/components.html', '/sketchpad.html']) {
    assert.equal(tagsFor(path).length, 2);
  }
  for (const path of ['/protovibe.html', '/protovibe.html?tab=app', '/specs.html']) {
    assert.deepEqual(tagsFor(path), []);
  }
  assert.doesNotMatch(overlayTags, /data:font|@font-face|url\(\.\/fonts\//);
  assert.ok(Buffer.byteLength(overlayTags) < 8_000, 'inactive overlay should not embed font binaries');
});

test('URL lofi overrides stored dark without modifying the preference; back/forward restores modes', async () => {
  const page = await newPage();
  try {
    await page.addInitScript(() => localStorage.setItem('user-theme-preference', 'dark'));
    await page.goto(`${origin}/?page=dashboard&lofi=true#section`);
    assert.deepEqual(await page.evaluate(() => [document.documentElement.dataset.theme, document.documentElement.dataset.pvLofi, localStorage.getItem('user-theme-preference')]), ['light', 'true', 'dark']);
    await page.evaluate(() => history.pushState({}, '', '?page=dashboard'));
    assert.deepEqual(await page.evaluate(() => [document.documentElement.dataset.theme, document.documentElement.hasAttribute('data-pv-lofi')]), ['dark', false]);
    await page.goBack();
    await page.waitForFunction(() => document.documentElement.dataset.pvLofi === 'true');
    await page.goForward();
    await page.waitForFunction(() => !document.documentElement.hasAttribute('data-pv-lofi'));
    await page.evaluate(() => history.replaceState({}, '', '?lofi=false'));
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
  } finally { await page.close(); }
});

test('overlay changes text, borders and fonts, preserves backgrounds and geometry, and fully switches off', async () => {
  const page = await newPage({ colorScheme: 'light' });
  try {
    await page.goto(origin);
    const styles = () => page.locator('#sample').evaluate(el => {
      const s = getComputedStyle(el);
      return { color: s.color, border: s.borderColor, width: s.borderWidth, radius: s.borderRadius, padding: s.padding, shadow: s.boxShadow, font: s.fontFamily, background: getComputedStyle(document.body).backgroundColor };
    });
    const light = await styles();
    await page.evaluate(() => preview.applyPreviewMode(document, 'lofi'));
    const lofi = await styles();
    assert.equal(lofi.color, 'rgb(17, 17, 17)');
    assert.equal(lofi.border, 'rgb(0, 0, 0)');
    assert.match(lofi.font, /Balsamiq Sans/);
    for (const key of ['background', 'width', 'radius', 'padding', 'shadow']) assert.equal(lofi[key], light[key], key);
    for (const selector of ['body', 'input', 'button', 'b']) {
      assert.match(await page.locator(selector).evaluate(el => getComputedStyle(el).fontFamily), /Balsamiq Sans/);
    }
    // Token live previews must not paint over the fixed lofi palette.
    await page.addStyleTag({ content: '[data-theme="light"] { --foreground-default: red !important; }' });
    assert.equal((await styles()).color, lofi.color);
    await page.evaluate(() => document.head.lastElementChild.remove());
    await page.evaluate(() => preview.applyPreviewMode(document, 'dark'));
    assert.equal((await styles()).background, 'rgb(0, 0, 0)');
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-pv-lofi')), false);
    await page.evaluate(() => preview.applyPreviewMode(document, 'light'));
    assert.deepEqual(await styles(), light);
  } finally { await page.close(); }
});

test('editor selection overrides the URL, and active lofi overrides app theme changes', async () => {
  const page = await newPage();
  try {
    await page.goto(`${origin}/?lofi=true`);
    await page.evaluate(() => preview.applyPreviewMode(document, 'dark'));
    await page.evaluate(() => history.pushState({}, '', '?lofi=true&page=other'));
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
    await page.evaluate(() => preview.applyPreviewMode(document, 'lofi'));
    await page.evaluate(() => ThemeManager.setTheme('dark'));
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
    await page.reload();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.pvLofi), 'true');
  } finally { await page.close(); }
});

test('light/dark editor selection does not lock the app theme on changes or navigation', async () => {
  const page = await newPage();
  try {
    await page.goto(origin);
    for (const [editor, app] of [['light', 'dark'], ['dark', 'light']]) {
      await page.evaluate(mode => preview.applyPreviewMode(document, mode), editor);
      await page.evaluate(mode => ThemeManager.setTheme(mode), app);
      await page.evaluate(() => history.pushState({}, '', '?page=other'));
      await page.evaluate(() => history.replaceState({}, '', '?page=team'));
      await page.goBack();
      assert.deepEqual(await page.evaluate(() => [
        document.documentElement.dataset.theme,
        ThemeManager.getActiveTheme(),
        localStorage.getItem('user-theme-preference'),
        document.documentElement.hasAttribute('data-pv-lofi'),
      ]), [app, app, app, false]);
    }
    // Also cover returning from lofi before using the prototype's switch.
    await page.evaluate(() => {
      preview.applyPreviewMode(document, 'lofi');
      preview.applyPreviewMode(document, 'light');
      ThemeManager.setTheme('dark');
    });
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
  } finally { await page.close(); }
});

test('leaving URL lofi restores the preference changed while the overlay was active', async () => {
  const page = await newPage({ colorScheme: 'light' });
  try {
    await page.goto(`${origin}/?page=team&lofi=true`);
    await page.evaluate(() => ThemeManager.setTheme('dark'));
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
    await page.evaluate(() => history.pushState({}, '', '?page=team'));
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
    await page.goBack();
    await page.waitForFunction(() => document.documentElement.dataset.pvLofi === 'true');
    await page.evaluate(() => ThemeManager.setTheme('light'));
    await page.goForward();
    await page.waitForFunction(() => !document.documentElement.hasAttribute('data-pv-lofi'));
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light');

    // Auto must restore its resolved system theme, not the original light snapshot.
    await page.evaluate(() => history.replaceState({}, '', '?lofi=true'));
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.evaluate(() => {
      ThemeManager.setTheme('auto');
      history.replaceState({}, '', '/');
    });
    assert.deepEqual(await page.evaluate(() => [
      document.documentElement.dataset.theme, ThemeManager.getActiveTheme(),
      localStorage.getItem('user-theme-preference'),
    ]), ['dark', 'dark', 'auto']);
  } finally { await page.close(); }
});

test('Google Fonts is loaded once on first lofi activation, never in normal light/dark', async () => {
  const page = await newPage();
  const requests = [];
  page.on('request', request => {
    if (request.url().startsWith('https://fonts.googleapis.com/')) requests.push(request.url());
  });
  try {
    await page.goto(origin);
    await page.evaluate(() => {
      preview.applyPreviewMode(document, 'dark');
      ThemeManager.setTheme('light');
      history.pushState({}, '', '?page=team');
    });
    assert.equal(await page.locator('#pv-lofi-font').count(), 0);
    assert.deepEqual(requests, []);

    await page.evaluate(() => preview.applyPreviewMode(document, 'lofi'));
    await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--google-font-stylesheet-loaded').trim() === '1');
    const fontUrl = 'https://fonts.googleapis.com/css2?family=Balsamiq+Sans:wght@400;700&display=swap';
    assert.deepEqual(requests, [fontUrl]);
    await page.evaluate(() => {
      preview.applyPreviewMode(document, 'light');
      preview.applyPreviewMode(document, 'lofi');
      preview.applyPreviewMode(document, 'dark');
      preview.applyPreviewMode(document, 'lofi');
    });
    assert.equal(await page.locator('link#pv-lofi-font[rel="stylesheet"]').count(), 1);
    assert.deepEqual(requests, [fontUrl]);

    await page.goto(`${origin}/?lofi=true`);
    await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--google-font-stylesheet-loaded').trim() === '1');
    assert.equal(await page.locator('#pv-lofi-font').getAttribute('href'), fontUrl);
  } finally { await page.close(); }
});

test('share URL preserves deep link state and removes stale/duplicate lofi parameters', async () => {
  const page = await newPage();
  try {
    await page.goto(origin);
    const links = await page.evaluate(() => {
      const url = new URL('https://prototype.example/path?page=team&dialog=true&lofi=false&lofi=true#details');
      return [preview.withLofiParam(url, true), preview.withLofiParam(url, false)];
    });
    assert.equal(links[0], 'https://prototype.example/path?page=team&dialog=true&lofi=true#details');
    assert.equal(links[1], 'https://prototype.example/path?page=team&dialog=true#details');
  } finally { await page.close(); }
});
