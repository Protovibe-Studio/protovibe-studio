import { useState } from 'react'
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
import {
  MoreVertical,
  ExternalLink,
  Square,
  Folder,
  Code2,
  Copy,
  Trash2,
  FolderRoot,
} from 'lucide-react'

const STATUS_LABELS = {
  running: 'Running',
  stopped: 'Stopped',
  installing: 'Installing',
  starting: 'Starting',
  'updating-plugin': 'Updating plugin',
}

function MenuItem({ icon, label, onClick, danger, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-danger={danger}
      className="flex items-center gap-3 w-full px-3 py-2 text-sm text-foreground-secondary rounded-lg hover:bg-background-tertiary data-[danger=true]:text-foreground-destructive data-[danger=true]:hover:bg-background-destructive-subtle transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-left"
    >
      {icon}
      {label}
    </button>
  )
}

export default function ProjectCard({ project, onOpen, onDuplicate, onDelete, onStop, onShowFolder, onOpenVSCode }) {
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

  const handleDelete = (e) => {
    e.stopPropagation()
    setMenuOpen(false)
    onDelete()
  }

  const formatDate = (iso) => iso
    ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null

  const createdDate = formatDate(project.createdAt)
  const updatedDate = formatDate(project.updatedAt)

  return (
    <div
      onClick={onOpen}
      data-testid="project-card"
      data-project-name={project.name}
      className="bg-background-elevated border border-border-default rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs hover:shadow-md hover:border-border-focus/40 transition-all cursor-pointer group"
    >
      {/* Icon */}
      <div className="shrink-0 w-10 h-10 rounded-xl bg-foreground-primary/20 flex items-center justify-center text-foreground-primary">
        <FolderRoot size={20} strokeWidth={1.5} />
      </div>

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
        {status !== 'stopped' && !isRunning && (
          <span
            data-status={status}
            className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium
              data-[status=installing]:bg-background-warning-subtle data-[status=installing]:text-foreground-warning
              data-[status=starting]:bg-background-info-subtle data-[status=starting]:text-foreground-info
              data-[status=updating-plugin]:bg-background-info-subtle data-[status=updating-plugin]:text-foreground-info"
          >
            {STATUS_LABELS[status] ?? status}
          </span>
        )}
        {isRunning && (
          <button
            onClick={(e) => { e.stopPropagation(); onStop && onStop() }}
            className="group/stop shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-background-success-subtle text-foreground-success transition-colors cursor-pointer"
          >
            <span className="flex items-center justify-center gap-1" style={{ minWidth: '3.5rem' }}>
              <Square size={8} fill="currentColor" strokeWidth={0} className="hidden group-hover/stop:block shrink-0" />
              <span className="group-hover/stop:hidden">Running</span>
              <span className="hidden group-hover/stop:inline">Stop</span>
            </span>
          </button>
        )}

        {/* Three-dot menu button */}
        <button
          ref={refs.setReference}
          data-testid="btn-card-menu"
          {...getReferenceProps({ onClick: (e) => e.stopPropagation() })}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-foreground-tertiary hover:text-foreground-default hover:bg-background-tertiary transition-colors cursor-pointer"
          title="Actions"
        >
          <MoreVertical size={16} />
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
                label="Open Protovibe editor"
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(`http://localhost:${port}/protovibe.html`, '_blank')
                  setMenuOpen(false)
                }}
                icon={<ExternalLink size={14} className="shrink-0" />}
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
                icon={<Square size={14} fill="currentColor" strokeWidth={0} className="shrink-0" />}
              />
            )}

            <MenuItem
              label="Show in Finder"
              onClick={(e) => {
                e.stopPropagation()
                onShowFolder && onShowFolder()
                setMenuOpen(false)
              }}
              icon={<Folder size={14} className="shrink-0" />}
            />

            <MenuItem
              label="Open in VS Code"
              onClick={(e) => {
                e.stopPropagation()
                onOpenVSCode && onOpenVSCode()
                setMenuOpen(false)
              }}
              icon={<Code2 size={14} className="shrink-0" />}
            />

            <MenuItem
              label="Duplicate"
              disabled={isBusy}
              onClick={(e) => {
                e.stopPropagation()
                onDuplicate()
                setMenuOpen(false)
              }}
              icon={<Copy size={14} className="shrink-0" />}
            />

            <div className="h-px bg-border-default mx-1 my-0.5" />

            <MenuItem
              label="Delete"
              danger
              disabled={isBusy || isRunning}
              onClick={handleDelete}
              icon={<Trash2 size={14} className="shrink-0" />}
            />
          </div>
        </FloatingPortal>
      )}
    </div>
  )
}
