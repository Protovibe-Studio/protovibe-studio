import { useEffect, useRef, useState } from 'react'
import { X, Loader2, CheckCircle2, AlertCircle, RotateCw } from 'lucide-react'

// `window.location.reload` is stubbed to a no-op in main.jsx so Vite's HMR
// can't blank the page during a self-update. Use this to force a real reload.
function forceReload() {
  window.location.assign(window.location.href)
}

export default function UpdateAppModal({ onClose, updatePluginsInProjects = false }) {
  const [logs, setLogs] = useState([])
  // running | restarting | updating-plugins | restarted | done | failed
  const [status, setStatus] = useState('running')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [pluginProgress, setPluginProgress] = useState({ done: 0, total: 0, failures: [] })
  const logRef = useRef(null)
  const restartPollRef = useRef(null)
  const startedRef = useRef(false)
  // Mirror result + opts in refs so async chains read fresh values without
  // closing over stale props/state.
  const optsRef = useRef({ updatePluginsInProjects })
  useEffect(() => { optsRef.current = { updatePluginsInProjects } }, [updatePluginsInProjects])
  const resultRef = useRef(null)

  const appendLog = (text) => setLogs((l) => [...l, text])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const finishSuccess = () => {
      // Use restarted (which renders Reload now) only if the manager actually
      // restarted; otherwise plain done with a Done button.
      const restarted = !!resultRef.current?.restartScheduled
      setStatus(restarted ? 'restarted' : 'done')
    }

    const runPluginUpdates = async () => {
      const updateTemplate = !!resultRef.current?.templateUpdated
      if (!updateTemplate || !optsRef.current.updatePluginsInProjects) {
        finishSuccess()
        return
      }
      setStatus('updating-plugins')
      appendLog('--- updating Protovibe shell in all projects ---')

      let projects
      try {
        const res = await fetch('/api/projects', { cache: 'no-store' })
        if (!res.ok) throw new Error(`GET /api/projects failed (${res.status})`)
        projects = await res.json()
      } catch (e) {
        appendLog(`failed to list projects: ${e.message}`)
        setError(e.message)
        setStatus('failed')
        return
      }

      setPluginProgress({ done: 0, total: projects.length, failures: [] })
      if (projects.length === 0) {
        appendLog('no projects to update.')
        finishSuccess()
        return
      }

      const failures = []
      for (let i = 0; i < projects.length; i++) {
        const p = projects[i]
        appendLog(`[${i + 1}/${projects.length}] updating ${p.name} ...`)
        try {
          const res = await fetch(`/api/projects/${p.id}/update-plugin`, { method: 'POST' })
          const data = await res.json().catch(() => ({}))
          if (res.ok) {
            appendLog(`[${i + 1}/${projects.length}] ${p.name} → v${data.pluginVersion ?? '?'}`)
          } else {
            const msg = data?.error || `HTTP ${res.status}`
            appendLog(`[${i + 1}/${projects.length}] ${p.name} FAILED: ${msg}`)
            failures.push({ name: p.name, error: msg })
          }
        } catch (e) {
          appendLog(`[${i + 1}/${projects.length}] ${p.name} FAILED: ${e.message}`)
          failures.push({ name: p.name, error: e.message })
        }
        setPluginProgress({ done: i + 1, total: projects.length, failures: [...failures] })
      }

      appendLog('--- finished updating projects ---')
      finishSuccess()
    }

    const pollUntilRestarted = () => {
      restartPollRef.current = setInterval(async () => {
        try {
          const res = await fetch('/api/version', { cache: 'no-store' })
          if (res.ok) {
            clearInterval(restartPollRef.current)
            // Manager is back. Run plugin sweep (if requested) then finish.
            runPluginUpdates()
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
            if (evType === 'log') appendLog(data.text)
            else if (evType === 'fail') { setError(data.message || 'Update failed'); setStatus('failed') }
            else if (evType === 'done') {
              setResult(data)
              resultRef.current = data
              if (data.restartScheduled) {
                setStatus('restarting')
                pollUntilRestarted()
              } else {
                runPluginUpdates()
              }
            }
          }
        }
      } catch (e) {
        // Manager-restart drops the connection mid-stream — that's expected.
        setStatus((prev) => (prev === 'restarting' || prev === 'updating-plugins' || prev === 'restarted' ? prev : 'failed'))
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

  const title = (() => {
    switch (status) {
      case 'running': return 'Downloading update…'
      case 'restarting': return 'Restarting Protovibe…'
      case 'updating-plugins': return 'Updating projects…'
      case 'done':
      case 'restarted': return 'Update complete'
      case 'failed': return 'Update failed'
      default: return ''
    }
  })()

  return (
    <div
      className="fixed inset-0 bg-background-overlay z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget && closable) onClose() }}
    >
      <div className="bg-background-elevated border border-border-default rounded-2xl shadow-xl w-full max-w-xl flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground-default">{title}</h2>
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

        {status === 'updating-plugins' && (
          <div className="flex items-center gap-2 text-sm text-foreground-secondary">
            <Loader2 size={14} className="animate-spin" />
            Updating Protovibe shell in projects ({pluginProgress.done}/{pluginProgress.total})…
          </div>
        )}

        {(status === 'done' || status === 'restarted') && result && (
          <div className="flex items-start gap-2 text-sm text-foreground-default">
            <CheckCircle2 size={16} className="text-foreground-success shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              {result.managerUpdated && <span>Project manager updated to <span className="font-mono">{result.managerVersion}</span>.</span>}
              {result.templateUpdated && <span>Project template updated to <span className="font-mono">{result.templateVersion}</span>.</span>}
              {!result.managerUpdated && !result.templateUpdated && <span>Already up to date.</span>}
              {pluginProgress.total > 0 && (
                <span>
                  Updated Protovibe shell in {pluginProgress.done - pluginProgress.failures.length}/{pluginProgress.total} project{pluginProgress.total === 1 ? '' : 's'}.
                </span>
              )}
              {pluginProgress.failures.length > 0 && (
                <span className="text-foreground-destructive">
                  Failed: {pluginProgress.failures.map((f) => f.name).join(', ')}
                </span>
              )}
              {status === 'restarted' && (
                <span className="text-foreground-secondary">Protovibe has been restarted on the new version. Reload the page to apply.</span>
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
              onClick={forceReload}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary-hover text-foreground-on-primary transition-colors cursor-pointer"
            >
              <RotateCw size={14} />
              Confirm and reload
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
              {status === 'done' ? 'Acknowledge' : closable ? 'Close' : 'Please wait…'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
