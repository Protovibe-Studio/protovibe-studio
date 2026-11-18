// Real Vite server + editor shell + Chromium. Run from the plugin directory:
// PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:blank-preview
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const templateRoot = fileURLToPath(new URL('../../../', import.meta.url));
// Opt-in screenshots from the real e2e flow; normal test runs don't write files.
const screenshotsDir = process.env.PV_BLANK_PREVIEW_SCREENSHOTS_DIR;
async function captureState(page, name) {
  if (!screenshotsDir) return;
  await mkdir(screenshotsDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotsDir, `${name}.png`), fullPage: true });
}
let server, browser, origin;
// Keep these recovery fixtures independent of the user's project-local URL.
async function isolateAppPath(page, path = '/') {
  await page.route('**/__app-path', route => route.fulfill({ json: { success: true } }));
  await page.route('**/protovibe.html*', async route => {
    const response = await route.fetch();
    const html = (await response.text()).replace(
      /(<script id="pv-app-path-state" type="application\/json">)([^<]*)(<\/script>)/,
      (_, open, json, close) => open + JSON.stringify({ ...JSON.parse(json), path, updatedAt: 1 }).replace(/</g, '\\u003c') + close,
    );
    await route.fulfill({ response, body: html });
  });
}
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
  await isolateAppPath(page);
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
  const requestTimes = [];
  await page.route('**/src/App.tsx', route => {
    requestTimes.push(Date.now());
    const body = source(++requests);
    return body === null ? route.continue() : route.fulfill({ contentType: 'text/javascript', body });
  });
  // Keep unrelated publishing/auth work out of this preview test.
  await page.route('**/__cloudflare-auth-status*', route => route.fulfill({ json: {} }));
  await isolateAppPath(page, path);
  if (init) await init(page);
  await page.goto(`${origin}/protovibe.html`);
  const element = page.getByTestId('app-preview');
  await element.waitFor();
  const frame = await (await element.elementHandle()).contentFrame();
  await frame.waitForLoadState('load');
  return { page, frame, errors, requests: () => requests, requestTimes };
}

async function staysAt(fixture, count) {
  // Longer than the settling delay plus an HTTP probe and another delay.
  await fixture.page.waitForTimeout(4_000);
  assert.equal(fixture.requests(), count);
}

test('a permanent missing export shows the captured error after the initial three retries', async t => {
  const fixture = await openFixture(t, () => missingExport);
  await fixture.page.getByText('The app failed to load', { exact: true }).first().waitFor({ timeout: 25_000 });
  await staysAt(fixture, 4);
  assert.match(await fixture.page.locator('pre').first().innerText(), /does not provide an export/);
  assert.equal(await fixture.frame.locator('#root').innerHTML(), '');
  assert.equal(fixture.errors.filter(e => e.includes('does not provide an export')).length, 4);
});

test('a URL change before a module error retains the initial retry schedule', async t => {
  const fixture = await openFixture(t, () => `
    history.replaceState({}, '', '/?view=normalized');
    void import('/__missing-module-for-test.js');
    ${emptyApp}
  `);
  await fixture.page.getByText('The app failed to load', { exact: true }).first().waitFor({ timeout: 25_000 });
  await staysAt(fixture, 4);
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

test('an uncaught runtime error plus an empty root recovers through the loading cover', async t => {
  const fixture = await openFixture(t, n => n === 1
    ? `setTimeout(() => { throw new Error('Business logic bug'); }, 0); ${emptyApp}` : readyApp);
  await fixture.page.getByText('Loading…', { exact: true }).first().waitFor();
  await fixture.frame.waitForFunction(() => document.getElementById('root').textContent.includes('Recovery fixture ready'));
  await fixture.page.getByText('Loading…', { exact: true }).first().waitFor({ state: 'hidden' });
  assert.equal(fixture.requests(), 2);
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

test('the initial retry schedule works even when session storage is unavailable', async t => {
  const fixture = await openFixture(t, () => missingExport, { init: page => page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('Storage disabled'); } });
  }) });
  await fixture.page.getByText('The app failed to load', { exact: true }).first().waitFor({ timeout: 25_000 });
  await staysAt(fixture, 4);
});

