// Exercises the real middleware against two clones and a local bare remote.
// Run: pnpm run test:git-sync
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { before, test } from 'node:test';
import { setTimeout } from 'node:timers/promises';
import { build } from 'esbuild';

const pluginRoot = process.cwd();
const routes = new Map();
let syncConflictPrompt;

before(async () => {
  const result = await build({
    stdin: {
      contents: `export { registerGitMiddleware } from './src/backend/git-server';
        export { syncConflictPrompt } from './src/ui/utils/gitAgentPrompts';`,
      resolveDir: pluginRoot,
    },
    bundle: true, platform: 'node', format: 'esm', write: false,
    plugins: [{
      // Avoid importing the unrelated Vite/Cloudflare server. Git commands still
      // execute for real, through the production git-server command/auth helpers.
      name: 'git-process-runner',
      setup(build) {
        build.onResolve({ filter: /^\.\/server$/ }, () => ({ path: 'runner', namespace: 'test' }));
        build.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: `
          import { execFile } from 'node:child_process';
          export function spawnCmd(cmd, args, opts) {
            return new Promise((resolve, reject) => {
              execFile(cmd, args, { ...opts, timeout: opts.timeoutMs }, (err, stdout, stderr) => {
                if (err) reject(new Error(stdout + stderr));
                else resolve(stdout + stderr);
              });
            });
          }`, loader: 'js' }));
      },
    }],
  });
  const module = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
  syncConflictPrompt = module.syncConflictPrompt;
  module.registerGitMiddleware({ middlewares: { use: (route, handler) => routes.set(route, handler) } });
});

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function request(route, body) {
  return new Promise((resolve, reject) => {
    const req = new EventEmitter();
    req.method = body ? 'POST' : 'GET';
    req.url = '/';
    const res = { setHeader() {}, end: value => resolve(JSON.parse(value)) };
    Promise.resolve(routes.get(route)(req, res)).catch(reject);
    if (body) {
      req.emit('data', JSON.stringify(body));
      req.emit('end');
    }
  });
}

async function runOp(op = 'sync') {
  assert.equal((await request('/__git-op-start', { op })).success, true);
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const result = await request('/__git-op-status');
    if (result.status === 'success' || result.status === 'error') return result;
    await setTimeout(10);
  }
  throw new Error('Git operation did not finish');
}

function fixture(t) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'protovibe-git-sync-'));
  const previousDir = process.cwd();
  const envKeys = ['GIT_CONFIG_GLOBAL', 'GIT_CONFIG_NOSYSTEM', 'GIT_AUTHOR_NAME',
    'GIT_COMMITTER_NAME', 'GIT_AUTHOR_EMAIL', 'GIT_COMMITTER_EMAIL'];
  const savedEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  // Isolate tests from the developer's global Git settings and hooks.
  process.env.GIT_CONFIG_GLOBAL = path.join(tmp, 'gitconfig');
  process.env.GIT_CONFIG_NOSYSTEM = '1';
  process.env.GIT_AUTHOR_NAME = process.env.GIT_COMMITTER_NAME = 'Sync test';
  process.env.GIT_AUTHOR_EMAIL = process.env.GIT_COMMITTER_EMAIL = 'sync@example.test';
  t.after(() => {
    process.chdir(previousDir);
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  });
  const remote = path.join(tmp, 'remote.git');
  const local = path.join(tmp, 'local');
  const teammate = path.join(tmp, 'teammate');
  git(tmp, 'init', '--bare', '--initial-branch=main', remote);
  git(tmp, 'clone', remote, local);
  git(local, 'config', 'user.email', 'sync@example.test');
  fs.writeFileSync(path.join(local, 'imports.ts'), 'import { Base } from "./base";\n\nexport const value = Base;\n');
  git(local, 'add', '.');
  git(local, 'commit', '-m', 'Base');
  git(local, 'push', '-u', 'origin', 'main');
  git(tmp, 'clone', remote, teammate);
  process.chdir(local);
  return { local, remote, teammate };
}

