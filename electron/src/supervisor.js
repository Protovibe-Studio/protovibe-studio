const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const treeKill = require('tree-kill');
const { buildChildEnv } = require('./toolchain');
const { SHIM_DIR, MANAGER_DIR_NAME } = require('./paths');

// Same format the manager itself scrapes from its project children
// (vite.config.js PORT_RE) — vite prints "Local:   http://localhost:5173/".
const PORT_RE = /Local:\s+https?:\/\/(?:localhost|127\.0\.0\.1):(\d+)/;
const DEFAULT_URL = 'http://127.0.0.1:5173';
const PORT_PARSE_TIMEOUT = 60_000;
const PORT_PROBE_AFTER = 15_000;
const HEALTH_TIMEOUT = 30_000;
const KILL_GRACE = 5_000;
const RESTART_BACKOFF = [0, 2_000, 5_000];
const RESTART_WINDOW = 60_000;

function healthCheck(url, timeoutMs = 2_000) {
  return new Promise((resolve) => {
    const req = http.get(`${url}/api/projects`, { timeout: timeoutMs }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Supervises the manager's vite dev server.
// Events: 'ready' (url), 'failed' (error), 'log' (chunk).
class Supervisor extends EventEmitter {
  constructor(root, logger) {
    super();
    this.root = root;
    this.logger = logger;
    this.proc = null;
    this.url = null;
    this.attached = false; // true = server owned by someone else (old launcher)
    this.stopping = false;
    this.restarts = []; // timestamps within RESTART_WINDOW
  }

  async start() {
    // An old-launcher install (or a manual `pnpm dev`) may already be serving.
    // Attach instead of double-starting — and never kill what we don't own.
    if (await healthCheck(DEFAULT_URL)) {
      this.url = DEFAULT_URL;
      this.attached = true;
      this.logger.line(`attached to existing manager at ${DEFAULT_URL}`);
      this.emit('ready', this.url);
      return;
    }
    await this.spawnServer();
  }

  async spawnServer() {
    // Absolute shim path — the child tree still resolves node/pnpm via the
    // shim dir prepended to PATH in buildChildEnv().
    this.proc = spawn(path.join(SHIM_DIR, 'pnpm'), ['--dir', MANAGER_DIR_NAME, 'dev'], {
      cwd: this.root,
      env: buildChildEnv(),
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const proc = this.proc;
    proc.stdout.on('data', (c) => { this.logger.write(c); this.emit('log', c); });
    proc.stderr.on('data', (c) => { this.logger.write(c); this.emit('log', c); });
    proc.on('exit', (code, signal) => this.onExit(code, signal));

    try {
      const port = await this.resolvePort(proc);
      const url = `http://127.0.0.1:${port}`;
      const deadline = Date.now() + HEALTH_TIMEOUT;
      while (Date.now() < deadline) {
        if (proc.exitCode !== null) throw new Error('manager dev server exited during startup');
        if (await healthCheck(url)) {
          this.url = url;
          this.logger.line(`manager ready at ${url}`);
          this.emit('ready', url);
          return;
        }
        await sleep(500);
      }
      throw new Error(`manager did not answer /api/projects within ${HEALTH_TIMEOUT / 1000}s`);
    } catch (err) {
      this.logger.line(`startup failed: ${err.message}`);
      this.emit('failed', err);
    }
  }

  resolvePort(proc) {
    return new Promise((resolve, reject) => {
      let buffer = '';
      let done = false;
      const finish = (fn, val) => { if (!done) { done = true; cleanup(); fn(val); } };
      const onData = (chunk) => {
        buffer += chunk.toString();
        const m = buffer.match(PORT_RE);
        if (m) finish(resolve, Number(m[1]));
      };
      const onExit = () => finish(reject, new Error('manager dev server exited before binding a port'));
      // Fallback: vite's stdout format changed — probe the default port range.
      const probeTimer = setTimeout(async () => {
        for (let p = 5173; p <= 5183 && !done; p++) {
          if (await healthCheck(`http://127.0.0.1:${p}`)) return finish(resolve, p);
        }
      }, PORT_PROBE_AFTER);
      const failTimer = setTimeout(
        () => finish(reject, new Error('timed out waiting for the manager to bind a port')),
        PORT_PARSE_TIMEOUT,
      );
      const cleanup = () => {
        clearTimeout(probeTimer);
        clearTimeout(failTimer);
        proc.stdout.off('data', onData);
        proc.off('exit', onExit);
      };
      proc.stdout.on('data', onData);
      proc.on('exit', onExit);
    });
  }

  onExit(code, signal) {
    this.proc = null;
    if (this.stopping) return;
    this.logger.line(`manager exited unexpectedly (code=${code} signal=${signal})`);
    const now = Date.now();
    this.restarts = this.restarts.filter((t) => now - t < RESTART_WINDOW);
    if (this.restarts.length >= RESTART_BACKOFF.length) {
      this.emit('failed', new Error('manager dev server keeps crashing'));
      return;
    }
    const delay = RESTART_BACKOFF[this.restarts.length];
    this.restarts.push(now);
    this.logger.line(`restarting manager in ${delay / 1000}s`);
    setTimeout(() => { if (!this.stopping) this.spawnServer(); }, delay);
  }

  // SIGTERM the whole tree (project dev servers are descendants), SIGKILL
  // stragglers after a grace period — same semantics the manager applies to
  // its own children.
  stop() {
    this.stopping = true;
    const proc = this.proc;
    if (this.attached || !proc || proc.exitCode !== null) return Promise.resolve();
    return new Promise((resolve) => {
      const pid = proc.pid;
      const finish = () => { clearTimeout(killTimer); resolve(); };
      proc.once('exit', finish);
      const killTimer = setTimeout(() => {
        treeKill(pid, 'SIGKILL', () => finish());
      }, KILL_GRACE);
      treeKill(pid, 'SIGTERM');
    });
  }
}

module.exports = { Supervisor, healthCheck };
