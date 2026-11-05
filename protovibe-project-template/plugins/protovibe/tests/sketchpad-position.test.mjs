import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';
import { after, before, test } from 'node:test';
import { build, transformSync } from 'esbuild';
import * as babel from '@babel/core';
import syntaxJsx from '@babel/plugin-syntax-jsx';

const pluginRoot = process.cwd();
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'pv-sketchpad-position-'));
const bundleDir = fs.mkdtempSync(path.join(pluginRoot, 'tests/.sketchpad-position-'));
const relativeFile = 'src/sketchpads/test/frame-test.tsx';
const frameFile = path.join(fixture, relativeFile);
let handlers;

before(async () => {
  const bundle = path.join(bundleDir, 'backend.mjs');
  await build({
    stdin: { resolveDir: pluginRoot, contents: `
      export { handleAddBlock, handleBlockAction, handleUpdateSource, handleWrapBlocks, handleUnwrapBlock, handleDeleteBlocks } from './src/backend/server';
      export { handleSketchpadUpdateElementPosition, handleSketchpadUpdateElementSize } from './src/backend/sketchpad-server';
      export { undoStack } from './src/shared/state';
    ` },
    bundle: true, platform: 'node', format: 'esm', packages: 'external', outfile: bundle,
  });
  process.chdir(fixture);
  handlers = await import(pathToFileURL(bundle).href);
  fs.mkdirSync(path.dirname(frameFile), { recursive: true });
});

after(() => {
  process.chdir(pluginRoot);
  fs.rmSync(fixture, { recursive: true, force: true });
  fs.rmSync(bundleDir, { recursive: true, force: true });
});

function request(name, body) {
  return new Promise(resolve => {
    const req = new EventEmitter();
    const res = { statusCode: 200, setHeader() {}, end(text) {
      resolve({ status: res.statusCode, ...JSON.parse(text) });
    } };
    handlers[name](req, res);
    req.emit('data', JSON.stringify(body));
    req.emit('end');
  });
}

function update(name, blockId, values) {
  return request(name, { sketchpadId: 'test', frameId: 'frame-test', blockId, ...values });
}

// Read persisted JSX afresh, as a reload does; never assert against optimistic DOM state.
function savedStyle(blockId) {
  const ast = babel.parseSync(fs.readFileSync(frameFile, 'utf8'), { plugins: [syntaxJsx] });
  let result;
  babel.traverse(ast, { JSXOpeningElement(p) {
    const attrs = p.node.attributes;
    if (!attrs.some(a => a.name?.name === 'data-pv-sketchpad-el' && a.value?.value === blockId)) return;
    const style = attrs.find(a => a.name?.name === 'style').value.expression;
    result = Object.fromEntries(style.properties.filter(p => p.type === 'ObjectProperty').map(p => [
      p.key.name ?? p.key.value,
      p.value.type === 'UnaryExpression' ? -p.value.argument.value : p.value.value,
    ]));
  } });
  assert.ok(result, `saved element ${blockId} exists`);
  return result;
}

// Evaluate only these test fixtures so spreads and computed keys have the same
// precedence they have when React receives the saved style after a reload.
function renderedStyle() {
  const { code, warnings } = transformSync(fs.readFileSync(frameFile, 'utf8'), {
    loader: 'tsx', format: 'cjs', jsxFactory: 'element',
  });
  assert.deepEqual(warnings, [], 'saved source has no duplicate property warnings');
  const context = { module: { exports: {} }, element: (_tag, props) => props };
  runInNewContext(code, context);
  return { ...context.module.exports.default().style };
}

