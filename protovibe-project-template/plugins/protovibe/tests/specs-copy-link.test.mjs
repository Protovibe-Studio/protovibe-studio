// Build the plugin and run the template dev server before running this test.
// PROTOVIBE_TEST_URL and PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH may override defaults.
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { chromium } from 'playwright';

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
});
after(async () => { await browser?.close(); });

async function openAnnotation(t, { denied = false, legacy = false } = {}) {
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  t.after(() => context.close());
  const page = await context.newPage();
  const spec = { id: 's-copy-test', title: 'Copy link test', createdAt: '2026-01-01T00:00:00Z' };
  const item = {
    id: 'a-copy-test', type: 'annotation', rank: 'a0', text: 'Example annotation',
    state: { tab: 'app', path: '/' }, author: { name: 'Test designer', email: 'test@example.com' },
    createdAt: spec.createdAt,
  };
  let publishedUrl = 'https://original.pages.dev/';
  await page.route('**/__specs-list', r => r.fulfill({ json: { specs: [{ ...spec, annotationCount: 1 }] } }));
  await page.route('**/__specs-get', r => r.fulfill({ json: { spec, items: [item] } }));
  await page.route('**/__cloudflare-publish-metadata', async r => {
    const url = publishedUrl;
    // A real asynchronous boundary exposes clipboard writes made after the click.
    await new Promise(resolve => setTimeout(resolve, 100));
    await r.fulfill({ json: { url } });
  });
  await page.addInitScript(({ denied, legacy }) => {
    sessionStorage.setItem('pv-specs-view', JSON.stringify({ level: 'doc', specId: 's-copy-test' }));
    let inClick = false;
    document.addEventListener('click', () => {
      inClick = true;
      setTimeout(() => { inClick = false; }, 0);
    }, true);
    for (const method of ['write', 'writeText']) {
      const original = navigator.clipboard[method].bind(navigator.clipboard);
      navigator.clipboard[method] = (...args) => {
        if (denied || !inClick) return Promise.reject(new DOMException('Clipboard permission denied', 'NotAllowedError'));
        return original(...args);
      };
    }
    if (legacy) window.ClipboardItem = undefined;
  }, { denied, legacy });
  await page.goto(`${process.env.PROTOVIBE_TEST_URL || 'http://localhost:3000'}/protovibe.html`);
  const loaded = page.waitForResponse('**/__cloudflare-publish-metadata');
  await page.getByText('Specs', { exact: true }).click();
  await loaded;
  const row = page.getByTestId('spec-annotation-row');
  await row.hover();
  await row.locator('button[data-tooltip="More"]').click();
  const copy = page.getByRole('button', { name: 'Copy published link', exact: true });
  await copy.waitFor();
  const labels = await copy.locator('..').getByRole('button').allTextContents();
  assert.equal(labels.indexOf('Delete annotation'), labels.indexOf('Copy published link') + 1);
  publishedUrl = 'https://latest.pages.dev/project/';
  return { page, copy };
}

test('copies fresh published URL without losing click activation', async t => {
  const { page, copy } = await openAnnotation(t);
  await copy.click();
  await page.getByText('Link copied to clipboard', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()),
    'https://latest.pages.dev/project/specs.html?spec=s-copy-test&item=a-copy-test');
});

test('clipboard rejection shows an error and no success toast', async t => {
  const { page, copy } = await openAnnotation(t, { denied: true });
  await copy.click();
  await page.getByText('Clipboard permission denied', { exact: true }).waitFor();
  assert.equal(await page.getByText('Link copied to clipboard', { exact: true }).count(), 0);
});

test('older clipboard API copies the already loaded URL during the click', async t => {
  const { page, copy } = await openAnnotation(t, { legacy: true });
  await copy.click();
  await page.getByText('Link copied to clipboard', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()),
    'https://original.pages.dev/specs.html?spec=s-copy-test&item=a-copy-test');
});
