import { test, expect, modifier, unlock, type Sketchpad } from './helpers/sketchpad';

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

for (const edge of ['east', 'west', 'north', 'south', 'northwest', 'northeast', 'southwest', 'southeast'] as const) {
  test(`resizes an item from the ${edge} edge as one undo step`, async ({ sketch: s }) => {
    const horizontal = edge.includes('east') || edge.includes('west');
    const vertical = edge.includes('north') || edge.includes('south');
    await s.addComponent(vertical ? 'Rectangle' : 'Button');
    const item = s.items().first();
    const geometry = () => item.evaluate(el => {
      const style = getComputedStyle(el);
      return { x: parseFloat(style.left), y: parseFloat(style.top), width: parseFloat(style.width), height: parseFloat(style.height) };
    });
    const before = await geometry();
    await item.click();
    const box = (await item.boundingBox())!;
    const west = edge.includes('west');
    const north = edge.includes('north');
    const x = horizontal ? (west ? box.x + 1 : box.x + box.width - 1) : box.x + box.width / 2;
    const y = vertical ? (north ? box.y + 1 : box.y + box.height - 1) : box.y + box.height / 2;
    const resized = s.page.waitForResponse(r => r.url().endsWith('/__sketchpad-update-element-size'));
    await s.page.mouse.move(x, y);
    await s.page.mouse.down();
    await s.page.mouse.move(x + (horizontal ? (west ? -25 : 55) : 0), y + (vertical ? (north ? -20 : 35) : 0), { steps: 12 });
    await s.page.mouse.up();
    expect((await resized).ok()).toBeTruthy();
    const after = await geometry();
    if (horizontal) expect(after.width).toBeGreaterThan(before.width);
    else expect(after.width).toBe(before.width);
    if (vertical) expect(after.height).toBeGreaterThan(before.height);
    else expect(after.height).toBe(before.height);
    if (west) expect(after.x).toBeLessThan(before.x);
    else expect(after.x).toBe(before.x);
    if (north) expect(after.y).toBeLessThan(before.y);
    else expect(after.y).toBe(before.y);
    await s.history();
    await expect.poll(geometry).toEqual(before);
    await s.history(true);
    await expect.poll(geometry).toEqual(after);
    await s.open();
    await expect.poll(geometry).toEqual(after);
  });
}

test('changes item width in the inspector and preserves it after moving and reloading', async ({ sketch: s }) => {
  await s.addComponent();
  const item = s.items().first();
  await item.click();
  const input = s.page.getByTestId('control-width').locator('input');
  await input.fill('240px');
  await input.press('Enter');
  await expect(item).toHaveCSS('width', '240px');
  await s.drag(item, 40, 60);
  await expect(item).toHaveCSS('width', '240px');
  await s.open();
  await expect(item).toHaveCSS('width', '240px');
});

for (const dropY of [210, 340]) {
  test(`drops a component from the palette at y=${dropY} at non-default zoom`, async ({ sketch: s }) => {
    await s.key(`${modifier}+-`);
    await s.canvas.getByTestId('toolbar-add').click();
    await s.canvas.getByTestId('add-menu-component').click();
    await s.canvas.getByTestId('input-component-search').fill('Button');
    const frame = s.frames.first();
    const box = (await frame.boundingBox())!;
    const scale = box.width / 500;
    await s.canvas.getByTestId('component-item-Button').dragTo(frame, { targetPosition: { x: 300 * scale, y: dropY * scale } });
    await unlock(s.canvas);
    await s.canvas.getByTestId('btn-close-palette').click();
    await expect(s.items()).toHaveCount(1);
    const position = await s.position(s.items().first());
    expect(Math.abs(position.x - 300)).toBeLessThanOrEqual(2);
    expect(Math.abs(position.y - dropY)).toBeLessThanOrEqual(2);
    await s.history();
    await expect(s.items()).toHaveCount(0);
    await s.history(true);
    await expect(s.items()).toHaveCount(1);
    await s.open();
    await expect.poll(() => s.position(s.items().first())).toEqual(position);
  });
}

test('moves multiple items together and undoes the entire gesture', async ({ sketch: s }) => {
  await s.addComponent();
  await s.drag(s.items().first(), 100, 100);
  await s.addComponent();
  await s.items().first().click();
  await s.items().nth(1).click({ modifiers: ['Shift'] });
  const positions = async () => Promise.all([s.position(s.items().first()), s.position(s.items().nth(1))]);
  const before = await positions();
  await s.drag(s.items().first(), 40, 30);
  const after = await positions();
  expect(after[0].x - before[0].x).toBeCloseTo(after[1].x - before[1].x, 0);
  expect(after[0].y - before[0].y).toBeCloseTo(after[1].y - before[1].y, 0);
  expect(after[0].x).toBeGreaterThan(before[0].x);
  await s.history();
  await expect.poll(positions).toEqual(before);
  await s.history(true);
  await expect.poll(positions).toEqual(after);
});

