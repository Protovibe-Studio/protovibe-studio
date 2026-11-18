// Build the plugin and run the template dev server before this test.
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { chromium } from 'playwright';

let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined }); });
after(async () => { await browser?.close(); });
const specId = 'k3f9x2m1qa';
const itemId = 'a-9z8y7x6w';
const spec = { id: specId, title: 'Agent spec', createdAt: '2026-01-01T00:00:00Z' };
const annotation = {
  id: itemId, type: 'annotation', rank: 'n', text: 'Fresh annotation from the agent',
  state: { tab: 'app', path: '/?dialog=recruit#details' },
  anchor: { file: 'src/App.tsx' }, author: { name: 'Designer', email: 'test@example.com' }, createdAt: spec.createdAt,
};

async function openEditor(t) {
  const page = await browser.newPage();
  t.after(() => page.close());
  page.setDefaultTimeout(10000);
  let items = [annotation];
  await page.route('**/__specs-list', r => r.fulfill({ json: { specs: [{ ...spec, annotationCount: items.length }] } }));
  await page.route('**/__specs-get', r => r.request().postDataJSON().specId === specId
    ? r.fulfill({ json: { spec, items } }) : r.fulfill({ status: 404, json: { error: 'Spec not found' } }));
  await page.route('**/__cloudflare-publish-metadata', r => r.fulfill({ json: {} }));
  await page.addInitScript(() => {
    if (window !== window.top) return;
    window.canvasNavigations = [];
    window.addEventListener('pv-canvas-navigate', e => window.canvasNavigations.push(e.detail));
    window.electronAPI = {
      onAnnotationLink(callback) {
        window.openAnnotation = callback;
        return () => { delete window.openAnnotation; };
      },
    };
    localStorage.setItem('pv-specs-filter-scope', 'viewport');
  });
  await page.goto(`${process.env.PROTOVIBE_TEST_URL || 'http://localhost:3000'}/protovibe.html`);
  await page.waitForFunction(() => typeof window.openAnnotation === 'function');
  return { page, setItems: next => { items = next; } };
}
const openLink = (page, target = { specId, itemId }) => page.evaluate(link => window.openAnnotation(link), target);

async function expectActive(page) {
  await page.getByText(annotation.text, { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('pv-specs-view')).itemId), itemId);
  assert.equal(await page.evaluate(() => localStorage.getItem('pv-specs-filter-scope')), 'all');
  assert.deepEqual(await page.evaluate(() => window.canvasNavigations.at(-1)), {
    path: annotation.state.path, selector: `[data-pv-spec-${itemId}]`, keepFocus: false,
  });
}

test('opens a fresh annotation from a hidden sidebar, restores canvas state and clears filters', async t => {
  const { page, setItems } = await openEditor(t);
  await page.locator('[data-tooltip="Enable live preview"]').click();
  await page.locator('[data-tooltip="Back to editor"]').waitFor();
  // The link must read the files again instead of relying on the initial list.
  setItems([{ ...annotation, text: 'New version' }]);
  await openLink(page);
  await page.getByText('New version', { exact: true }).waitFor();
  await page.locator('[data-tooltip="Enable live preview"]').waitFor();
  setItems([annotation]);
  await page.getByTestId('spec-find-input').fill('unrelated search');
  await openLink(page);
  await expectActive(page);
  assert.equal(await page.getByTestId('spec-find-input').inputValue(), '');
  await page.waitForFunction(path => {
    const location = document.querySelector('[data-testid="app-preview"]').contentWindow.location;
    return location.pathname + location.search + location.hash === path;
  }, annotation.state.path);
  assert.equal(await page.evaluate(() => window.canvasNavigations.length), 2);
});

for (const missing of ['spec', 'annotation', 'heading']) {
  test(`${missing} target shows toast and preserves the current annotation`, async t => {
    const { page, setItems } = await openEditor(t);
    await openLink(page);
    await expectActive(page);
    if (missing === 'heading') setItems([annotation, { id: 'h-test', type: 'heading', title: 'Heading', rank: 'z' }]);
    await openLink(page, { specId: missing === 'spec' ? 'absent' : specId, itemId: missing === 'heading' ? 'h-test' : 'a-absent' });
    await page.getByText('This annotation was not found in the current project.', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('pv-specs-view')).itemId), itemId);
    assert.equal(await page.evaluate(() => window.canvasNavigations.length), 1);
  });
}

test('a slow earlier link cannot replace the latest requested annotation', async t => {
  const { page } = await openEditor(t);
  let release;
  const wait = new Promise(resolve => { release = resolve; });
  await page.route('**/__specs-get', async r => {
    if (r.request().postDataJSON().specId !== 'slow') return r.fallback();
    await wait;
    await r.fulfill({ json: { spec: { ...spec, id: 'slow' }, items: [{ ...annotation, text: 'Stale response' }] } });
  });
  const requested = page.waitForRequest(r => r.url().endsWith('/__specs-get') && r.postDataJSON().specId === 'slow');
  await page.evaluate(({ itemId }) => { void window.openAnnotation({ specId: 'slow', itemId }); }, { itemId });
  await requested;
  await openLink(page);
  await expectActive(page);
  const responded = page.waitForResponse(r => r.url().endsWith('/__specs-get') && r.request().postDataJSON().specId === 'slow');
  release();
  await responded;
  assert.equal(await page.getByText('Stale response', { exact: true }).count(), 0);
  assert.equal(await page.evaluate(() => window.canvasNavigations.length), 1);
});

for (const unreadable of [false, true]) {
  test(unreadable ? 'unfinished agent file shows a retry toast' : 'server failure shows a retry toast', async t => {
    const { page } = await openEditor(t);
    await page.route('**/__specs-get', r => r.fulfill({ status: unreadable ? 200 : 500,
      json: unreadable ? { spec, items: [], unreadable: [`${itemId}.json`] } : { error: 'Unavailable' } }));
    await openLink(page);
    await page.getByText(unreadable
      ? 'Could not read this annotation. Try the link again after the files finish saving.'
      : 'Could not load this annotation. Please try again.', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.canvasNavigations.length), 0);
  });
}

test('a linked row is scrolled into view on first opening and on repeated clicks', async t => {
  const { page, setItems } = await openEditor(t);
  setItems([...Array.from({ length: 12 }, (_, i) => ({ ...annotation, id: `a-before${i}`, rank: `a${i}`, text: `Earlier annotation ${i}` })), annotation]);
  await openLink(page);
  const row = page.locator(`[data-spec-item="${itemId}"]`);
  const inView = () => row.evaluate(el => {
    const rect = el.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  });
  await page.waitForFunction(id => {
    const rect = document.querySelector(`[data-spec-item="${id}"]`)?.getBoundingClientRect();
    return rect && rect.bottom > 0 && rect.top < window.innerHeight;
  }, itemId);
  assert.equal(await inView(), true);
  await page.locator('[data-spec-item="a-before0"]').evaluate(el => el.scrollIntoView());
  assert.equal(await inView(), false);
  await openLink(page);
  await page.waitForFunction(id => {
    const rect = document.querySelector(`[data-spec-item="${id}"]`).getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  }, itemId);
});
