import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const pluginRoot = fileURLToPath(new URL('../', import.meta.url));
let buildDir, backend, client, browser;
before(async () => {
  buildDir = await mkdtemp(path.join(tmpdir(), 'pv-app-path-build-'));
  const outfile = path.join(buildDir, 'backend.mjs');
  await build({
    entryPoints: [path.join(pluginRoot, 'src/backend/app-path.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
  });
  backend = await import(pathToFileURL(outfile).href);
  const result = await build({
    stdin: {
      resolveDir: pluginRoot,
      loader: 'tsx',
      contents: `
    import React, {useState} from 'react';
    import {createRoot} from 'react-dom/client';
    import * as paths from './src/ui/utils/appPath';
    window.paths = paths;
    const root = createRoot(document.getElementById('root'));
    function Preview() {
      const [src] = useState(paths.readPersistedAppPath);
      return <iframe src={src} onLoad={e => {
        const loc = e.currentTarget.contentWindow.location;
        paths.setCurrentAppPath(loc.pathname + loc.search + loc.hash);
      }}/>;
    }
    let key = 0;
    window.remount = () => root.render(<Preview key={++key}/>);
    window.remount();
  `,
    },
    bundle: true,
    format: 'iife',
    write: false,
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  client = result.outputFiles[0].text;
  browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  });
});
after(async () => {
  await browser?.close();
  await rm(buildDir, { recursive: true, force: true });
});

async function fixture(t, existingRoot) {
  const dir = await mkdtemp(path.join(tmpdir(), 'pv-app-path-'));
  let project = existingRoot || path.join(dir, 'a');
  await mkdir(project, { recursive: true });
  let held = null;
  const server = createServer((req, res) => {
    if (req.url === '/__app-path') {
      const root = project;
      if (held && req.method === 'POST')
        held.push(() => backend.handleAppPath(root, req, res));
      else void backend.handleAppPath(root, req, res);
    } else if (req.url === '/client.js') {
      res.setHeader('Content-Type', 'text/javascript');
      res.end(client);
    } else if (req.url === '/shell') {
      res.setHeader('Content-Type', 'text/html');
      res.end(
        `<!doctype html><html><head>${backend.appPathBootstrap(project)}</head><body><div id="root"></div><script src="/client.js"></script></body></html>`,
      );
    } else {
      res.setHeader('Content-Type', 'text/html');
      res.end('<!doctype html><html><body>Preview content</body></html>');
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  });
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    root: project,
    useProject: (root) => {
      project = root;
    },
    holdWrites: () => {
      held = [];
    },
    releaseWrites: async () => {
      const pending = held;
      held = null;
      await Promise.all(pending.map((fn) => fn()));
    },
    disk: () => backend.readAppPath(project),
    key: () =>
      JSON.parse(backend.appPathBootstrap(project).match(/>(.*)</)[1])
        .projectKey,
  };
}
async function open(t, f, options = {}) {
  const context = await browser.newContext();
  t.after(() => context.close());
  if (options.blockStorage)
    await context.addInitScript(() =>
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('disabled');
        },
      }),
    );
  const page = await context.newPage();
  await page.goto(f.origin + '/shell');
  await ready(page);
  return page;
}
async function ready(page) {
  await page.waitForFunction(
    () =>
      document.querySelector('iframe')?.contentDocument?.readyState ===
      'complete',
  );
}
async function navigate(page, value) {
  await page.evaluate((value) => {
    const win = document.querySelector('iframe').contentWindow;
    win.history.pushState({}, '', value);
    window.paths.persistAppPath(value);
  }, value);
}
const current = (page) =>
  page.evaluate(() => {
    const l = document.querySelector('iframe').contentWindow.location;
    return l.pathname + l.search + l.hash;
  });
