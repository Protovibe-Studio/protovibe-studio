// plugins/protovibe/src/backend/sketchpad-server.ts
// Backend endpoints for sketchpad CRUD operations.
// Completely independent from the main protovibe server.

import fs from 'fs';
import path from 'path';
import { Connect } from 'vite';
import { undoStack, redoStack } from '../shared/state';

const SKETCHPADS_DIR = path.resolve(process.cwd(), 'src/sketchpads');

function logUndoDebug(_event: string, _details: Record<string, unknown>): void {}

// Debounce snapshots for high-frequency drag/resize endpoints. A multi-element drag
// fires N position-update calls in rapid succession; we want one undo step covering the
// whole gesture. Snapshot only the first call within the window — its content is the
// pre-gesture state; subsequent skipped snapshots would just capture intermediate states.
const recentBurstSnapshots = new Map<string, number>();
const BURST_SNAPSHOT_WINDOW_MS = 1000;

function maybeSnapshotForBurst(activeId: string | null, relPath: string): void {
  const now = Date.now();
  const last = recentBurstSnapshots.get(relPath) ?? 0;
  if (now - last > BURST_SNAPSHOT_WINDOW_MS) {
    snapshotFiles(activeId, '?tab=sketchpad', relPath);
  }
  recentBurstSnapshots.set(relPath, now);
}

// Snapshot one or more files into the undo stack before mutating them.
function snapshotFiles(activeId: string | null, currentURLQueryString: string, ...relPaths: string[]): void {
  const uniquePaths = Array.from(new Set(relPaths.filter((f) => f)));
  const files = uniquePaths
    .map((f) => {
      const abs = path.resolve(process.cwd(), f);
      return { file: f, content: fs.existsSync(abs) ? fs.readFileSync(abs, 'utf-8') : '' };
    });
  if (files.length === 0) return;

  // Deduplicate: Don't push if the top of the stack has the exact same content AND same activeId
  const lastState = undoStack[undoStack.length - 1];
  if (lastState && lastState.files.length === files.length) {
    const isIdentical = files.every(f => {
      const match = lastState.files.find(lf => lf.file === f.file);
      return match && match.content === f.content;
    });
    if (isIdentical && lastState.activeId === (activeId || '')) {
      logUndoDebug('snapshot-skipped-identical', {
        source: 'sketchpad-server',
        files: files.map((file) => file.file),
        undoDepth: undoStack.length,
      });
      return;
    }
  }

  undoStack.push({ files, activeId: activeId || '', currentURLQueryString });
  redoStack.length = 0;
  logUndoDebug('snapshot-created', {
    source: 'sketchpad-server',
    files: files.map((file) => ({ file: file.file, existed: file.content !== '', size: file.content.length })),
    undoDepth: undoStack.length,
    redoDepth: redoStack.length,
  });
}
const REGISTRY_PATH = path.join(SKETCHPADS_DIR, '_registry.json');

// ─── Helpers ───────────────────────────────────────────────────────────────

interface Frame {
  id: string;
  name: string;
  width: number;
  height: number;
  canvasX: number;
  canvasY: number;
}

interface SketchpadEntry {
  id: string;
  name: string;
  createdAt: string;
  frames: Frame[];
}

interface Registry {
  sketchpads: SketchpadEntry[];
}

function readRegistry(): Registry {
  if (!fs.existsSync(REGISTRY_PATH)) {
    const initial: Registry = { sketchpads: [] };
    fs.mkdirSync(SKETCHPADS_DIR, { recursive: true });
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
}

function writeRegistry(reg: Registry): void {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(reg, null, 2));
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'untitled';
}

function uniqueSlug(base: string, existing: string[]): string {
  if (!existing.includes(base)) return base;
  let i = 2;
  while (existing.includes(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

function parseBody(req: Connect.IncomingMessage): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: string) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (e) {
        reject(e);
      }
    });
  });
}

function sendJson(res: any, data: unknown, status = 200): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function sendError(res: any, msg: string, status = 400): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: msg }));
}

