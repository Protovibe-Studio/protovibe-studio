import type { Registry, Sketchpad, SketchpadFrame } from './types';

const post = async (url: string, body: Record<string, unknown> = {}) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
};

export async function fetchRegistry(): Promise<Registry> {
  return post('/__sketchpad-list');
}

export async function createSketchpad(name: string): Promise<Sketchpad> {
  return post('/__sketchpad-create', { name });
}

export async function deleteSketchpad(id: string): Promise<void> {
  await post('/__sketchpad-delete', { id });
}

export async function renameSketchpad(id: string, name: string): Promise<void> {
  await post('/__sketchpad-rename', { id, name });
}

export async function createFrame(
  sketchpadId: string,
  name: string,
  width: number,
  height: number,
  canvasX: number,
  canvasY: number,
): Promise<SketchpadFrame> {
  return post('/__frame-create', { sketchpadId, name, width, height, canvasX, canvasY });
}

export async function duplicateFrame(
  sketchpadId: string,
  frameId: string,
  canvasX: number,
  canvasY: number,
): Promise<{ ok: boolean; frame: SketchpadFrame }> {
  return post('/__frame-duplicate', { sketchpadId, frameId, canvasX, canvasY });
}

export async function deleteFrame(sketchpadId: string, frameId: string): Promise<void> {
  await post('/__frame-delete', { sketchpadId, frameId });
}

export async function renameFrame(sketchpadId: string, frameId: string, name: string): Promise<void> {
  await post('/__frame-rename', { sketchpadId, frameId, name });
}

export async function resizeFrame(
  sketchpadId: string,
  frameId: string,
  width: number,
  height: number,
): Promise<void> {
  await post('/__frame-resize', { sketchpadId, frameId, width, height });
}

export async function updateFramePosition(
  sketchpadId: string,
  frameId: string,
  canvasX: number,
  canvasY: number,
): Promise<void> {
  await post('/__frame-update-position', { sketchpadId, frameId, canvasX, canvasY });
}

export async function updateFramePositionMulti(
  sketchpadId: string,
  frames: Array<{ frameId: string; canvasX: number; canvasY: number }>,
): Promise<void> {
  await post('/__frame-update-position-multi', { sketchpadId, frames });
}

export async function updateElementPosition(
  sketchpadId: string,
  frameId: string,
  blockId: string,
  x: number,
  y: number,
): Promise<void> {
  await post('/__sketchpad-update-element-position', {
    sketchpadId,
    frameId,
    blockId,
    x,
    y,
  });
}

export async function duplicateElement(
  sketchpadId: string,
  frameId: string,
  blockId: string,
  x: number,
  y: number,
): Promise<{ blockId: string }> {
  return post('/__sketchpad-duplicate-element', {
    sketchpadId,
    frameId,
    blockId,
    x,
    y,
  });
}

export async function deleteElement(
  sketchpadId: string,
  frameId: string,
  blockId: string,
): Promise<void> {
  await post('/__sketchpad-delete-element', { sketchpadId, frameId, blockId });
}

export async function reorderElement(
  sketchpadId: string,
  frameId: string,
  blockId: string,
  direction: 'front' | 'back' | 'forward' | 'backward',
): Promise<void> {
  await post('/__sketchpad-reorder-element', { sketchpadId, frameId, blockId, direction });
}