test('reparents a flow child back to its frame and persists its dropped position', async ({ sketch: s }) => {
  const moves: string[][] = [];
  const separateDeletes: string[] = [];
  s.page.on('request', r => {
    if (r.url().endsWith('/__add-block') && r.postDataJSON()?.moveBlockIds) moves.push(r.postDataJSON().moveBlockIds);
    if (r.url().endsWith('/__block-action') && r.postDataJSON()?.action === 'delete') separateDeletes.push(r.url());
  });
  await s.addComponent('Container');
  const container = s.frames.first().locator('[data-pv-component-id="Container"]');
  await s.drag(container, 100, 120);
  await s.addComponent('Button');
  const button = s.frames.first().locator('[data-pv-component-id="Button"]');
  const start = (await button.boundingBox())!;
  const end = (await container.boundingBox())!;
  await s.drag(button, end.x + end.width / 2 - start.x - start.width / 2, end.y + end.height / 2 - start.y - start.height / 2);
  await expect(container.locator('[data-pv-component-id="Button"]')).toHaveCount(1);
  // Wait for the completed hierarchy update before starting the next gesture.
  await expect(button).toHaveCount(1);
  await expect(button).not.toHaveCSS('position', 'absolute');
  await s.key('Escape');
  // Select away from the drag start so the next pointerdown is not a double-click.
  await button.click({ modifiers: [modifier], position: { x: 10, y: 10 } });
  const nested = (await button.boundingBox())!;
  const frame = (await s.frames.first().boundingBox())!;
  await s.drag(button, frame.x + frame.width * 0.3 - nested.x - nested.width / 2, frame.y + frame.height * 0.2 - nested.y - nested.height / 2);
  await expect(container.locator('[data-pv-component-id="Button"]')).toHaveCount(0);
  await expect(button).toHaveCSS('position', 'absolute');
  expect(moves).toHaveLength(2);
  expect(separateDeletes).toEqual([]);
  const moved = await s.position(button);
  expect(moved.x).toBeGreaterThan(0);
  expect(moved.y).toBeGreaterThan(0);
  await s.history();
  await expect(container.locator('[data-pv-component-id="Button"]')).toHaveCount(1);
  await s.history(true);
  await expect(container.locator('[data-pv-component-id="Button"]')).toHaveCount(0);
  await s.open();
  await expect.poll(() => s.position(button)).toEqual(moved);
  await s.drag(button, 30, 40);
  const final = await s.position(button);
  expect(final.x).toBeGreaterThan(moved.x);
  expect(final.y).toBeGreaterThan(moved.y);
  await s.open();
  await expect.poll(() => s.position(button)).toEqual(final);
});

for (const operation of ['duplicate', 'reparent'] as const) {
  test(`an internal ${operation} preserves the user's copied item`, async ({ sketch: s }) => {
    if (operation === 'reparent') {
      await s.post('/__frame-create', { sketchpadId: s.id, name: 'Target', width: 500, height: 360, canvasX: 620, canvasY: 0 });
      await s.open();
    }
    await s.addComponent('Button');
    await s.drag(s.items().first(), 200, 170);
    const button = s.frames.first().locator('[data-pv-component-id="Button"]');
    await button.click();
    const copied = s.page.waitForResponse(r => r.url().endsWith('/__block-action') && r.request().postDataJSON()?.action === 'copy');
    await s.key(`${modifier}+c`);
    await copied;
    await s.addComponent('Container');
    const container = s.frames.first().locator('[data-pv-component-id="Container"]');
    if (operation === 'duplicate') {
      await s.drag(container, 80, 70, true);
      await expect(container).toHaveCount(2);
    } else {
      const target = s.frames.nth(1);
      await expect(target).toBeVisible();
      const start = (await container.boundingBox())!;
      const end = (await target.boundingBox())!;
      await s.drag(container, end.x + end.width / 2 - start.x - start.width / 2, end.y + end.height / 2 - start.y - start.height / 2);
      await expect(container).toHaveCount(0);
    }
    await button.click();
    await s.key(`${modifier}+Shift+v`);
    await expect(button).toHaveCount(2);
    const ids = await button.evaluateAll(els => els.map(el => el.getAttribute('data-pv-block')));
    expect(new Set(ids).size).toBe(2);
  });
}

