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
