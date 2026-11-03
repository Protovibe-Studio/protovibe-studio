import { test, expect, modifier, unlock } from './helpers/sketchpad';

// One server owns source files, clipboard and undo history: never run these in parallel.
test.describe.configure({ mode: 'default', timeout: 60_000 });

test('creates a sketchpad with its initial frame and deletes it through the UI', async ({ sketch: s }) => {
  const name = `E2E UI ${Date.now()}`;
  await s.canvas.getByTestId('toolbar-sketchpads').click();
  await s.canvas.getByTestId('btn-new-sketchpad').click();
  await s.canvas.getByTestId('input-new-sketchpad').fill(name);
  const created = s.page.waitForResponse(r => r.url().endsWith('/__sketchpad-create'));
  await s.canvas.getByTestId('input-new-sketchpad').press('Enter');
  const sp = await (await created).json();
  s.ids.push(sp.id);
  await unlock(s.canvas);
  await expect(s.frames).toHaveCount(1);
  await expect(s.title()).toContainText('Frame 1');
  await s.canvas.getByTestId(`btn-delete-${name.toLowerCase().replace(/\s+/g, '-')}`).click();
  await s.canvas.getByTestId('dialog-confirm').click();
  await unlock(s.canvas);
  await expect(s.canvas.getByTestId(`sketchpad-${sp.id}`)).toHaveCount(0);
  s.ids.splice(s.ids.indexOf(sp.id), 1);
});

test('renames a frame; typing shortcuts do not mutate the canvas', async ({ sketch: s }) => {
  await s.root().getByTestId('frame-more-btn').click();
  await s.canvas.getByTestId('frame-menu-rename').click();
  const input = s.canvas.getByTestId('input-frame-name');
  await input.fill('Draft!');
  await input.press('Backspace');
  await input.press(`${modifier}+a`);
  await input.press(`${modifier}+c`);
  await expect(s.frames).toHaveCount(1);
  await input.press('Enter');
  await unlock(s.canvas);
  await expect(s.title()).toContainText('Draft');
  await s.history();
  await expect(s.title()).toContainText('Frame 1');
  await s.history(true);
  await expect(s.title()).toContainText('Draft');
  await s.open();
  await expect(s.title()).toContainText('Draft');
});

test('moves and resizes a frame, with undo, redo and reload persistence', async ({ sketch: s }) => {
  const root = s.root();
  const before = await s.position(root);
  await s.drag(s.title(), 80, 45);
  const rawMoved = await s.position(root);
  const moved = { x: Math.round(rawMoved.x), y: Math.round(rawMoved.y) };
  expect(moved.x).toBeGreaterThan(before.x);
  expect(moved.y).toBeGreaterThan(before.y);
  await s.history();
  await expect.poll(() => s.position(root)).toEqual(before);
  await s.history(true);
  await expect.poll(() => s.position(root)).toEqual(moved);
  await s.drag(root.locator('[data-sketchpad-resize-handle]'), 60, 40);
  await expect.poll(async () => (await s.registry()).frames[0].width).toBeGreaterThan(500);
  const width = (await s.registry()).frames[0].width;
  await s.history();
  await expect(s.frames.first()).toHaveCSS('width', '500px');
  await s.history(true);
  await expect(s.frames.first()).toHaveCSS('width', `${width}px`);
  await s.open();
  await expect.poll(() => s.position(root)).toEqual(moved);
  await expect(s.frames.first()).toHaveCSS('width', `${width}px`);
});

test('duplicates a populated frame with fresh element IDs and undoes deletion', async ({ sketch: s }) => {
  await s.addComponent();
  const originalId = await s.items().first().getAttribute('data-pv-block');
  await s.root().getByTestId('frame-more-btn').click();
  await s.canvas.getByTestId('frame-menu-duplicate').click();
  await unlock(s.canvas);
  await expect(s.frames).toHaveCount(2);
  const copy = s.frames.nth(1);
  await expect(s.items(copy)).toHaveCount(1);
  expect(await s.items(copy).first().getAttribute('data-pv-block')).not.toBe(originalId);
  await s.root(copy).getByTestId('frame-more-btn').click();
  await s.canvas.getByTestId('frame-menu-delete').click();
  await unlock(s.canvas);
  await expect(s.frames).toHaveCount(1);
  await s.history();
  await expect(s.frames).toHaveCount(2);
  await expect(s.items(copy)).toHaveCount(1);
  await s.history(true);
  await expect(s.frames).toHaveCount(1);
});