test('cuts a styled item into another frame and duplicates it with fresh IDs', async ({ sketch: s }) => {
  await s.post('/__frame-create', { sketchpadId: s.id, name: 'Target', width: 500, height: 360, canvasX: 620, canvasY: 0 });
  await s.open();
  const source = s.frames.nth(0);
  const target = s.frames.nth(1);
  await s.addComponent('Button', source);
  const original = s.items(source).first();
  await original.click();
  const input = s.page.getByTestId('control-width').locator('input');
  await input.fill('180px');
  await input.press('Enter');
  await expect(original).toHaveCSS('width', '180px');
  await s.key(`${modifier}+x`);
  await expect(s.items(source)).toHaveCount(0);
  await s.title(target).click();
  await s.key(`${modifier}+v`);
  await expect(s.items(target)).toHaveCount(1);
  await expect(s.items(target).first()).toHaveCSS('width', '180px');
  await s.history();
  await expect(s.items(target)).toHaveCount(0);
  await s.history();
  await expect(s.items(source)).toHaveCount(1);
  await s.history(true);
  await expect(s.items(source)).toHaveCount(0);
  await s.history(true);
  await expect(s.items(target)).toHaveCount(1);
  await s.key('Escape');
  await s.items(target).first().click();
  await s.key(`${modifier}+d`);
  await expect(s.items(target)).toHaveCount(2);
  const ids = await s.items(target).evaluateAll(els => els.map(el => el.getAttribute('data-pv-block')));
  expect(new Set(ids).size).toBe(2);
  await expect(s.items(target).nth(1)).toHaveCSS('width', '180px');
  await s.open();
  await expect(s.items(source)).toHaveCount(0);
  await expect(s.items(target)).toHaveCount(2);
  await expect(s.items(target).nth(1)).toHaveCSS('width', '180px');
});

test('nudges multiple items and undoes the whole selection in one step', async ({ sketch: s }) => {
  await s.addComponent();
  await s.drag(s.items().first(), 100, 100);
  await s.addComponent();
  await s.items().first().click();
  await s.items().nth(1).click({ modifiers: ['Shift'] });
  const positions = () => Promise.all([s.position(s.items().first()), s.position(s.items().nth(1))]);
  const before = await positions();
  await s.key('Shift+ArrowRight');
  const after = before.map(p => ({ x: p.x + 8, y: p.y }));
  await expect.poll(positions).toEqual(after);
  await s.history();
  await expect.poll(positions).toEqual(before);
  await s.history(true);
  await expect.poll(positions).toEqual(after);
  await s.open();
  await expect.poll(positions).toEqual(after);
});

for (const action of ['copy', 'cut'] as const) {
  test(`frame ${action} supersedes an older item clipboard`, async ({ sketch: s }) => {
    await s.addComponent();
    await s.items().first().click();
    const copied = s.page.waitForResponse(r => r.url().endsWith('/__block-action') && r.request().postDataJSON()?.action === 'copy');
    await s.key(`${modifier}+c`);
    await copied;
    await s.title().click();
    const read = s.page.waitForResponse(r => r.url().endsWith('/__frame-read'));
    await s.key(`${modifier}+${action === 'copy' ? 'c' : 'x'}`);
    await read;
    if (action === 'cut') await expect(s.frames).toHaveCount(0);
    await unlock(s.canvas);
    await s.key(`${modifier}+v`);
    await expect(s.frames).toHaveCount(action === 'copy' ? 2 : 1);
    for (const frame of await s.frames.all()) await expect(s.items(frame)).toHaveCount(1);
  });
}

test('inspector dimensions override a pointer resize and survive duplication', async ({ sketch: s }) => {
  await s.addComponent('Rectangle');
  const item = s.items().first();
  await item.click();
  const box = (await item.boundingBox())!;
  const resized = s.page.waitForResponse(r => r.url().endsWith('/__sketchpad-update-element-size'));
  await s.page.mouse.move(box.x + box.width - 1, box.y + box.height - 1);
  await s.page.mouse.down();
  await s.page.mouse.move(box.x + box.width + 40, box.y + box.height + 30, { steps: 12 });
  await s.page.mouse.up();
  await resized;
  for (const [dimension, value] of [['width', '210px'], ['height', '140px']]) {
    const input = s.page.getByTestId(`control-${dimension}`).locator('input');
    await input.fill(value);
    await input.press('Enter');
    await expect(item).toHaveCSS(dimension, value);
  }
  const shadowInput = s.page.getByTestId('control-box-shadow').locator('input');
  await shadowInput.fill('lg');
  await shadowInput.press('Enter');
  await expect(item).not.toHaveCSS('box-shadow', 'none');
  const shadow = await item.evaluate(el => getComputedStyle(el).boxShadow);
  await s.drag(item, 30, 25);
  await s.key(`${modifier}+d`);
  await expect(s.items()).toHaveCount(2);
  for (const copy of await s.items().all()) {
    await expect(copy).toHaveCSS('width', '210px');
    await expect(copy).toHaveCSS('height', '140px');
    await expect(copy).toHaveCSS('box-shadow', shadow);
  }
  await s.open();
  for (const copy of await s.items().all()) {
    await expect(copy).toHaveCSS('width', '210px');
    await expect(copy).toHaveCSS('height', '140px');
    await expect(copy).toHaveCSS('box-shadow', shadow);
  }
});

