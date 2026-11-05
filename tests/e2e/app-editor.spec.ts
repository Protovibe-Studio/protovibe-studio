import { test as base, expect, type FrameLocator, type Page } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { modifier } from './helpers/sketchpad';

// Shared backend clipboard/history: run with --workers=1, after the Sketchpad suite.
const sourceFile = path.resolve('protovibe-project-template/src/pages/DashboardPage.tsx');
const fixture = `export function DashboardPage() { return <div data-testid="app-fixture" className="flex flex-col gap-4 p-8">
  {/* pv-editable-zone-start:root01 */}
    {/* pv-block-start:first1 */}
    <div data-pv-block="first1" data-testid="app-first" className="w-40 h-12 bg-background-secondary">First</div>
    {/* pv-block-end:first1 */}
    {/* pv-block-start:second */}
    <div data-pv-block="second" data-testid="app-second" className="w-40 h-12 bg-background-secondary" style={{width:180,opacity:0.7}}>Second</div>
    {/* pv-block-end:second */}
    {/* pv-block-start:third1 */}
    <div data-pv-block="third1" data-testid="app-third" className="w-40 h-12 bg-background-secondary">Third</div>
    {/* pv-block-end:third1 */}
  {/* pv-editable-zone-end:root01 */}
</div>; }`;

class AppEditor {
  readonly canvas: FrameLocator;
  constructor(readonly page: Page) { this.canvas = page.frameLocator('iframe').first(); }
  async ready() { await expect(this.page.getByTestId('inspector-sidebar')).toHaveAttribute('aria-busy', 'false'); }
  async key(key: string) { await this.ready(); await this.canvas.locator('body').press(key); }
  async action(key: string, action: string) {
    const response = this.page.waitForResponse(r => r.url().endsWith('/__block-action') && r.request().postDataJSON()?.action === action);
    await this.key(key);
    expect((await (await response).json()).success).toBe(true);
    await this.ready();
  }
  async history(redo = false) {
    await this.ready();
    const response = this.page.waitForResponse(r => r.url().endsWith(redo ? '/__redo' : '/__undo'));
    await this.key(`${modifier}+${redo ? 'Shift+Z' : 'z'}`);
    expect((await (await response).json()).success).toBe(true);
    await this.ready();
  }
  async button(id: string) { await this.ready(); await this.page.getByTestId(id).click(); await this.ready(); }
}

const test = base.extend<{ app: AppEditor }>({
  app: async ({ page }, use) => {
    const original = await readFile(sourceFile, 'utf8');
    try {
      await writeFile(sourceFile, fixture);
      await page.goto('/protovibe.html');
      await page.getByTestId('tab-app').click();
      const app = new AppEditor(page);
      await expect(app.canvas.getByTestId('app-first')).toBeVisible();
      await use(app);
    } finally {
      await writeFile(sourceFile, original);
    }
  },
});
test.describe.configure({ mode: 'default', timeout: 60_000 });

test('App clipboard, duplicate, cut and uppercase redo keep flow layout and fresh IDs', async ({ app: a }) => {
  const blocks = a.canvas.getByTestId('app-fixture').locator('[data-pv-block]');
  await a.canvas.getByTestId('app-first').click();
  await a.action(`${modifier}+c`, 'copy');
  await a.canvas.getByTestId('app-third').click();
  await a.key(`${modifier}+Shift+v`);
  await expect(blocks).toHaveCount(4);
  const copy = a.canvas.getByTestId('app-first').last();
  await expect(copy).not.toHaveCSS('position', 'absolute');
  expect(await copy.getAttribute('data-pv-block')).not.toBe('first1');
  await copy.click();
  await a.action(`${modifier}+d`, 'duplicate');
  await expect(blocks).toHaveCount(5);
  const ids = await blocks.evaluateAll(els => els.map(el => el.getAttribute('data-pv-block')));
  expect(new Set(ids).size).toBe(5);
  await a.canvas.getByTestId('app-first').last().click();
  await a.action(`${modifier}+x`, 'cut');
  await expect(blocks).toHaveCount(4);
  await a.history();
  await expect(blocks).toHaveCount(5);
  await a.history(true);
  await expect(blocks).toHaveCount(4);
  await a.page.reload();
  await expect(blocks).toHaveCount(4);
  await expect(a.canvas.locator('[data-pv-sketchpad-el]')).toHaveCount(0);
});

test('App inspector dimensions update classes while preserving ordinary inline styles', async ({ app: a }) => {
  const first = a.canvas.getByTestId('app-first');
  const second = a.canvas.getByTestId('app-second');
  await first.click();
  const width = a.page.getByTestId('control-width').locator('input');
  await width.fill('240px');
  await width.press('Enter');
  await expect(first).toHaveCSS('width', '240px');
  await a.history();
  await expect(first).toHaveCSS('width', '160px');
  await a.history(true);
  await expect(first).toHaveCSS('width', '240px');
  await second.click();
  await width.fill('260px');
  await width.press('Enter');
  await expect(second).toHaveClass(/w-\[260px\]/);
  await expect(second).toHaveCSS('width', '180px');
  await expect(second).toHaveCSS('opacity', '0.7');
  await a.page.reload();
  await expect(first).toHaveCSS('width', '240px');
  await expect(second).toHaveCSS('width', '180px');
  await expect(second).toHaveCSS('opacity', '0.7');
});

test('App move up/down, wrap, unwrap and Escape retain flow behavior', async ({ app: a }) => {
  const first = a.canvas.getByTestId('app-first');
  const order = () => a.canvas.getByTestId('app-fixture').locator('[data-testid^="app-"]').evaluateAll(els => els.map(el => el.getAttribute('data-testid')));
  await a.canvas.getByTestId('app-third').click();
  await a.button('btn-move-up');
  await expect.poll(order).toEqual(['app-first', 'app-third', 'app-second']);
  await a.button('btn-move-down');
  await expect.poll(order).toEqual(['app-first', 'app-second', 'app-third']);
  await first.click();
  await a.button('btn-wrap');
  const wrapper = first.locator('..');
  await expect(wrapper).toHaveAttribute('data-pv-block', /.+/);
  await expect(a.canvas.getByTestId('app-fixture').locator('[data-pv-block]')).toHaveCount(4);
  await a.button('btn-unwrap');
  await expect(a.canvas.getByTestId('app-fixture').locator('[data-pv-block]')).toHaveCount(3);
  await expect(first).not.toHaveCSS('position', 'absolute');
  await expect(a.canvas.locator('[data-pv-sketchpad-el]')).toHaveCount(0);
  await a.history();
  await expect(a.canvas.getByTestId('app-fixture').locator('[data-pv-block]')).toHaveCount(4);
  await a.history(true);
  await expect(a.canvas.getByTestId('app-fixture').locator('[data-pv-block]')).toHaveCount(3);
  await first.click();
  await a.key('Escape');
  await a.key('Delete');
  await expect(a.canvas.getByTestId('app-fixture').locator('[data-pv-block]')).toHaveCount(3);
});
