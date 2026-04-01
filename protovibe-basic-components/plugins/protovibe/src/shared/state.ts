// plugins/protovibe/shared.ts
export const locatorMap = new Map<string, any>();

export const undoStack: {
  files: { file: string; content: string }[];
  activeId: string;
}[] = [];
export const clipboard = { data: null as { file: string; content: string; imports: Array<{ name: string; path: string; isDefault: boolean }> } | null };

export const redoStack: {
  files: { file: string; content: string }[];
  activeId: string;
}[] = [];
