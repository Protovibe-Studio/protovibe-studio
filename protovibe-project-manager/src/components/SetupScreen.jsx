import { useState, useEffect, useRef } from 'react'
import { Check, X } from 'lucide-react'

const FUNNY_MESSAGES = {
  creating: [
    'Copying template files...',
    'Laying the foundations...',
    'Carving out a new playground...',
  ],
  duplicating: [
    'Cloning your project...',
    'Making a photocopy of the template...',
    'Duplicating bits and bytes...',
  ],
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
  creating: 'Creating project',
  duplicating: 'Duplicating project',
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

export default function SetupScreen({ projectId, projectName, onBack, onReady, inline = false, initialStage = 'installing' }) {
  const [stage, setStage] = useState(initialStage)
  const [funnyIndex, setFunnyIndex] = useState(0)
  const [logs, setLogs] = useState([])
  const [error, setError] = useState('')
  const [showLogs, setShowLogs] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const bottomRef = useRef(null)
  const esRef = useRef(null)

  const handleCancel = async () => {
    setCancelling(true)
    esRef.current?.close()
    if (projectId) {
      try {
        await fetch(`/api/projects/${projectId}/stop`, { method: 'POST' })
      } catch {}
    }
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

  // Sync stage with initialStage while projectId is not yet available
  useEffect(() => {
    if (!projectId) setStage(initialStage)
  }, [initialStage, projectId])

  // SSE connection to setup endpoint
  useEffect(() => {
    if (!projectId) return
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

    es.addEventListener('ready', () => {
      es.close()
      setStage('ready')
      onReady && onReady()
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

// Auto-scroll logs
  useEffect(() => {
    if (showLogs) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, showLogs])

  const messages = FUNNY_MESSAGES[stage] || []
  const funnyText = messages.length > 0 ? messages[funnyIndex % messages.length] : ''

  return (
    <div className={inline ? 'flex flex-col items-center gap-6 py-6' : 'fixed inset-0 z-50 bg-background-default flex flex-col items-center justify-center p-6'}>
      <div className="flex flex-col items-center gap-6 max-w-md w-full">
        {/* Spinner / ready / error icon */}
        {stage === 'ready' ? (
          <div className="relative w-12 h-12">
            <div className="w-12 h-12 rounded-full bg-background-success-subtle flex items-center justify-center text-foreground-success">
              <Check size={24} strokeWidth={2.5} />
            </div>
          </div>
        ) : stage === 'error' ? (
          <div className="w-12 h-12 rounded-full bg-background-destructive-subtle flex items-center justify-center text-foreground-destructive">
            <X size={24} strokeWidth={2.5} />
          </div>
        ) : (
          <Spinner />
        )}

        {/* Project name */}
        <h2 className="text-lg font-semibold text-foreground-default">{projectName}</h2>

        {/* Stage label */}
        <p className="text-sm font-medium text-foreground-secondary">{STAGE_LABELS[stage]}</p>

        {/* Funny message */}
        {funnyText ? (
          <p className="text-xs text-foreground-tertiary text-center animate-pulse">{funnyText}</p>
        ) : null}

        {/* Error message */}
        {stage === 'error' && error && (
          <div className="w-full rounded-xl bg-background-destructive-subtle border border-border-destructive p-4">
            <p className="text-sm text-foreground-destructive">{error}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col items-center gap-2 mt-2">
          <button
            onClick={() => setShowLogs((v) => !v)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-foreground-secondary hover:text-foreground-default hover:bg-background-secondary transition-colors cursor-pointer border border-border-default"
          >
            {showLogs ? 'Hide logs' : 'Show logs'}
          </button>
          {stage === 'error' ? (
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-lg text-sm font-medium text-foreground-on-primary bg-primary hover:bg-primary-hover transition-colors cursor-pointer"
            >
              Back to projects
            </button>
          ) : stage !== 'ready' && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="px-4 py-2 rounded-lg text-sm font-medium text-foreground-secondary hover:text-foreground-default hover:bg-background-secondary transition-colors disabled:opacity-50 cursor-pointer"
            >
              {cancelling ? 'Cancelling...' : 'Cancel'}
            </button>
          )}
        </div>
      </div>

      {/* Collapsible log area */}
      {showLogs && (
        <div className={`mt-2 w-full max-h-64 overflow-y-auto rounded-xl bg-background-tertiary border border-border-default p-4 font-mono text-xs ${inline ? '' : 'max-w-2xl'}`}>
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
