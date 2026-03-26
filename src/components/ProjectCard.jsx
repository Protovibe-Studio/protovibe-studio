import { useState, useEffect } from 'react'

const STATUS_LABELS = {
  running: 'Running',
  stopped: 'Stopped',
  installing: 'Installing',
  starting: 'Starting',
}

export default function ProjectCard({ project, onOpen, onDuplicate, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { status, port } = project

  const isRunning = status === 'running'
  const isBusy = status === 'installing' || status === 'starting'

  useEffect(() => {
    if (!confirmDelete) return
    const t = setTimeout(() => setConfirmDelete(false), 3000)
    return () => clearTimeout(t)
  }, [confirmDelete])

  const handleDelete = (e) => {
    e.stopPropagation()
    if (!confirmDelete) {
      setConfirmDelete(true)
    } else {
      setConfirmDelete(false)
      onDelete()
    }
  }

  const handleDuplicate = (e) => {
    e.stopPropagation()
    onDuplicate()
  }

  const createdDate = project.createdAt
    ? new Date(project.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div
      onClick={onOpen}
      className="bg-background-elevated border border-border-default rounded-2xl p-5 flex flex-col gap-3 shadow-xs hover:shadow-md hover:border-border-focus/40 transition-all cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground-default truncate group-hover:text-foreground-primary transition-colors">
            {project.name}
          </h2>
          {createdDate && (
            <p className="text-xs text-foreground-tertiary">{createdDate}</p>
          )}
        </div>

        <span
          data-status={status}
          className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium
            data-[status=running]:bg-background-success-subtle data-[status=running]:text-foreground-success
            data-[status=stopped]:bg-background-secondary data-[status=stopped]:text-foreground-tertiary
            data-[status=installing]:bg-background-warning-subtle data-[status=installing]:text-foreground-warning
            data-[status=starting]:bg-background-info-subtle data-[status=starting]:text-foreground-info"
        >
          {STATUS_LABELS[status] ?? status}
        </span>
      </div>

      {/* Port hint */}
      {isRunning && port && (
        <p className="text-xs text-foreground-tertiary">localhost:{port}</p>
      )}

      {/* Actions */}
      <div className="flex gap-1.5 mt-auto">
        <button
          onClick={handleDuplicate}
          disabled={isBusy}
          title="Duplicate project"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-background-secondary text-foreground-secondary hover:bg-background-tertiary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.25"/>
            <path d="M2 9V2h7" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Duplicate
        </button>

        {!confirmDelete ? (
          <button
            onClick={handleDelete}
            disabled={isBusy || isRunning}
            title="Delete project"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-background-secondary text-foreground-tertiary hover:bg-background-destructive-subtle hover:text-foreground-destructive transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2 3.5h9M4.5 3.5V2.5h4v1M5.5 6v3.5M7.5 6v3.5M3 3.5l.5 7h6l.5-7" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Delete
          </button>
        ) : (
          <button
            onClick={handleDelete}
            title="Click again to confirm deletion"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-background-destructive-subtle text-foreground-destructive hover:bg-destructive hover:text-destructive-foreground ring-1 ring-border-destructive transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2 3.5h9M4.5 3.5V2.5h4v1M5.5 6v3.5M7.5 6v3.5M3 3.5l.5 7h6l.5-7" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Confirm?
          </button>
        )}
      </div>
    </div>
  )
}
