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
  Pencil,
  Copy,
  Trash2,
} from 'lucide-react'

function MenuItem({ icon, label, onClick, danger, disabled, testId }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-danger={danger}
      data-testid={testId}
      className="flex items-center gap-3 w-full px-3 py-2 text-sm text-foreground-secondary rounded-lg hover:bg-background-tertiary data-[danger=true]:text-foreground-destructive data-[danger=true]:hover:bg-background-destructive-subtle transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-left"
    >
      {icon}
      {label}
    </button>
  )
}

export default function ProjectMoreMenu({ project, onDuplicate, onDelete, onStop, onShowFolder, onOpenVSCode, onRename }) {
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
    onDelete && onDelete()
  }

  return (
    <>
      <button
        ref={refs.setReference}
        data-testid="btn-more-menu"
        {...getReferenceProps({ onClick: (e) => e.stopPropagation() })}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-foreground-tertiary hover:text-foreground-default hover:bg-background-tertiary transition-colors cursor-pointer"
        title="Actions"
      >
        <MoreVertical size={16} />
      </button>

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
                testId="menu-open-editor"
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
                testId="menu-stop"
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

            {onRename && (
              <MenuItem
                label="Rename"
                onClick={(e) => {
                  e.stopPropagation()
                  onRename()
                  setMenuOpen(false)
                }}
                icon={<Pencil size={14} className="shrink-0" />}
              />
            )}

            <MenuItem
              label="Duplicate"
              disabled={isBusy}
              onClick={(e) => {
                e.stopPropagation()
                onDuplicate && onDuplicate()
                setMenuOpen(false)
              }}
              icon={<Copy size={14} className="shrink-0" />}
            />

            <div className="h-px bg-border-default mx-1 my-0.5" />

            <MenuItem
              label="Delete"
              danger
              testId="menu-delete"
              disabled={isBusy || isRunning}
              onClick={handleDelete}
              icon={<Trash2 size={14} className="shrink-0" />}
            />
          </div>
        </FloatingPortal>
      )}
    </>
  )
}