for (const style of [
  '{ left: 10, top: 20, width: 30, opacity: 0.5 } as const',
  '{ left: 10, top: 20, width: 30, opacity: 0.5 } satisfies Style',
  '(({ ...defaults } as Style) satisfies Style)!',
]) {
  test(`updates type-annotated inline styles in ${style}`, async () => {
    fs.writeFileSync(frameFile, `type Style = Record<string, number>;
      const defaults = { left: 10, top: 20, width: 30, opacity: 0.5 };
      export default () => <div data-pv-sketchpad-el="typed" style={${style}} />;`);
    for (const [x, y] of [[125, 180], [-24, 72]]) {
      const result = await update('handleSketchpadUpdateElementPosition', 'typed', { x, y });
      assert.equal(result.success, true, result.error);
      assert.deepEqual(renderedStyle(), { left: x, top: y, width: 30, opacity: 0.5 });
    }
    const result = await update('handleSketchpadUpdateElementSize', 'typed', { width: 240, height: 120 });
    assert.equal(result.success, true, result.error);
    assert.deepEqual(renderedStyle(), { left: -24, top: 72, width: 240, height: 120, opacity: 0.5 });
    const saved = fs.readFileSync(frameFile, 'utf8');
    for (const annotation of ['as const', 'as Style', 'satisfies Style']) {
      if (style.includes(annotation)) assert.ok(saved.includes(annotation));
    }
  });
}

for (const style of [
  '{ ...defaults }',
  '{ left: 1, top: 2, width: 3, ...defaults }',
  '{ ["left"]: 10, ["top"]: 20, ["width"]: 30, opacity: 0.5 }',
]) {
  test(`saved updates take precedence over dynamic properties in ${style}`, async () => {
    fs.writeFileSync(frameFile, `const defaults = { left: 10, top: 20, width: 30, opacity: 0.5 };
      export default () => <div style={${style}} data-pv-sketchpad-el="dynamic" />;`);
    for (const [x, y] of [[125, 180], [-24, 72]]) {
      assert.equal((await update('handleSketchpadUpdateElementPosition', 'dynamic', { x, y })).success, true);
      assert.deepEqual(renderedStyle(), { left: x, top: y, width: 30, opacity: 0.5 });
    }
    assert.equal((await update('handleSketchpadUpdateElementSize', 'dynamic', { width: 240, height: 120 })).success, true);
    assert.deepEqual(renderedStyle(), { left: -24, top: 72, width: 240, height: 120, opacity: 0.5 });
  });
}

for (const style of ['', ' style={{ opacity: 0.5 }}']) {
  test(`flow to absolute drop remains movable and resizable after saving (${style ? 'styled' : 'unstyled'})`, async () => {
    fs.writeFileSync(frameFile, `export default function Frame() { return (
      <div data-layout-mode="absolute">
        {/* pv-editable-zone-start:target */}
          {/* pv-block-start:parent */}
          <div data-pv-block="parent" data-layout-mode="flow">
            {/* pv-editable-zone-start:source */}
              {/* pv-block-start:child1 */}
              <div data-pv-block="child1"${style}>Child</div>
              {/* pv-block-end:child1 */}
            {/* pv-editable-zone-end:source */}
          </div>
          {/* pv-block-end:parent */}
        {/* pv-editable-zone-end:target */}
      </div>
    ); }`);
    assert.equal((await request('handleBlockAction', { file: relativeFile, blockIds: ['child1'], action: 'copy' })).success, true);
    const pasted = await request('handleAddBlock', {
      file: relativeFile, zoneId: 'target', elementType: 'paste', targetLayoutMode: 'absolute', pasteX: 40, pasteY: 60,
    });
    assert.equal(pasted.success, true);
    assert.equal((await request('handleBlockAction', { file: relativeFile, blockIds: ['child1'], action: 'delete' })).success, true);
    const blockId = pasted.newBlockIds[0];
    assert.equal(savedStyle(blockId).left, 40);
    assert.equal(savedStyle(blockId).top, 60);
    handlers.undoStack.length = 0;

    for (const [x, y] of [[125, 180], [-24, 72]]) {
      assert.equal((await update('handleSketchpadUpdateElementPosition', blockId, { x, y })).success, true);
      assert.equal(savedStyle(blockId).left, x);
      assert.equal(savedStyle(blockId).top, y);
    }
    assert.equal((await update('handleSketchpadUpdateElementSize', blockId, { width: 240, height: 120 })).success, true);
    assert.equal(savedStyle(blockId).width, 240);
    assert.equal(savedStyle(blockId).height, 120);
    if (style) assert.equal(savedStyle(blockId).opacity, 0.5);
    assert.equal(handlers.undoStack.length, 2, 'moves and resize retain separate undo snapshots');
    assert.match(handlers.undoStack[0].files[0].content, /left: 40, top: 60/);
    assert.match(handlers.undoStack[1].files[0].content, /left: -24, top: 72/);
  });
}

