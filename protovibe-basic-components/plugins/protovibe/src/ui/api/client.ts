// plugins/protovibe/src/ui/api/client.ts

export async function fetchSourceInfo(id: string, componentId?: string) {
  console.log(`[API] fetchSourceInfo requesting: id=${id}, componentId=${componentId}`);
  const res = await fetch('/__get-source-info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, componentId }),
  });
  if (!res.ok) throw new Error('Failed to fetch source info');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  console.log(`[API] fetchSourceInfo received:`, data);
  return data;
}

export async function fetchZones(file: string, startLine: number, startCol: number | null | undefined, endLine: number) {
  const res = await fetch('/__get-zones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file, startLine, startCol, endLine }),
  });
  if (!res.ok) throw new Error('Failed to fetch zones');
  return await res.json();
}

export async function fetchComponents() {
  const res = await fetch('/__get-components');
  if (!res.ok) throw new Error('Failed to fetch components');
  return await res.json();
}

export async function blockAction(action: string, blockId: string, file: string, text?: string) {
  const res = await fetch('/__block-action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, blockId, file, text }),
  });
  if (!res.ok) throw new Error('Failed to perform block action');
  return await res.json();
}

export async function addBlock(params: {
  file: string;
  zoneId: string;
  isPristine: boolean;
  elementType: string;
  compName?: string;
  importPath?: string;
  snippet?: string;
  defaultContent?: string;
  additionalImports?: Array<{ name: string; path: string }>;
  targetStartLine?: number;
  targetEndLine?: number;
}) {
  const res = await fetch('/__add-block', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to add block');
  return await res.json();
}

export async function updateSource(params: {
  id: string;
  file: string;
  startLine: number;
  endLine: number;
  oldClass: string;
  oldClasses?: string[];
  newClass: string;
  action: string;
  hasClass?: boolean;
  nameEnd?: number[];
  cStart?: number[];
  cEnd?: number[];
}) {
  console.log(`[API] updateSource sending:`, params);
  const res = await fetch('/__update-source', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to update source');
  return await res.json();
}

export async function updateProp(params: {
  file: string;
  action: string;
  propName: string;
  propValue?: string;
  loc?: any;
  nameEnd?: number;
}) {
  const res = await fetch('/__update-prop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to update prop');
  return await res.json();
}

export async function takeSnapshot(file: string, activeId: string) {
  const res = await fetch('/__take-snapshot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file, activeId }),
  });
  if (!res.ok) throw new Error('Failed to take snapshot');
  return await res.json();
}

export async function undo() {
  const res = await fetch('/__undo', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to undo');
  return await res.json();
}

export async function redo() {
  const res = await fetch('/__redo', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to redo');
  return await res.json();
}

export interface ThemeColor {
  val: string;
  hex: string;
  lightValue?: string;
  darkValue?: string;
}

export async function updateThemeColor(tokenName: string, themeMode: 'light' | 'dark', value: string): Promise<void> {
  const res = await fetch('/__update-theme-color', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tokenName, themeMode, value }),
  });
  if (!res.ok) throw new Error('Failed to update theme color');
}

export async function fetchThemeColors(): Promise<ThemeColor[]> {
  const res = await fetch('/__get-theme-colors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!res.ok) throw new Error('Failed to fetch theme colors');
  const data = await res.json();
  return data.colors || [];
}
