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
  browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  });
});
after(async () => {
  await browser?.close();
  await server?.close();
});

async function fixture(t) {
  const page = await browser.newPage();
  t.after(() => page.close());
  let saved = { path: '/', updatedAt: 0 };
  await page.route('**/__cloudflare-auth-status*', (route) =>
    route.fulfill({ json: {} }),
  );
  await page.route('**/src/App.tsx', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: 'export default function App() { return "Preview ready"; }',
    }),
  );
  // The separate app-path suite tests real disk writes. Here isolate the real
  // editor from local user state while retaining saved state across reloads.
  await page.route('**/__app-path', (route) => {
    saved = route.request().postDataJSON();
    return route.fulfill({ json: { success: true } });
  });
  await page.route('**/protovibe.html*', async (route) => {
    const response = await route.fetch();
    const html = (await response.text()).replace(
      /(<script id="pv-app-path-state" type="application\/json">)([^<]*)(<\/script>)/,
      (_, open, json, close) =>
        open +
        JSON.stringify({ ...JSON.parse(json), ...saved }).replace(
          /</g,
          '\\u003c',
        ) +
        close,
    );
    await route.fulfill({ response, body: html });
  });
  await page.goto(origin + '/protovibe.html');
  await page
    .frameLocator('[data-testid="app-preview"]')
    .getByText('Preview ready', { exact: true })
    .waitFor();
  return { page, saved: () => saved };
}
const current = (page) =>
  page.evaluate(() => {
    const loc = document.querySelector('[data-testid="app-preview"]')
      .contentWindow.location;
    return loc.pathname + loc.search + loc.hash;
  });
async function navigate(page, path) {
  const frame = await (
    await page.getByTestId('app-preview').elementHandle()
  ).contentFrame();
  await frame.evaluate((path) => {
    history.pushState({}, '', path);
    parent.postMessage({ type: 'PV_URL_CHANGE', path }, '*');
  }, path);
}
async function waitSaved(f, path) {
  for (let i = 0; i < 100; i++) {
    if (f.saved().path === path) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.equal(f.saved().path, path);
}

test('the real editor remembers navigation, repeated reloads, hash changes, and Home', async (t) => {
  const f = await fixture(t);
  const target = '/employees?dialog=details#salary';
  await navigate(f.page, target);
  await waitSaved(f, target);
  for (let i = 0; i < 2; i++) {
    await f.page.reload();
    await f.page
      .frameLocator('[data-testid="app-preview"]')
      .getByText('Preview ready', { exact: true })
      .waitFor();
    assert.equal(await current(f.page), target);
  }
  await f.page.evaluate(
    () =>
      (document.querySelector(
        '[data-testid="app-preview"]',
      ).contentWindow.location.hash = 'benefits'),
  );
  await waitSaved(f, '/employees?dialog=details#benefits');
  await f.page.locator('button[data-tooltip="Home"]').click();
  await waitSaved(f, '/');
  await f.page.reload();
  await f.page
    .frameLocator('[data-testid="app-preview"]')
    .getByText('Preview ready', { exact: true })
    .waitFor();
  assert.equal(await current(f.page), '/');
});

test('a browser error document retries the last URL rather than the iframe original src', async (t) => {
  const f = await fixture(t);
  const target = '/employees?dialog=details#salary';
  await navigate(f.page, target);
  await waitSaved(f, target);
  let fail = true;
  await f.page.route('**/employees?dialog=details', (route) =>
    fail ? route.abort('connectionfailed') : route.continue(),
  );
  await f.page.locator('button[data-tooltip="Refresh"]').first().click();
  await f.page.waitForFunction(() => {
    try {
      document.querySelector('[data-testid="app-preview"]').contentWindow
        .location.href;
      return false;
    } catch {
      return true;
    }
  });
  fail = false;
  await f.page.locator('button[data-tooltip="Refresh"]').first().click();
  await f.page
    .frameLocator('[data-testid="app-preview"]')
    .getByText('Preview ready', { exact: true })
    .waitFor();
  assert.equal(await current(f.page), target);
  assert.equal(f.saved().path, target);
});