test('updates formatted styles without touching nested styles, children, or siblings', async () => {
  const sibling = `<div data-pv-sketchpad-el="other1" style={{ left: 5, top: 6 }} />`;
  const nested = `<span style={{ left: 7, top: 8 }}>Nested</span>`;
  fs.writeFileSync(frameFile, `export default () => <>
    <div
      onClick={() => { if (1 > 0) return; }}
      style = {{
        position: "absolute",
        // Preserve this style comment and nested expression.
        ...{ opacity: 0.5 },
        'left': '12px', top: -2.5, width: 30, height: 40,
      }}
      data-pv-sketchpad-el = 'format'
    >${nested}</div>
    ${sibling}
  </>`);
  assert.equal((await update('handleSketchpadUpdateElementPosition', 'format', { x: -18.6, y: 24.4 })).success, true);
  assert.equal((await update('handleSketchpadUpdateElementSize', 'format', { width: 98.7 })).success, true);
  assert.deepEqual(savedStyle('format'), { position: 'absolute', left: -19, top: 24, width: 99, height: 40 });
  const saved = fs.readFileSync(frameFile, 'utf8');
  assert.ok(saved.includes(sibling));
  assert.ok(saved.includes(nested));
  assert.ok(saved.includes('// Preserve this style comment and nested expression.'));
  assert.ok(saved.includes('...{ opacity: 0.5 }'));
});

for (const style of ['{ position: "absolute", /* trailing comment */ }', '{ /* empty */ }']) {
  test(`inserts missing coordinates and dimensions into ${style}`, async () => {
    fs.writeFileSync(frameFile, `export default () => <div style={${style}} data-pv-sketchpad-el="insert" />`);
    assert.equal((await update('handleSketchpadUpdateElementPosition', 'insert', { x: 0, y: 42 })).success, true);
    assert.equal((await update('handleSketchpadUpdateElementSize', 'insert', { width: 80, height: 90 })).success, true);
    assert.equal(savedStyle('insert').left, 0);
    assert.equal(savedStyle('insert').top, 42);
    assert.equal(savedStyle('insert').width, 80);
    assert.equal(savedStyle('insert').height, 90);
  });
}

test('missing elements and unsupported styles return errors without changing the file', async () => {
  const source = `const styles = { left: 10, top: 20 };
    export default () => <div data-pv-sketchpad-el="exists" style={styles} />;`;
  fs.writeFileSync(frameFile, source);
  for (const blockId of ['absent', 'exists']) {
    for (const [handler, values] of [
      ['handleSketchpadUpdateElementPosition', { x: 100, y: 200 }],
      ['handleSketchpadUpdateElementSize', { width: 100 }],
    ]) {
      const result = await update(handler, blockId, values);
      assert.equal(result.status, 500);
      assert.ok(result.error);
      assert.equal(fs.readFileSync(frameFile, 'utf8'), source);
    }
  }
});

test('a group move writes and snapshots the whole gesture atomically', async () => {
  const source = `export default () => <div>
    <div data-pv-sketchpad-el="batch1" style={{ left: 10, top: 20 }} />
    <div data-pv-sketchpad-el="batch2" style={{ left: 30, top: 40 }} />
  </div>;`;
  fs.writeFileSync(frameFile, source);
  handlers.undoStack.length = 0;
  const positions = [{ blockId: 'batch1', x: 60, y: 70 }, { blockId: 'batch2', x: 80, y: 90 }];
  assert.equal((await update('handleSketchpadUpdateElementPosition', undefined, { positions })).status, 200);
  assert.deepEqual(savedStyle('batch1'), { left: 60, top: 70 });
  assert.deepEqual(savedStyle('batch2'), { left: 80, top: 90 });
  assert.equal(handlers.undoStack.length, 1);
  assert.equal(handlers.undoStack[0].files[0].content, source);

  const saved = fs.readFileSync(frameFile, 'utf8');
  const invalid = [{ blockId: 'batch1', x: 100, y: 100 }, { blockId: 'missing', x: 0, y: 0 }];
  assert.equal((await update('handleSketchpadUpdateElementPosition', undefined, { positions: invalid })).status, 500);
  assert.equal(fs.readFileSync(frameFile, 'utf8'), saved, 'failed batch must not partially move the group');
  assert.equal(handlers.undoStack.length, 1);
});

