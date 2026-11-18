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
  let currentSpec = spec;
  await page.route('**/__take-snapshot', r => r.fulfill({ json: {} }));
  await page.route('**/__specs-list', r => r.fulfill({ json: { specs: [{ ...currentSpec, annotationCount: items.length }] } }));
  await page.route('**/__specs-get', r => r.request().postDataJSON().specId === specId
    ? r.fulfill({ json: { spec: currentSpec, items } }) : r.fulfill({ status: 404, json: { error: 'Spec not found' } }));
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
  return { page, setItems: next => { items = next; }, setSpec: next => { currentSpec = next; } };
}
const openLink = (page, target = { specId, itemId }) => page.evaluate(link => window.openAnnotation(link), target);
const queueLink = (page, target) => page.evaluate(link => { window.pendingLink = window.openAnnotation(link); }, target);
const currentSpecId = page => page.evaluate(() => JSON.parse(sessionStorage.getItem('pv-specs-view')).specId);
const secondSpec = { ...spec, id: 'second-spec', title: 'Second spec' };
const secondItem = { ...annotation, id: 'a-second', text: 'Second annotation' };
const secondLink = { specId: secondSpec.id, itemId: secondItem.id };

function deferred(t) {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  t.after(() => resolve());
  return { promise, resolve };
}

async function routeSecondSpec(page, beforeRead = async () => {}) {
  await page.route('**/__specs-get', async r => {
    if (r.request().postDataJSON().specId !== secondSpec.id) return r.fallback();
    await beforeRead();
    await r.fulfill({ json: { spec: secondSpec, items: [secondItem] } });
  });
}

test('commits the focused title to its original spec before opening the latest queued link', async t => {
  const { page, setSpec } = await openEditor(t);
  await routeSecondSpec(page);
  await openLink(page);
  const save = deferred(t);
  const writes = [];
  await page.route('**/__specs-update', async r => {
    const body = r.request().postDataJSON();
    writes.push(body);
    await save.promise;
    const saved = { ...spec, title: body.title };
    setSpec(saved);
    await r.fulfill({ json: { spec: saved, items: [annotation] } });
  });
  const title = page.getByPlaceholder('Untitled spec', { exact: true });
  await title.click();
  await title.fill('Renamed first spec');
  const saving = page.waitForRequest('**/__specs-update');
  await queueLink(page, { specId: 'superseded', itemId });
  await saving;
  await queueLink(page, secondLink);
  assert.equal(await currentSpecId(page), specId);
  assert.deepEqual(writes, [{ specId, title: 'Renamed first spec' }]);
  save.resolve();
  await page.evaluate(() => window.pendingLink);
  await page.waitForFunction(() => document.querySelector('input[placeholder="Untitled spec"]')?.value === 'Second spec');
  assert.equal(await currentSpecId(page), secondSpec.id);
  await page.getByTestId('spec-find-input').click();
  assert.equal(writes.length, 1, 'the old title must never be saved to the destination spec');
  assert.equal(await page.getByText('This annotation was not found in the current project.', { exact: true }).count(), 0);
});

test('waits for every overlapping mutation before switching specs', async t => {
  const { page, setSpec, setItems } = await openEditor(t);
  let targetReads = 0;
  await routeSecondSpec(page, async () => { targetReads++; });
  await openLink(page);
  const rename = deferred(t);
  const update = deferred(t);
  const savedSpec = { ...spec, title: 'Saved first edit' };
  await page.route('**/__specs-update', async r => {
    await rename.promise;
    setSpec(savedSpec);
    await r.fulfill({ json: { spec: savedSpec, items: [annotation] } });
  });
  await page.route('**/__specs-item-update', async r => {
    const { patch } = r.request().postDataJSON();
    await update.promise;
    const saved = { ...annotation, ...patch };
    setItems([saved]);
    await r.fulfill({ json: { spec: savedSpec, items: [saved] } });
  });
  const title = page.getByPlaceholder('Untitled spec', { exact: true });
  await title.click();
  await title.fill('First edit');
  const renaming = page.waitForRequest('**/__specs-update');
  await title.evaluate(el => el.blur());
  await renaming;
  const text = page.getByPlaceholder('Write the annotation…', { exact: true });
  await text.click();
  await text.fill('Second edit');
  const updating = page.waitForRequest('**/__specs-item-update');
  await text.evaluate(el => el.blur());
  await updating;
  await queueLink(page, secondLink);
  rename.resolve();
  await page.waitForFunction(() => document.querySelector('input[placeholder="Untitled spec"]')?.value === 'Saved first edit');
  assert.equal(await currentSpecId(page), specId);
  assert.equal(targetReads, 0, 'the second save still owns the current spec');
  assert.equal(await page.getByTestId('spec-reload').isDisabled(), true);
  update.resolve();
  await page.evaluate(() => window.pendingLink);
  assert.equal(await currentSpecId(page), secondSpec.id);
});

test('saves edits made during link loading and re-reads after the mutation', async t => {
  const { page, setSpec } = await openEditor(t);
  await openLink(page);
  const read = deferred(t);
  const save = deferred(t);
  const requested = deferred(t);
  let targetReads = 0;
  await routeSecondSpec(page, async () => {
    if (++targetReads === 1) { requested.resolve(); await read.promise; }
  });
  await page.route('**/__specs-update', async r => {
    const body = r.request().postDataJSON();
    assert.equal(body.specId, specId);
    await save.promise;
    const saved = { ...spec, title: body.title };
    setSpec(saved);
    await r.fulfill({ json: { spec: saved, items: [annotation] } });
  });
  await queueLink(page, secondLink);
  await requested.promise;
  const title = page.getByPlaceholder('Untitled spec', { exact: true });
  await title.click();
  await title.fill('Edited while loading');
  const saving = page.waitForRequest('**/__specs-update');
  read.resolve();
  await saving;
  assert.equal(await currentSpecId(page), specId);
  save.resolve();
  await page.evaluate(() => window.pendingLink);
  assert.equal(await currentSpecId(page), secondSpec.id);
  assert.ok(targetReads >= 2, 'the snapshot from before the save must be discarded');
});

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
