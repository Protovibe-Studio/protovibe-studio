// Run: PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium pnpm run test:specs-find
// Optional SPEC_FIND_SCREENSHOT_DIR saves screenshots of the real UI with fixture data.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const createdAt = '2026-10-15T12:00:00Z';
const annotation = (id, text, status = 'todo') => ({
  id, type: 'annotation', rank: id, text, status, createdAt,
  state: { tab: 'app', path: '/index.html' }, author: { name: 'Designer', email: 'designer@example.com' },
});
const bundle = {
  spec: { id: 's-checkout', title: 'Checkout experience', createdAt },
  items: [
    { id: 'h-checkout', type: 'heading', rank: '0', title: 'Checkout flow', level: 'big', createdAt },
    annotation('a-cart', 'Review the checkout summary. Keep checkout totals visible before payment.'),
    annotation('a-address', 'Show saved addresses and let customers add a new address.', 'verified'),
    annotation('a-payment', 'At checkout, validate payment details before continuing.', 'discuss'),
    annotation('a-confirm', 'Confirm the order with a receipt and estimated delivery date.', 'verified'),
    annotation('a-literal', 'The checkout confirmation includes literal [total] and <receipt> labels.'),
  ],
};
const specs = [bundle, { spec: { id: 's-account', title: 'Account settings', createdAt }, items: [] },
  { spec: { id: 's-return', title: 'Checkout returns', createdAt }, items: [] }];
const prototype = `<!doctype html><html><body style="margin:0;background:#f5f6f8;color:#202632;font-family:system-ui">
  <nav style="padding:24px 40px;background:white;border-bottom:1px solid #e4e7ec;font-weight:700">ACME / Store</nav>
  <main style="max-width:720px;margin:60px auto;padding:0 32px"><small style="color:#687386">CART → CHECKOUT → CONFIRMATION</small>
  <h1 style="font-size:36px;margin-bottom:8px">Review your order</h1><p style="color:#687386">A few details, then you're all set.</p>
  <section style="background:white;border-radius:12px;padding:28px;margin-top:32px"><h3>Everyday essentials</h3>
  <p style="color:#687386">Canvas tote · Natural · Quantity 1</p><hr style="border:0;border-top:1px solid #eee;margin:24px 0">
  <p>Subtotal <b style="float:right">$32.00</b></p><p>Delivery <b style="float:right">$4.00</b></p>
  <hr style="border:0;border-top:1px solid #eee;margin:24px 0"><p><b>Total <span style="float:right">$36.00</span></b></p>
  <button style="background:#232b3b;color:white;border:0;border-radius:6px;padding:14px 24px;width:100%;margin-top:16px">Continue to payment</button>
  </section></main></body></html>`;
