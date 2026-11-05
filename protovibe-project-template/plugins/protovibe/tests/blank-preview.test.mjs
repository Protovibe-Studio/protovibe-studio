// Real Vite server + editor shell + Chromium. Run from the plugin directory:
// PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:blank-preview
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
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

test('recovers an empty App tab after a transient missing export', async t => {
  const page = await browser.newPage();
  t.after(() => page.close());
  await page.route('**/__cloudflare-auth-status*', route => route.fulfill({ json: {} }));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let appRequests = 0;
  // Model a multi-file edit/sync race: main imports App's default export,
  // but the first response is an intermediate version without that export.
  await page.route('**/src/App.tsx', async route => {
    appRequests++;
    if (appRequests === 1) {
      await route.fulfill({ contentType: 'text/javascript', body: 'export const interim = true;' });
    } else {
      await route.continue();
    }
  });
  await page.goto(`${origin}/protovibe.html`);
  const canvas = page.frameLocator('[data-testid="app-preview"]');
  await page.waitForFunction(() => document.querySelector('iframe[src="/"]')?.contentDocument?.readyState === 'complete');
  assert.ok(errors.some(error => error.includes("does not provide an export named 'default'")), errors.join('\n'));
  assert.equal(await canvas.locator('#root').innerHTML(), '');
  assert.equal(await canvas.locator('vite-error-overlay').count(), 0);
  // This fails before the fix: the empty root persists until manual refresh.
  await canvas.locator('#root > *').first().waitFor({ timeout: 12_000 });
  assert.equal(appRequests, 2);
});

const missingExport = 'export const interim = true;';
const readyApp = 'export default function App() { return "Recovery fixture ready"; }';
const emptyApp = 'export default function App() { return null; }';

async function openFixture(t, source, { path = '/', init } = {}) {
  const page = await browser.newPage();
  t.after(() => page.close());
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let requests = 0;
  await page.route('**/src/App.tsx', route => route.fulfill({
    contentType: 'text/javascript', body: source(++requests),
  }));
  // Keep unrelated publishing/auth work out of this preview test.
  await page.route('**/__cloudflare-auth-status*', route => route.fulfill({ json: {} }));
  if (path !== '/') await page.addInitScript(path => {
    if (window === window.top) localStorage.setItem('pv-app-iframe-path', path);
  }, path);
  if (init) await init(page);
  await page.goto(`${origin}/protovibe.html`);
  const element = page.getByTestId('app-preview');
  await element.waitFor();
  const frame = await (await element.elementHandle()).contentFrame();
  await frame.waitForLoadState('load');
  return { page, frame, errors, requests: () => requests };
}

async function staysAt(fixture, count) {
  // Longer than the settling delay plus an HTTP probe and another delay.
  await fixture.page.waitForTimeout(4_000);
  assert.equal(fixture.requests(), count);
}

test('a permanent missing export gets only one retry across document reloads', async t => {
  const fixture = await openFixture(t, () => missingExport);
  await fixture.page.waitForFunction(() => !!document.querySelector('[data-testid="app-preview"]')
    ?.contentWindow.sessionStorage.getItem('pv-blank-preview-retry:/'));
  await staysAt(fixture, 2);
  assert.equal(await fixture.frame.locator('#root').innerHTML(), '');
  assert.equal(fixture.errors.filter(e => e.includes('does not provide an export')).length, 2);
});

test('a URL change before a module error still gets only one retry', async t => {
  const fixture = await openFixture(t, () => `
    history.replaceState({}, '', '/?view=normalized');
    void import('/__missing-module-for-test.js');
    ${emptyApp}
  `);
  await fixture.page.waitForFunction(() => !!document.querySelector('[data-testid="app-preview"]')
    ?.contentWindow.sessionStorage.getItem('pv-blank-preview-retry:/?view=normalized'));
  await staysAt(fixture, 2);
  assert.equal(new URL(fixture.frame.url()).search, '?view=normalized');
});

test('an intentionally empty app without an error does not refresh', async t => {
  const fixture = await openFixture(t, () => emptyApp);
  assert.equal(await fixture.frame.locator('#root').innerHTML(), '');
  await staysAt(fixture, 1);
});

test('a module error in a rendered app does not refresh it', async t => {
  const fixture = await openFixture(t, () => readyApp);
  await fixture.frame.waitForFunction(() => document.getElementById('root').textContent.includes('Recovery fixture ready'));
  await fixture.frame.evaluate(() => { void import('/__missing-module-for-test.js'); });
  await staysAt(fixture, 1);
  assert.ok(fixture.errors.some(e => e.includes('dynamically imported module')));
});