test('reparenting a container preserves its absolute children for later movement and resizing', async ({ sketch: s }) => {
  // Seed a converted-style nested absolute layout; normal palette containers use flow.
  await s.post('/__frame-delete', { sketchpadId: s.id, frameId: (await s.registry()).frames[0].id });
  await s.post('/__frame-paste', { targetSketchpadId: s.id, frames: [{
    name: 'Nested layout', width: 600, height: 420, canvasX: 0, canvasY: 0,
    content: `import { Container } from '@/components/ui/container';
      import { Button } from '@/components/ui/button';
      export default function NestedLayout() { return <div data-layout-mode="absolute" style={{width:'100%',height:'100%',position:'relative'}}>
        {/* pv-editable-zone-start:root01 */}
          {/* pv-block-start:outer1 */}
          <Container data-pv-block="outer1" data-pv-sketchpad-el="outer1" data-layout-mode="absolute" data-testid="nested-source" className="min-w-48 min-h-32" style={{position:'absolute',left:40,top:40}}>
            {/* pv-editable-zone-start:inner1 */}
              {/* pv-block-start:child1 */}
              <Button data-pv-block="child1" data-pv-sketchpad-el="child1" label="Child" style={{position:'absolute',left:20,top:20}} />
              {/* pv-block-end:child1 */}
            {/* pv-editable-zone-end:inner1 */}
          </Container>
          {/* pv-block-end:outer1 */}
          {/* pv-block-start:target */}
          <Container data-pv-block="target" data-pv-sketchpad-el="target" data-testid="nested-target" className="min-w-48 min-h-32" style={{position:'absolute',left:330,top:220}}>
            {/* pv-editable-zone-start:zone02 */}
            {/* pv-editable-zone-end:zone02 */}
          </Container>
          {/* pv-block-end:target */}
        {/* pv-editable-zone-end:root01 */}
      </div>; }`,
  }] });
  await s.open();
  const source = s.canvas.getByTestId('nested-source');
  const target = s.canvas.getByTestId('nested-target');
  const start = (await source.boundingBox())!;
  const end = (await target.boundingBox())!;
  await s.drag(source, end.x + end.width / 2 - start.x - start.width / 2, end.y + end.height / 2 - start.y - start.height / 2);
  await expect(target.getByTestId('nested-source')).toHaveCount(1);
  await expect(source).toHaveCount(1);
  const child = source.locator('[data-pv-component-id="Button"]');
  await expect(child).toHaveAttribute('data-pv-sketchpad-el', /.+/);
  await expect(source).not.toHaveAttribute('data-pv-sketchpad-el', /.+/);
  await s.key('Escape');
  await child.click({ modifiers: [modifier], position: { x: 10, y: 10 } });
  const before = await s.position(child);
  await s.drag(child, 25, 20);
  const moved = await s.position(child);
  expect(moved.x).toBeGreaterThan(before.x);
  expect(moved.y).toBeGreaterThan(before.y);
  await child.click();
  const box = (await child.boundingBox())!;
  const resized = s.page.waitForResponse(r => r.url().endsWith('/__sketchpad-update-element-size'));
  await s.page.mouse.move(box.x + box.width - 1, box.y + box.height / 2);
  await s.page.mouse.down();
  await s.page.mouse.move(box.x + box.width + 25, box.y + box.height / 2, { steps: 12 });
  await s.page.mouse.up();
  expect((await resized).ok()).toBeTruthy();
  const width = await child.evaluate(el => getComputedStyle(el).width);
  await s.open();
  await expect.poll(() => s.position(child)).toEqual(moved);
  await expect(child).toHaveCSS('width', width);
});

