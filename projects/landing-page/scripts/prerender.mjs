import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const template = readFileSync(resolve(root, 'dist/index.html'), 'utf-8');

const serverEntry = pathToFileURL(resolve(root, 'dist/server/entry-server.js')).href;
const { render, ROUTES } = await import(serverEntry);

const escapeAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const renderRoute = (path, outFile) => {
  const meta = ROUTES[path];
  if (!meta) throw new Error(`No ROUTES entry for ${path}`);
  const appHtml = render(path);
  const html = template
    .replaceAll('<!--app-title-->', escapeAttr(meta.title))
    .replaceAll('<!--app-description-->', escapeAttr(meta.description))
    .replaceAll('<!--app-canonical-->', escapeAttr(meta.canonical))
    .replace('<!--app-html-->', appHtml);
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, html, 'utf-8');
  console.log(`[prerender] ${path} → ${outFile.replace(root + '/', '')}`);
};

renderRoute('/', resolve(root, 'dist/index.html'));
renderRoute('/docs', resolve(root, 'dist/docs/index.html'));