test('northwest resize saves size and origin in one snapshot', async () => {
  const source = `export default () => <div data-pv-sketchpad-el="corner" style={{ left: 100, top: 100, width: 200, height: 150 }} />;`;
  fs.writeFileSync(frameFile, source);
  handlers.undoStack.length = 0;
  assert.equal((await update('handleSketchpadUpdateElementSize', 'corner', { x: 80, y: 70, width: 220, height: 180 })).status, 200);
  assert.deepEqual(savedStyle('corner'), { left: 80, top: 70, width: 220, height: 180 });
  assert.equal(handlers.undoStack.length, 1);
  assert.equal(handlers.undoStack[0].files[0].content, source);
});

test('private block transfers leave the user clipboard intact, including failed reads', async () => {
  const source = `export default () => <div>
    {/* pv-editable-zone-start:zone01 */}
      {/* pv-block-start:copy01 */}
      <div data-pv-block="copy01">Copied</div>
      {/* pv-block-end:copy01 */}
      {/* pv-block-start:move01 */}
      <div data-pv-block="move01">Moved</div>
      {/* pv-block-end:move01 */}
    {/* pv-editable-zone-end:zone01 */}
  </div>;`;
  fs.writeFileSync(frameFile, source);
  await request('handleBlockAction', { file: relativeFile, blockId: 'copy01', action: 'copy' });
  const transfer = await request('handleBlockAction', { file: relativeFile, blockId: 'move01', action: 'read' });
  assert.equal(transfer.status, 200);
  assert.match(transfer.data.blocks[0], /Moved/);
  const internalPaste = await request('handleAddBlock', { file: relativeFile, zoneId: 'zone01', elementType: 'paste', pasteData: transfer.data });
  assert.equal(internalPaste.status, 200);
  assert.equal((await request('handleBlockAction', { file: relativeFile, blockId: 'absent', action: 'read' })).status, 500);
  const userPaste = await request('handleAddBlock', { file: relativeFile, zoneId: 'zone01', elementType: 'paste' });
  assert.equal(userPaste.status, 200);
  const saved = fs.readFileSync(frameFile, 'utf8');
  assert.equal((saved.match(/>Copied</g) || []).length, 2);
  assert.equal((saved.match(/>Moved</g) || []).length, 2);
});

test('pasting a container into flow preserves absolute descendants', async () => {
  fs.writeFileSync(frameFile, `export default () => <div>
    {/* pv-editable-zone-start:zone01 */}
      {/* pv-block-start:outer1 */}
      <div data-pv-block="outer1" data-pv-sketchpad-el="outer1" data-layout-mode="absolute" style={{ position: 'absolute', left: 40, top: 40 }}>
        {/* pv-editable-zone-start:inner1 */}
          {/* pv-block-start:child1 */}
          <div data-pv-block="child1" data-pv-sketchpad-el="child1" style={{ position: 'absolute', left: 20, top: 20, width: 80 }}>Child</div>
          {/* pv-block-end:child1 */}
        {/* pv-editable-zone-end:inner1 */}
      </div>
      {/* pv-block-end:outer1 */}
    {/* pv-editable-zone-end:zone01 */}
  </div>;`);
  const transfer = await request('handleBlockAction', { file: relativeFile, blockId: 'outer1', action: 'read' });
  const pasted = await request('handleAddBlock', {
    file: relativeFile, zoneId: 'zone01', elementType: 'paste', targetLayoutMode: 'flow', pasteData: transfer.data,
  });
  assert.equal(pasted.status, 200, pasted.error);
  await request('handleBlockAction', { file: relativeFile, blockId: 'outer1', action: 'delete' });
  const saved = fs.readFileSync(frameFile, 'utf8');
  const childId = saved.match(/data-pv-sketchpad-el="([^"]+)"/)?.[1];
  assert.ok(childId, 'absolute child retains its editing marker');
  assert.notEqual(childId, pasted.newBlockIds[0], 'flow root loses only its own marker');
  assert.deepEqual(savedStyle(childId), { position: 'absolute', left: 20, top: 20, width: 80 });
  assert.equal((await update('handleSketchpadUpdateElementPosition', childId, { positions: [{ blockId: childId, x: 60, y: 50 }] })).status, 200);
  assert.equal((await update('handleSketchpadUpdateElementSize', childId, { width: 120 })).status, 200);
});

