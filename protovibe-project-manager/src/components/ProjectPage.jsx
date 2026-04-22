import { useState, useEffect, useRef } from 'react'
import SetupScreen from './SetupScreen.jsx'
import ProjectMoreMenu from './ProjectMoreMenu.jsx'
import {
  ArrowLeft,
  X,
  ExternalLink,
  Square,
  RotateCcw,
  Folder,
  Code2,
  Play,
  List,
  ChevronDown,
} from 'lucide-react'

export default function ProjectPage({ project, onBack, onSetup, onShowFolder, onOpenVSCode, onDuplicate, onDelete, onStop, onRenamed }) {
  const [lines, setLines] = useState([])
  const [error, setError] = useState('')
  const [showLogs, setShowLogs] = useState(false)
  const [setupMode, setSetupMode] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const bottomRef = useRef(null)

  const { id, name, status, port } = project
  const isRunning = status === 'running'
  const isStopped = status === 'stopped'
  const isBusy = status === 'installing' || status === 'starting'

  // Auto-enter setup mode when project is busy (e.g. navigated to mid-start)
  useEffect(() => {
    if (isBusy) setSetupMode(true)
  }, [isBusy])

  // SSE for logs
  useEffect(() => {
    const es = new EventSource(`/api/projects/${id}/logs`)
    es.onmessage = (e) => setLines((prev) => [...prev, e.data])
    es.onerror = () => es.close()
    return () => es.close()
  }, [id])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  const callAction = async (action) => {
    setError('')
    try {
      const res = await fetch(`/api/projects/${id}/${action}`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || `Failed to ${action}.`)
      }
    } catch {
      setError('Network error. Make sure the dev server is running.')
    }
  }

  const callRestart = async () => {
    setError('')
    try {
      await fetch(`/api/projects/${id}/stop`, { method: 'POST' })
      setSetupMode(true)
    } catch {
      setError('Network error. Make sure the dev server is running.')
    }
  }

  const fmt = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      : null

  const createdDate = fmt(project.createdAt)
  const updatedDate = fmt(project.updatedAt)

  const startRename = () => { setNameDraft(name); setEditingName(true) }
  const submitRename = async () => {
    const newName = nameDraft.trim()
    setEditingName(false)
    if (!newName || newName === name) return
    try {
      const res = await fetch(`/api/projects/${id}/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to rename.')
      } else {
        onRenamed && onRenamed()
      }
    } catch {
      setError('Network error.')
    }
  }

  const renderTitle = () => editingName ? (
    <input
      autoFocus
      value={nameDraft}
      onChange={(e) => setNameDraft(e.target.value)}
      onBlur={submitRename}
      onKeyDown={(e) => {
        if (e.key === 'Enter') submitRename()
        if (e.key === 'Escape') setEditingName(false)
      }}
      className="text-3xl font-bold text-foreground-default tracking-tight leading-tight bg-background-secondary border border-border-focus rounded-md px-2 -mx-2 outline-none w-full"
    />
  ) : (
    <h1
      onDoubleClick={startRename}
      title="Double-click to rename"
      className="text-3xl font-bold text-foreground-default tracking-tight leading-tight cursor-text"
    >
      {name}
    </h1>
  )

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-6">
      {/* Breadcrumb */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-foreground-tertiary hover:text-foreground-default transition-colors w-fit cursor-pointer"
      >
        <ArrowLeft size={20} />
        Back to projects
      </button>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-background-destructive-subtle border border-border-destructive px-4 py-3">
          <p className="text-sm text-foreground-destructive flex-1">{error}</p>
          <button
            onClick={() => setError('')}
            className="text-foreground-destructive hover:text-foreground-default transition-colors shrink-0 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main card */}
      <div className="bg-background-elevated rounded-2xl border border-border-default shadow-sm overflow-hidden">
        {setupMode ? (
          <SetupScreen
            inline
            projectId={id}
            projectName={name}
            onBack={() => setSetupMode(false)}
            onReady={() => setSetupMode(false)}
          />
        ) : (
        <div className="p-8 flex flex-col gap-10">

          {/* Project title + dates — shown when busy (no left/right split) */}
          {isBusy && (
            <div className="flex items-start justify-between gap-4">
              <div>
                {renderTitle()}
                <div className="flex items-center gap-2.5 mt-2 text-sm text-foreground-tertiary">
                  {createdDate && <span>Created {createdDate}</span>}
                  {updatedDate && updatedDate !== createdDate && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-foreground-tertiary/50 inline-block flex-shrink-0" />
                      <span>Modified {updatedDate}</span>
                    </>
                  )}
                </div>
              </div>
              <ProjectMoreMenu project={project} onDuplicate={onDuplicate} onDelete={onDelete} onStop={onStop} onShowFolder={onShowFolder} onOpenVSCode={onOpenVSCode} onRename={startRename} />
            </div>
          )}

          {/* ── Running state ── */}
          {isRunning && (
            <div className="flex items-start justify-between gap-6">
              {/* Left: title + status */}
              <div className="flex flex-col gap-3">
                <div>
                  {renderTitle()}
                  <div className="flex items-center gap-2.5 mt-2 text-sm text-foreground-tertiary">
                    {createdDate && <span>Created {createdDate}</span>}
                    {updatedDate && updatedDate !== createdDate && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-foreground-tertiary/50 inline-block flex-shrink-0" />
                        <span>Modified {updatedDate}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
                  </span>
                  <span className="text-xl font-semibold text-foreground-success">Project is running...</span>
                </div>
              </div>

              {/* Right: action cards */}
              <div className="flex flex-col gap-3 flex-shrink-0">
                <div className="flex justify-end">
                  <ProjectMoreMenu project={project} onDuplicate={onDuplicate} onDelete={onDelete} onStop={onStop} onShowFolder={onShowFolder} onOpenVSCode={onOpenVSCode} onRename={startRename} />
                </div>
                <div className="grid grid-cols-3 gap-3 auto-rows-[7rem]">
                  {port && (
                    <a
                      data-testid="btn-open-editor"
                      href={`http://localhost:${port}/protovibe.html`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="col-span-2 flex flex-col items-center justify-center gap-2.5 rounded-2xl bg-background-primary-subtle hover:shadow-md transition-all text-foreground-primary cursor-pointer"
                    >
                      <ExternalLink size={28} strokeWidth={1.5} />
                      <span className="text-xs font-semibold">Open Protovibe editor</span>
                    </a>
                  )}

                  <button
                    data-testid="btn-stop"
                    onClick={() => callAction('stop')}
                    className="flex flex-col items-center justify-center gap-2.5 w-28 rounded-2xl bg-background-destructive-subtle hover:shadow-md transition-all text-foreground-destructive/50 hover:text-foreground-destructive cursor-pointer"
                  >
                    <Square size={28} fill="currentColor" strokeWidth={0} />
                    <span className="text-xs font-semibold">Stop</span>
                  </button>

                  <button
                    onClick={callRestart}
                    className="flex flex-col items-center justify-center gap-2.5 w-28 rounded-2xl bg-background-secondary hover:bg-background-tertiary hover:shadow-md transition-all text-foreground-tertiary hover:text-foreground-default cursor-pointer"
                  >
                    <RotateCcw size={28} strokeWidth={1.5} />
                    <span className="text-xs font-semibold">Restart</span>
                  </button>

                  <button
                    onClick={onShowFolder}
                    className="flex flex-col items-center justify-center gap-2.5 w-28 rounded-2xl bg-background-secondary hover:bg-background-tertiary hover:shadow-md transition-all text-foreground-tertiary hover:text-foreground-default cursor-pointer"
                  >
                    <Folder size={28} strokeWidth={1.5} />
                    <span className="text-xs font-semibold">Show folder</span>
                  </button>

                  <button
                    onClick={onOpenVSCode}
                    className="flex flex-col items-center justify-center gap-2.5 w-28 rounded-2xl bg-background-secondary hover:bg-background-tertiary hover:shadow-md transition-all text-foreground-tertiary hover:text-foreground-default cursor-pointer"
                  >
                    <Code2 size={28} strokeWidth={1.5} />
                    <span className="text-xs font-semibold">VS Code</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Stopped state ── */}
          {isStopped && (
            <div className="flex items-start justify-between gap-6">
              {/* Left: title + status */}
              <div className="flex flex-col gap-3">
                <div>
                  {renderTitle()}
                  <div className="flex items-center gap-2.5 mt-2 text-sm text-foreground-tertiary">
                    {createdDate && <span>Created {createdDate}</span>}
                    {updatedDate && updatedDate !== createdDate && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-foreground-tertiary/50 inline-block flex-shrink-0" />
                        <span>Modified {updatedDate}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-foreground-disabled" />
                  </span>
                  <span className="text-xl font-semibold text-foreground-tertiary">Project is not running</span>
                </div>
              </div>

              {/* Right: action cards */}
              <div className="flex flex-col gap-3 flex-shrink-0">
                <div className="flex justify-end">
                  <ProjectMoreMenu project={project} onDuplicate={onDuplicate} onDelete={onDelete} onStop={onStop} onShowFolder={onShowFolder} onOpenVSCode={onOpenVSCode} onRename={startRename} />
                </div>
                <div className="flex gap-3">
                  <button
                    data-testid="btn-run"
                    onClick={() => setSetupMode(true)}
                    className="flex flex-col items-center justify-center gap-2.5 w-full h-28 rounded-2xl bg-background-primary-subtle hover:shadow-md transition-all text-foreground-primary cursor-pointer"
                  >
                    <Play size={28} fill="currentColor" strokeWidth={0} />
                    <span className="text-xs font-semibold">Run project</span>
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={onShowFolder}
                    className="flex flex-col items-center justify-center gap-2.5 w-28 h-28 rounded-2xl bg-background-secondary hover:bg-background-tertiary hover:shadow-md transition-all text-foreground-tertiary hover:text-foreground-default cursor-pointer"
                  >
                    <Folder size={28} strokeWidth={1.5} />
                    <span className="text-xs font-semibold">Show folder</span>
                  </button>

                  <button
                    onClick={onOpenVSCode}
                    className="flex flex-col items-center justify-center gap-2.5 w-28 h-28 rounded-2xl bg-background-secondary hover:bg-background-tertiary hover:shadow-md transition-all text-foreground-tertiary hover:text-foreground-default cursor-pointer"
                  >
                    <Code2 size={28} strokeWidth={1.5} />
                    <span className="text-xs font-semibold">VS Code</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Logs toggle */}
          <button
            onClick={() => setShowLogs((v) => !v)}
            className="flex items-center gap-2 text-sm text-foreground-tertiary hover:text-foreground-secondary transition-colors cursor-pointer w-fit"
          >
            <List size={14} />
            {showLogs ? 'Hide logs' : 'Show logs'}
            <ChevronDown size={10} className={`transition-transform duration-200 ${showLogs ? 'rotate-180' : ''}`} />
          </button>
        </div>
        )}

        {!setupMode && (
        <>
        {/* Card footer: logs label */}
        {showLogs && (
        <div className="border-t border-border-default px-8 py-3.5 flex items-center justify-between">
          <span className="text-sm text-foreground-tertiary">Project logs</span>
          <button
            onClick={() => setLines([])}
            className="text-xs text-foreground-tertiary hover:text-foreground-secondary transition-colors cursor-pointer"
          >
            Clear
          </button>
        </div>
        )}

        {/* Logs panel */}
        {showLogs && (
          <div className="px-8 pb-8">
            <div className="h-72 overflow-y-auto rounded-xl bg-background-tertiary border border-border-default p-4 font-mono text-xs">
              {lines.length === 0 ? (
                <p className="text-foreground-tertiary italic">Waiting for output...</p>
              ) : (
                lines.map((line, i) => (
                  <p
                    key={i}
                    data-separator={line.startsWith('---')}
                    className="text-foreground-secondary leading-relaxed whitespace-pre-wrap break-all data-[separator=true]:text-foreground-tertiary data-[separator=true]:mt-2 data-[separator=true]:mb-1"
                  >
                    {line}
                  </p>
                ))
              )}
              <div ref={bottomRef} />
            </div>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  )
}
