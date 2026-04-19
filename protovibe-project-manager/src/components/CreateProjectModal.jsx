import { useState, useEffect, useRef } from 'react'

const NAME_RE = /^[a-zA-Z0-9_-]+$/

export default function CreateProjectModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = name.trim()

    if (!trimmed) {
      setError('Project name is required.')
      return
    }
    if (!NAME_RE.test(trimmed)) {
      setError('Name may only contain letters, numbers, hyphens, and underscores.')
      return
    }

    setError('')
    onCreate(trimmed)
  }

  return (
    <div
      className="fixed inset-0 bg-background-overlay z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-background-elevated border border-border-default rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground-default">New Project</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-foreground-tertiary hover:text-foreground-default hover:bg-background-secondary transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="project-name" className="text-sm font-medium text-foreground-default">
              Project name
            </label>
            <input
              ref={inputRef}
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError('')
              }}
              placeholder="my-project"
              className="w-full px-3 py-2 rounded-lg border text-sm text-foreground-default bg-background-secondary placeholder-foreground-tertiary outline-none transition-colors disabled:opacity-50
                border-border-default
                focus:border-border-focus focus:ring-2 focus:ring-border-focus/20"
            />
            {error && (
              <p className="text-xs text-foreground-destructive">{error}</p>
            )}
            <p className="text-xs text-foreground-tertiary">
              Letters, numbers, hyphens, and underscores only
            </p>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-foreground-secondary hover:text-foreground-default hover:bg-background-secondary transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary-hover text-primary-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
