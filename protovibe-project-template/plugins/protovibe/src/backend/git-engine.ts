// plugins/protovibe/src/backend/git-engine.ts
// Git binary resolution for in-project git sync. Resolve-only port of the
// manager's protovibe-project-manager/server/git-engine.js — the manager owns
// downloading the embedded distribution; this module just finds whichever git
// is available. Keep the resolution order and the embedded layout in sync with
// that file.
//
// Order: PROTOVIBE_GIT_PATH env (injected by the manager when it launched us
// with a non-system git) → system git on PATH → embedded dugite-native git in
// ~/.protovibe/git/<version>/ (machine-global cache shared with the manager).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Must match the manager's EMBEDDED_GIT_VERSION pin.
const EMBEDDED_GIT_VERSION = '2.53.0';

const EMBEDDED_GIT_ROOT = path.join(os.homedir(), '.protovibe', 'git', EMBEDDED_GIT_VERSION);
const READY_MARKER = path.join(EMBEDDED_GIT_ROOT, '.ready');

export interface ResolvedGit {
  binary: string;
  /** Git-specific env extras only — merge over process.env for the child. */
  env: Record<string, string>;
  source: 'env' | 'system' | 'embedded';
}

function embeddedGitBinary(): string {
  return process.platform === 'win32'
    ? path.join(EMBEDDED_GIT_ROOT, 'cmd', 'git.exe')
    : path.join(EMBEDDED_GIT_ROOT, 'bin', 'git');
}

// Env for a git child process using the embedded distribution — mirrors what
// dugite sets so hooks, templates, and TLS work outside a system install.
function embeddedGitEnv(): Record<string, string> {
  const root = EMBEDDED_GIT_ROOT;
  const env: Record<string, string> = {};
  if (process.platform === 'win32') {
    env.PATH = `${path.join(root, 'cmd')};${path.join(root, 'mingw64', 'bin')};${process.env.PATH ?? ''}`;
    env.GIT_EXEC_PATH = path.join(root, 'mingw64', 'libexec', 'git-core');
    env.GIT_TEMPLATE_DIR = path.join(root, 'mingw64', 'share', 'git-core', 'templates');
  } else {
    env.PATH = `${path.join(root, 'bin')}:${process.env.PATH ?? ''}`;
    env.GIT_EXEC_PATH = path.join(root, 'libexec', 'git-core');
    env.GIT_TEMPLATE_DIR = path.join(root, 'share', 'git-core', 'templates');
    if (process.platform === 'linux') {
      env.GIT_SSL_CAINFO = path.join(root, 'ssl', 'cacert.pem');
    }
  }
  return env;
}

function probeGit(binary: string): boolean {
  try {
    execFileSync(binary, ['--version'], { stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

let cached: ResolvedGit | null = null;

/**
 * Returns the git to use, or null when none is available. A successful
 * resolution is cached for the life of the dev server; a miss is re-probed on
 * every call, so installing git (or the manager downloading the embedded one)
 * is picked up without a restart.
 */
export function resolveGit(): ResolvedGit | null {
  if (cached) return cached;
  const override = process.env.PROTOVIBE_GIT_PATH;
  if (override && probeGit(override)) {
    cached = { binary: override, env: {}, source: 'env' };
  } else if (!override && probeGit('git')) {
    cached = { binary: 'git', env: {}, source: 'system' };
  } else if (fs.existsSync(READY_MARKER) && probeGit(embeddedGitBinary())) {
    cached = { binary: embeddedGitBinary(), env: embeddedGitEnv(), source: 'embedded' };
  }
  return cached;
}
