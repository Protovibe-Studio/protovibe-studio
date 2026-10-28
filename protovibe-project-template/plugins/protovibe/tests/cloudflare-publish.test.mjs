// Run on Node >=22.13: node --test tests/cloudflare-publish.test.mjs
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';

// Execute the real publishing handlers in isolation from the unrelated image
// and AST editor dependencies. Only command execution is faked; metadata and
// publish history use real files in a fresh directory for every test.
const source = fs.readFileSync(new URL('../src/backend/server.ts', import.meta.url), 'utf8');
const start = source.indexOf('type CfPublishStatus =');
const end = source.indexOf('export const handleCloudflareLogout:');
assert.ok(start >= 0 && end > start);
const publishCode = stripTypeScriptTypes(source.slice(start, end)).replace(/^export /gm, '');

function fixture(t, name = 'My-PROTOTYPE', respond = () => undefined) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'protovibe-publish-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const metaPath = path.join(dir, 'protovibe-data.json');
  fs.writeFileSync(metaPath, JSON.stringify({ name: 'My-PROTOTYPE', 'cloudflare-wrangler-project-name': name }));
  const calls = [];
  const context = vm.createContext({
    fs, path, URL,
    console: { log() {}, warn() {} },
    process: { cwd: () => dir, env: {}, platform: process.platform, stdout: { write() {} } },
    spawnCmd: async (cmd, args, opts) => {
      calls.push({ cmd, args, opts });
      const response = respond(args, calls);
      if (response !== undefined) return response;
      if (args.includes('whoami')) return 'Account Name | Account ID\nTest | 0123456789abcdef0123456789abcdef';
      return '';
    },
  });
  const handlers = vm.runInContext(`${publishCode}\n({
    metadata: handleCloudflarePublishMetadata,
    save: handleCloudflarePublishSaveName,
    start: handleCloudflarePublishStart,
    status: handleCloudflarePublishStatus,
  })`, context);
  const request = (handler, body) => new Promise(resolve => {
    const req = new EventEmitter();
    const res = { statusCode: 200, setHeader() {}, end: text => resolve({ status: res.statusCode, ...JSON.parse(text) }) };
    handlers[handler](req, res);
    if (body !== undefined) {
      req.emit('data', JSON.stringify(body));
      req.emit('end');
    }
  });
  const publish = async (body = {}) => {
    assert.equal((await request('start', body)).success, true);
    for (let i = 0; i < 100; i++) {
      const result = await request('status');
      if (['success', 'error', 'not-logged-in', 'account-selection'].includes(result.status)) return result;
      await new Promise(resolve => setImmediate(resolve));
    }
    throw new Error('Publishing did not settle');
  };
  return { request, publish, calls, meta: () => JSON.parse(fs.readFileSync(metaPath, 'utf8')) };
}

test('name editor saves lowercase, trimmed names without changing the project display name', async t => {
  const f = fixture(t);
  assert.equal((await f.request('save', { projectName: '  NEW-Prototype  ' })).success, true);
  assert.equal(f.meta()['cloudflare-wrangler-project-name'], 'new-prototype');
  assert.equal(f.meta().name, 'My-PROTOTYPE');
  assert.equal((await f.request('metadata')).projectName, 'new-prototype');
});

test('metadata displays lowercase names from older projects', async t => {
  const f = fixture(t, '  OLD-Prototype  ');
  assert.equal((await f.request('metadata')).projectName, 'old-prototype');
});

for (const name of ['My-PROTOTYPE', '  MY-prototype  ', 'my-prototype']) {
  test(`publishing ${JSON.stringify(name)} creates and deploys the same lowercase name`, async t => {
    const f = fixture(t, name);
    const result = await f.publish();
    assert.equal(result.status, 'success');
    assert.equal(result.url, 'https://my-prototype.pages.dev');
    assert.equal(f.calls.find(c => c.args.includes('create')).args[5], 'my-prototype');
    const deploy = f.calls.find(c => c.args.includes('deploy'));
    assert.equal(deploy.args[deploy.args.indexOf('--project-name') + 1], 'my-prototype');
    assert.equal(f.meta()['cloudflare-wrangler-project-name'], 'my-prototype');
    assert.equal(f.meta().name, 'My-PROTOTYPE');
    assert.equal((await f.request('metadata')).url, result.url);
  });
}

