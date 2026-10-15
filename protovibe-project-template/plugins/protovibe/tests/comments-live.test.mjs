// Run: PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:comments-live
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { after, before, beforeEach, test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const pluginRoot = process.cwd();
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'pv-comments-'));
const bundleDir = fs.mkdtempSync(path.join(pluginRoot, 'tests/.comments-'));
const commentsDir = path.join(fixture, 'src/comments');
const author = { name: 'Tester', email: 'tester@example.com' };
let browser, server, origin;
const message = (id, content) => ({ id, content, author, createdAt: '2026-01-01T00:00:00Z', seenBy: ['Tester'] });
const meta = id => ({ id, context: { tab: 'app', pathname: '/' }, createdAt: '2026-01-01T00:00:00Z' });
function write(relative, value) {
  const file = path.join(commentsDir, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
}
function thread(id, content) {
  write(`${id}/thread.json`, meta(id));
  write(`${id}/c-first.json`, message('c-first', content));
}
async function openPage() {
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  page.errors = [];
  page.on('pageerror', error => page.errors.push(error.message));
  await page.clock.install();
  await page.goto(origin);
  await page.getByText('Initial comment', { exact: true }).waitFor();
  return page;
}
async function poll(page) {
  await Promise.all([
    page.waitForResponse(r => r.url().endsWith('/__comments-list')),
    page.clock.runFor(2100),
  ]);
  await page.waitForTimeout(60);
}
async function api(endpoint, body = {}) {
  const res = await fetch(`${origin}/${endpoint}`, { method: 'POST', body: JSON.stringify(body) });
  assert.equal(res.status, 200);
  return res.json();
}

before(async () => {
  const ui = (await build({ bundle: true, write: false, format: 'iife',
    plugins: [{ name: 'context-fixture', setup(build) {
      build.onLoad({ filter: /ProtovibeContext\.tsx$/ }, () => ({ loader: 'js', contents:
        'export const useProtovibe = () => ({ currentBaseTarget: null, runLockedMutation: fn => fn() });' }));
    } }],
    stdin: { resolveDir: pluginRoot, loader: 'tsx', contents: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { CommentsTab } from './src/ui/components/CommentsTab';
      const root = createRoot(document.getElementById('root'));
      window.renderPanel = (isActive = true) => root.render(<CommentsTab activeIframeTab="app" isActive={isActive} />);
      window.renderPanel();
    ` },
  })).outputFiles[0].text;
  const backendPath = path.join(bundleDir, 'backend.mjs');
  await build({ entryPoints: ['src/backend/comments-server.ts'], bundle: true, platform: 'node',
    format: 'esm', packages: 'external', outfile: backendPath });
  process.chdir(fixture); // Backend resolves its project-relative storage at import.
  const { registerCommentsMiddleware } = await import(pathToFileURL(backendPath).href);
  process.chdir(pluginRoot);
  const routes = new Map();
  registerCommentsMiddleware({ middlewares: { use: (url, handler) => routes.set(url, handler) } });
  server = createServer((req, res) => {
    if (routes.has(req.url)) return routes.get(req.url)(req, res);
    if (req.url === '/__profile') {
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ profile: author }));
    }
    if (req.url === '/canvas') return res.end('<html><body><div data-pv-comment-first>Original label</div></body></html>');
    if (req.url === '/ui.js') {
      res.setHeader('Content-Type', 'text/javascript');
      return res.end(ui);
    }
    res.end('<html><body><div id="root" style="width:420px;height:800px"></div><script src="/ui.js"></script></body></html>');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
});
beforeEach(() => {
  fs.rmSync(commentsDir, { recursive: true, force: true });
  thread('first', 'Initial comment');
});
after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
  fs.rmSync(fixture, { recursive: true, force: true });
  fs.rmSync(bundleDir, { recursive: true, force: true });
});

test('agent edits update list and open thread while preserving draft and focus; deleted thread returns to list', async () => {
  const page = await openPage();
  try {
    write('first/c-first.json', message('c-first', 'Edited by agent'));
    thread('second', 'New thread from agent');
    await poll(page);
    await page.getByText('New thread from agent', { exact: true }).waitFor();
    await page.getByText('Edited by agent', { exact: true }).click();
    const reply = page.getByPlaceholder('Reply…');
    await reply.fill('My unfinished reply');
    await reply.evaluate(el => el.setSelectionRange(3, 3));
    write('first/c-first.json', message('c-first', 'Edited again'));
    write('first/c-reply.json', { ...message('c-reply', 'Agent reply'), createdAt: '2026-01-02T00:00:00Z' });
    write('first/thread.json', { ...meta('first'), status: 'accepted' });
    await poll(page);
    await page.getByText('Edited again', { exact: true }).waitFor();
    await page.getByText('Agent reply', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Accepted', exact: true }).waitFor();
    assert.equal(await reply.inputValue(), 'My unfinished reply');
    assert.deepEqual(await reply.evaluate(el => [document.activeElement === el, el.selectionStart]), [true, 3]);

    fs.rmSync(path.join(commentsDir, 'first'), { recursive: true });
    await poll(page);
    assert.equal(await reply.inputValue(), 'My unfinished reply');
    await poll(page);
    await poll(page);
    await page.getByPlaceholder('Search all comments…').waitFor();
    assert.equal(await page.getByText('Edited again', { exact: true }).count(), 0);
    await page.getByText('New thread from agent', { exact: true }).click();
    assert.equal(await page.getByPlaceholder('Reply…').inputValue(), '');
    assert.deepEqual(page.errors, []);
  } finally { await page.close(); }
});

test('torn writes and temporary deletion keep the current thread and edit draft intact', async () => {
  const page = await openPage();
  try {
    await page.getByText('Initial comment', { exact: true }).click();
    await page.locator('[data-pv-comment-row="c-first"]').hover();
    await page.locator('[data-tooltip="Edit"]').click();
    const editor = page.locator('textarea').first();
    await editor.fill('Unfinished edit');
    write('first/c-first.json', '{');
    await poll(page);
    await poll(page);
    assert.equal(await editor.inputValue(), 'Unfinished edit');
    write('first/c-first.json', message('c-first', 'Completed disk edit'));
    await poll(page);
    assert.equal(await editor.inputValue(), 'Unfinished edit');
    fs.rmSync(path.join(commentsDir, 'first/thread.json'));
    await poll(page);
    write('first/thread.json', meta('first'));
    await poll(page);
    assert.equal(await editor.inputValue(), 'Unfinished edit');
    fs.rmSync(path.join(commentsDir, 'first/c-first.json'));
    await poll(page);
    await poll(page);
    await poll(page);
    assert.equal(await page.getByRole('button', { name: 'Save', exact: true }).count(), 0);
    await page.getByPlaceholder('Reply…').fill('Reply after message deletion');
    assert.deepEqual(page.errors, []);
  } finally { await page.close(); }
});

test('Accepted persists through API and filters; stale poll cannot overwrite a local status change', async () => {
  const page = await openPage();
  try {
    await page.getByText('Initial comment', { exact: true }).click();
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    let captured;
    const capturedPromise = new Promise(resolve => { captured = resolve; });
    await page.route('**/__comments-list', async route => {
      const response = await route.fetch();
      captured();
      await gate;
      await route.fulfill({ response });
    }, { times: 1 });
    await page.clock.runFor(2100);
    await capturedPromise;
    await page.getByRole('button', { name: 'No status', exact: true }).click();
    await page.getByRole('button', { name: 'Accepted', exact: true }).click();
    await page.getByRole('button', { name: 'Accepted', exact: true }).waitFor();
    release();
    await page.waitForTimeout(100);
    assert.equal(await page.getByRole('button', { name: 'Accepted', exact: true }).count(), 1);
    assert.equal(JSON.parse(fs.readFileSync(path.join(commentsDir, 'first/thread.json'))).status, 'accepted');
    await page.getByRole('button', { name: 'Back to all threads' }).click();
    await page.getByTestId('comments-filter-status').click();
    await page.getByRole('button', { name: 'Accepted', exact: true }).click();
    await page.getByText('Initial comment', { exact: true }).waitFor();
    await api('__comments-update-status', { threadId: 'first', status: 'closed' });
    await poll(page);
    assert.equal(await page.getByText('Initial comment', { exact: true }).count(), 0);
    assert.deepEqual(page.errors, []);
  } finally { await page.close(); }
});

test('polling pauses for inactive and hidden panels, recovers after network failure', async () => {
  const page = await openPage();
  try {
    await page.evaluate(() => window.renderPanel(false));
    await page.waitForTimeout(100);
    let reads = 0;
    page.on('request', req => { if (req.url().endsWith('/__comments-list')) reads++; });
    write('first/c-first.json', message('c-first', 'While inactive'));
    await page.clock.runFor(6000);
    assert.equal(reads, 0);
    await page.evaluate(() => window.renderPanel(true));
    await page.getByText('While inactive', { exact: true }).waitFor();
    await page.evaluate(() => Object.defineProperty(document, 'hidden', { configurable: true, value: true }));
    reads = 0;
    await page.clock.runFor(6000);
    assert.equal(reads, 0);
    await page.evaluate(() => Object.defineProperty(document, 'hidden', { configurable: true, value: false }));
    await page.route('**/__comments-list', route => route.abort(), { times: 1 });
    await page.clock.runFor(2100);
    await page.waitForTimeout(60);
    assert.equal(await page.getByText('While inactive', { exact: true }).count(), 1);
    write('first/c-first.json', message('c-first', 'After reconnect'));
    await poll(page);
    await page.getByText('After reconnect', { exact: true }).waitFor();
    assert.deepEqual(page.errors, []);
  } finally { await page.close(); }
});


test('pending writes pause reads and a failed reply keeps the draft', async () => {
  const page = await openPage();
  try {
    await page.getByText('Initial comment', { exact: true }).click();
    const reply = page.getByPlaceholder('Reply…');
    await reply.fill('Keep this reply on failure');
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await page.route('**/__comments-reply', async route => {
      await gate;
      await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Thread not found' }) });
    });
    await page.getByRole('button', { name: 'Reply', exact: true }).click();
    let reads = 0;
    page.on('request', req => { if (req.url().endsWith('/__comments-list')) reads++; });
    await page.evaluate(() => window.dispatchEvent(new Event('pv-comments-refresh')));
    await page.clock.runFor(6000);
    assert.equal(reads, 0);
    release();
    await page.getByText('Error: Thread not found', { exact: true }).waitFor();
    assert.equal(await reply.inputValue(), 'Keep this reply on failure');
    await poll(page);
    assert.equal(await reply.inputValue(), 'Keep this reply on failure');
    assert.deepEqual(page.errors, []);
  } finally { await page.close(); }
});

test('snapshot diagnoses invalid files, preserves legacy compatibility and accepts new status', async () => {
  write('comment-legacy.json', { ...meta('legacy'), status: 'To review', comments: [message('old', 'Legacy')] });
  write('first/broken.json', '{');
  write('first/invalid.json', { id: 'invalid', content: 'Missing author' });
  const snapshot = await api('__comments-list');
  assert.deepEqual(snapshot.unreadable.sort(), ['first/broken.json', 'first/invalid.json']);
  assert.equal(snapshot.threads.find(t => t.id === 'legacy').status, 'review');
  assert.equal(snapshot.threads.find(t => t.id === 'first').comments.length, 1);
  await api('__comments-update-status', { threadId: 'legacy', status: 'accepted' });
  assert.equal((await api('__comments-list')).threads.find(t => t.id === 'legacy').status, 'accepted');
});

for (const mode of ['all', 'unread', 'search']) {
  test(`Next/Prev keeps the opening order after a reply (${mode}) until returning to the list`, async () => {
    thread('second', 'Middle comment');
    thread('third', 'Oldest comment');
    for (const [id, content, day] of [
      ['first', 'Initial comment', '03'], ['second', 'Middle comment', '02'], ['third', 'Oldest comment', '01'],
    ]) {
      write(`${id}/c-first.json`, {
        ...message('c-first', content), createdAt: `2026-01-${day}T00:00:00Z`, seenBy: [],
      });
    }
    const page = await openPage();
    try {
      if (mode === 'unread') {
        await page.getByTestId('comments-filter-status').click();
        await page.getByText('Unread', { exact: true }).click();
      } else if (mode === 'search') {
        await page.getByPlaceholder('Search all comments…').fill('comment');
      }
      await page.getByText('Middle comment', { exact: true }).click();
      await page.getByPlaceholder('Reply…').fill('My comment reply');
      await page.getByRole('button', { name: 'Reply', exact: true }).click();
      await page.getByText('My comment reply', { exact: true }).waitFor();
      // Even switching panels must preserve this browsing session.
      await page.evaluate(() => window.renderPanel(false));
      await page.waitForTimeout(60);
      await page.evaluate(() => window.renderPanel(true));
      await page.getByRole('button', { name: 'Next comment', exact: true }).click();
      await page.getByText('Thread third', { exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Next comment', exact: true }).isDisabled(), true);
      await page.getByRole('button', { name: 'Previous comment', exact: true }).click();
      await page.getByText('Thread second', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Previous comment', exact: true }).click();
      await page.getByText('Thread first', { exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Previous comment', exact: true }).isDisabled(), true);
      await page.getByRole('button', { name: 'Back to all threads' }).click();
      if (mode === 'unread') {
        // The refreshed unread list now excludes the threads just visited.
        assert.equal(await page.getByText('Middle comment', { exact: true }).count(), 0);
        await page.getByRole('button', { name: 'Clear filter', exact: true }).click();
      }
      await page.getByText('My comment reply', { exact: true }).click();
      assert.equal(await page.getByRole('button', { name: 'Previous comment', exact: true }).isDisabled(), true);
      await page.getByRole('button', { name: 'Next comment', exact: true }).click();
      await page.getByText('Thread first', { exact: true }).waitFor();
      assert.deepEqual(page.errors, []);
    } finally { await page.close(); }
  });
}

test('navigation skips deleted neighbours and includes new threads only after returning to the list', async () => {
  thread('second', 'Middle comment');
  thread('third', 'Oldest comment');
  write('first/c-first.json', { ...message('c-first', 'Initial comment'), createdAt: '2026-01-03T00:00:00Z' });
  write('second/c-first.json', { ...message('c-first', 'Middle comment'), createdAt: '2026-01-02T00:00:00Z' });
  const page = await openPage();
  try {
    await page.getByText('Initial comment', { exact: true }).click();
    thread('newest', 'New comment');
    write('newest/c-first.json', { ...message('c-first', 'New comment'), createdAt: '2026-01-04T00:00:00Z' });
    fs.rmSync(path.join(commentsDir, 'second'), { recursive: true });
    await poll(page);
    await poll(page);
    await poll(page);
    assert.equal(await page.getByRole('button', { name: 'Previous comment', exact: true }).isDisabled(), true);
    await page.getByRole('button', { name: 'Next comment', exact: true }).click();
    await page.getByText('Thread third', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Previous comment', exact: true }).click();
    await page.getByText('Thread first', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Back to all threads' }).click();
    await page.getByText('Initial comment', { exact: true }).click();
    await page.getByRole('button', { name: 'Previous comment', exact: true }).click();
    await page.getByText('Thread newest', { exact: true }).waitFor();
    assert.deepEqual(page.errors, []);
  } finally { await page.close(); }
});

test('live refresh preserves the canvas preview of an unsaved wording suggestion', async () => {
  const page = await openPage();
  try {
    await page.evaluate(() => {
      const frame = document.createElement('iframe');
      frame.dataset.testCanvas = '';
      frame.src = '/canvas';
      document.body.appendChild(frame);
    });
    const canvas = page.frameLocator('[data-test-canvas]');
    await canvas.getByText('Original label', { exact: true }).waitFor();
    await page.getByText('Initial comment', { exact: true }).click();
    await page.locator('[data-tooltip="Suggest wording change"]').click();
    await page.getByPlaceholder('Suggested wording…').fill('Unsaved wording');
    await canvas.getByText('Unsaved wording', { exact: true }).waitFor();
    await poll(page);
    assert.equal(await canvas.getByText('Unsaved wording', { exact: true }).count(), 1);
    assert.equal(await page.getByPlaceholder('Suggested wording…').inputValue(), 'Unsaved wording');
    assert.deepEqual(page.errors, []);
  } finally { await page.close(); }
});

test('finishing a reply after Next does not erase the next thread draft', async () => {
  thread('second', 'Second comment');
  write('first/c-first.json', { ...message('c-first', 'Initial comment'), createdAt: '2026-01-03T00:00:00Z' });
  const page = await openPage();
  let release;
  try {
    await page.getByText('Initial comment', { exact: true }).click();
    const gate = new Promise(resolve => { release = resolve; });
    let captured;
    const capturedPromise = new Promise(resolve => { captured = resolve; });
    await page.route('**/__comments-reply', async route => {
      const response = await route.fetch();
      captured();
      await gate;
      await route.fulfill({ response });
    });
    await page.getByPlaceholder('Reply…').fill('Reply in the first thread');
    await page.getByRole('button', { name: 'Reply', exact: true }).click();
    await capturedPromise;
    await page.getByRole('button', { name: 'Next comment', exact: true }).click();
    await page.getByText('Thread second', { exact: true }).waitFor();
    await page.getByPlaceholder('Reply…').fill('Draft in the second thread');
    const refreshed = page.waitForResponse(r => r.url().endsWith('/__comments-list'));
    release();
    await refreshed;
    await page.waitForTimeout(60);
    assert.equal(await page.getByPlaceholder('Reply…').inputValue(), 'Draft in the second thread');
    assert.deepEqual(page.errors, []);
  } finally { release?.(); await page.close(); }
});

test('legacy message overlays do not report missing metadata, but malformed metadata still does', async () => {
  write('comment-legacy.json', { ...meta('legacy'), comments: [message('old', 'Legacy message')] });
  await api('__comments-set-seen', { threadId: 'legacy', commentId: 'old', name: 'Reviewer', seen: true });
  assert.equal(fs.existsSync(path.join(commentsDir, 'legacy/thread.json')), false);
  const snapshot = await api('__comments-list');
  assert.equal(snapshot.threads.find(t => t.id === 'legacy').comments[0].seenBy.includes('Reviewer'), true);
  assert.deepEqual(snapshot.unreadable, []);
  write('legacy/thread.json', '{');
  assert.deepEqual((await api('__comments-list')).unreadable, ['legacy/thread.json']);
  fs.rmSync(path.join(commentsDir, 'legacy/thread.json'));
  const page = await openPage();
  try {
    // The initial read must include this valid thread without waiting for polls.
    assert.equal(await page.getByText('Legacy message', { exact: true }).count(), 1);
  } finally { await page.close(); }
});

test('refresh event during temporary thread disappearance preserves the draft and still confirms permanent deletion', async () => {
  const page = await openPage();
  const original = path.join(commentsDir, 'first');
  const temporary = path.join(fixture, 'temporarily-moved-thread');
  try {
    await page.getByText('Initial comment', { exact: true }).click();
    await page.getByPlaceholder('Reply…').fill('Must survive a temporary missing directory');
    fs.renameSync(original, temporary);
    await Promise.all([
      page.waitForResponse(r => r.url().endsWith('/__comments-list')),
      page.evaluate(() => window.dispatchEvent(new Event('pv-comments-refresh'))),
    ]);
    await page.waitForTimeout(100);
    fs.renameSync(temporary, original);
    assert.equal(await page.getByPlaceholder('Reply…').inputValue(), 'Must survive a temporary missing directory');
    await poll(page);
    assert.equal(await page.getByPlaceholder('Reply…').inputValue(), 'Must survive a temporary missing directory');
    fs.rmSync(original, { recursive: true });
    await poll(page);
    await poll(page);
    await poll(page);
    await page.getByPlaceholder('Search all comments…').waitFor();
    assert.deepEqual(page.errors, []);
  } finally {
    if (fs.existsSync(temporary)) fs.renameSync(temporary, original);
    await page.close();
  }
});

test('confirmed local deletions update immediately without waiting for polls', async () => {
  write('first/c-reply.json', { ...message('c-reply', 'Reply to delete'), createdAt: '2026-01-02T00:00:00Z' });
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  try {
    // Pause automatic polling; the mutation refresh must be sufficient.
    await page.addInitScript(() => Object.defineProperty(document, 'hidden', { configurable: true, value: true }));
    await page.goto(origin);
    await page.getByText('Reply to delete', { exact: true }).click();
    await page.locator('[data-pv-comment-row="c-reply"]').hover();
    await page.locator('[data-tooltip="Delete"]').click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByText('Reply to delete', { exact: true }).waitFor({ state: 'detached' });
    await page.locator('[data-tooltip="Delete thread"]').click();
    await page.getByRole('button', { name: 'Delete thread', exact: true }).click();
    await page.getByPlaceholder('Search all comments…').waitFor();
    assert.equal(await page.getByText('Initial comment', { exact: true }).count(), 0);
  } finally { await page.close(); }
});