for (const style of [
  "{ position: 'absolute', left: 10, top: 20, width: 300, height: 200, opacity: 0.5 }",
  "{ ...{ position: 'absolute', left: 10, top: 20, width: 300, height: 200, opacity: 0.5 } } as const",
]) {
  test(`inspector size classes release only the corresponding inline override: ${style}`, async () => {
    fs.writeFileSync(frameFile, `export default () => <div data-pv-sketchpad-el="sized1" className="w-[200px] h-[100px]" style={${style}} />;`);
    const edit = (oldClass, newClass, action = 'edit') => request('handleUpdateSource', {
      file: relativeFile, startLine: 1, oldClass, newClass, action,
    });
    // Conditional styling must not silently discard the base inline dimension.
    assert.equal((await edit('', 'hover:w-[250px]', 'add')).status, 200);
    assert.equal(renderedStyle().width, 300);
    // Reapplying the existing width class still releases a pointer resize.
    assert.equal((await edit('w-[200px]', 'w-[200px]')).status, 200);
    assert.deepEqual(renderedStyle(), { position: 'absolute', left: 10, top: 20, width: undefined, height: 200, opacity: 0.5 });
    assert.equal((await edit('h-[100px]', 'h-[140px]')).status, 200);
    assert.equal(renderedStyle().height, undefined);
    assert.match(fs.readFileSync(frameFile, 'utf8'), /h-\[140px\]/);
    assert.equal((await update('handleSketchpadUpdateElementSize', 'sized1', { width: 250 })).status, 200);
    assert.equal(renderedStyle().width, 250, 'pointer resizing works after inspector editing');
    assert.equal((await edit('w-[200px]', '', 'remove')).status, 200);
    assert.equal(renderedStyle().width, undefined, 'removing a size also releases the override');
  });
}

test('inspector class editing leaves ordinary app inline dimensions untouched', async () => {
  fs.writeFileSync(frameFile, `export default () => <div className="w-[200px]" style={{ width: 300, height: 200 }} />;`);
  assert.equal((await request('handleUpdateSource', {
    file: relativeFile, startLine: 1, oldClass: 'w-[200px]', newClass: 'w-[210px]', action: 'edit',
  })).status, 200);
  assert.deepEqual(renderedStyle(), { width: 300, height: 200 });
});