test('drags an item and restores exact position with undo and redo', async ({ sketch: s }) => {
  await s.addComponent();
  const item = s.items().first();
  const before = await s.position(item);
  await s.drag(item, 70, 50);
  const after = await s.position(item);
  expect(after.x).toBeGreaterThan(before.x);
  expect(after.y).toBeGreaterThan(before.y);
  await s.history();
  await expect.poll(() => s.position(item)).toEqual(before);
  await s.history(true);
  await expect.poll(() => s.position(item)).toEqual(after);
  await s.open();
  await expect.poll(() => s.position(item)).toEqual(after);
});

test('copies and pastes an item and deletes only that item with the keyboard', async ({ sketch: s }) => {
  await s.addComponent();
  await s.items().first().click();
  const copied = s.page.waitForResponse(r => r.url().endsWith('/__block-action') && r.request().postDataJSON()?.action === 'copy');
  await s.key(`${modifier}+c`);
  await copied;
  // Paste after a leaf component; plain paste inserts inside containers.
  await s.key(`${modifier}+Shift+v`);
  await expect(s.items()).toHaveCount(2);
  await unlock(s.canvas);
  const ids = await s.items().evaluateAll(els => els.map(el => el.getAttribute('data-pv-block')));
  expect(new Set(ids).size).toBe(2);
  const obsoleteDeletes: string[] = [];
  s.page.on('request', r => { if (r.url().includes('/__sketchpad-delete-element')) obsoleteDeletes.push(r.url()); });
  await s.key('Delete');
  await expect(s.items()).toHaveCount(1);
  expect(obsoleteDeletes).toEqual([]);
  await expect(s.frames).toHaveCount(1);
  await s.history();
  await expect(s.items()).toHaveCount(2);
  await s.history(true);
  await expect(s.items()).toHaveCount(1);
});

test('Alt-drag duplicates an item without moving its source', async ({ sketch: s }) => {
  await s.addComponent();
  const item = s.items().first();
  const before = await s.position(item);
  await s.drag(item, 100, 65, true);
  await expect(s.items()).toHaveCount(2);
  await expect.poll(() => s.position(item)).toEqual(before);
  await s.history();
  await expect(s.items()).toHaveCount(1);
  await s.history(true);
  await expect(s.items()).toHaveCount(2);
});

test('nudges an item by 1px and Shift+arrow by 8px', async ({ sketch: s }) => {
  await s.addComponent();
  const item = s.items().first();
  const before = await s.position(item);
  await item.click();
  await s.key('ArrowRight');
  await expect.poll(() => s.position(item)).toEqual({ x: before.x + 1, y: before.y });
  await s.key('Shift+ArrowDown');
  await expect.poll(() => s.position(item)).toEqual({ x: before.x + 1, y: before.y + 8 });
  await s.open();
  await expect.poll(() => s.position(item)).toEqual({ x: before.x + 1, y: before.y + 8 });
});

test('copies a populated frame across sketchpads and cuts/pastes it back', async ({ sketch: s }) => {
  await s.addComponent();
  const target = await s.create(`E2E target ${Date.now()}`);
  // Reload registry before copying: the in-memory frame clipboard survives tab/board switches, not reloads.
  await s.open();
  await s.title().click();
  const read = s.page.waitForResponse(r => r.url().endsWith('/__frame-read'));
  await s.key(`${modifier}+c`);
  await read;
  await s.canvas.getByTestId('toolbar-sketchpads').click();
  await s.canvas.getByTestId(`sketchpad-${target.id}`).click();
  await s.key(`${modifier}+v`);
  await expect(s.frames).toHaveCount(2);
  await expect(s.items(s.frames.nth(1))).toHaveCount(1);
  await unlock(s.canvas);
  await s.key(`${modifier}+x`);
  await expect(s.frames).toHaveCount(1);
  await unlock(s.canvas);
  await s.canvas.getByTestId('toolbar-sketchpads').click();
  await s.canvas.getByTestId(`sketchpad-${s.id}`).click();
  await s.key(`${modifier}+v`);
  await expect(s.frames).toHaveCount(2);
  await expect(s.items(s.frames.nth(1))).toHaveCount(1);
  await s.history();
  await expect(s.frames).toHaveCount(1);
  await s.history(true);
  await expect(s.frames).toHaveCount(2);
});

