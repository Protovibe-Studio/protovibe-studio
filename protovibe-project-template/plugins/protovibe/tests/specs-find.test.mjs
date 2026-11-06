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
const overviewBundle = {
  ...bundle,
  items: Array.from({ length: 24 }, (_, i) => [
    { id: `h-chapter-${i}`, type: 'heading', rank: `${i}`, title: i === 0 ? 'Checkout flow' : `Chapter ${i + 1}`, level: 'big', createdAt },
    { id: `h-detail-${i}`, type: 'heading', rank: `${i}`, title: 'Details and requirements', level: 'medium', createdAt },
    annotation(`a-chapter-${i}`, `Requirements for chapter ${i + 1}`, i === 0 ? 'verified' : 'todo'),
  ]).flat(),
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
      const initial = location.search.includes('overview') ? ${JSON.stringify(overviewBundle)} : ${JSON.stringify(bundle)};
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
              scope="all" setScope={noop} scopeIds={scopeIds} busy={false} activeId={activeId}
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
    if (path === '/specs-data.json') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ generatedAt: createdAt, specs: req.headers.referer?.includes('overview') ? [overviewBundle] : specs })); }
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
  page.setDefaultTimeout(10_000);
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

for (const [name, path] of [['editor', '/editor'], ['published-viewer', '/specs.html?spec=s-checkout']]) {
  test(`${name}: next and previous reveal a single match after scrolling away`, async t => {
    const page = await openPage(t, path);
    await page.setViewportSize({ width: 1280, height: 500 });
    const input = page.getByTestId('spec-find-input');
    await input.fill('[total]');
    await count(page, '1 of 1');
    for (const key of ['Enter', 'Shift+Enter']) {
      await page.locator('mark').evaluate(el => {
        let list = el.parentElement;
        while (list && getComputedStyle(list).overflowY !== 'auto') list = list.parentElement;
        list.scrollTop = 0;
      });
      await input.press(key);
      await page.waitForFunction(() => {
        const rect = document.querySelector('mark[data-spec-find-active="true"]').getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= innerHeight;
      }, null, { timeout: 2000 });
    }
  });
}

test('editor: live text updates reveal a newly matching annotation', async t => {
  const page = await openPage(t, '/editor');
  await page.setViewportSize({ width: 1280, height: 500 });
  await page.getByTestId('spec-find-input').fill('newly matching');
  await count(page, 'No matches');
  await page.evaluate(items => window.updateItems(items), bundle.items.map(it =>
    it.id === 'a-literal' ? { ...it, text: 'A newly matching annotation.' } : it));
  await count(page, '1 of 1');
  await page.waitForFunction(() => {
    const rect = document.querySelector('mark[data-spec-find-active="true"]')?.getBoundingClientRect();
    return rect && rect.top >= 0 && rect.bottom <= innerHeight;
  }, null, { timeout: 2000 });
});

test('editor: Unicode case conversion preserves highlight offsets', async t => {
  const page = await openPage(t, '/editor');
  await page.evaluate(items => window.updateItems(items), [
    { ...bundle.items[0], title: 'İstanbul checkout' },
    annotation('a-unicode', 'İstanbul checkout'),
  ]);
  await page.getByTestId('spec-find-input').fill('CHECKOUT');
  await count(page, '1 of 2');
  assert.deepEqual(await page.locator('mark').allTextContents(), ['checkout', 'checkout']);
});

test('editor: clicking a horizontally revealed heading match edits that word', async t => {
  const page = await openPage(t, '/editor');
  const title = 'This is a very long heading with many words before the checkout word';
  await page.evaluate(items => window.updateItems(items), [{ ...bundle.items[0], title }]);
  const findInput = page.getByTestId('spec-find-input');
  await findInput.fill('checkout');
  await count(page, '1 of 1');
  const field = page.locator('[data-spec-item="h-checkout"] input');
  const match = page.locator('[data-spec-item="h-checkout"] mark');
  await page.waitForFunction(() => document.querySelector('mark')?.parentElement.scrollLeft > 0);

  // The overlay ignores pointer events, so use real pointer coordinates to
  // exercise caret placement in the input underneath the visible match.
  const clickMatch = async () => {
    const box = await match.boundingBox();
    assert.ok(box);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    return field.evaluate(el => el.selectionStart);
  };
  const caret = await clickMatch();
  const start = title.indexOf('checkout');
  assert.ok(caret >= start && caret <= start + 'checkout'.length,
    `Expected caret inside checkout at ${start}, got ${caret}`);
  await page.keyboard.type('X');
  const edited = title.slice(0, caret) + 'X' + title.slice(caret);
  assert.equal(await field.inputValue(), edited);

  // Restore the text so the find effect will not run again. Remounting the
  // overlay on blur must still preserve the field's horizontal position.
  await page.keyboard.press('Backspace');
  assert.equal(await field.inputValue(), title);
  await findInput.click();
  await count(page, '1 of 1');
  const nextCaret = await clickMatch();
  assert.ok(nextCaret >= start && nextCaret <= start + 'checkout'.length,
    `Expected caret inside checkout after blur at ${start}, got ${nextCaret}`);
});