for (const action of ['copy', 'cut'] as const) {
  test(`multi-item ${action}/paste preserves spacing and uses fresh IDs`, async ({ sketch: s }) => {
    await s.addComponent();
    await s.drag(s.items().first(), 100, 100);
    await s.addComponent();
    await s.items().first().click();
    await s.items().nth(1).click({ modifiers: ['Shift'] });
    const before = await Promise.all([s.position(s.items().first()), s.position(s.items().nth(1))]);
    const ids = await s.items().evaluateAll(els => els.map(el => el.getAttribute('data-pv-block')));
    const copied = s.page.waitForResponse(r => r.url().endsWith('/__block-action') && r.request().postDataJSON()?.action === action);
    await s.key(`${modifier}+${action === 'copy' ? 'c' : 'x'}`);
    await copied;
    if (action === 'cut') await expect(s.items()).toHaveCount(0);
    await s.title().click();
    await s.key(`${modifier}+v`);
    await expect(s.items()).toHaveCount(action === 'copy' ? 4 : 2);
    const offset = action === 'copy' ? 2 : 0;
    const first = s.items().nth(offset);
    const second = s.items().nth(offset + 1);
    const after = [await s.position(first), await s.position(second)];
    expect(after[0].x - after[1].x).toBe(before[0].x - before[1].x);
    expect(after[0].y - after[1].y).toBe(before[0].y - before[1].y);
    expect(ids).not.toContain(await first.getAttribute('data-pv-block'));
    expect(ids).not.toContain(await second.getAttribute('data-pv-block'));
    await s.history();
    await expect(s.items()).toHaveCount(action === 'copy' ? 2 : 0);
    await s.history(true);
    await expect(s.items()).toHaveCount(action === 'copy' ? 4 : 2);
    await s.open();
    await expect.poll(async () => [await s.position(first), await s.position(second)]).toEqual(after);
  });
}

async function seed(s: Sketchpad, content: string) {
  await s.post('/__frame-delete', { sketchpadId: s.id, frameId: (await s.registry()).frames[0].id });
  await s.post('/__frame-paste', { targetSketchpadId: s.id, frames: [{
    name: 'Structure', width: 600, height: 420, canvasX: 0, canvasY: 0,
    content: `export default function Structure() { return <div data-layout-mode="absolute" style={{width:'100%',height:'100%',position:'relative'}}>
      {/* pv-editable-zone-start:root01 */}
      ${content}
      {/* pv-editable-zone-end:root01 */}
    </div>; }`,
  }] });
  await s.open();
}

const blocks = ['first1', 'second', 'third1'].map((id, i) => `
  {/* pv-block-start:${id} */}
  <div data-pv-block="${id}" data-pv-sketchpad-el="${id}" data-testid="${id}" style={{position:'absolute',left:${40 + i * 25},top:${40 + i * 25},width:140,height:80,background:'teal'}} />
  {/* pv-block-end:${id} */}
`).join('\n');

async function toolbar(s: Sketchpad, id: string) {
  await expect(s.page.getByTestId('inspector-sidebar')).toHaveAttribute('aria-busy', 'false');
  await s.page.getByTestId(id).click();
  await unlock(s.canvas);
  await expect(s.page.getByTestId('inspector-sidebar')).toHaveAttribute('aria-busy', 'false');
}

const order = (s: Sketchpad) => s.frames.first().locator('[data-testid]').evaluateAll(els => els.map(el => el.getAttribute('data-testid')));

test('Bring to front crosses every sibling; Send backward moves one layer with undo/redo', async ({ sketch: s }) => {
  await seed(s, blocks);
  const first = s.canvas.getByTestId('first1');
  const before = await s.position(first);
  await first.click({ position: { x: 10, y: 10 } });
  await toolbar(s, 'btn-move-up');
  await expect.poll(() => order(s)).toEqual(['second', 'third1', 'first1']);
  await expect.poll(() => s.position(first)).toEqual(before);
  await s.history();
  await expect.poll(() => order(s)).toEqual(['first1', 'second', 'third1']);
  await s.history(true);
  await expect.poll(() => order(s)).toEqual(['second', 'third1', 'first1']);
  await first.click();
  await toolbar(s, 'btn-move-down');
  await expect.poll(() => order(s)).toEqual(['second', 'first1', 'third1']);
  await s.open();
  await expect.poll(() => order(s)).toEqual(['second', 'first1', 'third1']);
  await expect.poll(() => s.position(first)).toEqual(before);
});

