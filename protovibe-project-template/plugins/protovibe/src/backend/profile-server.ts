// plugins/protovibe/src/backend/profile-server.ts
// The comment author's identity, shared across every project on this machine.
//
// It lives at ~/.protovibe/profile.json rather than in the browser because
// localStorage is keyed by origin — and each project runs on its own dev-server
// port, so a profile set in one project is invisible to the next. This file
// follows the same ~/.protovibe conventions as github.json (see github.ts): a
// plain machine-global file, read fresh on every request, owned by whichever
// Protovibe process happens to be running. No manager required.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Connect, ViteDevServer } from 'vite';
import type { CommentAuthor } from '../shared/comments';

const PROFILE_DIR = path.join(os.homedir(), '.protovibe');
const PROFILE_FILE = path.join(PROFILE_DIR, 'profile.json');

function sendJson(res: any, data: unknown, status = 200): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function parseBody(req: Connect.IncomingMessage): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: string) => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch (e) { reject(e); }
    });
  });
}

/** The saved profile, or null when the user has never set one. */
export function readProfile(): CommentAuthor | null {
  try {
    const data = JSON.parse(fs.readFileSync(PROFILE_FILE, 'utf-8'));
    if (typeof data?.name === 'string' && data.name.trim()) {
      return { name: data.name.trim(), email: String(data.email ?? '').trim() };
    }
  } catch {}
  return null;
}

function writeProfile(author: CommentAuthor): void {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  fs.writeFileSync(PROFILE_FILE, JSON.stringify(author, null, 2) + '\n', 'utf-8');
}

export function registerProfileMiddleware(server: ViteDevServer): void {
  // GET /__profile → { profile }
  server.middlewares.use('/__profile', (_req, res) => {
    try {
      sendJson(res, { profile: readProfile() });
    } catch (err) {
      sendJson(res, { error: String(err) }, 500);
    }
  });

  // POST /__profile-save { name, email } → { profile }
  server.middlewares.use('/__profile-save', async (req, res) => {
    if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405);
    try {
      const body = await parseBody(req);
      const name = String(body.name ?? '').trim();
      if (!name) return sendJson(res, { error: 'Name is required' }, 400);
      const profile: CommentAuthor = { name, email: String(body.email ?? '').trim() };
      writeProfile(profile);
      sendJson(res, { profile });
    } catch (err) {
      sendJson(res, { error: String(err) }, 500);
    }
  });
}
