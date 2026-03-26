import { useState, useEffect, useRef } from 'react'

const FUNNY_MESSAGES = {
  installing: [
    'Summoning node_modules from the void...',
    'Downloading the internet (just the good parts)...',
    'Teaching dependencies to get along...',
    'Negotiating with npm... this could take a while...',
    'Counting every single package...',
    'Making sure left-pad is included...',
    'Alphabetizing the electrons...',
  ],
  starting: [
    'Warming up the engines...',
    'Convincing Vite to cooperate...',
    'Almost there, pinky promise...',
    'Lighting the fuse...',
    'Polishing the pixels...',
  ],
}

const STAGE_LABELS = {
  installing: 'Installing dependencies',
  starting: 'Starting dev server',
  ready: 'Ready!',
  error: 'Something went wrong',
}

function Spinner() {
  return (
    <div className="w-12 h-12 rounded-full border-4 border-border-default border-t-primary animate-spin" />
  )
}

export default function SetupScreen({ projectId, projectName, onBack }) {
  const [stage, setStage] = useState('installing')
  const [funnyIndex, setFunnyIndex] = useState(0)
  const [logs, setLogs] = useState([])
  const [error, setError] = useState('')
  const [showLogs, setShowLogs] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [countdown, setCountdown] = useState(null)
  const redirectUrlRef = useRef(null)
  const bottomRef = useRef(null)
  const esRef = useRef(null)

  const handleCancel = async () => {
    setCancelling(true)
    esRef.current?.close()
    try {
      await fetch(`/api/projects/${projectId}/stop`, { method: 'POST' })
    } catch {}
    onBack()
  }

  // Rotate funny messages
  useEffect(() => {
    if (stage === 'error' || stage === 'ready') return
    const interval = setInterval(() => {
      setFunnyIndex((i) => i + 1)
    }, 3000)
    return () => clearInterval(interval)
  }, [stage])

  // SSE connection to setup endpoint
  useEffect(() => {
    const es = new EventSource(`/api/projects/${projectId}/setup`)
    esRef.current = es

    es.addEventListener('stage', (e) => {
      const data = JSON.parse(e.data)
      setStage(data.stage)
      setFunnyIndex(0)
    })

    es.addEventListener('log', (e) => {
      const data = JSON.parse(e.data)
      setLogs((prev) => [...prev, data.text])
    })

    es.addEventListener('ready', (e) => {
      const { port } = JSON.parse(e.data)
      es.close()
      redirectUrlRef.current = `http://localhost:${port}`
      setStage('ready')
      setCountdown(3)
    })

    es.addEventListener('fail', (e) => {
      const data = JSON.parse(e.data)
      setError(data.message || 'Unknown error')
      setStage('error')
      es.close()
    })

    es.onerror = () => {
      es.close()
      setError('Connection to server lost')
      setStage('error')
    }

    return () => es.close()
  }, [projectId])

  // Countdown then redirect
  useEffect(() => {
    if (countdown === null) return
    if (countdown === 0) {
      window.location.href = redirectUrlRef.current
      return
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  // Auto-scroll logs
  useEffect(() => {
    if (showLogs) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, showLogs])

  const messages = FUNNY_MESSAGES[stage] || []
  const funnyText = messages.length > 0 ? messages[funnyIndex % messages.length] : ''

  return (
    <div className="fixed inset-0 z-50 bg-background-default flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-6 max-w-md w-full">
        {/* Spinner / ready / error icon */}
        {stage === 'ready' ? (
          <div className="relative w-12 h-12">
            <div className="w-12 h-12 rounded-full bg-background-success-subtle flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M6 12l4 4 8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground-success" />
              </svg>
            </div>
          </div>
        ) : stage === 'error' ? (
          <div className="w-12 h-12 rounded-full bg-background-destructive-subtle flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-foreground-destructive" />
            </svg>
          </div>
        ) : (
          <Spinner />
        )}

        {/* Project name */}
        <h2 className="text-lg font-semibold text-foreground-default">{projectName}</h2>

        {/* Stage label */}
        <p className="text-sm font-medium text-foreground-secondary">{STAGE_LABELS[stage]}</p>

        {/* Funny message or countdown */}
        {stage === 'ready' && countdown !== null ? (
          <p className="text-xs text-foreground-tertiary text-center">
            Opening in {countdown}…
          </p>
        ) : funnyText ? (
          <p className="text-xs text-foreground-tertiary text-center animate-pulse">{funnyText}</p>
        ) : null}

        {/* Error message */}
        {stage === 'error' && error && (
          <div className="w-full rounded-xl bg-background-destructive-subtle border border-border-destructive p-4">
            <p className="text-sm text-foreground-destructive">{error}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3 mt-2">
          {stage === 'error' ? (
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary-hover text-primary-foreground transition-colors"
            >
              Back to projects
            </button>
          ) : stage !== 'ready' && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="px-4 py-2 rounded-lg text-sm font-medium text-foreground-secondary hover:text-foreground-default hover:bg-background-secondary transition-colors disabled:opacity-50"
            >
              {cancelling ? 'Cancelling...' : 'Cancel'}
            </button>
          )}
          <button
            onClick={() => setShowLogs((v) => !v)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-foreground-secondary hover:text-foreground-default hover:bg-background-secondary transition-colors"
          >
            {showLogs ? 'Hide logs' : 'Show logs'}
          </button>
        </div>
      </div>

      {/* Collapsible log area */}
      {showLogs && (
        <div className="mt-6 w-full max-w-2xl max-h-64 overflow-y-auto rounded-xl bg-background-tertiary border border-border-default p-4 font-mono text-xs">
          {logs.length === 0 ? (
            <p className="text-foreground-tertiary italic">Waiting for output...</p>
          ) : (
            logs.map((line, i) => (
              <p key={i} className="text-foreground-secondary leading-relaxed whitespace-pre-wrap break-all">
                {line}
              </p>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}