test('moves multiple selected frames together and deletes/restores them as one undo step', async ({ sketch: s }) => {
  await s.post('/__frame-create', { sketchpadId: s.id, name: 'Frame 2', width: 400, height: 360, canvasX: 600, canvasY: 0 });
  await s.open();
  const first = s.root(s.frames.nth(0));
  const second = s.root(s.frames.nth(1));
  await s.title(s.frames.nth(0)).click();
  await s.title(s.frames.nth(1)).click({ modifiers: ['Shift'] });
  await expect(s.canvas.locator('[data-sketchpad-frame-overlay]')).toHaveCount(2);
  const before = [await s.position(first), await s.position(second)];
  await s.drag(s.title(s.frames.nth(0)), 45, 35);
  const after = [await s.position(first), await s.position(second)];
  expect(after[0].x - before[0].x).toBeCloseTo(after[1].x - before[1].x, 0);
  expect(after[0].y - before[0].y).toBeCloseTo(after[1].y - before[1].y, 0);
  expect(after[0].x).toBeGreaterThan(before[0].x);
  await s.history();
  await expect.poll(async () => [await s.position(first), await s.position(second)]).toEqual(before);
  await s.title(s.frames.nth(0)).click();
  // Undo may preserve selection; explicitly select the group if needed.
  if (await s.canvas.locator('[data-sketchpad-frame-overlay]').count() === 1) {
    await s.title(s.frames.nth(1)).click({ modifiers: ['Shift'] });
  }
  await s.key('Backspace');
  await expect(s.frames).toHaveCount(0);
  await s.history();
  await expect(s.frames).toHaveCount(2);
  await s.history(true);
  await expect(s.frames).toHaveCount(0);
});

test('reparents an item between frames and restores both frames on undo/redo', async ({ sketch: s }) => {
  await s.post('/__frame-create', { sketchpadId: s.id, name: 'Target', width: 500, height: 360, canvasX: 620, canvasY: 0 });
  await s.open();
  const source = s.frames.nth(0);
  const target = s.frames.nth(1);
  await s.addComponent('Button', source);
  const item = s.items(source).first();
  const start = await item.boundingBox();
  const end = await target.boundingBox();
  await s.drag(item, end!.x + end!.width / 2 - start!.x - start!.width / 2, end!.y + end!.height / 2 - start!.y - start!.height / 2);
  await expect(s.items(source)).toHaveCount(0);
  await expect(s.items(target)).toHaveCount(1);
  await s.history();
  await expect(s.items(source)).toHaveCount(1);
  await expect(s.items(target)).toHaveCount(0);
  await s.history(true);
  await expect(s.items(source)).toHaveCount(0);
  await expect(s.items(target)).toHaveCount(1);
  await s.open();
  await expect(s.items(source)).toHaveCount(0);
  await expect(s.items(target)).toHaveCount(1);
});

test('Alt-click selects a frame without duplicating it', async ({ sketch: s }) => {
  const requests: string[] = [];
  s.page.on('request', r => { if (r.url().includes('/__frame-duplicate')) requests.push(r.url()); });
  await s.title().click({ modifiers: ['Alt'] });
  await unlock(s.canvas);
  await expect(s.canvas.locator('[data-sketchpad-frame-overlay]')).toHaveCount(1);
  await expect(s.frames).toHaveCount(1);
  expect(requests).toEqual([]);
});