test('a healthy recovery re-arms the budget for a later independent edit', async t => {
  const fixture = await openFixture(t, n => n % 2 ? missingExport : readyApp);
  await fixture.frame.waitForFunction(() => document.getElementById('root').textContent.includes('Recovery fixture ready'));
  await fixture.page.getByText('Loading…', { exact: true }).first().waitFor({ state: 'hidden' });
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
  await staysAt(fixture, 2);
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

const providerCrash = `export default function App() { throw new Error('useStore must be used within StoreProvider'); }`;

test('a transient React render crash recovers without reloading the editor or losing its URL', async t => {
  const fixture = await openFixture(t, n => n === 1 ? providerCrash : readyApp, { path: '/?view=runtime#details' });
  await fixture.page.evaluate(() => { window.shellIdentity = 'same shell'; });
  await fixture.page.getByText('Loading…', { exact: true }).first().waitFor();
  await fixture.frame.waitForFunction(() => document.getElementById('root').textContent.includes('Recovery fixture ready'));
  await fixture.page.getByText('Loading…', { exact: true }).first().waitFor({ state: 'hidden' });
  assert.equal(fixture.requests(), 2);
  assert.ok(fixture.errors.some(e => e.includes('useStore must be used within StoreProvider')));
  assert.equal(new URL(fixture.frame.url()).search + new URL(fixture.frame.url()).hash, '?view=runtime#details');
  assert.equal(await fixture.page.evaluate(() => window.shellIdentity), 'same shell');
});

test('a permanent React crash shows its error after three retries, despite unrelated cleared reports', async t => {
  const fixture = await openFixture(t, () => providerCrash, { init: page => page.addInitScript(() => {
    if (window !== window.top) return;
    window.addEventListener('message', event => {
      if (event.data?.type === 'PV_BLANK_PREVIEW_ERROR') window.previewCrashAt ??= Date.now();
    });
  }) });
  await fixture.page.getByText('Loading…', { exact: true }).first().waitFor();
  await fixture.page.evaluate(() => {
    const other = [...document.querySelectorAll('iframe')].find(f => f.dataset.testid !== 'app-preview');
    if (other) other.contentWindow.eval(`setInterval(() => parent.postMessage({ type: 'PV_VITE_ERROR_CLEARED' }, location.origin), 500)`);
    // A message from the shell itself is not an app report either.
    setInterval(() => window.postMessage({ type: 'PV_BLANK_PREVIEW_RECOVERED' }, location.origin), 500);
  });
  await fixture.page.getByText('The app failed to load', { exact: true }).first().waitFor({ timeout: 25_000 });
  assert.match(await fixture.page.locator('pre').first().innerText(), /useStore must be used within StoreProvider/);
  await staysAt(fixture, 4);
  const detectedAt = await fixture.page.evaluate(() => window.previewCrashAt);
  // Assert the actual browser requests, not just the configured constants.
  // Allow scheduling/network latency, but fail if the first attempt waits 5s.
  for (const [index, target] of [1_000, 5_000, 10_000].entries()) {
    const elapsed = fixture.requestTimes[index + 1] - detectedAt;
    assert.ok(elapsed >= target - 100 && elapsed < target + 3_000,
      `retry ${index + 1} arrived ${elapsed}ms after detection (target ${target}ms)`);
  }
});

async function appReactUrl() {
  const main = await server.transformRequest('/src/main.tsx');
  const url = main.code.match(/["']([^"']*\/react\.js[^"']*)["']/)?.[1];
  assert.ok(url, 'use the same React module as the app entry');
  return JSON.stringify(url);
}

test('a React crash after the app has mounted recovers', async t => {
  const reactUrl = await appReactUrl();
  const fixture = await openFixture(t, n => n === 1 ? `
    import React from ${reactUrl};
    const { useState } = React;
    export default function App() {
      const [crashed, setCrashed] = useState(false);
      window.crashApp = () => setCrashed(true);
      if (crashed) throw new Error('Post-edit runtime crash');
      return 'Recovery fixture ready';
    }
  ` : readyApp);
  await fixture.frame.waitForFunction(() => document.getElementById('root').textContent.includes('Recovery fixture ready'));
  assert.equal(fixture.requests(), 1);
  assert.deepEqual(fixture.errors, []);
  await fixture.frame.evaluate(() => window.crashApp());
  await fixture.page.getByText('Loading…', { exact: true }).first().waitFor();
  await fixture.frame.waitForFunction(() => document.getElementById('root').textContent.includes('Recovery fixture ready'));
  await fixture.page.getByText('Loading…', { exact: true }).first().waitFor({ state: 'hidden' });
  assert.equal(fixture.requests(), 2);
  assert.ok(fixture.errors.some(e => e.includes('Post-edit runtime crash')));
});

test('uncaught errors and rejected promises do not refresh an app that still renders', async t => {
  const fixture = await openFixture(t, () => readyApp);
  await fixture.frame.waitForFunction(() => document.getElementById('root').textContent.includes('Recovery fixture ready'));
  await fixture.frame.evaluate(() => {
    setTimeout(() => { throw new Error('Nonfatal handler error'); });
    void Promise.reject(new Error('Nonfatal request error'));
    console.error('Logged error');
  });
  await staysAt(fixture, 1);
  assert.equal(await fixture.page.getByText('Loading…', { exact: true }).first().count(), 0);
});

test('an unhandled string rejection with a blank app recovers', async t => {
  const fixture = await openFixture(t, n => n === 1
    ? `void Promise.reject('App startup failed'); ${emptyApp}` : readyApp);
  await fixture.page.getByText('Loading…', { exact: true }).first().waitFor();
  await fixture.frame.waitForFunction(() => document.getElementById('root').textContent.includes('Recovery fixture ready'));
  assert.equal(fixture.requests(), 2);
});

test('console.error alone does not refresh an intentionally empty app', async t => {
  const fixture = await openFixture(t, () => `console.error('Diagnostic only'); ${emptyApp}`);
  await staysAt(fixture, 1);
  assert.equal(await fixture.page.getByText('Loading…', { exact: true }).first().count(), 0);
});

test('a blank reload without a new error is not mistaken for recovery', async t => {
  const fixture = await openFixture(t, n => n === 1 ? providerCrash : emptyApp);
  await fixture.page.getByText('The app failed to load', { exact: true }).first().waitFor({ timeout: 25_000 });
  assert.match(await fixture.page.locator('pre').first().innerText(), /useStore must be used within StoreProvider/);
  await staysAt(fixture, 4);
});

test('rendering during the settling period cancels stale runtime evidence', async t => {
  const fixture = await openFixture(t, () => emptyApp);
  await fixture.frame.evaluate(() => {
    window.dispatchEvent(new ErrorEvent('error', { message: 'Transient error' }));
    const root = document.getElementById('root');
    root.textContent = 'Recovered';
    setTimeout(() => { root.textContent = ''; }, 100);
  });
  await staysAt(fixture, 1);
  assert.equal(await fixture.page.getByText('Loading…', { exact: true }).first().count(), 0);
});

test('a React error boundary fallback is preserved', async t => {
  const reactUrl = await appReactUrl();
  const fixture = await openFixture(t, () => `
    import React from ${reactUrl};
    const { Component, createElement } = React;
    function Broken() { throw new Error('Caught render error'); }
    class Boundary extends Component {
      state = { failed: false };
      static getDerivedStateFromError() { return { failed: true }; }
      render() { return this.state.failed ? 'Usable fallback' : this.props.children; }
    }
    export default function App() { return createElement(Boundary, null, createElement(Broken)); }
  `);
  await fixture.frame.getByText('Usable fallback', { exact: true }).waitFor();
  await staysAt(fixture, 1);
  assert.equal(await fixture.page.getByText('Loading…', { exact: true }).count(), 0);
});

test('ongoing edits keep the loading cover beyond a minute; an idle persistent failure then shows its error', async t => {
  let activityMsAgo = 0;
  const fixture = await openFixture(t, () => providerCrash, { init: async page => {
    // Advance the episode's age without fast-forwarding HTTP abort timers:
    // network responses still need real browser event-loop turns to arrive.
    await page.clock.setFixedTime(new Date());
    await page.route('**/__hmr-activity', route => route.fulfill({ json: { msSinceLastChange: activityMsAgo } }));
  } });
  await fixture.page.getByText('Loading…', { exact: true }).first().waitFor();
  await fixture.page.clock.setFixedTime(new Date(Date.now() + 61_000));
  await fixture.page.waitForTimeout(2_000);
  assert.equal(await fixture.page.getByText('Loading…', { exact: true }).first().isVisible(), true);
  assert.equal(await fixture.page.getByText('The app failed to load', { exact: true }).count(), 0);
  assert.equal(fixture.requests(), 1, 'wait for writes to settle before reloading');

  // A short pause allows retries but must still hide the error, even though
  // the episode itself is much older than the normal final-error deadline.
  activityMsAgo = 9_000;
  await fixture.page.waitForTimeout(5_000);
  assert.equal(await fixture.page.getByText('Loading…', { exact: true }).first().isVisible(), true);
  assert.equal(await fixture.page.getByText('The app failed to load', { exact: true }).count(), 0);

  activityMsAgo = 10_000;
  await fixture.page.getByText('The app failed to load', { exact: true }).first().waitFor();
  assert.match(await fixture.page.locator('pre').first().innerText(), /useStore must be used within StoreProvider/);
  await staysAt(fixture, 4);
});

test('the loading, final error, and restored app states support manual recovery', async t => {
  let fixed = false;
  const fixture = await openFixture(t, () => fixed ? null : providerCrash, { init: page =>
    page.setViewportSize({ width: 1440, height: 1000 }),
  });
  await fixture.page.getByText('Loading…', { exact: true }).first().waitFor();
  await captureState(fixture.page, '01-loading');
  await fixture.page.getByText('The app failed to load', { exact: true }).first().waitFor({ timeout: 25_000 });
  assert.match(await fixture.page.locator('pre').first().innerText(), /useStore must be used within StoreProvider/);
  assert.equal(fixture.requests(), 4);
  await captureState(fixture.page, '02-error-after-idle');

  fixed = true;
  await fixture.page.getByRole('button', { name: 'Refresh page', exact: true }).first().click();
  assert.equal(await fixture.page.getByText('Loading…', { exact: true }).first().isVisible(), true);
  assert.equal(await fixture.page.getByText('The app failed to load', { exact: true }).count(), 0);
  await captureState(fixture.page, '04-manual-refresh-loading');
  await fixture.frame.locator('#root > *').first().waitFor();
  await fixture.page.getByText('Loading…', { exact: true }).first().waitFor({ state: 'hidden' });
  assert.equal(fixture.requests(), 5);
  assert.equal(await fixture.page.getByText('Loading…', { exact: true }).count(), 0);
  await captureState(fixture.page, '03-recovered');
});

test('a cleared Vite error during runtime recovery does not hide the final blank-page diagnostic', async t => {
  const fixture = await openFixture(t, n => n === 1 ? providerCrash : `
    parent.postMessage({ type: 'PV_VITE_ERROR', moduleLoadError: false }, location.origin);
    parent.postMessage({ type: 'PV_VITE_ERROR_CLEARED' }, location.origin);
    ${emptyApp}
  `);
  await fixture.page.getByText('The app failed to load', { exact: true }).first().waitFor({ timeout: 25_000 });
  assert.match(await fixture.page.locator('pre').first().innerText(), /useStore must be used within StoreProvider/);
  await fixture.page.waitForTimeout(7_000);
  assert.equal(fixture.requests(), 5, 'continue retrying even after mixed compile/runtime errors');
  assert.equal(await fixture.page.getByText('The app failed to load', { exact: true }).first().isVisible(), true);
  assert.match(await fixture.page.locator('pre').first().innerText(), /useStore must be used within StoreProvider/);
});

test('a blank document must render for the full confirmation period before recovery', async t => {
  const fixture = await openFixture(t, n => n === 1 ? providerCrash : `window.blankRetryReady = true; ${emptyApp}`);
  await fixture.page.getByText('Loading…', { exact: true }).first().waitFor();
  await fixture.frame.waitForFunction(() => window.blankRetryReady && document.readyState === 'complete');
  await fixture.page.waitForTimeout(1_800);
  await fixture.frame.evaluate(() => { document.getElementById('root').textContent = 'Late recovery'; });
  const renderedAt = Date.now();
  await fixture.page.getByText('Loading…', { exact: true }).first().waitFor({ state: 'hidden' });
  assert.ok(Date.now() - renderedAt >= 2_400, 'confirm 2.5 seconds of rendered content, not just a loaded document');
  assert.equal(fixture.requests(), 2);
});

test('losing rendered content restarts the recovery confirmation period', async t => {
  const fixture = await openFixture(t, n => n === 1 ? providerCrash : `window.blankRetryReady = true; ${emptyApp}`);
  await fixture.page.getByText('Loading…', { exact: true }).first().waitFor();
  await fixture.frame.waitForFunction(() => window.blankRetryReady && document.readyState === 'complete');
  await fixture.frame.evaluate(() => { document.getElementById('root').textContent = 'Brief recovery'; });
  await fixture.page.waitForTimeout(1_000);
  await fixture.frame.evaluate(() => { document.getElementById('root').textContent = ''; });
  await fixture.page.waitForTimeout(600);
  await fixture.frame.evaluate(() => { document.getElementById('root').textContent = 'Stable recovery'; });
  const renderedAt = Date.now();
  await fixture.page.getByText('Loading…', { exact: true }).first().waitFor({ state: 'hidden' });
  assert.ok(Date.now() - renderedAt >= 2_400, 'confirmation requires continuously rendered content');
  assert.equal(fixture.requests(), 2);
});

for (const reason of ['undefined', '0', '{}']) {
  test(`an unhandled ${reason} rejection with a blank app recovers`, async t => {
    const fixture = await openFixture(t, n => n === 1
      ? `void Promise.reject(${reason}); ${emptyApp}` : readyApp);
    await fixture.page.getByText('Loading…', { exact: true }).first().waitFor({ timeout: 5_000 });
    await fixture.frame.getByText('Recovery fixture ready', { exact: true }).waitFor();
    await fixture.page.getByText('Loading…', { exact: true }).first().waitFor({ state: 'hidden' });
    assert.equal(fixture.requests(), 2);
  });
}

test('the visible error keeps refreshing every five seconds and automatically clears after a fix', async t => {
  let fixed = false;
  let activityStatus = 200;
  const fixture = await openFixture(t, () => fixed ? readyApp : providerCrash, {
    path: '/?view=background-recovery#details',
    init: page => page.route('**/__hmr-activity', route => route.fulfill({
      status: activityStatus, json: { msSinceLastChange: null },
    })),
  });
  await fixture.page.evaluate(() => { window.shellIdentity = 'same shell'; });
  await fixture.page.getByText('The app failed to load', { exact: true }).first().waitFor({ timeout: 25_000 });
  const errorShownAt = Date.now();
  assert.equal(fixture.requests(), 4);
  assert.equal(await fixture.page.getByRole('button', { name: /undo/i }).count(), 0);
  const status = fixture.page.getByRole('status').filter({ hasText: 'Auto-refreshing every 5 seconds' }).first();
  assert.equal(await status.isVisible(), true);
  assert.equal(await status.locator('svg').evaluate(el => getComputedStyle(el).animationName), 'pv-crash-spin');

  // Error-state retries must keep running even if the readiness probe fails.
  activityStatus = 503;
  await fixture.page.waitForTimeout(11_500);
  assert.equal(fixture.requests(), 6);
  assert.equal(await fixture.page.getByText('The app failed to load', { exact: true }).first().isVisible(), true);
  assert.equal(await fixture.page.getByText('Loading…', { exact: true }).count(), 0);
  const firstDelay = fixture.requestTimes[4] - errorShownAt;
  const retryInterval = fixture.requestTimes[5] - fixture.requestTimes[4];
  assert.ok(firstDelay >= 4_500 && firstDelay < 7_000, `first background retry after ${firstDelay}ms`);
  assert.ok(retryInterval >= 4_800 && retryInterval < 6_500, `background retry interval ${retryInterval}ms`);

  fixed = true;
  await fixture.frame.getByText('Recovery fixture ready', { exact: true }).waitFor({ timeout: 8_000 });
  await fixture.page.getByText('The app failed to load', { exact: true }).first().waitFor({ state: 'hidden' });
  const recoveredRequests = fixture.requests();
  await fixture.page.waitForTimeout(6_000);
  assert.equal(fixture.requests(), recoveredRequests, 'stop background retries after confirmed recovery');
  assert.equal(new URL(fixture.frame.url()).search + new URL(fixture.frame.url()).hash, '?view=background-recovery#details');
  assert.equal(await fixture.page.evaluate(() => window.shellIdentity), 'same shell');
});

for (const buttonName of ['Refresh page', 'Refresh', 'toolbar Refresh']) {
  test(`${buttonName} immediately restores loading and restarts the full attempt cycle`, async t => {
    const fixture = await openFixture(t, () => providerCrash);
    await fixture.page.getByText('The app failed to load', { exact: true }).first().waitFor({ timeout: 25_000 });
    const requestsBeforeRefresh = fixture.requests();
    const clickedAt = Date.now();
    const button = buttonName === 'toolbar Refresh'
      ? fixture.page.locator('button[data-tooltip="Refresh"]').first()
      : fixture.page.getByRole('button', { name: buttonName, exact: true }).first();
    await button.click();
    assert.equal(await fixture.page.getByText('Loading…', { exact: true }).first().isVisible(), true);
    assert.equal(await fixture.page.getByText('The app failed to load', { exact: true }).count(), 0);
    assert.equal(await fixture.page.getByRole('button', { name: /undo/i }).count(), 0);
    await fixture.page.waitForTimeout(4_000);
    assert.equal(await fixture.page.getByText('Loading…', { exact: true }).first().isVisible(), true);
    await fixture.page.getByText('The app failed to load', { exact: true }).first().waitFor({ timeout: 20_000 });
    assert.ok(Date.now() - clickedAt >= 15_000, 'give the restarted episode a new grace period');
    assert.equal(fixture.requests(), requestsBeforeRefresh + 4, 'manual reload plus three fresh automatic attempts');
    for (const [index, target] of [1_000, 5_000, 10_000].entries()) {
      const elapsed = fixture.requestTimes[requestsBeforeRefresh + index + 1] - clickedAt;
      assert.ok(elapsed >= target - 100 && elapsed < target + 3_000,
        `restarted retry ${index + 1} arrived ${elapsed}ms after click (target ${target}ms)`);
    }
  });
}

test('failed entry-module requests continue retrying after the compile error is shown', async t => {
  let broken = true;
  let entryRequests = 0;
  const fixture = await openFixture(t, () => readyApp, { init: page =>
    page.route('**/src/main.tsx', route => {
      entryRequests++;
      return broken
        ? route.fulfill({ status: 500, contentType: 'text/javascript', body: 'Compile error fixture' })
        : route.continue();
    }),
  });
  await fixture.page.getByText('The app failed to load', { exact: true }).first().waitFor({ timeout: 25_000 });
  assert.equal(entryRequests, 4);
  await fixture.page.waitForTimeout(7_000);
  assert.equal(entryRequests, 5);
  assert.equal(await fixture.page.getByText('Auto-refreshing every 5 seconds', { exact: true }).first().isVisible(), true);
  broken = false;
  await fixture.frame.getByText('Recovery fixture ready', { exact: true }).waitFor({ timeout: 8_000 });
  await fixture.page.getByText('The app failed to load', { exact: true }).first().waitFor({ state: 'hidden' });
});

for (const resource of ['module', 'document']) {
  test(`background retries let a slow ${resource} load finish after the app is fixed`, async t => {
    let fixed = false;
    let slowRequests = 0;
    const fixture = await openFixture(t, () => fixed ? readyApp : providerCrash, {
      init: page => page.route(resource === 'module' ? '**/src/main.tsx' : `${origin}/`, async route => {
        if (fixed) {
          slowRequests++;
          // Longer than the background retry interval: reloading at five seconds
          // would cancel this successful response and prevent recovery forever.
          await new Promise(resolve => setTimeout(resolve, 7_000));
        }
        await route.continue().catch(() => {});
      }),
    });
    await fixture.page.getByText('The app failed to load', { exact: true }).first().waitFor({ timeout: 25_000 });
    fixed = true;
    await fixture.frame.getByText('Recovery fixture ready', { exact: true }).waitFor({ timeout: 18_000 });
    await fixture.page.getByText('The app failed to load', { exact: true }).first().waitFor({ state: 'hidden' });
    assert.equal(slowRequests, 1, 'do not interrupt an in-flight recovery load');
  });
}

test('a stalled background reload is retried after its timeout', async t => {
  let fixed = false;
  let recoveryRequests = 0;
  const fixture = await openFixture(t, () => fixed ? readyApp : providerCrash, {
    init: page => page.route('**/src/main.tsx', route => {
      // Leave the first recovery request pending forever; the next one works.
      if (fixed && ++recoveryRequests === 1) return;
      return route.continue();
    }),
  });
  await fixture.page.getByText('The app failed to load', { exact: true }).first().waitFor({ timeout: 25_000 });
  const request = fixture.page.waitForRequest('**/src/main.tsx');
  fixed = true;
  await request;
  // Age the stalled request without waiting thirty seconds or accelerating
  // browser timers needed by Vite's networking and recovery confirmation.
  await fixture.page.clock.setFixedTime(new Date(Date.now() + 31_000));
  await fixture.frame.getByText('Recovery fixture ready', { exact: true }).waitFor({ timeout: 8_000 });
  await fixture.page.getByText('The app failed to load', { exact: true }).first().waitFor({ state: 'hidden' });
  assert.equal(recoveryRequests, 2);
});

