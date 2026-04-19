import { useState, useEffect, useRef } from 'react'

const VARIANT_STYLES = {
  info: {
    borderColor: 'var(--border-default)',
    background: 'var(--background-elevated)',
    color: 'var(--foreground-default)'
  },
  success: {
    borderColor: '#2e7d32',
    background: '#1b2b1d',
    color: '#c8f5cd'
  },
  error: {
    borderColor: 'var(--border-destructive)',
    background: 'var(--background-destructive-subtle)',
    color: 'var(--foreground-destructive)'
  }
}

export const PV_TOAST_EVENT = 'pv-toast'

export function showToast(message, variant = 'info', durationMs = 3000) {
  window.dispatchEvent(new CustomEvent(PV_TOAST_EVENT, { detail: { message, variant, durationMs } }))
}

export function ToastViewport() {
  const [toasts, setToasts] = useState([])
  const timeoutRefs = useRef(new Map())
  const nextId = useRef(1)

  useEffect(() => {
    const handleToast = (event) => {
      const { message, variant = 'info', durationMs = 3000 } = event.detail ?? {}
      if (!message) return

      const id = nextId.current++
      setToasts((prev) => [...prev, { id, message, variant, durationMs }])

      const timeoutId = window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
        timeoutRefs.current.delete(id)
      }, durationMs)

      timeoutRefs.current.set(id, timeoutId)
    }

    window.addEventListener(PV_TOAST_EVENT, handleToast)
    return () => {
      window.removeEventListener(PV_TOAST_EVENT, handleToast)
      timeoutRefs.current.forEach((id) => window.clearTimeout(id))
      timeoutRefs.current.clear()
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        zIndex: 9999,
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
            whiteSpace: 'nowrap',
            ...VARIANT_STYLES[toast.variant]
          }}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