test('zoom shortcuts apply once per keypress inside the iframe', async ({ sketch: s }) => {
  const frame = s.frames.first();
  const scale = async () => (await frame.boundingBox())!.width / 500;
  await s.key(`${modifier}+0`);
  await expect.poll(scale).toBeCloseTo(1, 2);
  await s.key(`${modifier}+-`);
  await expect.poll(scale).toBeCloseTo(1 / 1.2, 2);
  await s.key(`${modifier}+=`);
  await expect.poll(scale).toBeCloseTo(1, 2);
  // The same shortcuts must still work when keyboard focus is in the shell.
  await s.page.locator('body').press(`${modifier}+-`);
  await expect.poll(scale).toBeCloseTo(1 / 1.2, 2);
});

test('deleting a clicked item delegates to the shell without calling a removed endpoint', async ({ sketch: s }) => {
  await s.addComponent();
  await s.items().first().click();
  const obsolete: string[] = [];
  s.page.on('request', r => { if (r.url().includes('/__sketchpad-delete-element')) obsolete.push(r.url()); });
  await s.key('Backspace');
  await expect(s.items()).toHaveCount(0);
  await expect(s.frames).toHaveCount(1);
  expect(obsolete).toEqual([]);
  await s.history();
  await expect(s.items()).toHaveCount(1);
});

test('reparents an item into a nested container and undoes the hierarchy change', async ({ sketch: s }) => {
  await s.addComponent('Container');
  const container = s.frames.first().locator('[data-pv-component-id="Container"]');
  await s.drag(container, 100, 120);
  await s.addComponent('Button');
  const button = s.frames.first().locator('[data-pv-component-id="Button"]');
  const start = await button.boundingBox();
  const end = await container.boundingBox();
  await s.drag(button, end!.x + end!.width / 2 - start!.x - start!.width / 2, end!.y + end!.height / 2 - start!.y - start!.height / 2);
  await expect(container.locator('[data-pv-component-id="Button"]')).toHaveCount(1);
  await s.history();
  await expect(container.locator('[data-pv-component-id="Button"]')).toHaveCount(0);
  await expect(button).toHaveCount(1);
  await s.history(true);
  await expect(container.locator('[data-pv-component-id="Button"]')).toHaveCount(1);
  await s.open();
  await expect(container.locator('[data-pv-component-id="Button"]')).toHaveCount(1);
});

test('Alt-drag copies a frame and its contents while preserving the source position', async ({ sketch: s }) => {
  await s.addComponent();
  const before = await s.position(s.root());
  await s.drag(s.title(), 120, 65, true);
  await expect(s.frames).toHaveCount(2);
  await expect.poll(() => s.position(s.root())).toEqual(before);
  await expect(s.items(s.frames.nth(1))).toHaveCount(1);
  expect((await s.position(s.root(s.frames.nth(1)))).x).toBeGreaterThan(before.x);
  await s.history();
  await expect(s.frames).toHaveCount(1);
  await s.history(true);
  await expect(s.frames).toHaveCount(2);
});

test('Shift-selects multiple items and deletes/restores them in a single history step', async ({ sketch: s }) => {
  await s.addComponent();
  await s.drag(s.items().first(), 100, 100);
  await s.addComponent();
  await s.items().first().click();
  await s.items().nth(1).click({ modifiers: ['Shift'] });
  await s.key('Delete');
  await expect(s.items()).toHaveCount(0);
  await expect(s.frames).toHaveCount(1);
  await s.history();
  await expect(s.items()).toHaveCount(2);
  await s.history(true);
  await expect(s.items()).toHaveCount(0);
});

test('Escape clears item selection and prevents keyboard deletion', async ({ sketch: s }) => {
  await s.addComponent();
  await s.items().first().click();
  await s.key('Escape');
  await s.key('Delete');
  await unlock(s.canvas);
  await expect(s.items()).toHaveCount(1);
  await expect(s.frames).toHaveCount(1);
});

