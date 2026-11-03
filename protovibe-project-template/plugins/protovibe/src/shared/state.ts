// plugins/protovibe/shared.ts
export const locatorMap = new Map<string, any>();

export type Snapshot = {
  files: { file: string; content: string }[];
  activeId: string;
  currentURLQueryString?: string;
  note?: string;
};

export const undoStack: Snapshot[] = [];
export type BlockClipboard = { file: string; blocks: string[]; imports: Array<{ name: string; path: string; isDefault: boolean }> };
export const clipboard = { data: null as BlockClipboard | null };

export const redoStack: Snapshot[] = [];
