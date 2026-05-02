import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const template = readFileSync(resolve(root, 'dist/index.html'), 'utf-8');

const serverEntry = pathToFileURL(resolve(root, 'dist/server/entry-server.js')).href;
const { render } = await import(serverEntry);

const appHtml = render();
const html = template.replace('<!--app-html-->', appHtml);

writeFileSync(resolve(root, 'dist/index.html'), html, 'utf-8');
console.log('[prerender] dist/index.html updated with prerendered markup');