test('wraps a multi-selection, reorders flow children and unwraps without a visual jump', async ({ sketch: s }) => {
  await s.addComponent();
  await s.drag(s.items().first(), 140, 120);
  await s.addComponent();
  const ids = await s.items().evaluateAll(els => els.map(el => el.getAttribute('data-pv-block')!));
  await s.items().first().click();
  await s.items().nth(1).click({ modifiers: ['Shift'] });
  await toolbar(s, 'btn-wrap');
  const wrapper = s.items().first();
  const children = wrapper.locator('[data-pv-block]');
  await expect(children).toHaveCount(2);
  await expect(s.items()).toHaveCount(1);
  const childOrder = () => children.evaluateAll(els => els.map(el => el.getAttribute('data-pv-block')));
  await expect.poll(childOrder).toEqual(ids);
  // Undo wrapping restores both original absolute items.
  await s.history();
  await expect(s.items()).toHaveCount(2);
  await s.history(true);
  await expect(children).toHaveCount(2);
  await children.nth(1).click({ modifiers: [modifier], position: { x: 10, y: 10 } });
  await toolbar(s, 'btn-move-up');
  await expect.poll(childOrder).toEqual([...ids].reverse());
  await toolbar(s, 'btn-move-down');
  await expect.poll(childOrder).toEqual(ids);
  await s.key('Escape');
  await wrapper.click({ position: { x: 2, y: 2 } });
  const before = await children.evaluateAll(els => els.map(el => {
    const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height };
  }));
  await toolbar(s, 'btn-unwrap');
  await expect(s.items()).toHaveCount(2);
  for (const [i, id] of ids.entries()) {
    const item = s.frames.first().locator(`[data-pv-block="${id}"]`);
    const after = await item.evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
    for (const key of ['x', 'y', 'width', 'height'] as const) expect(Math.abs(after[key] - before[i][key])).toBeLessThanOrEqual(1);
  }
  await s.history();
  await expect(children).toHaveCount(2);
  await s.history(true);
  await expect(s.items()).toHaveCount(2);
  await s.open();
  await expect(s.items()).toHaveCount(2);
});

const nested = `
  {/* pv-block-start:outer1 */}
  <div data-pv-block="outer1" data-pv-sketchpad-el="outer1" data-testid="outer" data-layout-mode="absolute" className="w-64 h-48" style={{position:'absolute',left:50,top:50}}>
    {/* pv-editable-zone-start:inner1 */}
      {/* pv-block-start:child1 */}
      <div data-pv-block="child1" data-pv-sketchpad-el="child1" data-testid="child" style={{position:'absolute',left:20,top:20,width:80,height:40,background:'teal'}} />
      {/* pv-block-end:child1 */}
    {/* pv-editable-zone-end:inner1 */}
  </div>
  {/* pv-block-end:outer1 */}`;

for (const operation of ['wrap', 'unwrap'] as const) {
  test(`${operation} preserves nested absolute children's editing markers`, async ({ sketch: s }) => {
    await seed(s, operation === 'wrap' ? nested : `
      {/* pv-block-start:flow01 */}
      <div data-pv-block="flow01" data-pv-sketchpad-el="flow01" data-layout-mode="flow" style={{position:'absolute',left:40,top:40}}>
        {/* pv-editable-zone-start:flow02 */}
          {/* pv-block-start:wrap01 */}
          <div data-pv-block="wrap01" data-testid="wrapper" className="w-80 h-64">
            {/* pv-editable-zone-start:wrap02 */}
              ${nested}
            {/* pv-editable-zone-end:wrap02 */}
          </div>
          {/* pv-block-end:wrap01 */}
        {/* pv-editable-zone-end:flow02 */}
      </div>
      {/* pv-block-end:flow01 */}`);
    const outer = s.canvas.getByTestId('outer');
    const child = s.canvas.getByTestId('child');
    if (operation === 'wrap') await outer.click({ position: { x: 150, y: 90 } });
    else await s.canvas.getByTestId('wrapper').click({ modifiers: [modifier], position: { x: 10, y: 10 } });
    await toolbar(s, `btn-${operation}`);
    await expect(outer).not.toHaveAttribute('data-pv-sketchpad-el', /.+/);
    await expect(child).toHaveAttribute('data-pv-sketchpad-el', /.+/);
    await s.open();
    await expect(child).toHaveAttribute('data-pv-sketchpad-el', /.+/);
    await child.click({ modifiers: [modifier], position: { x: 10, y: 10 } });
    const before = await s.position(child);
    await s.drag(child, 20, 15);
    const after = await s.position(child);
    expect(after.x).toBeGreaterThan(before.x);
    expect(after.y).toBeGreaterThan(before.y);
    await s.history();
    await expect.poll(() => s.position(child)).toEqual(before);
    await s.history(true);
    await expect.poll(() => s.position(child)).toEqual(after);
  });
}