test('same-frame reparenting removes the source and inserts the destination in one write', async () => {
  const source = `export default () => <div>
    {/* pv-editable-zone-start:root01 */}
      {/* pv-block-start:outer1 */}
      <div data-pv-block="outer1">
        {/* pv-editable-zone-start:inner1 */}
          {/* pv-block-start:child1 */}
          <div data-pv-block="child1">Child</div>
          {/* pv-block-end:child1 */}
        {/* pv-editable-zone-end:inner1 */}
      </div>
      {/* pv-block-end:outer1 */}
    {/* pv-editable-zone-end:root01 */}
  </div>;`;
  fs.writeFileSync(frameFile, source);
  const transfer = await request('handleBlockAction', { file: relativeFile, blockId: 'child1', action: 'read' });
  const params = {
    file: relativeFile, zoneId: 'root01', elementType: 'paste', targetLayoutMode: 'absolute',
    pasteX: 80, pasteY: 90, pasteData: transfer.data,
  };
  const writes = [];
  const write = fs.writeFileSync;
  fs.writeFileSync = (...args) => {
    if (args[0] === frameFile) writes.push(args[1]);
    return write(...args);
  };
  try {
    const invalid = await request('handleAddBlock', { ...params, moveBlockIds: ['missing'] });
    assert.equal(invalid.status, 500);
    const intoSelf = await request('handleAddBlock', {
      ...params, zoneId: 'inner1', moveBlockIds: ['outer1'],
    });
    assert.equal(intoSelf.status, 500, 'a move cannot erase its own destination');
    assert.deepEqual(writes, [], 'invalid move must not paste a duplicate');
    assert.equal(fs.readFileSync(frameFile, 'utf8'), source);
    const moved = await request('handleAddBlock', { ...params, moveBlockIds: ['child1'] });
    assert.equal(moved.status, 200, moved.error);
    assert.equal(writes.length, 1, 'the file watcher sees only the completed move');
    assert.doesNotMatch(writes[0], /pv-block-start:child1/);
    assert.equal((writes[0].match(/>Child</g) || []).length, 1);
    assert.deepEqual(savedStyle(moved.newBlockIds[0]), { position: 'absolute', left: 80, top: 90 });
  } finally {
    fs.writeFileSync = write;
  }
});

for (const operation of ['wrap', 'unwrap']) {
  for (const rootStyle of ['', `style={{ position: 'absolute', left: 20, top: 30 }}`]) {
    test(`${operation} into flow preserves absolute descendants (${rootStyle || 'no root style'})`, async () => {
      const descendant = `<div data-pv-block="child1" data-pv-sketchpad-el="child1" style={{ position: 'absolute', left: 5, top: 10, width: 40 }} />`;
      const nested = `
        {/* pv-block-start:outer1 */}
        <div data-pv-block="outer1" data-pv-sketchpad-el="outer1" ${rootStyle}>
          {/* pv-editable-zone-start:inner1 */}
            {/* pv-block-start:child1 */}
            ${descendant}
            {/* pv-block-end:child1 */}
          {/* pv-editable-zone-end:inner1 */}
        </div>
        {/* pv-block-end:outer1 */}`;
      fs.writeFileSync(frameFile, `export default () => <div>
        {/* pv-editable-zone-start:root01 */}
        {/* pv-block-start:wrap01 */}
        <div data-pv-block="wrap01">
          {/* pv-editable-zone-start:wrap02 */}
          ${nested}
          {/* pv-editable-zone-end:wrap02 */}
        </div>
        {/* pv-block-end:wrap01 */}
        {/* pv-editable-zone-end:root01 */}
      </div>;`);
      const result = await request(operation === 'wrap' ? 'handleWrapBlocks' : 'handleUnwrapBlock', {
        file: relativeFile, blockId: 'wrap01', blockIds: ['outer1'], targetLayoutMode: 'flow',
      });
      assert.equal(result.success, true, result.error);
      const saved = fs.readFileSync(frameFile, 'utf8');
      assert.ok(saved.includes(descendant), 'descendant source is untouched');
      assert.ok(!saved.includes('data-pv-sketchpad-el="outer1"'), 'only the root becomes flow');
      babel.parseSync(saved, { plugins: [syntaxJsx] });
    });
  }
}