// Assigns fresh IDs to bare pv-block and pv-editable-zone tags in default content
function assignDefaultContentIds(content: string): string {
  // 1. Assign IDs to bare pv-block tags (innermost-first, iterative)
  const bareBlockRe = /\{\/\*\s*pv-block-start\s*\*\/\}((?:(?!\{\/\*\s*pv-block-start\s*\*\/\}).)*?)\{\/\*\s*pv-block-end\s*\*\/\}/s;
  while (bareBlockRe.test(content)) {
    const id = Math.random().toString(36).substring(2, 8);
    content = content.replace(bareBlockRe, (_match, inner) => {
      const updatedInner = inner.replace('data-pv-block=""', `data-pv-block="${id}"`);
      return `{/* pv-block-start:${id} */}${updatedInner}{/* pv-block-end:${id} */}`;
    });
  }

  // 2. Assign IDs to bare pv-editable-zone tags using a stack-based scan
  const bareZoneStartRe = /\{\/\*\s*pv-editable-zone-start\s*\*\/\}/g;
  const bareZoneEndRe = /\{\/\*\s*pv-editable-zone-end\s*\*\/\}/g;
  const zoneTags: Array<{ index: number; length: number; type: 'start' | 'end' }> = [];
  let zm: RegExpExecArray | null;
  bareZoneStartRe.lastIndex = 0;
  while ((zm = bareZoneStartRe.exec(content)) !== null) {
    zoneTags.push({ index: zm.index, length: zm[0].length, type: 'start' });
  }
  bareZoneEndRe.lastIndex = 0;
  while ((zm = bareZoneEndRe.exec(content)) !== null) {
    zoneTags.push({ index: zm.index, length: zm[0].length, type: 'end' });
  }
  if (zoneTags.length > 0) {
    zoneTags.sort((a, b) => a.index - b.index);
    const stack: string[] = [];
    const replacements: Array<{ index: number; length: number; replacement: string }> = [];
    for (const tag of zoneTags) {
      if (tag.type === 'start') {
        const id = Math.random().toString(36).substring(2, 8);
        stack.push(id);
        replacements.push({ index: tag.index, length: tag.length, replacement: `{/* pv-editable-zone-start:${id} */}` });
      } else {
        const id = stack.pop();
        if (id) {
          replacements.push({ index: tag.index, length: tag.length, replacement: `{/* pv-editable-zone-end:${id} */}` });
        }
      }
    }
    replacements.sort((a, b) => b.index - a.index);
    for (const r of replacements) {
      content = content.slice(0, r.index) + r.replacement + content.slice(r.index + r.length);
    }
  }

  return content;
}

// Generate frame file content
function generateFrameContent(
  frameName: string,
  elements: Array<{
    componentName: string;
    importPath: string;
    defaultProps: string;
    defaultContent: string;
    x: number;
    y: number;
  }> = [],
): string {
  // Collect unique imports
  const imports = new Map<string, string>();
  for (const el of elements) {
    if (el.importPath && el.componentName) {
      imports.set(el.componentName, el.importPath);
    }
  }

  const importLines = Array.from(imports.entries())
    .map(([name, path]) => `import { ${name} } from '${path}';`)
    .join('\n');

  const funcName = frameName
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');

  let elementsJsx = '';
  for (const el of elements) {
    const blockId = Math.random().toString(36).slice(2, 8);
    elementsJsx += `
      {/* pv-block-start:${blockId} */}
      <${el.componentName} data-pv-block="${blockId}" data-pv-sketchpad-el="${blockId}" ${el.defaultProps} style={{ position: 'absolute', left: ${Math.round(el.x)}, top: ${Math.round(el.y)} }} />
      {/* pv-block-end:${blockId} */}`;
  }

  const zoneId = Math.random().toString(36).substring(2, 8);
  return `// Auto-generated by Protovibe Sketchpad
${importLines ? importLines + '\n' : ''}
export default function ${funcName || 'Frame'}() {
  return (
    <div data-layout-mode="absolute" style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* pv-editable-zone-start:${zoneId} */}${elementsJsx}
      {/* pv-editable-zone-end:${zoneId} */}
    </div>
  );
}
`;
}