test('unwrap preserves coordinates inside a bordered absolute container at non-default zoom', async ({ sketch: s }) => {
  await seed(s, `
    {/* pv-block-start:parent */}
    <div data-pv-block="parent" data-pv-sketchpad-el="parent" data-testid="parent" data-layout-mode="absolute" style={{position:'absolute',left:30,top:30,width:400,height:300,border:'12px solid teal'}}>
      {/* pv-editable-zone-start:zone01 */}
        {/* pv-block-start:wrap01 */}
        <div data-pv-block="wrap01" data-pv-sketchpad-el="wrap01" data-testid="wrapper" className="flex flex-col" style={{position:'absolute',left:30,top:40,width:200,height:100}}>
          {/* pv-editable-zone-start:zone02 */}
            {/* pv-block-start:child1 */}
            <div data-pv-block="child1" data-testid="child" style={{width:80,height:40,background:'teal'}} />
            {/* pv-block-end:child1 */}
          {/* pv-editable-zone-end:zone02 */}
        </div>
        {/* pv-block-end:wrap01 */}
      {/* pv-editable-zone-end:zone01 */}
    </div>
    {/* pv-block-end:parent */}`);
  await s.key(`${modifier}+-`);
  const child = s.canvas.getByTestId('child');
  await s.canvas.getByTestId('wrapper').click({ modifiers: [modifier], position: { x: 85, y: 45 } });
  const before = (await child.boundingBox())!;
  await toolbar(s, 'btn-unwrap');
  await expect(s.canvas.getByTestId('wrapper')).toHaveCount(0);
  const after = (await child.boundingBox())!;
  expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
  await s.history();
  await expect(s.canvas.getByTestId('wrapper')).toHaveCount(1);
  await s.history(true);
  await expect(s.canvas.getByTestId('wrapper')).toHaveCount(0);
  const saved = await s.position(child);
  await s.open();
  await expect.poll(() => s.position(child)).toEqual(saved);
});

test('marquee selects a group, moves it together, and preserves spacing after reload', async ({ sketch: s }) => {
  await seed(s, blocks);
  await s.key('Escape');
  const box = (await s.frames.first().boundingBox())!;
  const scale = box.width / 600;
  await s.page.mouse.move(box.x + 20 * scale, box.y + 20 * scale);
  await s.page.mouse.down();
  await s.page.mouse.move(box.x + 250 * scale, box.y + 200 * scale, { steps: 12 });
  await s.page.mouse.up();
  const items = ['first1', 'second', 'third1'].map(id => s.canvas.getByTestId(id));
  const positions = () => Promise.all(items.map(item => s.position(item)));
  const before = await positions();
  await s.drag(items[2], 90, 60);
  const after = await positions();
  const delta = { x: after[0].x - before[0].x, y: after[0].y - before[0].y };
  expect(delta.x).toBeGreaterThan(0);
  expect(delta.y).toBeGreaterThan(0);
  for (let i = 1; i < 3; i++) {
    expect(after[i].x - before[i].x).toBe(delta.x);
    expect(after[i].y - before[i].y).toBe(delta.y);
  }
  await s.history();
  await expect.poll(positions).toEqual(before);
  await s.history(true);
  await expect.poll(positions).toEqual(after);
  await s.open();
  await expect.poll(positions).toEqual(after);
});

test('reparenting into a bordered absolute container keeps the dropped position', async ({ sketch: s }) => {
  await seed(s, `
    {/* pv-block-start:parent */}
    <div data-pv-block="parent" data-pv-sketchpad-el="parent" data-testid="parent" data-layout-mode="absolute" style={{position:'absolute',left:240,top:40,width:300,height:300,border:'12px solid teal'}}>
      {/* pv-editable-zone-start:zone01 */}
      {/* pv-editable-zone-end:zone01 */}
    </div>
    {/* pv-block-end:parent */}
    {/* pv-block-start:child1 */}
    <div data-pv-block="child1" data-pv-sketchpad-el="child1" data-testid="child" style={{position:'absolute',left:40,top:100,width:80,height:40,background:'teal'}} />
    {/* pv-block-end:child1 */}`);
  await s.key(`${modifier}+-`);
  const child = s.canvas.getByTestId('child');
  const parent = s.canvas.getByTestId('parent');
  const start = (await child.boundingBox())!;
  const end = (await parent.boundingBox())!;
  await s.page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await s.page.mouse.down();
  await s.page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 12 });
  const dropped = (await child.boundingBox())!;
  await s.page.mouse.up();
  await unlock(s.canvas);
  await expect(parent.getByTestId('child')).toHaveCount(1);
  await expect(child).toHaveCount(1);
  const after = (await child.boundingBox())!;
  expect(Math.abs(after.x - dropped.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(after.y - dropped.y)).toBeLessThanOrEqual(1);
  const saved = await s.position(child);
  await s.history();
  await expect(parent.getByTestId('child')).toHaveCount(0);
  await s.history(true);
  await expect(parent.getByTestId('child')).toHaveCount(1);
  await s.open();
  await expect.poll(() => s.position(child)).toEqual(saved);
});

