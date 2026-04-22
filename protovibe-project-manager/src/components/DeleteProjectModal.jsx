import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'

export default function DeleteProjectModal({ projectName, onConfirm, onClose }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && !deleting) onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, deleting])

  const handleConfirm = async () => {
    setDeleting(true)
    setError('')
    try {
      await onConfirm()
      onClose()
    } catch (e) {
      setError(e.message || 'Failed to delete project.')
      setDeleting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-background-overlay z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !deleting) onClose() }}
    >
      <div className="bg-background-elevated border border-border-default rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground-default">Delete project</h2>
          <button
            onClick={onClose}
            disabled={deleting}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-foreground-tertiary hover:text-foreground-default hover:bg-background-secondary transition-colors disabled:opacity-40 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        <p className="text-sm text-foreground-secondary">
          Are you sure you want to delete <span className="font-semibold text-foreground-default">{projectName}</span>? This action cannot be undone.
        </p>

        {error && (
          <p className="text-xs text-foreground-destructive">{error}</p>
        )}

        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 rounded-lg text-sm font-medium text-foreground-secondary hover:text-foreground-default hover:bg-background-secondary transition-colors disabled:opacity-40 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="btn-confirm-delete"
            onClick={handleConfirm}
            disabled={deleting}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-background-destructive-subtle hover:bg-background-destructive text-foreground-destructive transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
          >
            {deleting && <Loader2 size={14} className="animate-spin" />}
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
