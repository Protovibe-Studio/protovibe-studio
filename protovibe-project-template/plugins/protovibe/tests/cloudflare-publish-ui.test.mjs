// Node >=22.13; PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH can select a system browser.
// Real PublishButton, API client and backend handlers; Wrangler/build commands
// are simulated. No Cloudflare account or network connection is used.
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { fixture } from './helpers/cloudflare-publish-fixture.mjs';

let browser, server, origin;
before(async () => {
  const harness = (await build({
    bundle: true, write: false, format: 'iife',
    stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { PublishButton } from './src/ui/components/PublishButton';
      createRoot(document.getElementById('root')).render(<PublishButton />);
    ` },
    plugins: [{ name: 'publish-preview-context', setup(builder) {
      builder.onResolve({ filter: /\/context\/ProtovibeContext$/ }, () => ({ path: 'context', namespace: 'test' }));
      builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({
        contents: 'export const useProtovibe = () => ({ previewMode: "light" });',
      }));
    } }],
  })).outputFiles[0].text;
  server = createServer((req, res) => {
    if (req.url === '/publish.js') {
      res.setHeader('Content-Type', 'text/javascript');
      res.end(harness);
    } else {
      res.setHeader('Content-Type', 'text/html');
      res.end('<html><body><div id="root" style="display:flex;justify-content:flex-end;padding:20px"></div><script src="/publish.js"></script></body></html>');
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

async function setupPublisher(t, name = 'My-PROTOTYPE', respond) {
  const f = fixture(t, name, respond);
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(async () => {
    await page.close();
    assert.deepEqual(errors, [], 'No browser runtime errors');
  });
  const routes = {
    '/__cloudflare-auth-status': 'auth',
    '/__cloudflare-publish-metadata': 'metadata',
    '/__cloudflare-publish-save-name': 'save',
    '/__cloudflare-publish-start': 'start',
    '/__cloudflare-publish-status': 'status',
  };
  await page.route('**/__cloudflare-*', async route => {
    const handler = routes[new URL(route.request().url()).pathname];
    assert.ok(handler, `Unexpected Cloudflare route: ${route.request().url()}`);
    const body = route.request().method() === 'POST' ? route.request().postDataJSON() : undefined;
    const result = await f.request(handler, body, route.request().url());
    const status = typeof result.status === 'number' ? result.status : 200;
    if (typeof result.status === 'number') delete result.status;
    await route.fulfill({ status, json: result });
  });
  await page.route('**/__specs-list', route => route.fulfill({ json: { specs: [] } }));
  const toggle = page.locator('button[data-tooltip="Publish"]');
  return { ...f, page, toggle };
}

async function openPublisher(t, name, respond) {
  const f = await setupPublisher(t, name, respond);
  const { page } = f;
  await page.goto(origin);
  await f.toggle.click();
  await page.getByText('Connected to Cloudflare', { exact: true }).waitFor();
  return f;
}

test('legacy uppercase name publishes successfully using lowercase Wrangler arguments', async t => {
  const f = await openPublisher(t);
  await f.page.getByText('my-prototype', { exact: true }).waitFor();
  await f.page.getByRole('button', { name: 'Publish to Cloudflare', exact: true }).click();
  await f.page.getByText('Your app is published', { exact: true }).waitFor();
  assert.equal(f.meta()['cloudflare-wrangler-project-name'], 'my-prototype');
  assert.equal(f.calls.find(c => c.args.includes('create')).args[5], 'my-prototype');
  const deploy = f.calls.find(c => c.args.includes('deploy'));
  assert.equal(deploy.args[deploy.args.indexOf('--project-name') + 1], 'my-prototype');
});

test('first publish previews and saves a typed uppercase name in lowercase', async t => {
  const f = await openPublisher(t, '');
  await f.page.getByRole('button', { name: /Publish to Cloudflare/ }).click();
  await f.page.getByPlaceholder('my-app').fill('  NEW-Prototype  ');
  await f.page.getByText('new-prototype.pages.dev', { exact: true }).waitFor();
  await f.page.getByRole('button', { name: 'Publish', exact: true }).click();
  await f.page.getByText('Your app is published', { exact: true }).waitFor();
  assert.equal(f.meta()['cloudflare-wrangler-project-name'], 'new-prototype');
});

test('editing a name updates the preview, saved label and subsequent publish', async t => {
  const f = await openPublisher(t);
  await f.page.getByRole('button', { name: 'Edit project name', exact: true }).click();
  await f.page.getByPlaceholder('my-app').fill('Another-PROTOTYPE');
  await f.page.getByText('another-prototype.pages.dev', { exact: true }).waitFor();
  await f.page.getByRole('button', { name: 'Save', exact: true }).click();
  await f.page.getByText('another-prototype', { exact: true }).waitFor();
  await f.page.getByRole('button', { name: 'Publish to Cloudflare', exact: true }).click();
  await f.page.getByText('Your app is published', { exact: true }).waitFor();
  assert.equal(f.meta()['cloudflare-wrangler-project-name'], 'another-prototype');
});

test('Pages verification rejection shows instructions and original error, then retry succeeds', async t => {
  let verified = false;
  const f = await openPublisher(t, 'My-PROTOTYPE', args => {
    if (!verified && args.includes('create')) throw new Error('Your user email must been verified [code: 8000077]');
  });
  await f.page.getByRole('button', { name: 'Publish to Cloudflare', exact: true }).click();
  await f.page.getByText('Publishing failed', { exact: true }).waitFor();
  const error = f.page.getByText(/Verify your Cloudflare email address before publishing/);
  const text = await error.textContent();
  assert.match(text, /My Profile.*resend the verification email/);
  assert.match(text, /8000077/);
  assert.equal(await error.evaluate(el => getComputedStyle(el).whiteSpace), 'pre-wrap');
  assert.equal(f.calls.some(c => c.args.includes('deploy')), false);
  verified = true;
  await f.page.getByRole('button', { name: 'Try again', exact: true }).click();
  await f.page.getByText('Your app is published', { exact: true }).waitFor();
  assert.equal(await f.page.getByText('Publishing failed', { exact: true }).count(), 0);
});

test('an error without command details still shows its backend summary', async t => {
  const f = await openPublisher(t, 'My-PROTOTYPE', args => {
    if (args.includes('create')) throw new Error('A project with this name already exists');
    if (args.includes('list')) return '';
  });
  await f.page.getByRole('button', { name: 'Publish to Cloudflare', exact: true }).click();
  await f.page.getByText('Publishing failed', { exact: true }).waitFor();
  await f.page.getByText(/auto-rename failed.*choose a different project name/).waitFor();
  assert.equal(await f.page.getByText('An unknown error occurred.', { exact: true }).count(), 0);
});

test('reopening after a confirmed logout shows checking until the published project is verified', async t => {
  const checked = Promise.withResolvers();
  let whoami;
  const f = await setupPublisher(t, 'demo-project', args => {
    if (args.includes('whoami')) return whoami;
  });
  assert.equal((await f.publish()).status, 'success');
  whoami = 'You are not authenticated';
  await f.page.goto(origin);
  await f.toggle.click();
  const connect = f.page.getByRole('button', { name: 'Connect Cloudflare' });
  await connect.waitFor();
  await f.toggle.click();

  whoami = checked.promise;
  await f.toggle.click();
  await f.page.getByRole('status').filter({ hasText: 'Checking your Cloudflare connection' }).waitFor();
  assert.equal(await connect.count(), 0);
  checked.resolve('You are logged in with an OAuth Token');
  await f.page.getByRole('link', { name: /demo-project.pages.dev/ }).waitFor();
  await f.page.getByRole('button', { name: 'Publish update' }).waitFor();
});

test('a Wrangler timeout offers a connection retry that recovers in the same popover', async t => {
  let offline = false;
  const f = await setupPublisher(t, 'demo-project', args => {
    if (offline && args.includes('whoami')) throw new Error('Connection timed out');
  });
  assert.equal((await f.publish()).status, 'success');
  offline = true;
  await f.page.goto(origin);
  await f.toggle.click();
  const retry = f.page.getByRole('button', { name: 'Check again' });
  await retry.waitFor();
  assert.equal(await f.page.getByRole('button', { name: 'Connect Cloudflare' }).count(), 0);
  offline = false;
  await retry.click();
  await f.page.getByRole('button', { name: 'Publish update' }).waitFor();
  assert.equal(f.calls.filter(c => c.args.includes('deploy')).length, 1);
});

test('a sign-out discovered during publish is rechecked on the next open', async t => {
  let signedOut = false;
  const f = await openPublisher(t, 'demo-project', args => {
    if (signedOut && args.includes('whoami')) return 'You are not authenticated';
  });
  signedOut = true;
  const publish = f.page.getByRole('button', { name: 'Publish to Cloudflare', exact: true });
  await publish.click();
  await f.page.getByRole('button', { name: 'Connect Cloudflare' }).waitFor();
  await f.toggle.click();
  signedOut = false;
  await f.toggle.click();
  await publish.waitFor();
});