test('bring-to-front moves to the end of its zone without crossing another zone', async () => {
  const block = id => `    {/* pv-block-start:${id} */}\n    <div data-pv-block="${id}" />\n    {/* pv-block-end:${id} */}\n`;
  const otherZone = `    {/* pv-editable-zone-start:other1 */}\n${block('other2')}    {/* pv-editable-zone-end:other1 */}`;
  fs.writeFileSync(frameFile, `export default () => <div>\n    {/* pv-editable-zone-start:root01 */}\n${['first1', 'second', 'third1'].map(block).join('')}    {/* pv-editable-zone-end:root01 */}\n${otherZone}\n</div>;`);
  const move = () => request('handleBlockAction', { file: relativeFile, blockId: 'first1', action: 'bring-to-front' });
  assert.equal((await move()).success, true);
  const saved = fs.readFileSync(frameFile, 'utf8');
  assert.ok(saved.indexOf('pv-block-start:third1') < saved.indexOf('pv-block-start:first1'));
  assert.ok(saved.indexOf('pv-block-start:first1') < saved.indexOf('pv-editable-zone-end:root01'));
  assert.ok(saved.includes(otherZone));
  assert.equal((await move()).success, true);
  assert.equal(fs.readFileSync(frameFile, 'utf8'), saved, 'already frontmost is a no-op');
});

test('cross-frame movement validates every target before saving one undo snapshot', async () => {
  const otherFile = path.join(path.dirname(frameFile), 'frame-other.tsx');
  const firstSource = `export default () => <div data-pv-sketchpad-el="first1" style={{ left: 10, top: 20 }} />;`;
  const otherSource = `export default () => <div data-pv-sketchpad-el="second" style={{ left: 30, top: 40 }} />;`;
  fs.writeFileSync(frameFile, firstSource);
  fs.writeFileSync(otherFile, otherSource);
  handlers.undoStack.length = 0;
  const first = { blockId: 'first1', x: 60, y: 70 };
  const second = { frameId: 'frame-other', blockId: 'second', x: 80, y: 90 };
  for (const invalid of [{ ...second, blockId: 'missing' }, { ...second, frameId: 'missing' }]) {
    const result = await update('handleSketchpadUpdateElementPosition', undefined, { positions: [first, invalid] });
    assert.ok(result.status >= 400);
    assert.equal(fs.readFileSync(frameFile, 'utf8'), firstSource);
    assert.equal(fs.readFileSync(otherFile, 'utf8'), otherSource);
    assert.equal(handlers.undoStack.length, 0);
  }
  const result = await update('handleSketchpadUpdateElementPosition', undefined, { positions: [first, second] });
  assert.equal(result.success, true, result.error);
  assert.deepEqual(savedStyle('first1'), { left: 60, top: 70 });
  assert.match(fs.readFileSync(otherFile, 'utf8'), /left: 80, top: 90/);
  assert.equal(handlers.undoStack.length, 1);
  assert.deepEqual(handlers.undoStack[0].files.map(file => file.content), [firstSource, otherSource]);
  fs.unlinkSync(otherFile);
});

for (const action of ['copy', 'cut', 'read', 'duplicate', 'delete', 'delete-many']) {
  test(`overlapping block selection ${action} handles each subtree once`, async () => {
    const sibling = `{/* pv-block-start:other1 */}<div data-pv-block="other1" />{/* pv-block-end:other1 */}`;
    const source = `export default () => <div>
      {/* pv-editable-zone-start:root01 */}
        {/* pv-block-start:outer1 */}
        <div data-pv-block="outer1">
          {/* pv-editable-zone-start:inner1 */}
            {/* pv-block-start:child1 */}<div data-pv-block="child1" />{/* pv-block-end:child1 */}
          {/* pv-editable-zone-end:inner1 */}
        </div>
        {/* pv-block-end:outer1 */}
        ${sibling}
      {/* pv-editable-zone-end:root01 */}
    </div>;`;
    fs.writeFileSync(frameFile, source);
    const result = await request(action === 'delete-many' ? 'handleDeleteBlocks' : 'handleBlockAction', {
      file: relativeFile, action, blockIds: ['child1', 'outer1', 'child1'],
    });
    assert.equal(result.success, true, result.error);
    const saved = fs.readFileSync(frameFile, 'utf8');
    assert.ok(saved.includes(sibling), 'unselected sibling remains untouched');
    babel.parseSync(saved, { plugins: [syntaxJsx] });
    if (action === 'read') assert.equal(result.data.blocks.length, 1);
    if (['copy', 'read'].includes(action)) assert.equal(saved, source);
    else if (action === 'duplicate') {
      const ids = [...saved.matchAll(/data-pv-block="([^"]+)"/g)].map(match => match[1]);
      assert.equal(ids.length, 5, 'parent and child duplicated once');
      assert.equal(new Set(ids).size, 5);
    } else {
      assert.doesNotMatch(saved, /data-pv-block="(?:outer1|child1)"/);
    }
  });
}

