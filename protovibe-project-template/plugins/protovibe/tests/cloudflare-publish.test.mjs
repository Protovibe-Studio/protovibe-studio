// Run on Node >=22.13: node --test tests/cloudflare-publish.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixture } from './helpers/cloudflare-publish-fixture.mjs';

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

test('overlapping checks share Wrangler and logout invalidates an unfinished check', async t => {
  const pending = Promise.withResolvers();
  let whoami = pending.promise;
  const f = fixture(t, 'demo-project', args => {
    if (args.includes('whoami')) return whoami;
  });
  const first = f.request('auth');
  const second = f.request('auth');
  assert.equal(f.calls.length, 1);
  await f.request('logout');
  whoami = 'You are not authenticated';
  assert.equal((await f.request('auth')).loggedIn, false);
  pending.resolve('You are logged in');
  await Promise.all([first, second]);
  assert.equal((await f.request('auth')).loggedIn, false);
});

test('explicit sign-out errors can be rechecked immediately and confirmed connections are cached', async t => {
  let connected = false;
  const f = fixture(t, 'demo-project', args => {
    if (!connected && args.includes('whoami')) throw new Error('You are not logged in');
  });
  assert.equal((await f.request('auth')).loggedIn, false);
  connected = true;
  assert.equal((await f.request('auth')).loggedIn, true);
  assert.equal((await f.request('auth')).loggedIn, true);
  assert.equal(f.calls.length, 2);
});
