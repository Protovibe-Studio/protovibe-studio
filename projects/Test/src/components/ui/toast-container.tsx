import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@/store';
import { ToastBox } from '@/components/ui/toast-box';

export function ToastContainer() {
  const { state, hideToast } = useStore();
  const { toast } = state;
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (toast) {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    } else {
      setVisible(false);
      animTimerRef.current = setTimeout(() => {
        setMounted(false);
      }, 300);
    }

    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, [toast]);

  // Auto-dismiss after 5 seconds unless persistent
  useEffect(() => {
    if (toast && !toast.persistent) {
      timerRef.current = setTimeout(() => {
        hideToast();
      }, 5000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast, hideToast]);

  if (!mounted) return null;

  const handleAction = () => {
    toast?.onAction?.();
    hideToast();
  };

  return createPortal(
    <div
      data-visible={visible}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 data-[visible=true]:translate-y-0 data-[visible=true]:opacity-100 data-[visible=false]:translate-y-4 data-[visible=false]:opacity-0"
    >
      {toast && (
        <ToastBox
          variant={toast.variant}
          heading={toast.heading}
          secondaryText={toast.secondaryText}
          actionLabel={toast.actionLabel}
          onAction={toast.actionLabel ? handleAction : undefined}
          onClose={hideToast}
        />
      )}
    </div>,
    document.body
  );
}
