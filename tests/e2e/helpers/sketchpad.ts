import { test as base, expect, type FrameLocator, type Locator, type Page } from '@playwright/test';

export const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
export async function unlock(canvas: FrameLocator) {
  try { await expect(canvas.getByTestId('mutation-lock-overlay')).toBeVisible({ timeout: 500 }); } catch {}
  await expect(canvas.getByTestId('mutation-lock-overlay')).not.toBeVisible();
}

export class Sketchpad {
  readonly canvas: FrameLocator;
  readonly frames: Locator;
  readonly ids: string[] = [];
  id = '';
  constructor(readonly page: Page) {
    this.canvas = page.frameLocator('iframe[title="Sketchpad"]');
    this.frames = this.canvas.locator('[data-sketchpad-frame]');
  }
  async post(url: string, data: object) {
    const response = await this.page.request.post(url, { data });
    expect(response.ok(), `${url}: ${await response.text()}`).toBeTruthy();
    const result = await response.json();
    expect(result.error).toBeUndefined();
    return result;
  }
  async create(name: string) {
    const sp = await this.post('/__sketchpad-create', {
      name, withFrame: { name: 'Frame 1', width: 500, height: 360, canvasX: 0, canvasY: 0 },
    });
    this.ids.push(sp.id);
    return sp;
  }
  async open(id = this.id) {
    await this.page.goto('/protovibe.html');
    await this.page.getByTestId('tab-sketchpad').click();
    await this.canvas.getByTestId('btn-close-palette').click();
    await this.canvas.getByTestId('toolbar-sketchpads').click();
    await this.canvas.getByTestId(`sketchpad-${id}`).click();
    // Selecting closes the panel.
    await expect(this.frames.first()).toBeVisible();
  }
  root(frame = this.frames.first()) { return frame.locator('..'); }
  title(frame = this.frames.first()) { return this.root(frame).getByTestId('frame-title'); }
  items(frame = this.frames.first()) { return frame.locator('[data-pv-sketchpad-el]'); }
  async addComponent(name = 'Button', frame = this.frames.first()) {
    await this.title(frame).click();
    await this.canvas.getByTestId('toolbar-add').click();
    await this.canvas.getByTestId('add-menu-component').click();
    await this.canvas.getByTestId('input-component-search').fill(name);
    await this.canvas.getByTestId(`component-item-${name}`).click();
    await unlock(this.canvas);
    await this.canvas.getByTestId('btn-close-palette').click();
    await expect(this.items(frame).last()).toBeVisible();
  }
  async key(key: string) {
    await expect(this.page.getByTestId('inspector-sidebar')).toHaveAttribute('aria-busy', 'false');
    await expect(this.canvas.getByTestId('mutation-lock-overlay')).not.toBeVisible();
    await this.canvas.locator('body').press(key);
  }
  async history(redo = false) {
    await unlock(this.canvas);
    // Shell mutations can outlive the HMR update that removed/inserted an item.
    await expect(this.page.getByTestId('inspector-sidebar')).toHaveAttribute('aria-busy', 'false');
    const response = this.page.waitForResponse(r => r.url().includes(redo ? '/__redo' : '/__undo') && r.request().method() === 'POST');
    await this.key(`${modifier}+${redo ? 'Shift+Z' : 'z'}`);
    const result = await response;
    expect(result.ok()).toBeTruthy();
    expect((await result.json()).success).toBe(true);
    await unlock(this.canvas);
    await expect(this.page.getByTestId('inspector-sidebar')).toHaveAttribute('aria-busy', 'false');
  }
  async drag(locator: Locator, dx: number, dy: number, alt = false) {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    // Stay away from element resize edges and the frame menu button.
    await this.page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    if (alt) await this.page.keyboard.down('Alt');
    await this.page.mouse.down();
    await this.page.mouse.move(box!.x + box!.width / 2 + dx, box!.y + box!.height / 2 + dy, { steps: 12 });
    await this.page.mouse.up();
    if (alt) await this.page.keyboard.up('Alt');
    await unlock(this.canvas);
  }
  async position(locator: Locator) {
    return locator.evaluate(el => ({ x: parseFloat((el as HTMLElement).style.left) || 0, y: parseFloat((el as HTMLElement).style.top) || 0 }));
  }
  async registry() { return (await this.post('/__sketchpad-list', {})).sketchpads.find((s: {id: string}) => s.id === this.id); }
}

export const test = base.extend<{ sketch: Sketchpad }>({
  sketch: async ({ page }, use, testInfo) => {
    const sketch = new Sketchpad(page);
    const failedMutations: string[] = [];
    page.on('response', response => {
      const path = new URL(response.url()).pathname;
      if (response.request().method() === 'POST' && response.status() >= 400
          && /^\/__(sketchpad-|frame-|block-action$|add-block$|update-source$)/.test(path)) {
        failedMutations.push(`${response.status()} ${path}`);
      }
    });
    try {
      const sp = await sketch.create(`E2E ${testInfo.workerIndex} ${Date.now()}`);
      sketch.id = sp.id;
      await sketch.open();
      await use(sketch);
      expect(failedMutations, 'Canvas mutations must persist successfully').toEqual([]);
    } finally {
      testInfo.setTimeout(testInfo.timeout + 15_000);
      // API teardown still runs when the UI is broken or a test assertion fails.
      for (const id of sketch.ids.reverse()) await sketch.post('/__sketchpad-delete', { id });
    }
  },
});
export { expect };
