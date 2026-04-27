import { useEffect, useRef, useState } from 'react'
import { X, Loader2, CheckCircle2, AlertCircle, RotateCw } from 'lucide-react'

// `window.location.reload` is stubbed to a no-op in main.jsx so Vite's HMR
// can't blank the page during a self-update. Use this to force a real reload.
function forceReload() {
  window.location.assign(window.location.href)
}

export default function UpdateAppModal({ onClose, updatePluginsInProjects = false }) {
  const [logs, setLogs] = useState([])
  // running-template | updating-plugins | running-manager | restarting | restarted | done | failed
  const [status, setStatus] = useState('running-template')
  const [error, setError] = useState('')
  const [summary, setSummary] = useState({
    templateUpdated: false,
    templateVersion: null,
    managerUpdated: false,
    managerVersion: null,
    pluginsTotal: 0,
    pluginsDone: 0,
    pluginFailures: [],
  })
  const logRef = useRef(null)
  const restartPollRef = useRef(null)
  const startedRef = useRef(false)

  const appendLog = (text) => setLogs((l) => [...l, text])

  // Stream SSE from /api/update-app and resolve when the script finishes.
  // Resolution shape: { ok, data, connectionLost }.
  // - ok=true / connectionLost=false: normal completion (any phase except manager-restart).
  // - ok=true / connectionLost=true: connection dropped after a `done` event (manager phase).
  // - ok=false: failure.
  const streamUpdate = (which) => new Promise((resolve) => {
    let saw = null
    let saidFail = false
    ;(async () => {
      try {
        const res = await fetch(`/api/update-app?which=${which}`, { method: 'POST' })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          resolve({ ok: false, error: data.error || `Request failed (${res.status})` })
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
            else if (evType === 'fail') {
              saidFail = true
              resolve({ ok: false, error: data.message || 'Update failed' })
            } else if (evType === 'done') {
              saw = data
            }
          }
        }
        if (saidFail) return
        if (saw) resolve({ ok: true, data: saw, connectionLost: false })
        else resolve({ ok: false, error: 'Updater closed without a result' })
      } catch (e) {
        // Connection drops mid-stream are expected for the manager phase
        // because the manager process exits after sending `done`.
        if (saw) resolve({ ok: true, data: saw, connectionLost: true })
        else resolve({ ok: false, error: e.message || 'Connection lost' })
      }
    })()
  })

  const pollUntilManagerBack = () => new Promise((resolve, reject) => {
    const startedAt = Date.now()
    const TIMEOUT_MS = 3 * 60 * 1000 // 3 minutes — plenty for pnpm install + dev start
    restartPollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' })
        if (res.ok) {
          clearInterval(restartPollRef.current)
          // Read the fresh version so the success card can show it.
          const v = await res.json().catch(() => null)
          if (v?.manager?.current) {
            setSummary((s) => ({ ...s, managerVersion: v.manager.current }))
          }
          resolve()
          return
        }
      } catch {}
      if (Date.now() - startedAt > TIMEOUT_MS) {
        clearInterval(restartPollRef.current)
        reject(new Error('Project manager did not come back online in time. Check dev.log for details.'))
      }
    }, 1000)
  })

  const updatePluginsForAllProjects = async () => {
    appendLog('--- updating Protovibe shell in all projects ---')
    let projects
    try {
      const res = await fetch('/api/projects', { cache: 'no-store' })
      if (!res.ok) throw new Error(`GET /api/projects failed (${res.status})`)
      projects = await res.json()
    } catch (e) {
      appendLog(`failed to list projects: ${e.message}`)
      throw e
    }

    setSummary((s) => ({ ...s, pluginsTotal: projects.length, pluginsDone: 0, pluginFailures: [] }))
    if (projects.length === 0) {
      appendLog('no projects to update.')
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
      setSummary((s) => ({ ...s, pluginsDone: i + 1, pluginFailures: [...failures] }))
    }
    appendLog('--- finished updating projects ---')
  }

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const orchestrate = async () => {
      // Snapshot what's outdated up-front so we don't rely on the script's
      // self-detection between phases.
      let v
      try {
        const res = await fetch('/api/version', { cache: 'no-store' })
        if (!res.ok) throw new Error(`GET /api/version failed (${res.status})`)
        v = await res.json()
      } catch (e) {
        setError(e.message)
        setStatus('failed')
        return
      }
      const tplOutdated = !!v?.template?.outdated
      const mgrOutdated = !!v?.manager?.outdated

      if (!tplOutdated && !mgrOutdated) {
        appendLog('Nothing to update — already on the latest version.')
        setStatus('done')
        return
      }

      // 1) Template (do first so the project plugin sweep uses fresh source).
      let templateActuallyUpdated = false
      if (tplOutdated) {
        setStatus('running-template')
        const r = await streamUpdate('template')
        if (!r.ok) { setError(r.error); setStatus('failed'); return }
        if (r.data?.templateUpdated) {
          templateActuallyUpdated = true
          setSummary((s) => ({ ...s, templateUpdated: true, templateVersion: r.data.templateVersion }))
        }
      }

      // 2) Project plugin sweep — only meaningful if template was actually
      //    refreshed and the user opted in. Use the local flag rather than
      //    summaryRef, which lags behind setSummary by one render.
      if (templateActuallyUpdated && updatePluginsInProjects) {
        setStatus('updating-plugins')
        try {
          await updatePluginsForAllProjects()
        } catch (e) {
          setError(e.message || 'Failed to update project plugins.')
          setStatus('failed')
          return
        }
      }

      // 3) Manager last — its restart kills the SSE connection and the dev
      //    server, so by ordering it last, every prior step gets to finish.
      if (mgrOutdated) {
        setStatus('running-manager')
        const r = await streamUpdate('manager')
        if (!r.ok) { setError(r.error); setStatus('failed'); return }
        if (r.data?.managerUpdated) {
          setSummary((s) => ({ ...s, managerUpdated: true, managerVersion: r.data.managerVersion }))
        }
        if (r.data?.restartScheduled) {
          setStatus('restarting')
          try {
            await pollUntilManagerBack()
          } catch (e) {
            setError(e.message || 'Manager restart timed out.')
            setStatus('failed')
            return
          }
          setStatus('restarted')
          return
        }
      }

      setStatus('done')
    }

    orchestrate()

    return () => {
      if (restartPollRef.current) clearInterval(restartPollRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  const closable = status === 'done' || status === 'failed' || status === 'restarted'

  const title = (() => {
    switch (status) {
      case 'running-template': return 'Updating project template…'
      case 'updating-plugins': return 'Updating projects…'
      case 'running-manager':  return 'Updating project manager…'
      case 'restarting':       return 'Restarting Protovibe…'
      case 'done':
      case 'restarted':        return 'Update complete'
      case 'failed':           return 'Update failed'
      default: return ''
    }
  })()

  const inFlight = status === 'running-template' || status === 'updating-plugins' || status === 'running-manager' || status === 'restarting'

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

        {inFlight && (
          <div className="flex items-center gap-2 text-sm text-foreground-secondary">
            <Loader2 size={14} className="animate-spin" />
            {status === 'running-template' && 'Downloading and installing latest project template…'}
            {status === 'updating-plugins' && (
              <span>Updating Protovibe shell in projects ({summary.pluginsDone}/{summary.pluginsTotal})…</span>
            )}
            {status === 'running-manager' && 'Downloading and installing latest project manager…'}
            {status === 'restarting' && 'Project manager updated — restarting the dev server…'}
          </div>
        )}

        {(status === 'done' || status === 'restarted') && (
          <div className="flex items-start gap-2 text-sm text-foreground-default">
            <CheckCircle2 size={16} className="text-foreground-success shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              {summary.templateUpdated && <span>Project template updated to <span className="font-mono">{summary.templateVersion}</span>.</span>}
              {summary.managerUpdated && <span>Project manager updated to <span className="font-mono">{summary.managerVersion}</span>.</span>}
              {!summary.templateUpdated && !summary.managerUpdated && <span>Already up to date.</span>}
              {summary.pluginsTotal > 0 && (
                <span>
                  Updated Protovibe shell in {summary.pluginsDone - summary.pluginFailures.length}/{summary.pluginsTotal} project{summary.pluginsTotal === 1 ? '' : 's'}.
                </span>
              )}
              {summary.pluginFailures.length > 0 && (
                <span className="text-foreground-destructive">
                  Failed: {summary.pluginFailures.map((f) => f.name).join(', ')}
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
