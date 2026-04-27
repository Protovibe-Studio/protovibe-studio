import { useEffect, useRef, useState } from 'react'
import { X, Loader2, CheckCircle2, AlertCircle, RotateCw } from 'lucide-react'

export default function UpdateAppModal({ onClose }) {
  const [logs, setLogs] = useState([])
  const [status, setStatus] = useState('running') // running | restarting | restarted | done | failed
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const logRef = useRef(null)
  const restartPollRef = useRef(null)
  // Guard against React StrictMode double-mounting in dev — without it, the
  // second mount POSTs again and gets "Update already in progress" back.
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const pollUntilRestarted = () => {
      restartPollRef.current = setInterval(async () => {
        try {
          const res = await fetch('/api/version', { cache: 'no-store' })
          if (res.ok) {
            clearInterval(restartPollRef.current)
            setStatus('restarted')
          }
        } catch {}
      }, 1000)
    }

    const run = async () => {
      try {
        const res = await fetch('/api/update-app', { method: 'POST' })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setError(data.error || `Request failed (${res.status})`)
          setStatus('failed')
          return
        }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const events = buf.split('\n\n')
          buf = events.pop() ?? ''
          for (const ev of events) {
            const lines = ev.split('\n')
            const evType = lines.find((l) => l.startsWith('event: '))?.slice(7).trim()
            const dataLine = lines.find((l) => l.startsWith('data: '))?.slice(6)
            if (!evType || !dataLine) continue
            let data
            try { data = JSON.parse(dataLine) } catch { continue }
            if (evType === 'log') setLogs((l) => [...l, data.text])
            else if (evType === 'fail') { setError(data.message || 'Update failed'); setStatus('failed') }
            else if (evType === 'done') {
              setResult(data)
              if (data.restartScheduled) {
                setStatus('restarting')
                pollUntilRestarted()
              } else {
                setStatus('done')
              }
            }
          }
        }
      } catch (e) {
        // Manager-restart drops the connection mid-stream; that's expected.
        setStatus((prev) => (prev === 'restarting' || prev === 'restarted' ? prev : 'failed'))
        setError((prevErr) => prevErr || e.message || 'Connection lost')
      }
    }
    run()

    return () => {
      if (restartPollRef.current) clearInterval(restartPollRef.current)
    }
  }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  const closable = status === 'done' || status === 'failed' || status === 'restarted'

  return (
    <div
      className="fixed inset-0 bg-background-overlay z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget && closable) onClose() }}
    >
      <div className="bg-background-elevated border border-border-default rounded-2xl shadow-xl w-full max-w-xl flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground-default">
            {status === 'running' && 'Downloading update…'}
            {status === 'restarting' && 'Restarting Protovibe…'}
            {(status === 'done' || status === 'restarted') && 'Update complete'}
            {status === 'failed' && 'Update failed'}
          </h2>
          <button
            onClick={onClose}
            disabled={!closable}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-foreground-tertiary hover:text-foreground-default hover:bg-background-secondary transition-colors disabled:opacity-40 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        <div
          ref={logRef}
          className="bg-background-secondary border border-border-default rounded-lg p-3 h-64 overflow-y-auto font-mono text-[11px] text-foreground-secondary"
        >
          {logs.length === 0 ? (
            <p className="text-foreground-tertiary">Connecting to updater…</p>
          ) : (
            logs.map((line, i) => <div key={i} className="whitespace-pre-wrap break-all">{line}</div>)
          )}
        </div>

        {status === 'running' && (
          <div className="flex items-center gap-2 text-sm text-foreground-secondary">
            <Loader2 size={14} className="animate-spin" />
            Downloading and installing latest version…
          </div>
        )}

        {status === 'restarting' && (
          <div className="flex items-center gap-2 text-sm text-foreground-secondary">
            <Loader2 size={14} className="animate-spin" />
            Project manager updated — restarting the dev server…
          </div>
        )}

        {(status === 'done' || status === 'restarted') && result && (
          <div className="flex items-start gap-2 text-sm text-foreground-default">
            <CheckCircle2 size={16} className="text-foreground-success shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              {result.managerUpdated && <span>Project manager updated to <span className="font-mono">{result.managerVersion}</span>.</span>}
              {result.templateUpdated && <span>Project template updated to <span className="font-mono">{result.templateVersion}</span>.</span>}
              {!result.managerUpdated && !result.templateUpdated && <span>Already up to date.</span>}
              {status === 'restarted' && (
                <span className="text-foreground-secondary">Protovibe has been restarted. Reload the page to use the new version.</span>
              )}
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="flex items-start gap-2 text-sm text-foreground-destructive">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error || 'The updater exited with an error. See the log above.'}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          {status === 'restarted' ? (
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary-hover text-foreground-on-primary transition-colors cursor-pointer"
            >
              <RotateCw size={14} />
              Reload now
            </button>
          ) : (
            <button
              onClick={onClose}
              disabled={!closable}
              className={
                status === 'done'
                  ? 'px-4 py-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary-hover text-foreground-on-primary transition-colors cursor-pointer'
                  : 'px-4 py-2 rounded-lg text-sm font-medium text-foreground-secondary hover:text-foreground-default hover:bg-background-secondary transition-colors disabled:opacity-40 cursor-pointer'
              }
            >
              {status === 'done' ? 'Done' : closable ? 'Close' : 'Please wait…'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
