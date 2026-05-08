import { useEffect, useState } from 'react'
import { X, Copy, Check } from 'lucide-react'

function CommandBlock({ command }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard blocked — user can still select the text manually
    }
  }

  return (
    <div className="flex items-stretch gap-2 rounded-lg bg-background-secondary border border-border-default overflow-hidden">
      <code className="flex-1 px-3 py-2 text-xs text-foreground-default font-mono whitespace-pre-wrap break-all select-all">
        {command}
      </code>
      <button
        type="button"
        onClick={copy}
        title="Copy"
        className="px-3 flex items-center justify-center text-foreground-tertiary hover:text-foreground-default hover:bg-background-tertiary transition-colors cursor-pointer border-l border-border-default"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  )
}

function Step({ index, title, description, children }) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-foreground-on-primary">
        {index}
      </div>
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <div>
          <p className="text-sm font-medium text-foreground-default">{title}</p>
          {description && (
            <p className="text-xs text-foreground-tertiary mt-0.5">{description}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

export default function CloneFromGitModal({ onClose }) {
  const [projectsDir, setProjectsDir] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/projects-dir')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled && data?.path) setProjectsDir(data.path) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Quote the path for shells if it contains spaces.
  const cdTarget = projectsDir
    ? (projectsDir.includes(' ') ? `"${projectsDir}"` : projectsDir)
    : '<projects folder>'
  const cdCommand = `cd ${cdTarget}`
  const cloneCommand = 'git clone https://github.com/your-name/your-repo.git'

  return (
    <div
      className="fixed inset-0 bg-background-overlay z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-background-elevated border border-border-default rounded-2xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground-default">Clone from a Git repository</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-foreground-tertiary hover:text-foreground-default hover:bg-background-secondary transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        <p className="text-sm text-foreground-secondary">
          Already keep your Protovibe project on GitHub or another Git host?
          Clone it straight into your projects folder and Protovibe will pick it up automatically.
          You'll need <span className="font-medium text-foreground-default">git</span> installed
          and access to the repository.
        </p>

        <div className="flex flex-col gap-4">
          <Step
            index={1}
            title="Open a terminal in your projects folder"
            description="Run this command to navigate there. Keep this terminal open for the next step."
          >
            <CommandBlock command={cdCommand} />
          </Step>

          <Step
            index={2}
            title="Clone your repository"
            description="Replace the URL below with your own repository URL. If the repo is private, make sure your Git credentials (SSH key or credential helper) are set up first."
          >
            <CommandBlock command={cloneCommand} />
          </Step>

          <Step
            index={3}
            title="Come back to Protovibe"
            description="Your project will appear in the list within a couple of seconds — no refresh needed. If it doesn't show up, make sure the cloned folder contains a protovibe-data.json file (only valid Protovibe projects are detected)."
          />
        </div>

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary-hover text-foreground-on-primary transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