// ─── Endpoint Handlers ────────────────────────────────────────────────────

export const handleSketchpadList: Connect.NextHandleFunction = async (_req, res) => {
  try {
    const reg = readRegistry();
    sendJson(res, reg);
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

export const handleSketchpadCreate: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { name } = await parseBody(req);
    if (!name) return sendError(res, 'Name required');

    const reg = readRegistry();
    const id = uniqueSlug(slugify(name), reg.sketchpads.map((s) => s.id));
    const dirPath = path.join(SKETCHPADS_DIR, id);
    fs.mkdirSync(dirPath, { recursive: true });

    const sp: SketchpadEntry = {
      id,
      name,
      createdAt: new Date().toISOString(),
      frames: [],
    };
    reg.sketchpads.push(sp);
    writeRegistry(reg);

    sendJson(res, sp);
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

export const handleSketchpadDelete: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { id } = await parseBody(req);
    if (!id) return sendError(res, 'ID required');

    const reg = readRegistry();
    const sp = reg.sketchpads.find((s) => s.id === id);
    const framePaths = (sp?.frames ?? []).map(
      (f) => path.relative(process.cwd(), path.join(SKETCHPADS_DIR, id, `${f.id}.tsx`)),
    );
    snapshotFiles(null, '?tab=sketchpad', 'src/sketchpads/_registry.json', ...framePaths);

    reg.sketchpads = reg.sketchpads.filter((s) => s.id !== id);
    writeRegistry(reg);

    const dirPath = path.join(SKETCHPADS_DIR, id);
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }

    sendJson(res, { success: true });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

export const handleSketchpadRename: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { id, name } = await parseBody(req);
    if (!id || !name) return sendError(res, 'ID and name required');

    const reg = readRegistry();
    const sp = reg.sketchpads.find((s) => s.id === id);
    if (!sp) return sendError(res, 'Sketchpad not found', 404);

    snapshotFiles(null, '?tab=sketchpad', 'src/sketchpads/_registry.json');
    sp.name = name;
    writeRegistry(reg);

    sendJson(res, { success: true });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

export const handleFrameCreate: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { sketchpadId, name, width, height, canvasX, canvasY } = await parseBody(req);
    if (!sketchpadId || !name) return sendError(res, 'sketchpadId and name required');

    const reg = readRegistry();
    const sp = reg.sketchpads.find((s) => s.id === sketchpadId);
    if (!sp) return sendError(res, 'Sketchpad not found', 404);

    const frameId = `frame-${Math.random().toString(36).substring(2, 8)}`;

    const frame: Frame = {
      id: frameId,
      name,
      width: width || 1440,
      height: height || 900,
      canvasX: canvasX ?? 0,
      canvasY: canvasY ?? 0,
    };

    const frameRelPath = path.relative(process.cwd(), path.join(SKETCHPADS_DIR, sketchpadId, `${frameId}.tsx`));
    // Snapshot both the registry and the tsx (tsx doesn't exist yet → stored as '' so undo deletes it)
    snapshotFiles(null, '?tab=sketchpad', 'src/sketchpads/_registry.json', frameRelPath);
    sp.frames.push(frame);
    writeRegistry(reg);

    // Create frame .tsx file
    const dirPath = path.join(SKETCHPADS_DIR, sketchpadId);
    fs.mkdirSync(dirPath, { recursive: true });
    const filePath = path.join(dirPath, `${frameId}.tsx`);
    fs.writeFileSync(filePath, generateFrameContent(name));

    sendJson(res, frame);
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

function generateCopyName(baseName: string, existingNames: string[]): string {
  const candidate = `${baseName} Copy`;
  if (!existingNames.includes(candidate)) return candidate;
  let i = 2;
  while (existingNames.includes(`${baseName} Copy ${i}`)) i++;
  return `${baseName} Copy ${i}`;
}

function toPascalCase(id: string): string {
  return id
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

function renameComponentInContent(content: string, oldId: string, newId: string): string {
  const oldName = toPascalCase(oldId);
  const newName = toPascalCase(newId);
  // Replace function declaration and default export references
  return content
    .replace(new RegExp(`\\bfunction ${oldName}\\b`, 'g'), `function ${newName}`)
    .replace(new RegExp(`\\bexport default ${oldName}\\b`, 'g'), `export default ${newName}`);
}

// Replace all existing pv-block and pv-editable-zone IDs with fresh ones
function reassignIds(content: string): string {
  // 1. Reassign zone pairs consistently
  const zoneStartRe = /pv-editable-zone-start:([a-zA-Z0-9_-]+)/g;
  const idMap = new Map<string, string>();
  let m: RegExpExecArray | null;

  while ((m = zoneStartRe.exec(content)) !== null) {
    if (!idMap.has(m[1])) {
      idMap.set(m[1], Math.random().toString(36).substring(2, 8));
    }
  }

  for (const [oldId, newId] of idMap) {
    content = content
      .replace(new RegExp(`pv-editable-zone-start:${oldId}\\b`, 'g'), `pv-editable-zone-start:${newId}`)
      .replace(new RegExp(`pv-editable-zone-end:${oldId}\\b`, 'g'), `pv-editable-zone-end:${newId}`);
  }

  // 2. Reassign block IDs
  const blockStartRe = /pv-block-start:([a-zA-Z0-9_-]+)/g;
  const blockIdMap = new Map<string, string>();

  while ((m = blockStartRe.exec(content)) !== null) {
    if (!blockIdMap.has(m[1])) {
      blockIdMap.set(m[1], Math.random().toString(36).substring(2, 8));
    }
  }

  for (const [oldId, newId] of blockIdMap) {
    content = content
      .replace(new RegExp(`pv-block-start:${oldId}\\b`, 'g'), `pv-block-start:${newId}`)
      .replace(new RegExp(`pv-block-end:${oldId}\\b`, 'g'), `pv-block-end:${newId}`)
      .replace(new RegExp(`data-pv-block="${oldId}"`, 'g'), `data-pv-block="${newId}"`)
      .replace(new RegExp(`data-pv-sketchpad-el="${oldId}"`, 'g'), `data-pv-sketchpad-el="${newId}"`);
  }

  return content;
}

export const handleFrameDuplicate: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { sketchpadId, frameId, canvasX, canvasY } = await parseBody(req);
    if (!sketchpadId || !frameId) return sendError(res, 'sketchpadId and frameId required');

    const reg = readRegistry();
    const sp = reg.sketchpads.find((s) => s.id === sketchpadId);
    if (!sp) return sendError(res, 'Sketchpad not found', 404);

    const sourceFrame = sp.frames.find((f) => f.id === frameId);
    if (!sourceFrame) return sendError(res, 'Frame not found', 404);

    const baseName = sourceFrame.name.replace(/ Copy( \d+)?$/, '');
    const existingNames = sp.frames.map((f) => f.name);
    const newName = generateCopyName(baseName, existingNames);

    const newFrameId = `frame-${Math.random().toString(36).substring(2, 8)}`;

    const sourceRelPath = path.relative(process.cwd(), path.join(SKETCHPADS_DIR, sketchpadId, `${frameId}.tsx`));
    const newRelPath = path.relative(process.cwd(), path.join(SKETCHPADS_DIR, sketchpadId, `${newFrameId}.tsx`));

    // Snapshot before mutation — new file doesn't exist yet so it's stored as '' (undo will delete it)
    snapshotFiles(null, '?tab=sketchpad', 'src/sketchpads/_registry.json', newRelPath);

    // Copy and transform the source TSX
    const sourceContent = fs.readFileSync(path.resolve(process.cwd(), sourceRelPath), 'utf-8');
    const renamedContent = renameComponentInContent(sourceContent, frameId, newFrameId);
    const freshContent = reassignIds(renamedContent);

    const dirPath = path.join(SKETCHPADS_DIR, sketchpadId);
    fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.resolve(process.cwd(), newRelPath), freshContent);

    const newFrame: Frame = {
      id: newFrameId,
      name: newName,
      width: sourceFrame.width,
      height: sourceFrame.height,
      canvasX: canvasX ?? sourceFrame.canvasX + 40,
      canvasY: canvasY ?? sourceFrame.canvasY + 40,
    };
    sp.frames.push(newFrame);
    writeRegistry(reg);

    sendJson(res, { ok: true, frame: newFrame });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

export const handleFrameDuplicateMulti: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { sketchpadId, entries } = await parseBody(req);
    if (!sketchpadId || !Array.isArray(entries) || entries.length === 0)
      return sendError(res, 'sketchpadId and non-empty entries array required');

    const reg = readRegistry();
    const sp = reg.sketchpads.find((s) => s.id === sketchpadId);
    if (!sp) return sendError(res, 'Sketchpad not found', 404);

    type Plan = { sourceFrameId: string; newFrameId: string; newRelPath: string; sourceContent: string; canvasX: number; canvasY: number };
    const plans: Plan[] = [];
    const existingNames = [...sp.frames.map((f) => f.name)];

    for (const entry of entries) {
      const { frameId, canvasX, canvasY } = entry;
      const sourceFrame = sp.frames.find((f) => f.id === frameId);
      if (!sourceFrame) continue;
      const baseName = sourceFrame.name.replace(/ Copy( \d+)?$/, '');
      const newName = generateCopyName(baseName, existingNames);
      existingNames.push(newName);
      const newFrameId = `frame-${Math.random().toString(36).substring(2, 8)}`;
      const sourceRelPath = path.relative(process.cwd(), path.join(SKETCHPADS_DIR, sketchpadId, `${frameId}.tsx`));
      const newRelPath = path.relative(process.cwd(), path.join(SKETCHPADS_DIR, sketchpadId, `${newFrameId}.tsx`));
      const sourceContent = fs.readFileSync(path.resolve(process.cwd(), sourceRelPath), 'utf-8');
      plans.push({
        sourceFrameId: frameId,
        newFrameId,
        newRelPath,
        sourceContent,
        canvasX: canvasX ?? sourceFrame.canvasX + 40,
        canvasY: canvasY ?? sourceFrame.canvasY + 40,
      });
      sp.frames.push({
        id: newFrameId,
        name: newName,
        width: sourceFrame.width,
        height: sourceFrame.height,
        canvasX: canvasX ?? sourceFrame.canvasX + 40,
        canvasY: canvasY ?? sourceFrame.canvasY + 40,
      });
    }

    // Single snapshot capturing registry + all about-to-be-created files
    snapshotFiles(null, '?tab=sketchpad', 'src/sketchpads/_registry.json', ...plans.map((p) => p.newRelPath));

    const dirPath = path.join(SKETCHPADS_DIR, sketchpadId);
    fs.mkdirSync(dirPath, { recursive: true });
    for (const p of plans) {
      const renamed = renameComponentInContent(p.sourceContent, p.sourceFrameId, p.newFrameId);
      const fresh = reassignIds(renamed);
      fs.writeFileSync(path.resolve(process.cwd(), p.newRelPath), fresh);
    }
    writeRegistry(reg);

    const newFrames = plans.map((p) => {
      const f = sp.frames.find((ff) => ff.id === p.newFrameId)!;
      return f;
    });
    sendJson(res, { ok: true, frames: newFrames });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

export const handleFrameDeleteMulti: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { sketchpadId, frameIds } = await parseBody(req);
    if (!sketchpadId || !Array.isArray(frameIds) || frameIds.length === 0)
      return sendError(res, 'sketchpadId and non-empty frameIds array required');

    const reg = readRegistry();
    const sp = reg.sketchpads.find((s) => s.id === sketchpadId);
    if (!sp) return sendError(res, 'Sketchpad not found', 404);

    const targets = sp.frames.filter((f) => frameIds.includes(f.id));
    const relPaths = targets.map((f) =>
      path.relative(process.cwd(), path.join(SKETCHPADS_DIR, sketchpadId, `${f.id}.tsx`)),
    );
    snapshotFiles(null, '?tab=sketchpad', 'src/sketchpads/_registry.json', ...relPaths);

    sp.frames = sp.frames.filter((f) => !frameIds.includes(f.id));
    writeRegistry(reg);

    for (const id of frameIds) {
      const filePath = path.join(SKETCHPADS_DIR, sketchpadId, `${id}.tsx`);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    sendJson(res, { success: true });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

export const handleFrameDelete: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { sketchpadId, frameId } = await parseBody(req);
    if (!sketchpadId || !frameId) return sendError(res, 'sketchpadId and frameId required');

    const reg = readRegistry();
    const sp = reg.sketchpads.find((s) => s.id === sketchpadId);
    if (!sp) return sendError(res, 'Sketchpad not found', 404);

    const frameRelPath = path.relative(process.cwd(), path.join(SKETCHPADS_DIR, sketchpadId, `${frameId}.tsx`));
    snapshotFiles(null, '?tab=sketchpad', 'src/sketchpads/_registry.json', frameRelPath);
    sp.frames = sp.frames.filter((f) => f.id !== frameId);
    writeRegistry(reg);

    const filePath = path.join(SKETCHPADS_DIR, sketchpadId, `${frameId}.tsx`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    sendJson(res, { success: true });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

export const handleFrameRename: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { sketchpadId, frameId, name } = await parseBody(req);
    if (!sketchpadId || !frameId || !name) return sendError(res, 'sketchpadId, frameId, and name required');

    const reg = readRegistry();
    const sp = reg.sketchpads.find((s) => s.id === sketchpadId);
    if (!sp) return sendError(res, 'Sketchpad not found', 404);

    const frame = sp.frames.find((f) => f.id === frameId);
    if (!frame) return sendError(res, 'Frame not found', 404);

    snapshotFiles(null, '?tab=sketchpad', 'src/sketchpads/_registry.json');
    frame.name = name;
    writeRegistry(reg);

    sendJson(res, { success: true });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

export const handleFrameResize: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { sketchpadId, frameId, width, height } = await parseBody(req);
    if (!sketchpadId || !frameId) return sendError(res, 'sketchpadId and frameId required');

    const reg = readRegistry();
    const sp = reg.sketchpads.find((s) => s.id === sketchpadId);
    if (!sp) return sendError(res, 'Sketchpad not found', 404);

    const frame = sp.frames.find((f) => f.id === frameId);
    if (!frame) return sendError(res, 'Frame not found', 404);

    snapshotFiles(null, '?tab=sketchpad', 'src/sketchpads/_registry.json');
    if (width) frame.width = width;
    if (height) frame.height = height;
    writeRegistry(reg);

    sendJson(res, { success: true });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

export const handleFrameUpdatePosition: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { sketchpadId, frameId, canvasX, canvasY } = await parseBody(req);
    if (!sketchpadId || !frameId) return sendError(res, 'sketchpadId and frameId required');

    const reg = readRegistry();
    const sp = reg.sketchpads.find((s) => s.id === sketchpadId);
    if (!sp) return sendError(res, 'Sketchpad not found', 404);

    const frame = sp.frames.find((f) => f.id === frameId);
    if (!frame) return sendError(res, 'Frame not found', 404);

    snapshotFiles(null, '?tab=sketchpad', 'src/sketchpads/_registry.json');
    if (canvasX !== undefined) frame.canvasX = canvasX;
    if (canvasY !== undefined) frame.canvasY = canvasY;
    writeRegistry(reg);

    sendJson(res, { success: true });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

export const handleFrameUpdatePositionMulti: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { sketchpadId, frames } = await parseBody(req);
    if (!sketchpadId || !Array.isArray(frames) || frames.length === 0)
      return sendError(res, 'sketchpadId and non-empty frames array required');

    const reg = readRegistry();
    const sp = reg.sketchpads.find((s) => s.id === sketchpadId);
    if (!sp) return sendError(res, 'Sketchpad not found', 404);

    snapshotFiles(null, '?tab=sketchpad', 'src/sketchpads/_registry.json');
    for (const update of frames) {
      const { frameId, canvasX, canvasY } = update;
      const frame = sp.frames.find((f) => f.id === frameId);
      if (!frame) continue;
      if (canvasX !== undefined) frame.canvasX = canvasX;
      if (canvasY !== undefined) frame.canvasY = canvasY;
    }
    writeRegistry(reg);

    sendJson(res, { success: true });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

export const handleSketchpadUpdateElementPosition: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { sketchpadId, frameId, blockId, x, y, activeSourceId } = await parseBody(req);
    if (!sketchpadId || !frameId || !blockId)
      return sendError(res, 'sketchpadId, frameId, and blockId required');

    const filePath = path.join(SKETCHPADS_DIR, sketchpadId, `${frameId}.tsx`);
    if (!fs.existsSync(filePath)) return sendError(res, 'Frame file not found', 404);

    maybeSnapshotForBurst(activeSourceId, path.relative(process.cwd(), filePath));
    let content = fs.readFileSync(filePath, 'utf-8');

    // Independently update left and top to avoid regex failures if code formatting changes
    const leftRegex = new RegExp(`(data-pv-sketchpad-el="${blockId}"[^>]*?style=\\{\\{[^}]*?)left:\\s*-?\\d+(?:\\.\\d+)?`);
    const topRegex = new RegExp(`(data-pv-sketchpad-el="${blockId}"[^>]*?style=\\{\\{[^}]*?)top:\\s*-?\\d+(?:\\.\\d+)?`);

    let updated = false;
    if (leftRegex.test(content)) {
      content = content.replace(leftRegex, `$1left: ${Math.round(x)}`);
      updated = true;
    }
    if (topRegex.test(content)) {
      content = content.replace(topRegex, `$1top: ${Math.round(y)}`);
      updated = true;
    }

    if (updated) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }

    sendJson(res, { success: true });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

export const handleSketchpadUpdateElementSize: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { sketchpadId, frameId, blockId, width, height, activeSourceId } = await parseBody(req);
    if (!sketchpadId || !frameId || !blockId || (width === undefined && height === undefined))
      return sendError(res, 'sketchpadId, frameId, blockId, and width or height required');

    const filePath = path.join(SKETCHPADS_DIR, sketchpadId, `${frameId}.tsx`);
    if (!fs.existsSync(filePath)) return sendError(res, 'Frame file not found', 404);

    maybeSnapshotForBurst(activeSourceId, path.relative(process.cwd(), filePath));
    let content = fs.readFileSync(filePath, 'utf-8');

    // Helper to update or insert a dimension in the style object
    const updateDimension = (dim: 'width' | 'height', value: number) => {
      const existsRe = new RegExp(
        `(data-pv-sketchpad-el="${blockId}"[^>]*?style=\\{\\{[^}]*?)${dim}:\\s*\\d+(?:\\.\\d+)?`,
      );
      if (existsRe.test(content)) {
        content = content.replace(existsRe, `$1${dim}: ${Math.round(value)}`);
      } else {
        const insertRe = new RegExp(
          `(data-pv-sketchpad-el="${blockId}"[^>]*?style=\\{\\{[^}]*?position:\\s*'absolute')`,
        );
        if (insertRe.test(content)) {
          content = content.replace(insertRe, `$1, ${dim}: ${Math.round(value)}`);
        }
      }
    };

    if (width !== undefined) updateDimension('width', width);
    if (height !== undefined) updateDimension('height', height);

    fs.writeFileSync(filePath, content, 'utf-8');
    sendJson(res, { success: true });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};