for (const gesture of ['drag-first', 'drag-last', 'nudge'] as const) {
  test(`a cross-frame selection ${gesture} persists both items as one undo step`, async ({ sketch: s }) => {
    await s.post('/__frame-create', { sketchpadId: s.id, name: 'Other', width: 500, height: 360, canvasX: 620, canvasY: 0 });
    await s.open();
    await s.addComponent('Button', s.frames.nth(0));
    await s.addComponent('Button', s.frames.nth(1));
    const items = [s.items(s.frames.nth(0)).first(), s.items(s.frames.nth(1)).first()];
    await items[0].click();
    await items[1].click({ modifiers: ['Shift'] });
    const positions = () => Promise.all(items.map(item => s.position(item)));
    const before = await positions();
    if (gesture.startsWith('drag')) await s.drag(items[gesture === 'drag-first' ? 0 : 1], 30, 25);
    else await s.key('Shift+ArrowRight');
    const after = (await positions()).map(({ x, y }) => ({ x: Math.round(x), y: Math.round(y) }));
    expect(after[0].x).toBeGreaterThan(before[0].x);
    expect(after[1].x - before[1].x).toBe(after[0].x - before[0].x);
    await s.open();
    await expect.poll(positions).toEqual(after);
    await s.history();
    await expect.poll(positions).toEqual(before);
    await s.history(true);
    await expect.poll(positions).toEqual(after);
  });
}

for (const operation of ['wrap', 'reparent'] as const) {
  test(`${operation} keeps a nested absolute layout's size and containing block`, async ({ sketch: s }) => {
    await seed(s, `
      {/* pv-block-start:outer1 */}
      <div data-pv-block="outer1" data-pv-sketchpad-el="outer1" data-testid="outer" data-layout-mode="absolute" style={{position:'absolute',left:40,top:40,width:200,height:150}}>
        {/* pv-editable-zone-start:inner1 */}
          {/* pv-block-start:child1 */}
          <div data-pv-block="child1" data-pv-sketchpad-el="child1" data-testid="child" style={{position:'absolute',left:20,top:30,width:80,height:40,background:'teal'}} />
          {/* pv-block-end:child1 */}
        {/* pv-editable-zone-end:inner1 */}
      </div>
      {/* pv-block-end:outer1 */}
      {/* pv-block-start:target */}
      <div data-pv-block="target" data-pv-sketchpad-el="target" data-testid="target" data-layout-mode="flow" className="flex flex-col" style={{position:'absolute',left:300,top:170,width:250,height:200}}>
        {/* pv-editable-zone-start:zone02 */}
        {/* pv-editable-zone-end:zone02 */}
      </div>
      {/* pv-block-end:target */}`);
    const outer = s.canvas.getByTestId('outer');
    const child = s.canvas.getByTestId('child');
    if (operation === 'wrap') {
      await outer.click({ position: { x: 100, y: 90 } });
      await toolbar(s, 'btn-wrap');
    } else {
      const start = (await outer.boundingBox())!;
      const end = (await s.canvas.getByTestId('target').boundingBox())!;
      await s.drag(outer, end.x + end.width / 2 - start.x - start.width / 2, end.y + end.height / 2 - start.y - start.height / 2);
      await expect(s.canvas.getByTestId('target').getByTestId('outer')).toHaveCount(1);
    }
    await expect(outer).toHaveCSS('position', 'relative');
    await expect(outer).toHaveCSS('width', '200px');
    await expect(outer).toHaveCSS('height', '150px');
    expect(await child.evaluate(el => (el as HTMLElement).offsetParent?.getAttribute('data-testid'))).toBe('outer');
    await s.history();
    await expect(outer).toHaveCSS('position', 'absolute');
    await s.history(true);
    await expect(outer).toHaveCSS('position', 'relative');
    await s.open();
    await expect(outer).toHaveCSS('width', '200px');
    await expect(outer).toHaveCSS('height', '150px');
    expect(await child.evaluate(el => (el as HTMLElement).offsetParent?.getAttribute('data-testid'))).toBe('outer');
  });
}

for (const action of ['Delete', `${modifier}+x`, `${modifier}+d`] as const) {
  test(`ancestor and descendant selection ${action} operates on the subtree once`, async ({ sketch: s }) => {
    await seed(s, nested);
    const outer = s.canvas.getByTestId('outer');
    const child = s.canvas.getByTestId('child');
    await outer.click({ position: { x: 100, y: 90 } });
    await child.click({ modifiers: [modifier, 'Shift'], position: { x: 10, y: 10 } });
    await s.key(action);
    const duplicating = action.endsWith('+d');
    await expect(outer).toHaveCount(duplicating ? 2 : 0);
    await expect(child).toHaveCount(duplicating ? 2 : 0);
    await expect(s.frames).toHaveCount(1);
    await s.history();
    await expect(outer).toHaveCount(1);
    await expect(child).toHaveCount(1);
    await s.history(true);
    await expect(outer).toHaveCount(duplicating ? 2 : 0);
    await expect(child).toHaveCount(duplicating ? 2 : 0);
    if (duplicating) {
      const ids = await s.frames.first().locator('[data-pv-block]').evaluateAll(els => els.map(el => el.getAttribute('data-pv-block')));
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
}
