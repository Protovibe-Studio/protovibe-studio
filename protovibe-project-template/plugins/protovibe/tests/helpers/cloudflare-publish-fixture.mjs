import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

// Execute the real publishing handlers in isolation from the unrelated image
// and AST editor dependencies. Only command execution is faked; metadata and
// publish history use real files in a fresh directory for every test.
const source = fs.readFileSync(new URL('../../src/backend/server.ts', import.meta.url), 'utf8');
const start = source.indexOf('type CfPublishStatus =');
const end = source.indexOf('export const handleCloudflareLogout:');
assert.ok(start >= 0 && end > start);
const publishCode = stripTypeScriptTypes(source.slice(start, end)).replace(/^export /gm, '');

export function fixture(t, name = 'My-PROTOTYPE', respond = () => undefined) {
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
    auth: handleCloudflareAuthStatus,
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