for (const mode of ['measured', 'missing', 'partial', 'invalid']) {
  test(`flow group paste uses rendered offsets or vertical fallback (${mode})`, async () => {
    const blocks = ['flow01', 'flow02', 'flow03'].map((id, i) => `
      {/* pv-block-start:${id} */}
      <div data-pv-block="${id}" style={{ width: 90, height: ${140 + i * 20}, marginTop: 7, opacity: 0.7 }} />
      {/* pv-block-end:${id} */}`);
    fs.writeFileSync(frameFile, `export default () => <div>{/* pv-editable-zone-start:root01 */}${blocks.join('\n')}{/* pv-editable-zone-end:root01 */}</div>;`);
    const geometry = mode === 'missing' ? undefined : {
      flow01: { left: 410, top: 230, width: 100, height: 140, isFlow: true },
      flow02: { left: 540, top: 230, width: 110, height: 160, isFlow: true },
      flow03: { left: 410, top: 430, width: 120, height: 180, isFlow: true },
    };
    if (mode === 'partial') delete geometry.flow02;
    if (mode === 'invalid') geometry.flow02.left = null;
    // Reverse selection order: geometry is associated with source IDs, never DOM order.
    const cut = await request('handleBlockAction', { file: relativeFile, action: 'cut', blockIds: ['flow03', 'flow01', 'flow02'], geometry });
    assert.equal(cut.success, true);
    const pasted = await request('handleAddBlock', {
      file: relativeFile, zoneId: 'root01', elementType: 'paste', targetLayoutMode: 'absolute', pasteX: 30, pasteY: 50,
    });
    assert.equal(pasted.success, true, pasted.error);
    const styles = pasted.newBlockIds.map(savedStyle);
    if (mode === 'measured') {
      assert.deepEqual(styles.map(s => [s.left, s.top]), [[30, 250], [30, 50], [160, 50]]);
      assert.deepEqual(styles.map(s => s.width), [120, 100, 110]);
    } else {
      assert.deepEqual(styles.map(s => [s.left, s.top]), [[30, 50], [30, 246], [30, 402]]);
    }
    for (const style of styles) {
      assert.equal(style.position, 'absolute');
      assert.equal(style.margin, 0);
      assert.equal(style.marginTop, undefined);
      assert.equal(style.opacity, 0.7);
      assert.equal(style.boxSizing, 'border-box');
    }
  });
}

test('absolute group paste does not count existing margins twice', async () => {
  fs.writeFileSync(frameFile, `export default () => <div>{/* pv-editable-zone-start:root01 */}{/* pv-editable-zone-end:root01 */}</div>;`);
  const blocks = ['first1', 'second'].map((id, i) => `
    {/* pv-block-start:${id} */}
    <div data-pv-block="${id}" data-pv-sketchpad-el="${id}" style={{position:'absolute',left:${10 + i * 100},top:20,width:80,height:40,marginLeft:${i * 10} }} />
    {/* pv-block-end:${id} */}`);
  const pasted = await request('handleAddBlock', {
    file: relativeFile, zoneId: 'root01', elementType: 'paste', targetLayoutMode: 'absolute', pasteX: 30, pasteY: 50,
    pasteData: { file: relativeFile, blocks, imports: [], geometry: {
      first1: { left: 10, top: 20, width: 80, height: 40, isFlow: false },
      second: { left: 120, top: 20, width: 80, height: 40, isFlow: false },
    } },
  });
  assert.equal(pasted.success, true, pasted.error);
  const styles = pasted.newBlockIds.map(savedStyle);
  assert.deepEqual(styles.map(s => [s.left, s.top, s.marginLeft]), [[30, 50, 0], [130, 50, 10]]);
});
