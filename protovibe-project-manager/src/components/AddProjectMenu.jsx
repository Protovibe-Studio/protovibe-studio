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
import { ChevronDown, Upload, GitBranch } from 'lucide-react'

function MenuItem({ icon, label, description, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 w-full px-3 py-2.5 text-left rounded-lg hover:bg-background-tertiary transition-colors cursor-pointer"
    >
      <span className="shrink-0 mt-0.5 text-foreground-secondary">{icon}</span>
      <span className="flex flex-col min-w-0">
        <span className="text-sm font-medium text-foreground-default">{label}</span>
        <span className="text-xs text-foreground-tertiary mt-0.5">{description}</span>
      </span>
    </button>
  )
}

export default function AddProjectMenu({ onImportZip, onCloneGit, compact = false }) {
  const [open, setOpen] = useState(false)

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
    placement: 'bottom-end',
  })

  const click = useClick(context)
  const dismiss = useDismiss(context)
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss])

  const triggerSize = compact
    ? 'px-3 py-2'
    : 'px-2.5 py-1.5'

  return (
    <>
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        title="More ways to add a project"
        className={`flex items-center gap-1 ${triggerSize} bg-background-secondary hover:bg-background-tertiary text-foreground-default text-sm font-medium rounded-lg border border-border-default transition-colors cursor-pointer`}
      >
        More
        <ChevronDown size={14} />
      </button>

      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-50 w-72 bg-background-elevated border border-border-default rounded-xl shadow-xl p-1.5 flex flex-col gap-0.5"
          >
            <MenuItem
              icon={<Upload size={14} />}
              label="Import from ZIP"
              description="Upload a ZIP archive of an exported Protovibe project."
              onClick={() => { setOpen(false); onImportZip() }}
            />
            <MenuItem
              icon={<GitBranch size={14} />}
              label="Clone from a Git repository"
              description="Use git to clone an existing Protovibe project into your projects folder."
              onClick={() => { setOpen(false); onCloneGit() }}
            />
          </div>
        </FloatingPortal>
      )}
    </>
  )
}
