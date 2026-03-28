import { useState, useEffect, useRef } from 'react'
import SetupScreen from './SetupScreen.jsx'

export default function ProjectPage({ project, onBack, onSetup }) {
  const [lines, setLines] = useState([])
  const [error, setError] = useState('')
  const [showLogs, setShowLogs] = useState(false)
  const [setupMode, setSetupMode] = useState(false)
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

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-6">
      {/* Breadcrumb */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-foreground-tertiary hover:text-foreground-default transition-colors w-fit cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M8.5 2.5L4 7l4.5 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Projects
      </button>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-background-destructive-subtle border border-border-destructive px-4 py-3">
          <p className="text-sm text-foreground-destructive flex-1">{error}</p>
          <button
            onClick={() => setError('')}
            className="text-foreground-destructive hover:text-foreground-default transition-colors shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
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
          />
        ) : (
        <div className="p-8 flex flex-col gap-10">

          {/* Project title + dates — shown when busy (no left/right split) */}
          {isBusy && (
            <div>
              <h1 className="text-3xl font-bold text-foreground-default tracking-tight leading-tight">{name}</h1>
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
          )}

          {/* ── Running state ── */}
          {isRunning && (
            <div className="flex items-start justify-between gap-6">
              {/* Left: title + status */}
              <div className="flex flex-col gap-3">
                <div>
                  <h1 className="text-3xl font-bold text-foreground-default tracking-tight leading-tight">{name}</h1>
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
              <div className="flex gap-3 flex-shrink-0">
                {port && (
                  <a
                    href={`http://localhost:${port}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col items-center justify-center gap-2.5 w-28 h-28 rounded-2xl bg-background-primary-subtle hover:shadow-md transition-all relative overflow-hidden text-foreground-primary/50 hover:text-foreground-primary transition-colors cursor-pointer"
                  >
                    <svg width="28" height="28" viewBox="0 0 19 19" fill="none">
                      <path d="M8.5 3.5H4a1.5 1.5 0 00-1.5 1.5v10A1.5 1.5 0 004 16.5h10A1.5 1.5 0 0015.5 15v-4.5M12 2.5h4.5V7M16 3L9 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-xs font-semibold text-center">Open app</span>
                  </a>
                )}

                <button
                  onClick={callRestart}
                  className="group flex flex-col items-center justify-center gap-2.5 w-28 h-28 rounded-2xl bg-background-secondary hover:bg-background-tertiary hover:shadow-md transition-all relative overflow-hidden text-foreground-tertiary hover:text-foreground-default transition-colors cursor-pointer"
                >
                  <svg width="28" height="28" viewBox="0 0 19 19" fill="none">
                    <path d="M3 9.5a6.5 6.5 0 1 0 1.5-4.15M3 4v3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-xs font-semibold">Restart</span>
                </button>

                <button
                  onClick={() => callAction('stop')}
                  className="group flex flex-col items-center justify-center gap-2.5 w-28 h-28 rounded-2xl bg-background-destructive-subtle hover:shadow-md transition-all relative overflow-hidden text-foreground-destructive/50 hover:text-foreground-destructive transition-colors cursor-pointer"
                >
                  <svg width="28" height="28" viewBox="0 0 19 19" fill="none">
                    <rect x="5" y="5" width="9" height="9" rx="2" fill="currentColor" />
                  </svg>
                  <span className="text-xs font-semibold">Stop</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Stopped state ── */}
          {isStopped && (
            <div className="flex items-start justify-between gap-6">
              {/* Left: title + status */}
              <div className="flex flex-col gap-3">
                <div>
                  <h1 className="text-3xl font-bold text-foreground-default tracking-tight leading-tight">{name}</h1>
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

              {/* Right: run button as card */}
              <button
                onClick={() => setSetupMode(true)}
                className="flex flex-col items-center justify-center gap-2.5 w-28 h-28 rounded-2xl bg-background-primary-subtle hover:shadow-md transition-all text-foreground-primary/50 hover:text-foreground-primary transition-colors flex-shrink-0 cursor-pointer"
              >
                <svg width="28" height="28" viewBox="0 0 19 19" fill="none">
                  <path d="M5 3.5l11 6-11 6V3.5z" fill="currentColor" />
                </svg>
                <span className="text-xs font-semibold">Run project</span>
              </button>
            </div>
          )}

        </div>
        )}

        {!setupMode && (
        <>
        {/* Card footer: logs toggle */}
        <div className="border-t border-border-default px-8 py-3.5 flex items-center justify-between">
          <button
            onClick={() => setShowLogs((v) => !v)}
            className="flex items-center gap-2 text-sm text-foreground-tertiary hover:text-foreground-secondary transition-colors cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 3.5h10M2 7h6M2 10.5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {showLogs ? 'Hide logs' : 'Show logs'}
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              className={`transition-transform duration-200 ${showLogs ? 'rotate-180' : ''}`}
            >
              <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
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