let browser, server, origin;
before(async () => {
  const bundleJs = async options => (await build({ bundle: true, write: false, format: 'iife', ...options })).outputFiles[0].text;
  const viewer = await bundleJs({ entryPoints: ['src/specs-viewer/main.tsx'] });
  const viewerHtml = await readFile('src/specs-viewer/specs.html', 'utf8');
  const editor = await bundleJs({
    // The document only consumes previewMode. Isolate it from unrelated shell services.
    plugins: [{ name: 'preview-context', setup(build) {
      build.onResolve({ filter: /context\/ProtovibeContext$/ }, () => ({ path: 'context', namespace: 'fixture' }));
      build.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: "export const useProtovibe = () => ({ previewMode: 'light' });" }));
    } }],
    stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
      import React, { useState } from 'react';
      import { createRoot } from 'react-dom/client';
      import { SpecDocView } from './src/ui/components/specs/SpecDocView';
      import { SpecsDocList } from './src/ui/components/specs/SpecsDocList';
      import { SpecsInlineStyles } from './src/ui/components/specs/specsUi';
      const initial = ${JSON.stringify(bundle)};
      const summaries = ${JSON.stringify(specs.map(b => ({ ...b.spec, annotationCount: b.items.filter(i => i.type === 'annotation').length })))};
      const noop = () => {};
      window.selections = [];
      function Editor() {
        const [query, setQuery] = useState('');
        const [bundle, setBundle] = useState(initial);
        const [statusFilter, setStatusFilter] = useState('all');
        const [scopeIds, setScopeIds] = useState(null);
        const [activeId, setActiveId] = useState(null);
        window.updateItems = items => setBundle(b => ({ ...b, items }));
        window.setStatusFilter = setStatusFilter;
        window.setScopeIds = ids => setScopeIds(ids ? new Set(ids) : null);
        const select = id => { window.selections.push(id); setActiveId(id); };
        return <div style={{display:'flex',height:'100vh',background:'#212121',color:'#eaeaea',fontFamily:'system-ui'}}>
          <SpecsInlineStyles />
          <div style={{width:360,display:'flex',flexDirection:'column',minHeight:0,borderRight:'1px solid #333'}}>
            {location.pathname === '/list' ? <SpecsDocList specs={summaries} publishedUrl="" busy={false}
              onOpen={select} onCreate={noop} onDelete={noop} onExport={noop} /> :
            <SpecDocView bundle={bundle} query={query} setQuery={setQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              scope="all" setScope={noop} scopeIds={scopeIds} busy={false} activeId={activeId} activeAnchorFound={null}
              editingItemId={null} editingTitle={false} autoEditTextId={null} thumbHolds={{}}
              onEditingDone={noop} onTitleEditingDone={noop} onAutoEditDone={noop} onBack={noop} onRename={noop}
              onSelectAnnotation={select} onSelectHeading={select} onUpdateReference={noop} onUnpin={noop}
              onInsert={noop} onMove={noop} onDeleteItem={noop} onExport={noop} onReload={noop} onDeleteSpec={noop}
              initialScrollTop={0} onScrollChange={noop}
              onUpdateItem={(id, patch) => setBundle(b => ({...b,items:b.items.map(i => i.id === id ? {...i,...patch} : i)}))} />}
          </div>
          <iframe src="/index.html" title="Prototype fixture" style={{flex:1,border:0}} />
        </div>;
      }
      createRoot(document.getElementById('root')).render(<Editor />);
    ` },
  });
  server = createServer((req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (path === '/specs-data.json') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ generatedAt: createdAt, specs })); }
    else if (path === '/specs-viewer.js' || path === '/editor.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(path === '/editor.js' ? editor : viewer); }
    else if (path === '/specs.html') res.end(viewerHtml);
    else if (path === '/index.html') res.end(prototype);
    else res.end('<html><body style="margin:0"><div id="root"></div><script src="/editor.js"></script></body></html>');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

async function openPage(t, path) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(async () => { await page.close(); assert.deepEqual(errors, []); });
  await page.goto(origin + path);
  return page;
}
async function count(page, value) {
  await page.waitForFunction(expected => document.querySelector('[data-testid="spec-find-count"]')?.textContent === expected, value);
}
async function screenshot(page, name) {
  if (!process.env.SPEC_FIND_SCREENSHOT_DIR) return;
  const dir = resolve(process.env.SPEC_FIND_SCREENSHOT_DIR);
  await mkdir(dir, { recursive: true });
  await page.screenshot({ path: resolve(dir, name + '.png') });
}

for (const [name, path] of [['editor', '/editor'], ['published-viewer', '/specs.html?spec=s-checkout']]) {
  test(`${name}: find preserves rows, highlights first occurrences, wraps and keeps keyboard focus`, async t => {
    const page = await openPage(t, path);
    const input = page.getByTestId('spec-find-input');
    await input.fill('CHECKOUT');
    await count(page, '1 of 4');
    assert.equal(await page.locator('mark').count(), 4);
    assert.equal(await page.locator('[data-spec-item]').count(), name === 'editor' ? 6 : 5);
    assert.equal(await page.locator('mark[data-spec-find-active="true"]').textContent(), 'Checkout');
    if (name === 'editor') {
      for (const field of await page.locator('[data-spec-item] textarea, [data-spec-item] input').all()) {
        assert.equal(await field.evaluate(el => {
          const overlay = el.nextElementSibling;
          if (!overlay) return true;
          const inputRect = el.getBoundingClientRect();
          const overlayRect = overlay.getBoundingClientRect();
          return inputRect.x === overlayRect.x && inputRect.y === overlayRect.y && inputRect.width === overlayRect.width;
        }), true, 'highlight text stays aligned with its editable field');
      }
    }
    await input.press('Enter');
    await count(page, '2 of 4');
    assert.equal(await page.locator('[data-spec-item="a-cart"] mark[data-spec-find-active="true"]').count(), 1);
    await screenshot(page, name + '-find');
    await input.press('Shift+Enter');
    await count(page, '1 of 4');
    await input.press('Shift+Enter');
    await count(page, '4 of 4');
    const active = page.locator('mark[data-spec-find-active="true"]');
    await page.waitForFunction(() => {
      const rect = document.querySelector('mark[data-spec-find-active="true"]')?.getBoundingClientRect();
      return rect && rect.top >= 0 && rect.bottom <= innerHeight;
    }, null, { timeout: 3000 });
    await screenshot(page, name + '-next-match');
    assert.equal(await input.evaluate(el => el === document.activeElement), true);
    assert.equal(await page.locator('[data-spec-item][data-active="true"]').count(), 0, 'find does not navigate the prototype');
    await page.getByTestId('spec-find-next').click();
    await count(page, '1 of 4');
    await page.getByTestId('spec-find-prev').click();
    await count(page, '4 of 4');
    await input.fill('missing');
    await count(page, 'No matches');
    assert.equal(await page.locator('mark').count(), 0);
    assert.equal(await page.getByTestId('spec-find-next').isDisabled(), true);
    assert.equal(await page.locator('[data-spec-item]').count(), name === 'editor' ? 6 : 5);
    await input.fill('[total]');
    await count(page, '1 of 1');
    assert.equal(await active.textContent(), '[total]');
    await input.fill('<receipt>');
    await count(page, '1 of 1');
    assert.equal(await active.textContent(), '<receipt>');
    await input.press('Escape');
    assert.equal(await input.inputValue(), '');
    assert.equal(await page.locator('mark').count(), 0);
    await input.fill('CHECKOUT');
    await count(page, '1 of 4');
    await input.press('ArrowRight');
    assert.equal(await page.locator('[data-spec-item][data-active="true"]').count(), 0);
  });
}

for (const [name, path] of [['editor', '/list'], ['published-viewer', '/specs.html']]) {
  test(`${name}: spec titles stay visible and searchable without opening a document`, async t => {
    const page = await openPage(t, path);
    const input = page.getByTestId('specs-search');
    await input.fill('checkout');
    await count(page, '1 of 2');
    assert.equal(await page.locator('mark').count(), 2);
    await input.press('Enter');
    await count(page, '2 of 2');
    assert.equal(await page.locator('mark[data-spec-find-active="true"]').textContent(), 'Checkout');
    await screenshot(page, name + '-spec-list-find');
    await input.fill('missing');
    await count(page, 'No matches');
    assert.equal(await page.locator('[role="button"]').count(), 3);
    await page.getByTestId('spec-find-clear').click();
    assert.equal(await input.inputValue(), '');
  });
}

test('editor: filters, live item changes, and editing stay independent from find', async t => {
  const page = await openPage(t, '/editor');
  const input = page.getByTestId('spec-find-input');
  await input.fill('checkout');
  await count(page, '1 of 4');
  await page.evaluate(() => window.setStatusFilter('verified'));
  await count(page, '1 of 1'); // Heading stays with its verified annotations.
  assert.equal(await page.getByTestId('spec-annotation-row').count(), 2);
  await page.evaluate(() => { window.setStatusFilter('all'); window.setScopeIds(['a-payment']); });
  await count(page, '1 of 2');
  assert.equal(await page.getByTestId('spec-annotation-row').count(), 1);
  await page.evaluate(() => window.setScopeIds(null));
  await count(page, '1 of 4');
  await input.press('Enter');
  await count(page, '2 of 4');
  const editor = page.locator('[data-spec-item="a-cart"] textarea');
  await editor.click();
  await editor.fill('Updated checkout copy.');
  await input.click(); // Commit the edited value and restore highlighting.
  assert.equal(await editor.inputValue(), 'Updated checkout copy.');
  assert.equal(await page.locator('[data-spec-item="a-cart"] mark').textContent(), 'checkout');
  await page.evaluate(items => window.updateItems(items), bundle.items.filter(i => i.id !== 'a-cart'));
  await count(page, '1 of 3');
  await page.evaluate(items => window.updateItems(items), [bundle.items[0]]);
  await count(page, '1 of 1');
  await input.fill('flow');
  await count(page, '1 of 1'); // Heading-only documents retain find.
  await input.press('Enter');
  await count(page, '1 of 1');
});
