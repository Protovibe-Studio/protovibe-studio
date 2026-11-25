import type { ComponentType } from 'react';

// Share pending imports across navigation, undo and frame discovery. Completed
// imports are not cached here: existing frames update through Vite HMR, and a
// later explicit reload must be able to read a restored/replaced source file.
const pending = new Map<string, Promise<ComponentType<any> | undefined>>();

export function importFrameModule(sketchpadId: string, frameId: string): Promise<ComponentType<any> | undefined> {
  const path = `/src/sketchpads/${sketchpadId}/${frameId}.tsx`;
  const existing = pending.get(path);
  if (existing) return existing;
  const request = import(/* @vite-ignore */ `${path}?t=${Date.now()}`)
    .then((mod) => mod.default as ComponentType<any> | undefined)
    .finally(() => { pending.delete(path); });
  pending.set(path, request);
  return request;
}
