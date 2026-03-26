import { useState, useEffect, useRef } from 'react'

const STATUS_LABELS = {
  running: 'Running',
  stopped: 'Stopped',
  installing: 'Installing',
  starting: 'Starting',
}

export default function ProjectPage({ project, onBack, onSetup }) {
  const [lines, setLines] = useState([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState('')
  const [showLogs, setShowLogs] = useState(false)
  const bottomRef = useRef(null)

  const { id, name, status, port } = project
  const isRunning = status === 'running'
  const isStopped = status === 'stopped'
  const isBusy = status === 'installing' || status === 'starting'

  // SSE for logs
  useEffect(() => {
    const es = new EventSource(`/api/projects/${id}/logs`)
    es.onopen = () => setConnected(true)
    es.onmessage = (e) => setLines((prev) => [...prev, e.data])
    es.onerror = () => {
      setConnected(false)
      es.close()
    }
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

  const createdDate = project.createdAt
    ? new Date(project.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen bg-background-default">
      {/* Header */}
      <header className="border-b border-border-default bg-background-elevated shrink-0">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-secondary hover:text-foreground-default hover:bg-background-secondary transition-colors shrink-0"
            title="Back to projects"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M10 3L5 8l5 5"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className="flex items-center gap-3 min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-foreground-default truncate">{name}</h1>
            <span
              data-status={status}
              className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium
                data-[status=running]:bg-background-success-subtle data-[status=running]:text-foreground-success
                data-[status=stopped]:bg-background-secondary data-[status=stopped]:text-foreground-tertiary
                data-[status=installing]:bg-background-warning-subtle data-[status=installing]:text-foreground-warning
                data-[status=starting]:bg-background-info-subtle data-[status=starting]:text-foreground-info"
            >
              {STATUS_LABELS[status] ?? status}
            </span>
          </div>

          {createdDate && (
            <p className="text-xs text-foreground-tertiary shrink-0">{createdDate}</p>
          )}
        </div>
      </header>

      {/* Actions bar */}
      <div className="border-b border-border-default bg-background-elevated shrink-0">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-3 flex-wrap">
          {!isRunning ? (
            <button
              onClick={onSetup}
              disabled={isBusy}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium bg-background-primary-subtle text-foreground-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3.5 2.5l8 4.5-8 4.5V2.5z" fill="currentColor" />
              </svg>
              Start
            </button>
          ) : (
            <button
              onClick={() => callAction('stop')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium bg-background-secondary text-foreground-secondary hover:bg-background-tertiary transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="3" y="3" width="8" height="8" rx="1" fill="currentColor" />
              </svg>
              Stop
            </button>
          )}

          {isRunning && port && (
            <a
              href={`http://localhost:${port}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium bg-background-success-subtle text-foreground-success hover:bg-background-success-subtle/80 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M7 1.5h3.5V5M10.5 1.5L5.5 6.5M4.5 2.5H2v8h8V7.5"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              localhost:{port}
            </a>
          )}

          <div className="ml-auto flex items-center gap-2">
            {showLogs && (
              <button
                onClick={() => setLines([])}
                className="text-xs text-foreground-tertiary hover:text-foreground-secondary transition-colors px-2.5 py-1.5 rounded-lg hover:bg-background-secondary"
              >
                Clear
              </button>
            )}
            <span
              data-connected={connected}
              className="text-xs px-2 py-0.5 rounded-full
                data-[connected=true]:bg-background-success-subtle data-[connected=true]:text-foreground-success
                data-[connected=false]:bg-background-secondary data-[connected=false]:text-foreground-tertiary"
            >
              {connected ? 'live' : 'disconnected'}
            </span>
            <button
              onClick={() => setShowLogs((v) => !v)}
              className="text-xs text-foreground-tertiary hover:text-foreground-secondary transition-colors px-2.5 py-1.5 rounded-lg hover:bg-background-secondary"
            >
              {showLogs ? 'Hide logs' : 'Show logs'}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-5xl mx-auto px-6 pt-4 w-full">
          <div className="flex items-center gap-3 rounded-xl bg-background-destructive-subtle border border-border-destructive px-4 py-3">
            <p className="text-sm text-foreground-destructive flex-1">{error}</p>
            <button
              onClick={() => setError('')}
              className="text-foreground-destructive hover:text-foreground-default transition-colors shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M2 2l10 10M12 2L2 12"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Logs */}
      {showLogs && (
        <div className="max-w-5xl mx-auto w-full px-6 py-4">
          <div className="h-80 overflow-y-auto rounded-xl bg-background-tertiary border border-border-default p-4 font-mono text-xs">
            {lines.length === 0 ? (
              <p className="text-foreground-tertiary italic">Waiting for output...</p>
            ) : (
              lines.map((line, i) => (
                <p
                  key={i}
                  data-separator={line.startsWith('---')}
                  className="text-foreground-secondary leading-relaxed whitespace-pre-wrap break-all
                    data-[separator=true]:text-foreground-tertiary data-[separator=true]:mt-2 data-[separator=true]:mb-1"
                >
                  {line}
                </p>
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      )}
    </div>
  )
}
