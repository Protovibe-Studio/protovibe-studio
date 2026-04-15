import React from 'react';
import { theme } from '../theme';
import { normalizeToastDetail, PV_TOAST_EVENT, type ToastPayload, type ToastVariant } from '../events/toast';

type ToastItem = ToastPayload & { id: number };

const VARIANT_STYLES: Record<ToastVariant, React.CSSProperties> = {
  info: {
    borderColor: theme.border_default,
    background: theme.bg_strong,
    color: theme.text_default
  },
  success: {
    borderColor: '#2e7d32',
    background: '#1b2b1d',
    color: '#c8f5cd'
  },
  error: {
    borderColor: '#b33939',
    background: '#2b1b1b',
    color: '#ffd3d3'
  }
};

export const ToastViewport: React.FC = () => {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const timeoutRefs = React.useRef<Map<number, number>>(new Map());
  const nextId = React.useRef(1);

  React.useEffect(() => {
    const handleToast = (event: Event) => {
      const customEvent = event as CustomEvent<ToastPayload | string>;
      const detail = customEvent.detail;

      if (!detail) return;

      const normalized = normalizeToastDetail(detail);
      if (!normalized.message) return;

      const id = nextId.current++;
      const toast: ToastItem = {
        id,
        message: normalized.message,
        durationMs: normalized.durationMs ?? 3000,
        variant: normalized.variant ?? 'info'
      };

      setToasts((prev) => [...prev, toast]);

      const timeoutId = window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timeoutRefs.current.delete(id);
      }, toast.durationMs);

      timeoutRefs.current.set(id, timeoutId);
    };

    window.addEventListener(PV_TOAST_EVENT, handleToast as EventListener);

    return () => {
      window.removeEventListener(PV_TOAST_EVENT, handleToast as EventListener);
      timeoutRefs.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutRefs.current.clear();
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        zIndex: 9999999,
        pointerEvents: 'none'
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            border: '1px solid',
            transition: 'all 0.2s ease-out',
            ...VARIANT_STYLES[toast.variant ?? 'info']
          }}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
};
