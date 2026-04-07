// plugins/protovibe/src/backend/sketchpad-server.ts
// Backend endpoints for sketchpad CRUD operations.
// Completely independent from the main protovibe server.

import fs from 'fs';
import path from 'path';
import { Connect } from 'vite';
import { undoStack, redoStack } from '../shared/state';

const SKETCHPADS_DIR = path.resolve(process.cwd(), 'src/sketchpads');

function logUndoDebug(event: string, details: Record<string, unknown>): void {
  console.log(`[protovibe:undo] ${event}`, details);
}

// Snapshot one or more files into the undo stack before mutating them.
function snapshotFiles(...relPaths: string[]): void {
  const uniquePaths = Array.from(new Set(relPaths.filter((f) => f)));
  const files = uniquePaths
    .map((f) => {
      const abs = path.resolve(process.cwd(), f);
      return { file: f, content: fs.existsSync(abs) ? fs.readFileSync(abs, 'utf-8') : '' };
    });
  if (files.length === 0) return;

  // Deduplicate: Don't push if the top of the stack has the exact same content
  const lastState = undoStack[undoStack.length - 1];
  if (lastState && lastState.files.length === files.length) {
    const isIdentical = files.every(f => {
      const match = lastState.files.find(lf => lf.file === f.file);
      return match && match.content === f.content;
    });
    if (isIdentical) {
      logUndoDebug('snapshot-skipped-identical', {
        source: 'sketchpad-server',
        files: files.map((file) => file.file),
        undoDepth: undoStack.length,
      });
      return;
    }
  }

  undoStack.push({ files, activeId: '' });
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
    snapshotFiles('src/sketchpads/_registry.json', ...framePaths);

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

    snapshotFiles('src/sketchpads/_registry.json');
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

    const frameId = uniqueSlug(
      'frame-' + slugify(name),
      sp.frames.map((f) => f.id),
    );

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
    snapshotFiles('src/sketchpads/_registry.json', frameRelPath);
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

export const handleFrameDelete: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { sketchpadId, frameId } = await parseBody(req);
    if (!sketchpadId || !frameId) return sendError(res, 'sketchpadId and frameId required');

    const reg = readRegistry();
    const sp = reg.sketchpads.find((s) => s.id === sketchpadId);
    if (!sp) return sendError(res, 'Sketchpad not found', 404);

    const frameRelPath = path.relative(process.cwd(), path.join(SKETCHPADS_DIR, sketchpadId, `${frameId}.tsx`));
    snapshotFiles('src/sketchpads/_registry.json', frameRelPath);
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

    snapshotFiles('src/sketchpads/_registry.json');
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

    snapshotFiles('src/sketchpads/_registry.json');
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

    snapshotFiles('src/sketchpads/_registry.json');
    if (canvasX !== undefined) frame.canvasX = canvasX;
    if (canvasY !== undefined) frame.canvasY = canvasY;
    writeRegistry(reg);

    sendJson(res, { success: true });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

export const handleSketchpadAddElement: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { sketchpadId, frameId, componentName, importPath, defaultProps, defaultContent, additionalImportsForDefaultContent, x, y } =
      await parseBody(req);
    if (!sketchpadId || !frameId || !componentName)
      return sendError(res, 'sketchpadId, frameId, and componentName required');

    const filePath = path.join(SKETCHPADS_DIR, sketchpadId, `${frameId}.tsx`);
    if (!fs.existsSync(filePath)) return sendError(res, 'Frame file not found', 404);

    snapshotFiles(path.relative(process.cwd(), filePath));
    let content = fs.readFileSync(filePath, 'utf-8');

    // Collect all imports to add (component + additional imports for default content)
    const importsToAdd: Array<{ name: string; path: string }> = [];

    if (importPath && !content.includes(`from '${importPath}'`)) {
      importsToAdd.push({ name: componentName, path: importPath });
    }

    if (Array.isArray(additionalImportsForDefaultContent)) {
      for (const dep of additionalImportsForDefaultContent) {
        if (dep.name && dep.path && !content.includes(`from '${dep.path}'`)) {
          importsToAdd.push({ name: dep.name, path: dep.path });
        }
      }
    }

    // Insert all imports
    for (const imp of importsToAdd) {
      const importLine = `import { ${imp.name} } from '${imp.path}';\n`;
      const lastImportIdx = content.lastIndexOf('import ');
      if (lastImportIdx >= 0) {
        const lineEnd = content.indexOf('\n', lastImportIdx);
        content = content.slice(0, lineEnd + 1) + importLine + content.slice(lineEnd + 1);
      } else {
        const firstLineEnd = content.indexOf('\n');
        content = content.slice(0, firstLineEnd + 1) + importLine + content.slice(firstLineEnd + 1);
      }
    }

    // Insert element before the topmost (last) zone-end so elements always
    // land in the frame's root zone, not inside a nested component's zone.
    const blockId = Math.random().toString(36).slice(2, 8);
    const zoneEndRe = /\{\/\* pv-editable-zone-end(?::\w+)? \*\/\}/g;
    let zoneEndIdx = -1;
    let m: RegExpExecArray | null;
    while ((m = zoneEndRe.exec(content)) !== null) {
      zoneEndIdx = m.index;
    }
    if (zoneEndIdx < 0) return sendError(res, 'No editable zone found in frame file');

    let elementJsx: string;
    const propsStr = defaultProps || '';

    if (defaultContent) {
      // Assign fresh IDs to bare pv-block/zone tags in the default content
      const contentWithIds = assignDefaultContentIds(defaultContent.trim());
      const indented = contentWithIds.split('\n').map(l => `        ${l}`).join('\n');
      elementJsx = `
      {/* pv-block-start:${blockId} */}
      <${componentName} data-pv-block="${blockId}" data-pv-sketchpad-el="${blockId}" ${propsStr} style={{ position: 'absolute', left: ${Math.round(x)}, top: ${Math.round(y)} }}>
${indented}
      </${componentName}>
      {/* pv-block-end:${blockId} */}
`;
    } else {
      elementJsx = `
      {/* pv-block-start:${blockId} */}
      <${componentName} data-pv-block="${blockId}" data-pv-sketchpad-el="${blockId}" ${propsStr} style={{ position: 'absolute', left: ${Math.round(x)}, top: ${Math.round(y)} }} />
      {/* pv-block-end:${blockId} */}
`;
    }

    content = content.slice(0, zoneEndIdx) + elementJsx + '      ' + content.slice(zoneEndIdx);
    fs.writeFileSync(filePath, content, 'utf-8');

    sendJson(res, { blockId });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

export const handleSketchpadUpdateElementPosition: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { sketchpadId, frameId, blockId, x, y } = await parseBody(req);
    if (!sketchpadId || !frameId || !blockId)
      return sendError(res, 'sketchpadId, frameId, and blockId required');

    const filePath = path.join(SKETCHPADS_DIR, sketchpadId, `${frameId}.tsx`);
    if (!fs.existsSync(filePath)) return sendError(res, 'Frame file not found', 404);

    snapshotFiles(path.relative(process.cwd(), filePath));
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
    const { sketchpadId, frameId, blockId, width, height } = await parseBody(req);
    if (!sketchpadId || !frameId || !blockId || (width === undefined && height === undefined))
      return sendError(res, 'sketchpadId, frameId, blockId, and width or height required');

    const filePath = path.join(SKETCHPADS_DIR, sketchpadId, `${frameId}.tsx`);
    if (!fs.existsSync(filePath)) return sendError(res, 'Frame file not found', 404);

    snapshotFiles(path.relative(process.cwd(), filePath));
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

export const handleSketchpadDuplicateElement: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { sketchpadId, frameId, blockId } = await parseBody(req);
    if (!sketchpadId || !frameId || !blockId)
      return sendError(res, 'sketchpadId, frameId, and blockId required');

    // For now, duplication is handled client-side with a new addElement call
    const newBlockId = Math.random().toString(36).slice(2, 8);
    sendJson(res, { blockId: newBlockId });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

export const handleSketchpadDeleteElement: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { sketchpadId, frameId, blockId } = await parseBody(req);
    if (!sketchpadId || !frameId || !blockId)
      return sendError(res, 'sketchpadId, frameId, and blockId required');

    // Element deletion would be handled by removing the pv-block from the file
    // For MVP, this is a placeholder
    sendJson(res, { success: true });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};

export const handleSketchpadReorderElement: Connect.NextHandleFunction = async (req, res) => {
  try {
    const { sketchpadId, frameId, blockId, direction } = await parseBody(req);
    if (!sketchpadId || !frameId || !blockId || !direction)
      return sendError(res, 'sketchpadId, frameId, blockId, and direction required');

    // Z-order reordering would reorder pv-block entries in the file
    // For MVP, this is a placeholder
    sendJson(res, { success: true });
  } catch (err) {
    sendError(res, String(err), 500);
  }
};
