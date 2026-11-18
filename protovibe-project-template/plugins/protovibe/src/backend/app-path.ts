import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { isSavedAppPath, type SavedAppPath } from '../shared/app-path';

const stateFile = (root: string) => path.join(root, '.protovibe-local-data', 'preview.json');
const projectKey = (root: string) => createHash('sha256').update(path.resolve(root)).digest('hex');

export function readAppPath(root: string): SavedAppPath {
  try {
    const value = JSON.parse(fs.readFileSync(stateFile(root), 'utf8'));
    if (isSavedAppPath(value)) return { path: value.path, updatedAt: value.updatedAt };
  } catch { /* New projects and malformed state start at home. */ }
  return { path: '/', updatedAt: 0 };
}

export function appPathBootstrap(root: string): string {
  // Stable across ports, distinct for projects sharing a localhost port.
  const json = JSON.stringify({ projectKey: projectKey(root), ...readAppPath(root) }).replace(/</g, '\\u003c');
  return `<script id="pv-app-path-state" type="application/json">${json}</script>`;
}

export async function handleAppPath(root: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') {
    res.end(JSON.stringify(readAppPath(root)));
    return;
  }
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  if (!req.headers['content-type']?.startsWith('application/json')) {
    res.statusCode = 415;
    res.end(JSON.stringify({ error: 'Expected JSON' }));
    return;
  }
  try {
    const chunks: Buffer[] = [];
    let bytes = 0;
    for await (const chunk of req) {
      const buffer = Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > 16_384) {
        res.statusCode = 413;
        res.end(JSON.stringify({ error: 'Request too large' }));
        return;
      }
      chunks.push(buffer);
    }
    let state: unknown;
    try { state = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { /* Rejected below. */ }
    if (!isSavedAppPath(state)) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Invalid preview URL' }));
      return;
    }
    if ((state as SavedAppPath & { projectKey?: string }).projectKey !== projectKey(root)) {
      res.statusCode = 409;
      res.end(JSON.stringify({ error: 'Project changed; reload the editor' }));
      return;
    }
    // An unloading document's keepalive must not overwrite newer navigation.
    if (state.updatedAt > readAppPath(root).updatedAt) {
      const file = stateFile(root);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const temporary = `${file}.${process.pid}.tmp`;
      fs.writeFileSync(temporary, JSON.stringify({ path: state.path, updatedAt: state.updatedAt }, null, 2) + '\n');
      fs.renameSync(temporary, file);
    }
    res.end(JSON.stringify({ success: true }));
  } catch {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Could not save preview URL' }));
  }
}
