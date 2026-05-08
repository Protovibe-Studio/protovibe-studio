import { useState, useEffect, useRef } from 'react'
import SetupScreen from './SetupScreen.jsx'
import ProjectMoreMenu from './ProjectMoreMenu.jsx'
import PathDisplay from './PathDisplay.jsx'
import { showToast } from './ToastViewport.jsx'
import {
  ArrowLeft,
  X,
  ExternalLink,
  Square,
  RotateCcw,
  Folder,
  Code2,
  Play,
  ChevronDown,
  RefreshCw,
} from 'lucide-react'

export default function ProjectPage({ project, onBack, onSetup, onShowFolder, onOpenVSCode, onDuplicate, onDelete, onStop, onRenamed }) {
  const [lines, setLines] = useState([])
  const [error, setError] = useState('')
  const [showLogs, setShowLogs] = useState(false)
  const [setupMode, setSetupMode] = useState(false)
  const [awaitingRunning, setAwaitingRunning] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [restartAfterStop, setRestartAfterStop] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [updatingPlugin, setUpdatingPlugin] = useState(false)
  const bottomRef = useRef(null)

  const { id, name, status, port, pluginVersion, pluginLastUpdated } = project
  const isRunning = status === 'running'
  const isStopped = status === 'stopped'
  // isBusy is the trigger for SetupScreen, so 'updating-plugin' deliberately
  // stays out of it — we render an inline indicator instead of hijacking the
  // page with the setup overlay.
  const isBusy = status === 'installing' || status === 'starting'
  const isUpdatingPluginServer = status === 'updating-plugin'
  const isUpdating = updatingPlugin || isUpdatingPluginServer

  // Auto-enter setup mode when project is busy (e.g. navigated to mid-start)
  useEffect(() => {
    if (isBusy) setSetupMode(true)
  }, [isBusy])

  // Once ready was signalled, wait for polling to confirm running before dismissing setup
  useEffect(() => {
    if (awaitingRunning && isRunning) {
      setAwaitingRunning(false)
      setSetupMode(false)
    }
  }, [awaitingRunning, isRunning])

  // Clear stopping spinner once polling confirms stopped; enter setup if restarting
  useEffect(() => {
    if (stopping && isStopped) {
      setStopping(false)
      if (restartAfterStop) {
        setRestartAfterStop(false)
        setSetupMode(true)
      }
    }
  }, [stopping, isStopped, restartAfterStop])

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

  const callStop = async () => {
    setError('')
    setStopping(true)
    try {
      const res = await fetch(`/api/projects/${id}/stop`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to stop.')
        setStopping(false)
      }
    } catch {
      setError('Network error. Make sure the dev server is running.')
      setStopping(false)
    }
  }

  const callRestart = async () => {
    setError('')
    setStopping(true)
    setRestartAfterStop(true)
    try {
      const res = await fetch(`/api/projects/${id}/stop`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to stop.')
        setStopping(false)
        setRestartAfterStop(false)
      }
    } catch {
      setError('Network error. Make sure the dev server is running.')
      setStopping(false)
      setRestartAfterStop(false)
    }
  }

  // pluginLastUpdated is stored as YYYY-MM-DD (no timezone). Reformat to the
  // same human-friendly style as the other dates without sliding by a day.
  const pluginUpdatedDate = (() => {
    if (!pluginLastUpdated) return null
    const [y, m, d] = pluginLastUpdated.split('-').map(Number)
    if (!y || !m || !d) return pluginLastUpdated
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  })()

  const handleUpdatePlugin = async () => {
    if (updatingPlugin) return
    if (isBusy) {
      setError('Wait for setup to finish before updating the plugin.')
      return
    }
    setError('')
    setUpdatingPlugin(true)
    try {
      const res = await fetch(`/api/projects/${id}/update-plugin`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Failed to update plugin.')
        showToast('Plugin update failed', 'error')
      } else {
        const v = data.pluginVersion ? ` v${data.pluginVersion}` : ''
        showToast(`Plugin${v} synced from template`, 'success')
        onRenamed && onRenamed()
      }
    } catch {
      setError('Network error. Make sure the dev server is running.')
      showToast('Plugin update failed', 'error')
    } finally {
      setUpdatingPlugin(false)
    }
  }

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
      className="text-lg font-semibold text-foreground-default bg-background-secondary border border-border-focus rounded px-2 -mx-2 outline-none w-full"
    />
  ) : (
    <h1
      onDoubleClick={startRename}
      title="Double-click to rename"
      className="text-lg font-semibold text-foreground-default cursor-text"
    >
      {name}
    </h1>
  )

  return (
    <div className="max-w-[700px] mx-auto px-6 py-8 flex flex-col gap-6">
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

        {/* ── Card header — always visible ── */}
        <div className="px-7 py-5 flex items-center justify-between gap-4 border-b border-border-default">
            <div className="min-w-0">
              {renderTitle()}
              {project.path && (
                <PathDisplay
                  path={project.path}
                  className="block mt-1 text-xs text-foreground-tertiary truncate"
                />
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Status pill */}
              {isRunning && !stopping && (
                <button
                  onClick={callStop}
                  className="group/stop px-2.5 py-1 rounded-full text-xs font-medium bg-background-success-subtle text-foreground-success hover:bg-background-destructive-subtle hover:text-foreground-destructive transition-colors cursor-pointer"
                >
                  <span className="flex items-center justify-center gap-1.5" style={{ minWidth: '3.5rem' }}>
                    <span className="relative flex h-2 w-2 group-hover/stop:hidden shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                    </span>
                    <Square size={8} fill="currentColor" strokeWidth={0} className="hidden group-hover/stop:block shrink-0" />
                    <span className="group-hover/stop:hidden">Running</span>
                    <span className="hidden group-hover/stop:inline">Stop</span>
                  </span>
                </button>
              )}
              {stopping && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-foreground-tertiary">
                  <span className="w-3 h-3 rounded-full border-2 border-border-default border-t-foreground-tertiary animate-spin inline-block" />
                  Stopping
                </span>
              )}
              {!stopping && isStopped && !setupMode && (
                <button
                  onClick={() => setSetupMode(true)}
                  disabled={isUpdating}
                  className="group/run px-2.5 py-1 rounded-full text-xs font-medium text-foreground-tertiary hover:bg-background-primary-subtle hover:text-foreground-primary transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="flex items-center justify-center gap-1.5" style={{ minWidth: '4.5rem' }}>
                    <span className="inline-block h-2 w-2 rounded-full bg-foreground-disabled group-hover/run:hidden shrink-0" />
                    <Play size={8} fill="currentColor" strokeWidth={0} className="hidden group-hover/run:block shrink-0" />
                    <span className="group-hover/run:hidden">Not running</span>
                    <span className="hidden group-hover/run:inline">Run project</span>
                  </span>
                </button>
              )}
              {isUpdatingPluginServer && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-foreground-info">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-foreground-info opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-foreground-info" />
                  </span>
                  Updating plugin
                </span>
              )}
              {isBusy && (
                <span className="text-xs font-medium text-foreground-secondary">
                  {status === 'installing' ? 'Installing...' : 'Starting...'}
                </span>
              )}
              {!isBusy && !stopping && isStopped && setupMode && (
                <span className="text-xs font-medium text-foreground-secondary">
                  Starting...
                </span>
              )}
              <ProjectMoreMenu project={project} onDuplicate={onDuplicate} onDelete={onDelete} onStop={onStop} onShowFolder={onShowFolder} onOpenVSCode={onOpenVSCode} onRename={startRename} />
            </div>
        </div>

        {/* ── Card body ── */}
        {setupMode ? (
          <div className="min-h-64">
            <SetupScreen
              inline
              hideName
              projectId={id}
              projectName={name}
              onBack={() => setSetupMode(false)}
              onReady={() => setAwaitingRunning(true)}
            />
          </div>
        ) : stopping ? (
          <div className="min-h-64 flex items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full border-[3px] border-border-default border-t-primary animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col">

            {/* Action buttons */}
            <div className="flex flex-col gap-2.5 p-7">
            {isRunning && (
              <>
                {port && (
                  <a
                    data-testid="btn-open-editor"
                    href={`http://localhost:${port}/protovibe.html`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 w-full px-5 py-4 rounded-xl bg-primary text-foreground-on-primary text-sm font-semibold hover:bg-primary-hover hover:shadow-sm transition-all cursor-pointer"
                  >
                    <ExternalLink size={18} strokeWidth={1.75} className="shrink-0" />
                    Open Protovibe editor
                  </a>
                )}
                <button
                  data-testid="btn-stop"
                  onClick={callStop}
                  className="flex items-center gap-4 w-full px-5 py-4 rounded-xl bg-background-secondary text-foreground-secondary text-sm font-semibold hover:bg-background-tertiary hover:shadow-sm transition-all cursor-pointer"
                >
                  <Square size={18} fill="currentColor" strokeWidth={0} className="shrink-0" />
                  Stop
                </button>
                <button
                  onClick={callRestart}
                  disabled={isUpdating}
                  className="flex items-center gap-4 w-full px-5 py-4 rounded-xl bg-background-secondary text-foreground-secondary text-sm font-semibold hover:bg-background-tertiary hover:shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RotateCcw size={18} strokeWidth={1.75} className="shrink-0" />
                  Restart
                </button>
                <button
                  onClick={onShowFolder}
                  className="flex items-center gap-4 w-full px-5 py-4 rounded-xl bg-background-secondary text-foreground-secondary text-sm font-semibold hover:bg-background-tertiary hover:shadow-sm transition-all cursor-pointer"
                >
                  <Folder size={18} strokeWidth={1.75} className="shrink-0" />
                  Show in Finder
                </button>
                <button
                  onClick={onOpenVSCode}
                  className="flex items-center gap-4 w-full px-5 py-4 rounded-xl bg-background-secondary text-foreground-secondary text-sm font-semibold hover:bg-background-tertiary hover:shadow-sm transition-all cursor-pointer"
                >
                  <Code2 size={18} strokeWidth={1.75} className="shrink-0" />
                  Open in VS Code
                </button>
              </>
            )}

            {(isStopped || isUpdatingPluginServer) && (
              <>
                <button
                  data-testid="btn-run"
                  onClick={() => setSetupMode(true)}
                  disabled={isUpdating}
                  className="flex items-center gap-4 w-full px-5 py-4 rounded-xl bg-background-primary-subtle text-foreground-primary text-sm font-semibold hover:shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Play size={18} fill="currentColor" strokeWidth={0} className="shrink-0" />
                  Run project
                </button>
                <button
                  onClick={onShowFolder}
                  className="flex items-center gap-4 w-full px-5 py-4 rounded-xl bg-background-secondary text-foreground-secondary text-sm font-semibold hover:bg-background-tertiary hover:shadow-sm transition-all cursor-pointer"
                >
                  <Folder size={18} strokeWidth={1.75} className="shrink-0" />
                  Show in Finder
                </button>
                <button
                  onClick={onOpenVSCode}
                  className="flex items-center gap-4 w-full px-5 py-4 rounded-xl bg-background-secondary text-foreground-secondary text-sm font-semibold hover:bg-background-tertiary hover:shadow-sm transition-all cursor-pointer"
                >
                  <Code2 size={18} strokeWidth={1.75} className="shrink-0" />
                  Open in VS Code
                </button>
              </>
            )}
            </div>

            {/* Plugin section */}
            {!isBusy && (
              <div className="flex items-center justify-between gap-4 px-7 py-5">
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-foreground-secondary">
                    Protovibe plugin{pluginVersion ? ` · v${pluginVersion}` : ''}
                  </span>
                  <span className="text-xs text-foreground-tertiary truncate">
                    {pluginUpdatedDate ? `Updated ${pluginUpdatedDate}` : 'Never updated in this project'}
                  </span>
                </div>
                <button
                  data-testid="btn-update-plugin"
                  onClick={handleUpdatePlugin}
                  disabled={isUpdating || isBusy}
                  title="Sync plugin source from protovibe-project-template"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-foreground-secondary bg-background-elevated hover:bg-background-tertiary border border-border-default transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  <RefreshCw size={12} className={isUpdating ? 'animate-spin' : ''} />
                  {isUpdating ? 'Updating…' : 'Update plugin'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Card footer: logs ── */}
        {!setupMode && !stopping && (
          <>
            <div className="border-t border-border-default px-7 py-4 flex items-center justify-between">
              <button
                onClick={() => setShowLogs((v) => !v)}
                className="flex items-center gap-1.5 text-sm text-foreground-tertiary hover:text-foreground-secondary transition-colors cursor-pointer"
              >
                {showLogs ? 'Hide logs' : 'Show logs'}
                <ChevronDown size={10} className={`transition-transform duration-200 ${showLogs ? 'rotate-180' : ''}`} />
              </button>
              {showLogs && (
                <button
                  onClick={() => setLines([])}
                  className="text-xs text-foreground-tertiary hover:text-foreground-secondary transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            {showLogs && (
              <div className="px-7 pb-7">
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
