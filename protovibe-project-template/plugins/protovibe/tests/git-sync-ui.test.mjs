// Run: PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chromium pnpm run test:git-sync-ui
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { before, after, test } from 'node:test';
import { build } from 'esbuild';
import { chromium } from 'playwright';

let browser, harness;
before(async () => {
  harness = (await build({
    bundle: true, write: false, format: 'iife',
    stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
      import React, { useLayoutEffect } from 'react';
      import { createRoot } from 'react-dom/client';
      import { useGitSync } from './src/ui/hooks/useGitSync';
      import { GitSyncBanner } from './src/ui/components/GitSyncBanner';
      function App() {
        const git = useGitSync();
        useLayoutEffect(() => {
          window.git = git;
          window.renders.push({ visible: git.bannerVisible, op: git.op.status, behind: git.status?.behind });
        });
        return <GitSyncBanner git={git} />;
      }
      createRoot(document.getElementById('root')).render(<App />);
    ` },
  })).outputFiles[0].text;
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
});
after(async () => { await browser?.close(); });

async function openPage(t, { clock = false } = {}) {
  const page = await browser.newPage();
  t.after(() => page.close());
  if (clock) await page.clock.install();
  await page.setContent('<body style="background:#212121;font-family:system-ui"><div id="root"></div></body>');
  await page.evaluate(() => {
    window.renders = [];
    window.toasts = [];
    window.menuOpens = 0;
    window.addEventListener('pv-git-menu-open', () => window.menuOpens++);
    window.addEventListener('pv-toast', event => window.toasts.push(event.detail));
    window.api = {
      status: {
        gitInstalled: true, isRepo: true, root: '/project', branch: 'main',
        hasUpstream: true, hasOrigin: true, dirty: false, changedCount: 0,
        ahead: 0, behind: 1, incomingAuthors: ['John Smith'], mergeInProgress: false,
        remoteUrl: null, remoteKind: null,
      },
      startFails: false, starts: 0,
      op: { status: 'success', message: 'Synced', op: 'sync' },
      holdNextStatus: false, failNextStatus: false, pending: [], statusRequests: [],
    };
    // Exercise the real client/hook/React/banner with controllable API timing.
    window.fetch = async url => {
      const json = body => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
      if (url.startsWith('/__git-status')) {
        window.api.statusRequests.push(url);
        if (window.api.holdNextStatus) {
          window.api.holdNextStatus = false;
          return new Promise(resolve => window.api.pending.push(status => resolve(json(status))));
        }
        if (window.api.failNextStatus) {
          window.api.failNextStatus = false;
          return new Response('', { status: 500 });
        }
        return json(window.api.status);
      }
      if (url === '/__git-op-start') {
        window.api.starts++;
        if (window.api.startFails) throw new Error('Offline');
        return json({ success: true });
      }
      if (url === '/__git-op-status') return json(window.api.op);
      throw new Error('Unexpected request: ' + url);
    };
  });
  await page.addScriptTag({ content: harness });
  await page.getByText('John Smith made changes').waitFor();
  await page.evaluate(() => window.git.refresh());
  return page;
}

test('banner sync keeps its button width, shows success for two seconds, then allows new authors', async t => {
  const page = await openPage(t, { clock: true });
  const capture = async name => {
    if (!process.env.SCREENSHOT_DIR) return;
    await mkdir(process.env.SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/${name}.png` });
  };
  const button = page.getByRole('button', { name: 'Sync', exact: true });
  const initial = await button.boundingBox();
  const copy = page.getByText('John Smith made changes', { exact: true });
  const banner = copy.locator('..');
  const initialBanner = await banner.boundingBox();
  await capture('01-banner');
  await page.evaluate(() => { window.api.holdNextStatus = true; });
  await button.click();
  const syncing = page.getByRole('button', { name: 'Syncing', exact: true });
  assert.equal(await syncing.isDisabled(), true);
  assert.equal((await syncing.boundingBox()).width, initial.width);
  assert.equal(await copy.isVisible(), true);
  assert.deepEqual(await banner.boundingBox(), initialBanner);
  await capture('02-syncing');
  await page.clock.runFor(1100);
  await page.waitForFunction(() => window.api.pending.length === 1);
  assert.equal(await page.evaluate(() => window.git.busy), true);
  await page.evaluate(() => window.git.runOp('sync'));
  assert.equal(await page.evaluate(() => window.api.starts), 1);
  await page.evaluate(() => {
    window.api.status = { ...window.api.status, behind: 0, incomingAuthors: [] };
    window.api.pending.shift()(window.api.status);
  });
  const synced = page.getByRole('button', { name: 'Synced', exact: true });
  await synced.waitFor();
  assert.equal(await synced.isDisabled(), true);
  assert.equal((await synced.boundingBox()).width, initial.width);
  assert.equal(await copy.isVisible(), true);
  assert.deepEqual(await banner.boundingBox(), initialBanner);
  assert.deepEqual(await page.evaluate(() => window.toasts), []);
  await capture('03-synced');
  await page.clock.runFor(1900);
  assert.equal(await synced.count(), 1);
  await page.clock.runFor(101);
  assert.equal(await synced.count(), 0);
  await capture('04-dismissed');
  await page.evaluate(async () => {
    window.api.status = { ...window.api.status, behind: 2, incomingAuthors: ['Anna Kowalska', 'John Smith'] };
    await window.git.refresh();
  });
  await page.getByText('Anna Kowalska, John Smith made changes').waitFor();
});

