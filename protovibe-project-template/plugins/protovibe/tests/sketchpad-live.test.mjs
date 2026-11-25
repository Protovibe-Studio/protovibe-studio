// Run: node --test tests/sketchpad-live.test.mjs
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { after, before, test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';

let browser, server, origin;
let registry, reads, imports;
let unavailable = new Set();
const frame = (id) => ({ id, name: id, width: 300, height: 200, canvasX: 0, canvasY: 0 });
const pad = (id, frames) => ({ id, name: id, createdAt: '2026-01-01', frames });
before(async () => {
  const ui = (await build({ bundle: true, write: false, format: 'esm',
    plugins: [{ name: 'empty-component-catalog', setup(build) {
      build.onLoad({ filter: /SketchpadApp\.tsx$/ }, async ({ path }) => ({ loader: 'tsx',
        contents: fs.readFileSync(path, 'utf8').replace("import.meta.glob('/src/components/**/*.{tsx,jsx}', { eager: true })", '{}'),
      }));
    } }],
    stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { SketchpadApp } from './src/sketchpads/components/SketchpadApp';
      import { importFrameModule } from './src/sketchpads/frame-modules';
      window.loadFrame = importFrameModule;
      createRoot(document.getElementById('root')).render(<React.StrictMode><SketchpadApp /></React.StrictMode>);
    ` },
  })).outputFiles[0].text;
  server = createServer((req, res) => {
    if (req.url === '/ui.js') {
      res.setHeader('Content-Type', 'text/javascript');
      return res.end(ui);
    }
    if (req.url.startsWith('/src/sketchpads/')) {
      imports.push(req.url.split('?')[0]);
      if (unavailable.has(req.url.split('/').pop().split('.')[0])) {
        res.statusCode = 503;
        return res.end('File still being written');
      }
      res.setHeader('Content-Type', 'text/javascript');
      return res.end(`export default () => ${JSON.stringify('content:' + req.url.split('/').pop().split('.')[0])}`);
    }
    if (req.url === '/__sketchpad-list') {
      reads++;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify(registry));
    }
    if (req.method === 'POST' || req.url === '/__get-components') {
      res.setHeader('Content-Type', 'application/json');
      return res.end('{}');
    }
    res.end('<html><body style="margin:0"><div id="root" style="height:800px;width:1200px"></div><script type="module" src="/ui.js"></script></body></html>');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

test('refreshes visible registry, imports only new active frames, and pauses while hidden', async () => {
  reads = 0; imports = [];
  registry = { sketchpads: [pad('first', [frame('original')]), pad('other', [frame('inactive')])] };
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.clock.install();
  await page.goto(origin);
  await page.getByText('content:original', { exact: true }).waitFor();
  await page.waitForTimeout(100);
  registry.sketchpads[0].frames.push(frame('added'));
  await page.clock.runFor(2100);
  await page.getByText('content:added', { exact: true }).waitFor();
  assert.equal(imports.filter(url => url.endsWith('/original.tsx')).length, 1);
  assert.equal(imports.some(url => url.includes('/other/')), false);
  const loaded = imports.length;
  await page.clock.runFor(4200);
  await page.waitForTimeout(100);
  assert.equal(imports.length, loaded, 'unchanged modules stay mounted');

  await page.evaluate(() => { document.getElementById('root').style.display = 'none'; });
  await page.waitForTimeout(100);
  const hiddenReads = reads;
  registry.sketchpads[0].frames.push(frame('while-hidden'));
  await page.clock.runFor(6200);
  assert.equal(reads, hiddenReads, 'hidden Sketchpad makes no requests');
  await page.evaluate(() => { document.getElementById('root').style.display = 'block'; });
  await page.clock.runFor(2100);
  await page.getByText('content:while-hidden', { exact: true }).waitFor();

  await page.evaluate(() => Object.defineProperty(document, 'hidden', { configurable: true, value: true }));
  await page.waitForTimeout(100);
  const backgroundReads = reads;
  await page.clock.runFor(6200);
  assert.equal(reads, backgroundReads, 'background browser tab makes no requests');
  registry.sketchpads[0].frames = [frame('added')];
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(100);
  await poll(page);
  await poll(page);
  assert.equal(await page.getByText('content:original', { exact: true }).count(), 1);
  assert.equal(await page.getByText('content:added', { exact: true }).count(), 1);
  assert.deepEqual(errors, []);
  await page.close();
});


test('retries unfinished frame files and preserves the canvas on invalid registry reads', async () => {
  reads = 0; imports = []; unavailable = new Set();
  registry = { sketchpads: [pad('first', [frame('original')])] };
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  await page.clock.install();
  await page.goto(origin);
  await page.getByText('content:original', { exact: true }).waitFor();
  unavailable.add('unfinished');
  registry.sketchpads[0].frames.push(frame('unfinished'));
  await page.clock.runFor(2100);
  await page.waitForTimeout(100);
  assert.equal(await page.getByText('content:original', { exact: true }).count(), 1);
  unavailable.clear();
  await page.clock.runFor(2100);
  await page.getByText('content:unfinished', { exact: true }).waitFor();
  registry = { error: 'Incomplete registry' };
  await page.clock.runFor(4200);
  assert.equal(await page.getByText('content:unfinished', { exact: true }).count(), 1);
  assert.equal(imports.filter(url => url.endsWith('/original.tsx')).length, 1);
  await page.close();
});


async function poll(page) {
  await page.clock.runFor(2100);
  await page.waitForTimeout(100);
}

test('discovery preserves existing frames, metadata, selection and camera', async () => {
  reads = 0; imports = []; unavailable = new Set();
  registry = { sketchpads: [pad('first', [frame('original')])] };
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.clock.install();
  await page.goto(origin);
  await page.getByText('content:original', { exact: true }).waitFor();
  await page.getByTestId('frame-title').click({ force: true });
  const originalRoot = page.locator('[data-sketchpad-frame-root="original"]');
  const bounds = await originalRoot.boundingBox();
  const selection = await page.getByTestId('frame-title').evaluate(el => getComputedStyle(el).color);
  registry.sketchpads[0].name = 'external rename';
  registry.sketchpads[0].frames[0] = { ...frame('original'), name: 'external frame rename', canvasX: 100000, width: 999 };
  registry.sketchpads[0].frames.push({ ...frame('added'), canvasX: 500 });
  registry.sketchpads.push(pad('inactive', [frame('not-loaded')]));
  await poll(page);
  await page.getByText('content:added', { exact: true }).waitFor();
  assert.deepEqual(await originalRoot.boundingBox(), bounds);
  assert.equal(await originalRoot.getByTestId('frame-title').evaluate(el => getComputedStyle(el).color), selection);
  assert.match(await originalRoot.getByTestId('frame-title').textContent(), /original/);
  assert.equal(imports.length, 2);

  registry = { sketchpads: [] };
  await poll(page);
  await poll(page);
  await poll(page);
  assert.equal(await page.getByText('content:original', { exact: true }).count(), 1);
  assert.equal(await page.getByText('content:added', { exact: true }).count(), 1);
  const before = reads;
  await poll(page);
  await poll(page);
  assert.ok(reads - before <= 3);
  assert.deepEqual(await originalRoot.boundingBox(), bounds);
  assert.deepEqual(errors, []);
  await page.close();
});


test('registry polling never creates files and reports incomplete JSON', async () => {
  const pluginRoot = process.cwd();
  const bundleDir = fs.mkdtempSync(path.join(pluginRoot, 'tests/.registry-'));
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'pv-registry-'));
  try {
    const outfile = path.join(bundleDir, 'backend.mjs');
    await build({ entryPoints: ['src/backend/sketchpad-server.ts'], bundle: true,
      platform: 'node', format: 'esm', packages: 'external', outfile,
      plugins: [{ name: 'unused-undo-store', setup(build) {
        build.onLoad({ filter: /[/\\]server\.ts$/ }, () => ({
          contents: 'export const pushUndoSnapshot = () => {};', loader: 'js',
        }));
      } }],
    });
    process.chdir(fixture);
    const { handleSketchpadList } = await import(pathToFileURL(outfile).href);
    process.chdir(pluginRoot);
    const read = async () => {
      let body;
      const response = { setHeader() {}, end(value) { body = JSON.parse(value); } };
      await handleSketchpadList({}, response, () => {});
      return { body, status: response.statusCode };
    };
    assert.deepEqual(await read(), { body: { sketchpads: [] }, status: 200 });
    assert.equal(fs.existsSync(path.join(fixture, 'src')), false);
    const dir = path.join(fixture, 'src/sketchpads');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, '_registry.json'), '{');
    assert.equal((await read()).status, 500);
    assert.equal(fs.readFileSync(path.join(dir, '_registry.json'), 'utf8'), '{');
    fs.writeFileSync(path.join(dir, '_registry.json'), '{}');
    assert.equal((await read()).status, 500, 'invalid data must not become an empty registry');
  } finally {
    process.chdir(pluginRoot);
    fs.rmSync(bundleDir, { recursive: true, force: true });
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('recovers from a failed initial read', async () => {
  reads = 0; imports = []; unavailable = new Set();
  registry = { error: 'Being written' };
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.clock.install();
  await page.goto(origin);
  await page.waitForTimeout(100);
  registry = { sketchpads: [pad('first', [frame('original')])] };
  await poll(page);
  await page.getByText('content:original', { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  await page.close();
});

test('does not poll or revert optimistic positions during a drag', async () => {
  reads = 0; imports = []; unavailable = new Set();
  registry = { sketchpads: [pad('first', [frame('original')])] };
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  await page.clock.install();
  await page.goto(origin);
  await page.getByText('content:original', { exact: true }).waitFor();
  await page.waitForTimeout(100);
  const title = await page.getByTestId('frame-title').boundingBox();
  await page.mouse.move(title.x + 10, title.y + 5);
  await page.mouse.down();
  await page.mouse.move(title.x + 110, title.y + 65, { steps: 5 });
  await page.waitForTimeout(100);
  const moved = await page.getByText('content:original', { exact: true }).boundingBox();
  const before = reads;
  registry.sketchpads[0].frames[0].canvasX = 900;
  await poll(page);
  await poll(page);
  assert.equal(reads, before, 'polling is paused until the gesture commits');
  assert.deepEqual(await page.getByText('content:original', { exact: true }).boundingBox(), moved);
  await page.mouse.up();
  await page.close();
});

test('a delayed module from a previous sketchpad cannot overwrite the current canvas', async () => {
  reads = 0; imports = []; unavailable = new Set();
  registry = { sketchpads: [pad('first', [frame('original')]), pad('other', [frame('slow')])] };
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let slowRequests = 0;
  await page.route('**/other/slow.tsx?*', async route => {
    slowRequests++;
    await gate;
    await route.fulfill({ contentType: 'text/javascript', body: "export default () => 'content:slow'" });
  });
  await page.clock.install();
  await page.goto(origin);
  await page.getByText('content:original', { exact: true }).waitFor();
  await page.getByTestId('toolbar-sketchpads').click({ force: true });
  await page.getByTestId('sketchpad-other').click({ force: true });
  await page.waitForTimeout(100);
  await poll(page);
  assert.equal(slowRequests, 1, 'polling must not duplicate an in-flight module load');
  await page.getByTestId('toolbar-sketchpads').click({ force: true });
  await page.getByTestId('sketchpad-first').click({ force: true });
  await page.getByText('content:original', { exact: true }).waitFor();
  release();
  await page.waitForTimeout(200);
  assert.equal(await page.getByText('content:original', { exact: true }).count(), 1);
  assert.equal(await page.getByText('content:slow', { exact: true }).count(), 0);
  await page.close();
});

test('discards a registry response started before a pointer interaction', async () => {
  reads = 0; imports = []; unavailable = new Set();
  registry = { sketchpads: [pad('first', [frame('original')])] };
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  await page.clock.install();
  await page.goto(origin);
  await page.getByText('content:original', { exact: true }).waitFor();
  await page.waitForTimeout(100);
  let release, requested;
  const gate = new Promise(resolve => { release = resolve; });
  const arrived = new Promise(resolve => { requested = resolve; });
  await page.route('**/__sketchpad-list', async route => {
    requested();
    await gate;
    const stale = structuredClone(registry);
    stale.sketchpads[0].frames.push(frame('stale-addition'));
    await route.fulfill({ json: stale });
  });
  await page.clock.runFor(2100);
  await arrived;
  await page.mouse.move(1150, 750);
  await page.mouse.down();
  await page.mouse.up();
  release();
  await page.waitForTimeout(200);
  assert.equal(await page.getByText('content:stale-addition', { exact: true }).count(), 0);
  await page.close();
});

test('undo reload retries restore metadata and removals after a failed read', async () => {
  reads = 0; imports = []; unavailable = new Set();
  registry = { sketchpads: [pad('first', [{ ...frame('original'), canvasX: 200 }, frame('removed')])] };
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install();
  await page.goto(origin);
  await page.getByText('content:original', { exact: true }).waitFor();
  registry = { error: 'Registry being written' };
  await page.evaluate(() => window.postMessage({ type: 'PV_UNDO_REDO_COMPLETE' }, '*'));
  await page.waitForTimeout(100);
  assert.deepEqual(errors, []);
  assert.equal(await page.getByText('content:original', { exact: true }).count(), 1);
  registry = { sketchpads: [pad('first', [frame('original'), frame('restored')])] };
  await poll(page);
  await page.getByText('content:restored', { exact: true }).waitFor();
  assert.equal(await page.locator('[data-sketchpad-frame-root="original"]').evaluate(el => el.style.left), '0px');
  assert.equal(await page.getByText('content:removed', { exact: true }).count(), 0);
  await page.close();
});

test('a delayed undo reload cannot switch back from the user’s new sketchpad', async () => {
  reads = 0; imports = []; unavailable = new Set();
  registry = { sketchpads: [pad('first', [frame('original')]), pad('other', [frame('second')])] };
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  await page.clock.install();
  await page.goto(origin);
  await page.getByText('content:original', { exact: true }).waitFor();
  await page.waitForTimeout(100);
  let release, requested;
  const gate = new Promise(resolve => { release = resolve; });
  const arrived = new Promise(resolve => { requested = resolve; });
  await page.route('**/__sketchpad-list', async route => {
    requested();
    await gate;
    // An obsolete undo snapshot no longer contains either current sketchpad.
    await route.fulfill({ json: { sketchpads: [pad('obsolete', [frame('obsolete')])] } });
  });
  await page.evaluate(() => window.postMessage({ type: 'PV_UNDO_REDO_COMPLETE' }, '*'));
  await arrived;
  await page.getByTestId('toolbar-sketchpads').click({ force: true });
  await page.getByTestId('sketchpad-other').click({ force: true });
  await page.getByText('content:second', { exact: true }).waitFor();
  await poll(page);
  release();
  await page.waitForTimeout(200);
  assert.equal(await page.getByText('content:second', { exact: true }).count(), 1);
  assert.equal(await page.getByText('content:obsolete', { exact: true }).count(), 0);
  await page.close();
});


test('concurrent frame consumers share one import, and failed imports can retry', async () => {
  reads = 0; imports = []; unavailable = new Set();
  registry = { sketchpads: [pad('first', [frame('original')])] };
  const page = await browser.newPage();
  await page.goto(origin);
  await page.getByText('content:original', { exact: true }).waitFor();
  await page.evaluate(() => Promise.all([
    window.loadFrame('first', 'shared'), window.loadFrame('first', 'shared'),
  ]));
  assert.equal(imports.filter(url => url.endsWith('/shared.tsx')).length, 1);
  unavailable.add('retry');
  assert.equal(await page.evaluate(() => window.loadFrame('first', 'retry').then(() => false, () => true)), true);
  unavailable.clear();
  await page.waitForTimeout(20);
  assert.equal(await page.evaluate(() => window.loadFrame('first', 'retry').then(component => !!component)), true);
  assert.equal(imports.filter(url => url.endsWith('/retry.tsx')).length, 2);
  await page.close();
});


test('clicking during undo does not lose the restored position', async () => {
  reads = 0; imports = []; unavailable = new Set();
  registry = { sketchpads: [pad('first', [{ ...frame('original'), canvasX: 200 }])] };
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  try {
    await page.clock.install();
    await page.goto(origin);
    await page.getByText('content:original', { exact: true }).waitFor();
    await page.waitForTimeout(100);
    let release, requested;
    const gate = new Promise(resolve => { release = resolve; });
    const arrived = new Promise(resolve => { requested = resolve; });
    await page.route('**/__sketchpad-list', async route => {
      requested();
      await gate;
      await route.fulfill({ json: registry });
    });
    registry.sketchpads[0].frames[0].canvasX = 0;
    await page.evaluate(() => window.postMessage({ type: 'PV_UNDO_REDO_COMPLETE' }, '*'));
    await arrived;
    await page.mouse.click(1150, 750);
    release();
    await page.waitForTimeout(100);
    await page.unroute('**/__sketchpad-list');
    await poll(page);
    await poll(page);
    assert.equal(await page.locator('[data-sketchpad-frame-root="original"]').evaluate(el => el.style.left), '0px');
  } finally { await page.close(); }
});

test('retries a frame unfinished at startup without changing its metadata', async () => {
  reads = 0; imports = []; unavailable = new Set(['unfinished']);
  registry = { sketchpads: [pad('first', [frame('original'), frame('unfinished')])] };
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  try {
    await page.clock.install();
    await page.goto(origin);
    await page.getByText('content:original', { exact: true }).waitFor();
    await page.waitForTimeout(100);
    unavailable.clear();
    registry.sketchpads[0].frames[1].canvasX = 1000;
    registry.sketchpads[0].frames[1].width = 900;
    await poll(page);
    await page.getByText('content:unfinished', { exact: true }).waitFor();
    const geometry = await page.locator('[data-sketchpad-frame-root="unfinished"]').evaluate(el => ({ left: el.style.left, width: el.style.width }));
    assert.deepEqual(geometry, { left: '0px', width: '300px' });
    assert.equal(imports.filter(url => url.endsWith('/original.tsx')).length, 1);
  } finally { await page.close(); }
});