const localImports = 'import { Local } from "./local";\n\nexport const value = Local;\n';
const remoteImports = 'import { Remote } from "./remote";\n\nexport const value = Remote;\n';

function diverge({ local, teammate }, { deletion = false, commitLocal = false } = {}) {
  if (deletion) git(teammate, 'rm', 'imports.ts');
  else fs.writeFileSync(path.join(teammate, 'imports.ts'), remoteImports);
  git(teammate, 'add', '-A');
  git(teammate, 'commit', '-m', 'Team changes');
  git(teammate, 'push');
  fs.writeFileSync(path.join(local, 'imports.ts'), localImports);
  if (commitLocal) {
    git(local, 'add', '-A');
    git(local, 'commit', '-m', 'Local changes');
  }
}

for (const scenario of ['sync import conflict', 'pull import conflict', 'sync modify/delete conflict']) {
  test(`${scenario} pauses, restores local work and does not push`, async t => {
    const repo = fixture(t);
    const op = scenario.startsWith('pull') ? 'pull' : 'sync';
    diverge(repo, { deletion: scenario.includes('delete'), commitLocal: op === 'pull' });
    const remoteHead = git(repo.remote, 'rev-parse', 'main');
    const result = await runOp(op);
    assert.equal(result.status, 'error');
    assert.equal(result.conflict, true);
    assert.deepEqual(result.conflictFiles, ['imports.ts']);
    assert.match(result.message, /Sync paused/);
    assert.equal(fs.readFileSync(path.join(repo.local, 'imports.ts'), 'utf8'), localImports);
    assert.equal(git(repo.local, 'show', 'HEAD:imports.ts'), localImports.trim());
    assert.equal(git(repo.local, 'status', '--porcelain'), '');
    assert.equal(git(repo.local, 'branch', '--show-current'), 'main');
    assert.equal(fs.existsSync(path.join(repo.local, '.git/rebase-merge')), false);
    assert.equal(git(repo.remote, 'rev-parse', 'main'), remoteHead);
    // A retry must pause again, never fall back to choosing the sender's version.
    assert.equal((await runOp(op)).conflict, true);
    assert.equal(git(repo.remote, 'rev-parse', 'main'), remoteHead);
  });
}

test('non-overlapping changes sync and push both versions', async t => {
  const repo = fixture(t);
  fs.writeFileSync(path.join(repo.teammate, 'team.txt'), 'Team work');
  git(repo.teammate, 'add', '.');
  git(repo.teammate, 'commit', '-m', 'Team work');
  git(repo.teammate, 'push');
  fs.writeFileSync(path.join(repo.local, 'local.txt'), 'Local work');
  const result = await runOp();
  assert.equal(result.status, 'success');
  assert.equal(result.conflict, undefined);
  assert.equal(git(repo.remote, 'show', 'main:team.txt'), 'Team work');
  assert.equal(git(repo.remote, 'show', 'main:local.txt'), 'Local work');
  assert.equal(git(repo.local, 'rev-parse', 'HEAD'), git(repo.remote, 'rev-parse', 'main'));
  assert.equal((await request('/__git-status')).mergeInProgress, false);
});

test('an unfinished agent merge is left untouched, including its index', async t => {
  const repo = fixture(t);
  diverge(repo, { commitLocal: true });
  git(repo.local, 'fetch');
  assert.throws(() => git(repo.local, 'merge', 'origin/main'));
  const worktree = fs.readFileSync(path.join(repo.local, 'imports.ts'), 'utf8');
  const index = git(repo.local, 'ls-files', '-u');
  const remoteHead = git(repo.remote, 'rev-parse', 'main');
  for (const op of ['sync', 'pull', 'commit', 'push']) {
    assert.equal((await request('/__git-status')).mergeInProgress, true);
    assert.equal((await runOp(op)).conflict, true);
    assert.equal(fs.readFileSync(path.join(repo.local, 'imports.ts'), 'utf8'), worktree);
    assert.equal(git(repo.local, 'ls-files', '-u'), index);
    assert.equal(fs.existsSync(path.join(repo.local, '.git/MERGE_HEAD')), true);
    assert.equal(git(repo.remote, 'rev-parse', 'main'), remoteHead);
  }
});

