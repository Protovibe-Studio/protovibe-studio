import { useState, useEffect, useRef } from 'react'
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useClick,
  useDismiss,
  useInteractions,
  FloatingPortal,
} from '@floating-ui/react'

const STATUS_LABELS = {
  running: 'Running',
  stopped: 'Stopped',
  installing: 'Installing',
  starting: 'Starting',
}

function MenuItem({ icon, label, onClick, danger, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-danger={danger}
      className="flex items-center gap-3 w-full px-3 py-2 text-sm text-foreground-secondary rounded-lg hover:bg-background-tertiary data-[danger=true]:text-foreground-destructive data-[danger=true]:hover:bg-background-destructive-subtle transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-left"
    >
      {icon}
      {label}
    </button>
  )
}

export default function ProjectCard({ project, onOpen, onDuplicate, onDelete, onStop, onShowFolder, onOpenVSCode }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { status, port } = project

  const isRunning = status === 'running'
  const isBusy = status === 'installing' || status === 'starting'

  const { refs, floatingStyles, context } = useFloating({
    open: menuOpen,
    onOpenChange: setMenuOpen,
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
    placement: 'bottom-end',
  })

  const click = useClick(context)
  const dismiss = useDismiss(context)
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss])

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
      setMenuOpen(false)
      onDelete()
    }
  }

  const createdDate = project.createdAt
    ? new Date(project.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  const updatedDate = project.updatedAt
    ? new Date(project.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div
      onClick={onOpen}
      className="bg-background-elevated border border-border-default rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs hover:shadow-md hover:border-border-focus/40 transition-all cursor-pointer group"
    >
      {/* Left: Header */}
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-foreground-default truncate group-hover:text-foreground-primary transition-colors">
          {project.name}
        </h2>
        <div className="flex items-center gap-2 text-xs text-foreground-tertiary">
          {createdDate && <span>Created {createdDate}</span>}
          {updatedDate && updatedDate !== createdDate && (
            <>
              <span className="w-1 h-1 rounded-full bg-foreground-tertiary/50 inline-block flex-shrink-0" />
              <span>Modified {updatedDate}</span>
            </>
          )}
        </div>
      </div>

      {/* Right: Status + menu button */}
      <div className="flex items-center gap-3 shrink-0">
        {status !== 'stopped' && (
          <span
            data-status={status}
            className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium
              data-[status=running]:bg-background-success-subtle data-[status=running]:text-foreground-success
              data-[status=installing]:bg-background-warning-subtle data-[status=installing]:text-foreground-warning
              data-[status=starting]:bg-background-info-subtle data-[status=starting]:text-foreground-info"
          >
            {STATUS_LABELS[status] ?? status}
          </span>
        )}


        {/* Three-dot menu button */}
        <button
          ref={refs.setReference}
          {...getReferenceProps({ onClick: (e) => e.stopPropagation() })}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-foreground-tertiary hover:text-foreground-default hover:bg-background-tertiary transition-colors"
          title="Actions"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="3.5" r="1.25" fill="currentColor" />
            <circle cx="8" cy="8" r="1.25" fill="currentColor" />
            <circle cx="8" cy="12.5" r="1.25" fill="currentColor" />
          </svg>
        </button>
      </div>

      {/* Dropdown menu */}
      {menuOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-50 min-w-48 bg-background-elevated border border-border-default rounded-xl shadow-xl p-1.5 flex flex-col gap-0.5"
          >
            {isRunning && port && (
              <MenuItem
                label="Open app"
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(`http://localhost:${port}/protovibe.html`, '_blank')
                  setMenuOpen(false)
                }}
                icon={
                  <svg width="14" height="14" viewBox="0 0 19 19" fill="none" className="shrink-0">
                    <path d="M8.5 3.5H4a1.5 1.5 0 00-1.5 1.5v10A1.5 1.5 0 004 16.5h10A1.5 1.5 0 0015.5 15v-4.5M12 2.5h4.5V7M16 3L9 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                }
              />
            )}

            {isRunning && (
              <MenuItem
                label="Stop"
                onClick={(e) => {
                  e.stopPropagation()
                  onStop && onStop()
                  setMenuOpen(false)
                }}
                icon={
                  <svg width="14" height="14" viewBox="0 0 19 19" fill="none" className="shrink-0">
                    <rect x="5" y="5" width="9" height="9" rx="2" fill="currentColor" />
                  </svg>
                }
              />
            )}

            <MenuItem
              label="Show in Finder"
              onClick={(e) => {
                e.stopPropagation()
                onShowFolder && onShowFolder()
                setMenuOpen(false)
              }}
              icon={
                <svg width="14" height="14" viewBox="0 0 19 19" fill="none" className="shrink-0">
                  <path d="M2.5 5.5C2.5 4.67 3.17 4 4 4H7.5l1.5 2H15c.83 0 1.5.67 1.5 1.5v7c0 .83-.67 1.5-1.5 1.5H4c-.83 0-1.5-.67-1.5-1.5V5.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                </svg>
              }
            />

            <MenuItem
              label="Open in VS Code"
              onClick={(e) => {
                e.stopPropagation()
                onOpenVSCode && onOpenVSCode()
                setMenuOpen(false)
              }}
              icon={
                <svg width="14" height="14" viewBox="0 0 19 19" fill="none" className="shrink-0">
                  <path d="M5.5 6L2 9.5 5.5 13M13.5 6L17 9.5 13.5 13M11 3.5l-3 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
            />

            <MenuItem
              label="Duplicate"
              disabled={isBusy}
              onClick={(e) => {
                e.stopPropagation()
                onDuplicate()
                setMenuOpen(false)
              }}
              icon={
                <svg width="14" height="14" viewBox="0 0 19 19" fill="none" className="shrink-0">
                  <rect x="6" y="6" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M3 13V3h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
            />

            <div className="h-px bg-border-default mx-1 my-0.5" />

            <MenuItem
              label={confirmDelete ? 'Confirm delete?' : 'Delete'}
              danger
              disabled={isBusy || isRunning}
              onClick={handleDelete}
              icon={
                <svg width="14" height="14" viewBox="0 0 19 19" fill="none" className="shrink-0">
                  <path d="M3 5.5h13M7.5 5.5V4h4v1.5M8.5 9v5M10.5 9v5M4.5 5.5l.75 10h8.5l.75-10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
            />
          </div>
        </FloatingPortal>
      )}
    </div>
  )
}