test('an existing lowercase project is reused without adding a suffix', async t => {
  const f = fixture(t, 'My-PROTOTYPE', args => {
    if (args.includes('create')) throw new Error('A project with this name already exists');
    if (args.includes('list')) return '│ my-prototype │ my-prototype.pages.dev │';
  });
  assert.equal((await f.publish()).status, 'success');
  assert.equal(f.calls.filter(c => c.args.includes('create')).length, 1);
  assert.equal(f.meta()['cloudflare-wrangler-project-name'], 'my-prototype');
});

test('name collision retries and persists a lowercase suffixed name for future publishes', async t => {
  let attempts = 0;
  const f = fixture(t, 'My-PROTOTYPE', args => {
    if (args.includes('create') && attempts++ === 0) throw new Error('A project with this name already exists');
    if (args.includes('list')) return '│ some-other-project │';
  });
  assert.equal((await f.publish()).status, 'success');
  const name = f.meta()['cloudflare-wrangler-project-name'];
  assert.match(name, /^my-prototype-[a-z0-9]+$/);
  assert.equal((await f.publish()).url, `https://${name}.pages.dev`);
  for (const { args } of f.calls.filter(c => c.args.includes('deploy'))) {
    assert.equal(args[args.indexOf('--project-name') + 1], name);
  }
});

for (const stage of ['create', 'deploy']) {
  test(`email-verification rejection during ${stage} gives recovery instructions and retains details`, async t => {
    const detail = stage === 'create'
      ? 'Your user email must been verified [code: 8000077]'
      : 'You need to verify your email address to use Workers. [code: 10034]';
    const f = fixture(t, 'My-PROTOTYPE', args => {
      if (args.includes(stage)) throw new Error(detail);
    });
    const result = await f.publish();
    assert.equal(result.status, 'error');
    assert.match(result.message, /Verify your Cloudflare email address/);
    assert.match(result.message, /My Profile.*resend.*try publishing again/);
    assert.ok(result.error.includes(detail));
    if (stage === 'create') assert.equal(f.calls.some(c => c.args.includes('deploy')), false);
    assert.equal((await f.request('metadata')).url, '');
  });
}

test('verification rejection during collision retry stops before deployment', async t => {
  let attempts = 0;
  const f = fixture(t, 'My-PROTOTYPE', args => {
    if (args.includes('create')) throw new Error(attempts++ === 0
      ? 'A project with this name already exists' : 'Your email address is not verified');
  });
  assert.match((await f.publish()).message, /Verify your Cloudflare email address/);
  assert.equal(f.calls.some(c => c.args.includes('deploy')), false);
});

test('unrelated creation errors are preserved and are not mislabeled as email verification', async t => {
  const f = fixture(t, 'My-PROTOTYPE', args => {
    if (args.includes('create')) throw new Error('Permission denied [code: 10000]');
  });
  const result = await f.publish();
  assert.equal(result.status, 'error');
  assert.equal(result.message, 'Failed to create Cloudflare Pages project.');
  assert.match(result.error, /Permission denied/);
  assert.equal(f.calls.some(c => c.args.includes('deploy')), false);
});

test('email verification is not reported as an invalid API token during credential checks', async t => {
  const f = fixture(t, 'My-PROTOTYPE', args => {
    if (args.includes('whoami')) throw new Error('Email verification required');
  });
  const result = await f.publish({ apiToken: 'test-token' });
  assert.equal(result.status, 'error');
  assert.match(result.message, /Verify your Cloudflare email address/);
  assert.equal(f.calls.some(c => c.args.includes('build') || c.args.includes('create') || c.args.includes('deploy')), false);
});

test('invalid names are rejected before launching commands', async t => {
  const f = fixture(t, '   ');
  for (const projectName of ['', '   ', 123, null]) {
    assert.equal((await f.request('save', { projectName })).status, 400);
  }
  assert.equal((await f.request('start', {})).status, 400);
  assert.equal(f.calls.length, 0);
});