test('adds a frame from the toolbar and undoes/redoes its creation', async ({ sketch: s }) => {
  await s.canvas.getByTestId('toolbar-add').click();
  await s.canvas.getByTestId('add-menu-frame').click();
  await unlock(s.canvas);
  await expect(s.frames).toHaveCount(2);
  await s.history();
  await expect(s.frames).toHaveCount(1);
  await s.history(true);
  await expect(s.frames).toHaveCount(2);
});

test('marquee-selects an item from empty frame space', async ({ sketch: s }) => {
  await s.addComponent();
  await s.key('Escape');
  const box = (await s.frames.first().boundingBox())!;
  const scale = box.width / 500;
  await s.page.mouse.move(box.x + 30 * scale, box.y + 30 * scale);
  await s.page.mouse.down();
  await s.page.mouse.move(box.x + 240 * scale, box.y + 200 * scale, { steps: 12 });
  await s.page.mouse.up();
  await s.key('Delete');
  await expect(s.items()).toHaveCount(0);
  await s.history();
  await expect(s.items()).toHaveCount(1);
});

test('Space-drag pans the viewport without changing saved frame positions', async ({ sketch: s }) => {
  const before = (await s.frames.first().boundingBox())!;
  const position = await s.position(s.root());
  await s.key('Escape');
  await s.page.keyboard.down('Space');
  await s.page.mouse.move(before.x + 30, before.y + 30);
  await s.page.mouse.down();
  await s.page.mouse.move(before.x + 90, before.y + 70, { steps: 12 });
  await s.page.mouse.up();
  await s.page.keyboard.up('Space');
  await expect.poll(async () => Math.round((await s.frames.first().boundingBox())!.x - before.x)).toBe(60);
  await expect.poll(async () => Math.round((await s.frames.first().boundingBox())!.y - before.y)).toBe(40);
  expect(await s.position(s.root())).toEqual(position);
  const frame = (await s.registry()).frames[0];
  expect({ x: frame.canvasX, y: frame.canvasY }).toEqual(position);
});

test('redo accepts the uppercase Z produced by a physical Shift shortcut', async ({ sketch: s }) => {
  await s.addComponent();
  await s.history();
  await expect(s.items()).toHaveCount(0);
  await s.key(`${modifier}+Shift+Z`);
  await expect(s.items()).toHaveCount(1);
});

for (const focus of ['iframe', 'shell'] as const) {
  test(`Escape clears frame selection before Delete (${focus})`, async ({ sketch: s }) => {
    await s.title().click();
    await expect(s.canvas.locator('[data-sketchpad-frame-overlay]')).toHaveCount(1);
    if (focus === 'shell') await s.page.locator('body').press('Escape');
    else await s.key('Escape');
    await expect(s.canvas.locator('[data-sketchpad-frame-overlay]')).toHaveCount(0);
    await s.key('Delete');
    await unlock(s.canvas);
    await expect(s.frames).toHaveCount(1);
  });
}

for (const action of ['copy', 'cut'] as const) {
  test(`${action} of an item replaces a previously copied frame`, async ({ sketch: s }) => {
    await s.addComponent();
    await s.title().click();
    const frameRead = s.page.waitForResponse(r => r.url().endsWith('/__frame-read'));
    await s.key(`${modifier}+c`);
    await frameRead;
    // Double-click drills through the selected frame's interaction overlay.
    const box = (await s.items().first().boundingBox())!;
    await s.page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
    await expect(s.canvas.locator('[data-sketchpad-frame-overlay]')).toHaveCount(0);
    const copied = s.page.waitForResponse(r => r.url().endsWith('/__block-action') && r.request().postDataJSON()?.action === action);
    await s.key(`${modifier}+${action === 'copy' ? 'c' : 'x'}`);
    await copied;
    // Plain paste into the frame must use the most recent item clipboard.
    await s.title().click();
    await s.page.locator('iframe[title="Sketchpad"]').focus();
    await s.key(`${modifier}+v`);
    await unlock(s.canvas);
    await expect(s.frames).toHaveCount(1);
    await expect(s.items()).toHaveCount(action === 'copy' ? 2 : 1);
  });
}
