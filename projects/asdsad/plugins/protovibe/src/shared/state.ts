// plugins/protovibe/shared.ts
export const locatorMap = new Map<string, any>();

export const undoStack: {
  file: string;
  content: string;
  activeId: string;
}[] = [];
export const clipboard = { data: null as { file: string; content: string } | null };

export const redoStack: {
  file: string;
  content: string;
  activeId: string;
}[] = [];