async function saved(f, value) {
  for (let i = 0; i < 100; i++) {
    if (f.disk().path === value) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  assert.equal(f.disk().path, value);
}

test('deep URLs survive repeated React remounts, shell reloads, and a fresh browser context', async (t) => {
  const f = await fixture(t);
  const page = await open(t, f);
  const value = '/employees?dialog=details#salary';
  await navigate(page, value);
  await saved(f, value);
  for (let i = 0; i < 3; i++) {
    const old = await page.locator('iframe').elementHandle();
    await page.evaluate(() => window.remount());
    await page.waitForFunction((old) => !old.isConnected, old);
    await ready(page);
    assert.equal(await current(page), value);
  }
  for (let i = 0; i < 2; i++) {
    await page.reload();
    await ready(page);
    assert.equal(await current(page), value);
  }
  const fresh = await open(t, f);
  assert.equal(await current(fresh), value);
  const json = JSON.parse(
    await readFile(
      path.join(f.root, '.protovibe-local-data/preview.json'),
      'utf8',
    ),
  );
  assert.equal(json.path, value);
});

test('project isolation survives port reuse and a project moving to another port', async (t) => {
  const f = await fixture(t);
  const page = await open(t, f);
  await navigate(page, '/project-a?x=1#tab');
  await saved(f, '/project-a?x=1#tab');
  const second = path.join(f.root, '..', 'b');
  await mkdir(second);
  f.useProject(second);
  await page.reload();
  await ready(page);
  assert.equal(await current(page), '/');
  await navigate(page, '/project-b');
  await saved(f, '/project-b');
  f.useProject(f.root);
  await page.reload();
  await ready(page);
  assert.equal(await current(page), '/project-a?x=1#tab');
  const newPort = await fixture(t, f.root);
  const reopened = await open(t, newPort);
  assert.equal(await current(reopened), '/project-a?x=1#tab');
});

test('an immediate reload keeps the URL while disk writes are pending; late writes cannot undo newer navigation', async (t) => {
  const f = await fixture(t);
  const page = await open(t, f);
  f.holdWrites();
  await navigate(page, '/pending?q=1#hash');
  await page.reload();
  await ready(page);
  assert.equal(await current(page), '/pending?q=1#hash');
  await navigate(page, '/newest');
  await page.waitForTimeout(100);
  await f.releaseWrites();
  await saved(f, '/newest');
  const response = await fetch(f.origin + '/__app-path', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: '/stale', updatedAt: 1, projectKey: f.key() }),
  });
  assert.equal(response.status, 200);
  assert.equal(f.disk().path, '/newest');
});

test('full document navigation and Home persist even with browser storage disabled', async (t) => {
  const f = await fixture(t);
  const page = await open(t, f, { blockStorage: true });
  await page.evaluate(
    () =>
      (document.querySelector('iframe').contentWindow.location.href =
        '/full-navigation?q=1#hash'),
  );
  await saved(f, '/full-navigation?q=1#hash');
  await page.reload();
  await ready(page);
  assert.equal(await current(page), '/full-navigation?q=1#hash');
  await page.evaluate(
    () => (document.querySelector('iframe').contentWindow.location.href = '/'),
  );
  await saved(f, '/');
  await page.reload();
  await ready(page);
  assert.equal(await current(page), '/');
});

test('unsafe URLs and invalid payloads are rejected without replacing the saved URL', async (t) => {
  const f = await fixture(t);
  const page = await open(t, f);
  await navigate(page, '/safe');
  await saved(f, '/safe');
  for (const value of [
    '//evil.example',
    '/\\evil.example',
    '/\n/evil.example',
    'https://evil.example',
    '/protovibe.html',
    '/a/../protovibe.html',
  ]) {
    const response = await fetch(f.origin + '/__app-path', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: value, updatedAt: Date.now() + 1 }),
    });
    assert.equal(response.status, 400, value);
    await page.evaluate((value) => window.paths.persistAppPath(value), value);
    assert.equal(
      await page.evaluate(() => window.paths.getCurrentAppPath()),
      '/safe',
    );
  }
  const response = await fetch(f.origin + '/__app-path', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'not json',
  });
  assert.equal(response.status, 400);
  assert.equal(f.disk().path, '/safe');
});

test('writes from an old project cannot overwrite a new project on the same port', async (t) => {
  const f = await fixture(t);
  const oldKey = f.key();
  const second = path.join(f.root, '..', 'b');
  await mkdir(second);
  f.useProject(second);
  const response = await fetch(f.origin + '/__app-path', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path: '/old-project',
      updatedAt: Date.now(),
      projectKey: oldKey,
    }),
  });
  assert.equal(response.status, 409);
  assert.equal(f.disk().path, '/');
});