test('editor: no wording status composes with find and scope', async t => {
  const page = await openPage(t, '/editor');
  await page.evaluate(items => window.updateItems(items), [
    annotation('a-none', 'Checkout without wording status'),
    ...['todo', 'progress', 'done'].map(wordingStatus => ({
      ...annotation(`a-${wordingStatus}`, 'Checkout with wording status'), wordingStatus,
    })),
  ]);
  await page.getByTestId('spec-find-input').fill('checkout');
  await count(page, '1 of 4');
  await page.getByRole('button', { name: 'All statuses', exact: true }).click();
  await page.getByRole('button', { name: /No wording status/ }).click();
  await count(page, '1 of 1');
  assert.deepEqual(await page.getByTestId('spec-annotation-row').evaluateAll(rows => rows.map(row => row.dataset.specItem)), ['a-none']);
  await page.evaluate(() => window.setScopeIds(['a-done']));
  await count(page, 'No matches');
  assert.equal(await page.getByTestId('spec-annotation-row').count(), 0);
  await page.evaluate(() => { window.setScopeIds(null); window.setStatusFilter('all'); });
  await count(page, '1 of 4');
});

test('editor: wording icon remains visible at thumbnail bottom through resizing and warning', async t => {
  const page = await openPage(t, '/editor');
  await page.evaluate(items => window.updateItems(items), [{
    ...annotation('a-wording', 'A long annotation. '.repeat(30)), wordingStatus: 'progress',
    anchor: { file: 'src/App.tsx' },
  }]);
  const row = page.getByTestId('spec-annotation-row');
  const icon = page.getByTestId('spec-wording-status');
  await icon.waitFor();
  await page.mouse.move(1200, 800);
  for (const width of [280, 360, 500]) {
    await page.evaluate(width => { document.querySelector('#root > div > div').style.width = `${width}px`; }, width);
    await page.waitForFunction(() => {
      const icon = document.querySelector('[data-testid="spec-wording-status"]');
      const thumbnail = document.querySelector('[data-pv-thumbnail]')?.parentElement;
      return icon && thumbnail && Math.abs(icon.getBoundingClientRect().bottom - thumbnail.getBoundingClientRect().bottom) < 1;
    });
    assert.equal(await icon.evaluate(el => getComputedStyle(el).opacity), '1');
  }
  await page.getByTestId('spec-pin-missing-warning').waitFor({ timeout: 15000 });
  assert.equal(await row.getByText(/not found on this screen/).count(), 0);
  assert.ok(await icon.evaluate(el => Math.abs(el.getBoundingClientRect().bottom - document.querySelector('[data-pv-thumbnail]').parentElement.getBoundingClientRect().bottom) < 1));
  await icon.click();
  await page.getByRole('button', { name: /^To check/ }).waitFor();
});

const heading = (id, title, level = 'big') => ({ id, type: 'heading', rank: id, title, level, createdAt });
const sectionNotes = prefix => Array.from({ length: 4 }, (_, i) =>
  annotation(`a-${prefix}-${i}`, `${prefix === 'payment' ? 'Payment' : 'Delivery'} step ${i + 1}. Review the details and keep the customer informed before continuing.`, 'verified'));
const stickyBundle = {
  spec: { id: 's-sticky', title: 'Checkout experience', createdAt },
  items: [
    heading('h-intro', 'Before checkout', 'medium'), ...sectionNotes('intro'),
    heading('h-checkout', 'Checkout flow'),
    heading('h-delivery', 'Delivery details', 'medium'), ...sectionNotes('delivery'),
    heading('h-payment', 'Payment and billing', 'medium'), ...sectionNotes('payment'),
    heading('h-complete', 'Order confirmation'), ...sectionNotes('complete'),
    heading('h-receipt', 'Receipt and next steps', 'medium'), ...sectionNotes('receipt'),
  ],
};

async function openStickyPage(t, name) {
  const page = await openPage(t, '/editor');
  if (name === 'editor') {
    await page.waitForFunction(() => !!window.updateItems);
    await page.evaluate(items => window.updateItems(items), stickyBundle.items);
  } else {
    await page.route('**/specs-data.json', route => route.fulfill({
      json: { generatedAt: createdAt, specs: [stickyBundle] },
    }));
    await page.goto(origin + '/specs.html?spec=s-sticky');
  }
  await page.locator('[data-spec-section="h-receipt"]').waitFor();
  return page;
}

