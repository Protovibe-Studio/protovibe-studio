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
import { Plus, ChevronDown, Sparkles, Upload, GitBranch } from 'lucide-react'
import GithubMark from '../assets/GithubMark.jsx'

function MenuItem({ icon, label, description, onClick, testId }) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
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

export default function AddProjectMenu({ onCreateNew, onImportZip, onConnectGithub, onCloneGit, compact = false }) {
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
    ? 'px-4 py-2'
    : 'px-3 py-1.5'

  const pick = (fn) => () => { setOpen(false); fn() }

  return (
    <>
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        data-testid="btn-new-project"
        className={`flex items-center gap-1.5 ${triggerSize} bg-primary hover:bg-primary-hover text-foreground-on-primary text-sm font-medium rounded-lg transition-colors cursor-pointer`}
      >
        <Plus size={14} />
        New Project
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
              icon={<Sparkles size={14} />}
              label="From scratch"
              description="Start a fresh project from the Protovibe template."
              onClick={pick(onCreateNew)}
              testId="menu-item-from-scratch"
            />
            <MenuItem
              icon={<Upload size={14} />}
              label="Import ZIP"
              description="Upload a ZIP archive of an exported Protovibe project."
              onClick={pick(onImportZip)}
            />
            <MenuItem
              icon={<GithubMark size={14} />}
              label="Connect to GitHub"
              description="Pick one of your GitHub repositories and clone it here."
              onClick={pick(onConnectGithub)}
            />
            <MenuItem
              icon={<GitBranch size={14} />}
              label="Clone from other git repo"
              description="Use git in a terminal to clone from any Git host."
              onClick={pick(onCloneGit)}
            />
          </div>
        </FloatingPortal>
      )}
    </>
  )
}