test('a status request started before Sync cannot restore the old banner afterwards', async t => {
  const page = await openPage(t);
  await page.evaluate(() => {
    window.api.holdNextStatus = true;
    window.oldStatus = { ...window.api.status };
    void window.git.refresh();
  });
  await page.waitForFunction(() => window.api.pending.length === 1);
  await page.evaluate(() => {
    window.renders = [];
    window.api.status = { ...window.api.status, behind: 0, incomingAuthors: [] };
  });
  await page.getByRole('button', { name: 'Sync', exact: true }).click();
  await page.waitForFunction(() => window.git.op.status === 'success');
  await page.evaluate(async () => {
    window.api.pending.shift()(window.oldStatus);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  assert.equal(await page.evaluate(() => window.git.status.behind), 0);
  await page.waitForFunction(() => window.git.bannerFeedback === null);
  assert.equal(await page.evaluate(() => window.git.bannerVisible), false);
});

test('a failed final status read never redisplays the pre-sync banner', async t => {
  const page = await openPage(t);
  await page.evaluate(() => {
    window.renders = [];
    window.api.failNextStatus = true;
  });
  await page.getByRole('button', { name: 'Sync', exact: true }).click();
  await page.waitForFunction(() => window.git.op.status === 'success');
  await page.waitForFunction(() => window.git.bannerFeedback === null);
  assert.equal(await page.evaluate(() => window.git.bannerVisible), false);
  await page.evaluate(async () => {
    window.api.status = { ...window.api.status, behind: 0, incomingAuthors: [] };
    await window.git.refresh();
  });
  await page.waitForFunction(() => window.git.status.behind === 0);
  assert.equal(await page.evaluate(() => window.git.bannerVisible), false);
});

test('agent recovery clears conflict guidance and restores notifications, but unfinished merges do not', async t => {
  const page = await openPage(t);
  await page.evaluate(() => {
    window.api.status = { ...window.api.status, ahead: 1 };
    window.api.op = { status: 'error', conflict: true, message: 'Sync paused', op: 'sync' };
  });
  await page.getByRole('button', { name: 'Sync', exact: true }).click();
  await page.waitForFunction(() => window.git.op.conflict === true);
  await page.evaluate(async () => {
    window.api.status = { ...window.api.status, ahead: 0, behind: 0, mergeInProgress: true };
    await window.git.refresh();
  });
  assert.equal(await page.evaluate(() => window.git.op.conflict), true);
  // The agent pushed, and another teammate committed before the next poll.
  await page.evaluate(async () => {
    window.api.status = { ...window.api.status, mergeInProgress: false, behind: 2, incomingAuthors: ['Anna Kowalska'] };
    await window.git.refresh();
  });
  await page.waitForFunction(() => window.git.op.status === 'idle');
  await page.getByText('Anna Kowalska made changes').waitFor();
});

test('a detached rebase keeps polling locally and resumes notifications after agent recovery', async t => {
  const page = await openPage(t, { clock: true });
  await page.evaluate(() => {
    window.api.status = { ...window.api.status, ahead: 1 };
    window.api.op = { status: 'error', conflict: true, message: 'Sync paused', op: 'sync' };
    void window.git.runOp('sync');
  });
  await page.clock.runFor(1100);
  await page.waitForFunction(() => window.git.op.conflict === true);
  await page.evaluate(async () => {
    window.api.status = { ...window.api.status, hasUpstream: false, branch: 'HEAD', mergeInProgress: true };
    await window.git.refresh();
  });
  await page.waitForFunction(() => window.git.status.hasUpstream === false);
  await page.evaluate(() => { window.api.statusRequests = []; });
  await page.clock.runFor(120100);
  const requests = await page.evaluate(() => window.api.statusRequests);
  assert.ok(requests.length > 0, 'detached HEAD must still poll local status');
  assert.ok(requests.every(url => !url.includes('fetch=1')), 'do not fetch without an upstream');
  assert.equal(await page.evaluate(() => window.git.op.conflict), true);
  // The agent finishes and pushes; the user does not manually refresh or reopen the menu.
  await page.evaluate(() => {
    window.api.status = { ...window.api.status, hasUpstream: true, branch: 'main', ahead: 0,
      behind: 1, mergeInProgress: false, incomingAuthors: ['Anna Kowalska'] };
    window.api.statusRequests = [];
  });
  await page.clock.runFor(120100);
  await page.waitForFunction(() => window.git.op.status === 'idle');
  await page.getByText('Anna Kowalska made changes').waitFor();
  assert.ok(await page.evaluate(() => window.api.statusRequests.some(url => url.includes('fetch=1'))));
});

test('failure stops the spinner and allows a retry', async t => {
  const page = await openPage(t);
  await page.evaluate(() => { window.api.op = { status: 'error', message: 'Network unavailable', op: 'sync' }; });
  await page.getByRole('button', { name: 'Sync', exact: true }).click();
  await page.waitForFunction(() => window.git.op.status === 'error');
  assert.equal(await page.getByRole('button', { name: 'Sync', exact: true }).isEnabled(), true);
  assert.equal(await page.evaluate(() => window.git.bannerFeedback), null);
  assert.equal(await page.evaluate(() => window.toasts[0].variant), 'error');
  assert.equal(await page.evaluate(() => window.menuOpens), 1);
});

test('menu sync retains its success toast', async t => {
  const page = await openPage(t);
  await page.evaluate(() => window.git.runOp('sync'));
  assert.equal(await page.evaluate(() => window.git.bannerFeedback), null);
  assert.equal(await page.evaluate(() => window.toasts[0].variant), 'success');
});

test('a rejected start clears loading and opens recovery guidance', async t => {
  const page = await openPage(t);
  await page.evaluate(() => { window.api.startFails = true; });
  await page.getByRole('button', { name: 'Sync', exact: true }).click();
  await page.waitForFunction(() => window.git.op.status === 'error');
  assert.equal(await page.evaluate(() => window.git.busy), false);
  assert.equal(await page.evaluate(() => window.git.bannerFeedback), null);
  assert.equal(await page.evaluate(() => window.menuOpens), 1);
});