// Scroll the real list, not the page. Layout assertions below also catch an
// accidental sticky ancestor or a section wrapper that cannot grow/shrink.
async function scrollToNote(page, id, inset = 100) {
  await page.locator(`[data-spec-item="${id}"]`).evaluate((row, inset) => {
    let list = row.parentElement;
    while (list && getComputedStyle(list).overflowY !== 'auto') list = list.parentElement;
    list.scrollTop += row.getBoundingClientRect().top - list.getBoundingClientRect().top - inset;
  }, inset);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function pinnedHeadings(page) {
  return page.locator('[data-spec-sticky-heading]').evaluateAll(headings => {
    let list = headings[0].parentElement;
    while (list && getComputedStyle(list).overflowY !== 'auto') list = list.parentElement;
    const top = list.getBoundingClientRect().top;
    return headings.filter(el => Math.abs(el.getBoundingClientRect().top - top - parseFloat(getComputedStyle(el).top)) < 1)
      .map(el => el.parentElement.dataset.specSection);
  });
}

for (const name of ['editor', 'published-viewer']) {
  test(`${name}: sticky headings replace each level and clear the subsection at a big heading`, async t => {
    const page = await openStickyPage(t, name);
    await scrollToNote(page, 'a-intro-2');
    assert.deepEqual(await pinnedHeadings(page), ['h-intro'], 'a small heading without a parent sticks at the top');
    await scrollToNote(page, 'a-delivery-2');
    assert.deepEqual(await pinnedHeadings(page), ['h-checkout', 'h-delivery']);
    await scrollToNote(page, 'a-payment-2');
    assert.deepEqual(await pinnedHeadings(page), ['h-checkout', 'h-payment']);
    const big = await page.locator('[data-spec-section="h-checkout"] > [data-spec-sticky-heading]').boundingBox();
    const small = await page.locator('[data-spec-section="h-payment"] > [data-spec-sticky-heading]').boundingBox();
    assert.ok(Math.abs(big.y + big.height - small.y) < 1, 'small heading sits directly below its big heading');
    await page.mouse.move(1200, 800);
    await screenshot(page, name + '-sticky-headings');
    await scrollToNote(page, 'a-complete-2');
    assert.deepEqual(await pinnedHeadings(page), ['h-complete'], 'previous subsection does not leak into a new big section');
    await screenshot(page, name + '-sticky-new-section');
    await scrollToNote(page, 'a-receipt-2');
    assert.deepEqual(await pinnedHeadings(page), ['h-complete', 'h-receipt']);
    await scrollToNote(page, 'a-delivery-2');
    assert.deepEqual(await pinnedHeadings(page), ['h-checkout', 'h-delivery'], 'scrolling back restores the earlier section');
    await page.locator('[data-spec-sticky-heading]').first().evaluate(el => {
      let list = el.parentElement;
      while (list && getComputedStyle(list).overflowY !== 'auto') list = list.parentElement;
      list.scrollTop = 0;
    });
    assert.deepEqual(await pinnedHeadings(page), name === 'editor' ? [] : ['h-intro']);
  });

  test(`${name}: find reveals an earlier annotation below sticky headings`, async t => {
    const page = await openStickyPage(t, name);
    await scrollToNote(page, 'a-receipt-2');
    await page.getByTestId('spec-find-input').fill('Payment step 1.');
    await count(page, '1 of 1');
    await page.waitForFunction(() => {
      const match = document.querySelector('mark[data-spec-find-active="true"]');
      const big = document.querySelector('[data-spec-section="h-checkout"] > [data-spec-sticky-heading]');
      const small = document.querySelector('[data-spec-section="h-payment"] > [data-spec-sticky-heading]');
      return match && match.getBoundingClientRect().top >= Math.max(big.getBoundingClientRect().bottom, small.getBoundingClientRect().bottom);
    });
    assert.deepEqual(await pinnedHeadings(page), ['h-checkout', 'h-payment']);
  });
}

test('published-viewer: wrapped headings remeasure after sidebar resize', async t => {
  const page = await openStickyPage(t, 'published-viewer');
  await page.route('**/specs-data.json', route => route.fulfill({ json: {
    generatedAt: createdAt, specs: [{ ...stickyBundle, items: stickyBundle.items.map(it =>
      it.id === 'h-checkout' ? { ...it, title: 'Checkout flow with saved addresses and delivery preferences' } : it) }],
  } }));
  await page.reload();
  await scrollToNote(page, 'a-payment-2');
  for (const width of [400, 240]) {
    const handle = page.getByTitle('Resize sidebar');
    const box = await handle.boundingBox();
    await page.mouse.move(box.x + box.width / 2, 300);
    await page.mouse.down();
    await page.mouse.move(width, 300);
    await page.mouse.up();
    await page.waitForFunction(() => {
      const big = document.querySelector('[data-spec-section="h-checkout"] > [data-spec-sticky-heading]').getBoundingClientRect();
      const small = document.querySelector('[data-spec-section="h-payment"] > [data-spec-sticky-heading]').getBoundingClientRect();
      return Math.abs(big.bottom - small.top) < 1;
    });
    assert.deepEqual(await pinnedHeadings(page), ['h-checkout', 'h-payment']);
  }
  await screenshot(page, 'published-viewer-sticky-wrapped');
});

test('editor: sticky headings remain editable and follow filtering and live changes', async t => {
  const page = await openStickyPage(t, 'editor');
  await scrollToNote(page, 'a-payment-2');
  const title = page.locator('[data-spec-item="h-payment"] input');
  await title.click();
  await title.fill('Payment methods');
  await page.getByTestId('spec-find-input').click();
  assert.equal(await title.inputValue(), 'Payment methods');
  assert.deepEqual(await pinnedHeadings(page), ['h-checkout', 'h-payment']);
  await page.evaluate(() => window.setScopeIds(['a-complete-2']));
  assert.deepEqual(await page.locator('[data-spec-section]').evaluateAll(rows => rows.map(row => row.dataset.specSection)), ['h-complete']);
  await page.evaluate(items => { window.setScopeIds(null); window.updateItems(items); }, stickyBundle.items.filter(it => it.type === 'annotation'));
  assert.equal(await page.locator('[data-spec-sticky-heading]').count(), 0);
});

for (const [name, path] of [['editor', '/editor?overview'], ['published-viewer', '/specs.html?spec=s-checkout&overview']]) {
  test(`${name}: heading overview navigates, nests, scrolls, and dismisses`, async t => {
    const page = await openPage(t, path);
    const input = page.getByTestId('spec-find-input');
    const menu = page.getByTestId('spec-heading-overview');
    const entries = page.getByTestId('spec-heading-jump');
    await input.click();
    await menu.waitFor();
    assert.equal(await entries.count(), 48);
    assert.equal(await entries.nth(0).textContent(), 'Checkout flow');
    assert.equal(await entries.nth(1).evaluate(el => parseInt(getComputedStyle(el).paddingLeft)), 24);
    assert.equal(await entries.nth(0).evaluate(el => parseInt(getComputedStyle(el).paddingLeft)), 8);
    assert.equal(await menu.evaluate(el => el.scrollHeight > el.clientHeight), true);
    assert.ok((await menu.boundingBox()).height <= 900 * 0.7);
    const beforeHover = await entries.nth(1).evaluate(el => getComputedStyle(el).backgroundColor);
    await entries.nth(1).hover();
    await page.waitForFunction(before => getComputedStyle(document.querySelectorAll('[data-testid="spec-heading-jump"]')[1]).backgroundColor !== before, beforeHover);
    await screenshot(page, name + '-overview');
    await entries.nth(42).click();
    await menu.waitFor({ state: 'hidden' });
    const heading = page.locator('[data-spec-heading="h-chapter-21"]');
    const rect = await heading.boundingBox();
    assert.ok(rect.y > 0 && rect.y < 800, 'selected chapter is visible');
    await input.click();
    await input.fill('Requirements');
    await menu.waitFor({ state: 'hidden' });
    await count(page, '1 of 48');
    await input.press('Escape');
    await menu.waitFor({ state: 'hidden' });
    await input.click();
    await input.press('ArrowDown');
    assert.equal(await entries.first().evaluate(el => el === document.activeElement), true);
    await entries.first().press('ArrowDown');
    await entries.nth(1).press('Enter');
    await menu.waitFor({ state: 'hidden' });
    assert.ok((await page.locator('[data-spec-heading="h-detail-0"]').boundingBox()).y < 300, 'keyboard jump returns to the first subsection');
    await input.click();
    await menu.waitFor();
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await menu.waitFor({ state: 'hidden' });
    if (name === 'editor') {
      await page.evaluate(() => window.setStatusFilter('verified'));
      await input.click();
      await menu.waitFor();
      assert.equal(await entries.count(), 2, 'only filtered headings appear');
      await page.evaluate(() => window.updateItems([]));
      await menu.waitFor({ state: 'hidden' });
    }
  });
}
