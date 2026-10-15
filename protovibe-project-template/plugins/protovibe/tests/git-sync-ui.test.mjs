// Run: PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chromium pnpm run test:git-sync-ui
import assert from 'node:assert/strict';
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

async function openPage(t) {
  const page = await browser.newPage();
  t.after(() => page.close());
  await page.setContent('<div id="root"></div>');
  await page.evaluate(() => {
    window.renders = [];
    window.api = {
      status: {
        gitInstalled: true, isRepo: true, root: '/project', branch: 'main',
        hasUpstream: true, hasOrigin: true, dirty: false, changedCount: 0,
        ahead: 0, behind: 1, incomingAuthors: ['John Smith'], mergeInProgress: false,
        remoteUrl: null, remoteKind: null,
      },
      op: { status: 'success', message: 'Synced', op: 'sync' },
      holdNextStatus: false, failNextStatus: false, pending: [],
    };
    // Exercise the real client/hook/React/banner with controllable API timing.
    window.fetch = async url => {
      const json = body => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
      if (url.startsWith('/__git-status')) {
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
      if (url === '/__git-op-start') return json({ success: true });
      if (url === '/__git-op-status') return json(window.api.op);
      throw new Error('Unexpected request: ' + url);
    };
  });
  await page.addScriptTag({ content: harness });
  await page.getByText('John Smith made changes').waitFor();
  await page.evaluate(() => window.git.refresh());
  return page;
}

test('Sync keeps the banner hidden until the final status arrives, then shows future authors', async t => {
  const page = await openPage(t);
  await page.evaluate(() => {
    window.renders = [];
    window.api.holdNextStatus = true;
  });
  await page.getByRole('button', { name: 'Sync', exact: true }).click();
  await page.waitForFunction(() => window.api.pending.length === 1);
  assert.equal(await page.getByRole('button', { name: 'Sync', exact: true }).count(), 0);
  assert.equal(await page.evaluate(() => window.git.busy), true);
  await page.evaluate(() => {
    window.api.status = { ...window.api.status, behind: 0, incomingAuthors: [] };
    window.api.pending.shift()(window.api.status);
  });
  await page.waitForFunction(() => window.git.op.status === 'success');
  assert.equal(await page.evaluate(() => window.renders.some(render => render.visible)), false);
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
  assert.equal(await page.evaluate(() => window.renders.some(render => render.visible)), false);
});

test('a failed final status read never redisplays the pre-sync banner', async t => {
  const page = await openPage(t);
  await page.evaluate(() => {
    window.renders = [];
    window.api.failNextStatus = true;
  });
  await page.getByRole('button', { name: 'Sync', exact: true }).click();
  await page.waitForFunction(() => window.git.op.status === 'success');
  assert.equal(await page.evaluate(() => window.renders.some(render => render.visible)), false);
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
