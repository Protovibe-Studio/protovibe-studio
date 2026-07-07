export const PV_TOAST_EVENT = 'pv-toast';

export type ToastVariant = 'info' | 'success' | 'error';

export type ToastPayload = {
  message: string;
  durationMs?: number;
  variant?: ToastVariant;
};

export type ToastEventDetail = string | ToastPayload;

export function normalizeToastDetail(detail: ToastEventDetail): ToastPayload {
  if (typeof detail === 'string') {
    return { message: detail };
  }

  return {
    message: detail.message,
    durationMs: detail.durationMs,
    variant: detail.variant ?? 'info'
  };
}

export function emitToast(detail: ToastEventDetail) {
  window.dispatchEvent(new CustomEvent<ToastEventDetail>(PV_TOAST_EVENT, { detail }));
}

// Build the "Undo — px-2 in file.tsx" style message from an undo/redo response.
export function formatUndoRedoMessage(action: 'Undo' | 'Redo', res: { note?: string; file?: string }): string {
  if (!res?.note) return action === 'Undo' ? 'Undone' : 'Redone';
  const fileName = res.file ? res.file.split('/').pop() : undefined;
  return fileName ? `${action} — ${res.note} in ${fileName}` : `${action} — ${res.note}`;
}
