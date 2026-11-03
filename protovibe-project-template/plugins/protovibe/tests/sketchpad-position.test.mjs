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
      export { handleAddBlock, handleBlockAction } from './src/backend/server';
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