test('an unrelated uncaught runtime error plus an empty root does not refresh', async t => {
  const fixture = await openFixture(t, () => `setTimeout(() => { throw new Error('Business logic bug'); }, 0); ${emptyApp}`);
  await staysAt(fixture, 1);
  assert.ok(fixture.errors.includes('Business logic bug'));
});

test('a rejected dynamic import plus an empty root recovers without reloading the shell or losing the URL', async t => {
  const path = '/?view=recovery#details';
  const fixture = await openFixture(t, n => n === 1
    ? `void import('/__missing-module-for-test.js'); ${emptyApp}` : readyApp, { path });
  await fixture.page.evaluate(() => { window.shellIdentity = 'same shell'; });
  await fixture.frame.waitForFunction(() => document.getElementById('root').textContent.includes('Recovery fixture ready'));
  assert.equal(fixture.requests(), 2);
  assert.equal(new URL(fixture.frame.url()).search + new URL(fixture.frame.url()).hash, '?view=recovery#details');
  assert.equal(await fixture.page.evaluate(() => window.shellIdentity), 'same shell');
});

test('a render during a pending readiness probe cancels recovery', async t => {
  let release;
  const fixture = await openFixture(t, () => missingExport, { init: async page => {
    await page.route('**/__hmr-activity', async route => {
      await new Promise(resolve => { release = resolve; });
      await route.fulfill({ json: { msSinceLastChange: null } });
    });
  } });
  const deadline = Date.now() + 10_000;
  while (!release && Date.now() < deadline) await fixture.page.waitForTimeout(50);
  assert.ok(release, 'recovery should probe server readiness');
  await fixture.frame.evaluate(() => { document.getElementById('root').textContent = 'Recovered without reload'; });
  release();
  await staysAt(fixture, 1);
});

test('a busy or unavailable server delays recovery until it is ready', async t => {
  let activity = 0;
  let status = 200;
  const fixture = await openFixture(t, n => n === 1 ? missingExport : readyApp, { init: async page => {
    await page.route('**/__hmr-activity', route => route.fulfill({ status, json: { msSinceLastChange: activity } }));
  } });
  await staysAt(fixture, 1);
  activity = 10_000;
  status = 503;
  await staysAt(fixture, 1);
  status = 200;
  await fixture.frame.waitForFunction(() => document.getElementById('root').textContent.includes('Recovery fixture ready'));
  assert.equal(fixture.requests(), 2);
});

test('unavailable session storage disables automatic retry', async t => {
  const fixture = await openFixture(t, () => missingExport, { init: page => page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('Storage disabled'); } });
  }) });
  await staysAt(fixture, 1);
});

test('a healthy recovery re-arms the budget for a later independent edit', async t => {
  const fixture = await openFixture(t, n => n % 2 ? missingExport : readyApp);
  await fixture.frame.waitForFunction(() => document.getElementById('root').textContent.includes('Recovery fixture ready'));
  await fixture.frame.waitForFunction(() => sessionStorage.getItem('pv-blank-preview-retry:/') === null);
  await fixture.frame.goto(`${origin}/`);
  await fixture.frame.waitForFunction(() => document.getElementById('root').textContent.includes('Recovery fixture ready'));
  assert.equal(fixture.requests(), 4);
});

test('spec thumbnail frames do not auto-retry module errors', async t => {
  const fixture = await openFixture(t, () => missingExport, { init: page => page.addInitScript(() => {
    if (window !== window.top) window.name = 'pv-spec-thumbnail';
  }) });
  await staysAt(fixture, 1);
});

test('a Vite overlay keeps ownership of compile-error recovery', async t => {
  const fixture = await openFixture(t, () => missingExport);
  server.ws.send({ type: 'error', err: { message: 'Compile error fixture', stack: '' } });
  await fixture.frame.locator('vite-error-overlay').waitFor({ state: 'attached' });
  await staysAt(fixture, 1);
});


test('content outside an empty root (such as a portal) prevents recovery', async t => {
  const fixture = await openFixture(t, () => `
    const portal = document.createElement('div');
    portal.textContent = 'App rendered outside root';
    document.body.appendChild(portal);
    void import('/__missing-module-for-test.js');
    ${emptyApp}
  `);
  await staysAt(fixture, 1);
  assert.ok(fixture.errors.some(e => e.includes('dynamically imported module')));
});

test('text content outside an empty root prevents recovery', async t => {
  const fixture = await openFixture(t, () => `
    document.body.appendChild(document.createTextNode('App fallback content'));
    void import('/__missing-module-for-test.js');
    ${emptyApp}
  `);
  await staysAt(fixture, 1);
  assert.ok(fixture.errors.some(e => e.includes('dynamically imported module')));
});
