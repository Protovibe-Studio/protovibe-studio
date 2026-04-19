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
        {...getReferenceProps({ onClick: (e) => e.stopPropagation() })}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-foreground-tertiary hover:text-foreground-default hover:bg-background-tertiary transition-colors cursor-pointer"
        title="Actions"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="3.5" r="1.25" fill="currentColor" />
          <circle cx="8" cy="8" r="1.25" fill="currentColor" />
          <circle cx="8" cy="12.5" r="1.25" fill="currentColor" />
        </svg>
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

            {onRename && (
              <MenuItem
                label="Rename"
                onClick={(e) => {
                  e.stopPropagation()
                  onRename()
                  setMenuOpen(false)
                }}
                icon={
                  <svg width="14" height="14" viewBox="0 0 19 19" fill="none" className="shrink-0">
                    <path d="M12 3l4 4-9 9H3v-4l9-9z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                }
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
              icon={
                <svg width="14" height="14" viewBox="0 0 19 19" fill="none" className="shrink-0">
                  <rect x="6" y="6" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M3 13V3h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
            />

            <div className="h-px bg-border-default mx-1 my-0.5" />

            <MenuItem
              label="Delete"
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
    </>
  )
}