test('cached rerere resolutions do not silently choose a side', async t => {
  const repo = fixture(t);
  diverge(repo, { commitLocal: true });
  git(repo.local, 'config', 'rerere.enabled', 'true');
  git(repo.local, 'config', 'rerere.autoupdate', 'true');
  git(repo.local, 'fetch');
  assert.throws(() => git(repo.local, 'rebase', '@{u}'));
  fs.writeFileSync(path.join(repo.local, 'imports.ts'), localImports);
  git(repo.local, 'add', 'imports.ts');
  git(repo.local, 'rerere');
  git(repo.local, 'rebase', '--abort');
  const remoteHead = git(repo.remote, 'rev-parse', 'main');
  assert.equal((await runOp()).conflict, true);
  assert.equal(git(repo.remote, 'rev-parse', 'main'), remoteHead);
  assert.equal(git(repo.local, 'config', 'rerere.enabled'), 'true');
});

test('sync works again after an agent combines the conflicting changes and pushes', async t => {
  const repo = fixture(t);
  diverge(repo);
  assert.equal((await runOp()).conflict, true);
  assert.throws(() => git(repo.local, 'merge', 'origin/main'));
  const combined = 'import { Local } from "./local";\nimport { Remote } from "./remote";\n\nexport const value = [Local, Remote];\n';
  fs.writeFileSync(path.join(repo.local, 'imports.ts'), combined);
  git(repo.local, 'add', 'imports.ts');
  // Even staged resolutions must be left for the agent to finish.
  assert.equal((await request('/__git-status')).mergeInProgress, true);
  assert.equal((await runOp()).conflict, true);
  git(repo.local, 'commit', '-m', 'Combine both changes');
  git(repo.local, 'push');
  const result = await runOp();
  assert.equal(result.status, 'success');
  assert.equal(result.conflict, undefined);
  assert.equal(git(repo.remote, 'show', 'main:imports.ts'), combined.trim());
});

test('dirty worktree pull failure is not reported as a merge conflict', async t => {
  const repo = fixture(t);
  fs.writeFileSync(path.join(repo.local, 'imports.ts'), localImports);
  const result = await runOp('pull');
  assert.equal(result.status, 'error');
  assert.equal(result.conflict, undefined);
  assert.equal(fs.readFileSync(path.join(repo.local, 'imports.ts'), 'utf8'), localImports);
});

test('fetch failures remain distinct from conflicts and preserve local work', async t => {
  const repo = fixture(t);
  git(repo.local, 'remote', 'set-url', 'origin', path.join(repo.local, 'missing.git'));
  fs.writeFileSync(path.join(repo.local, 'imports.ts'), localImports);
  const result = await runOp();
  assert.equal(result.status, 'error');
  assert.equal(result.conflict, undefined);
  assert.match(result.message, /Couldn’t reach/);
  assert.equal(git(repo.local, 'show', 'HEAD:imports.ts'), localImports.trim());
});

test('conflict prompt contains project context and the complete recovery workflow', () => {
  const prompt = syncConflictPrompt('/projects/My project', 'team/branch', ['src/imports.ts'], 'conflict details');
  for (const text of ['/projects/My project', 'team/branch', 'src/imports.ts', 'conflict details',
    'Fetch the latest', 'both people', 'imports', 'tests, type checks and build',
    'normal push', 'Do not force-push', 'uncommitted edits']) assert.ok(prompt.includes(text), text);
  assert.ok(!prompt.includes('gh auth login'));
});
