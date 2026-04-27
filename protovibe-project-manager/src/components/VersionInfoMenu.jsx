import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronDown, Loader2, Download, Check, AlertCircle } from 'lucide-react'

export default function VersionInfoMenu({ onUpdateClick }) {
  const [open, setOpen] = useState(false)
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [updatePluginsInProjects, setUpdatePluginsInProjects] = useState(true)
  const ref = useRef(null)

  const check = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/version')
      if (!res.ok) throw new Error('Request failed')
      const data = await res.json()
      setInfo(data)
      return data
    } catch (e) {
      setError(e.message || 'Failed to check for updates')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const data = await check()
      if (cancelled || !data) return
      if (data.manager?.outdated || data.template?.outdated) {
        setOpen(true)
      }
    })()
    return () => { cancelled = true }
  }, [check])

  useEffect(() => {
    if (!open) return
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleToggle = () => {
    setOpen((v) => {
      const next = !v
      if (next) check()
      return next
    })
  }

  const outdated = info && (info.manager?.outdated || info.template?.outdated)
  const fetchFailed = info && (info.manager?.error || info.template?.error)
  const allUpToDate = info && !fetchFailed && !outdated

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleToggle}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
          outdated
            ? 'bg-primary text-foreground-on-primary hover:bg-primary-hover'
            : 'bg-background-secondary text-foreground-default hover:bg-background-tertiary'
        }`}
      >
        {outdated ? <Download size={14} /> : null}
        {outdated ? 'Update available' : 'Version info'}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        {outdated && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-foreground-destructive border-2 border-background-elevated" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-background-elevated border border-border-default rounded-xl shadow-xl p-4 flex flex-col gap-3 z-50">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-foreground-secondary">
              <Loader2 size={14} className="animate-spin" />
              Checking for updates…
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-foreground-destructive">{error}</p>
              <button
                onClick={check}
                className="text-xs text-foreground-secondary hover:text-foreground-default self-start cursor-pointer"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && info && (
            <>
              <VersionRow label="Project manager" data={info.manager} />
              <div className="h-px bg-border-default" />
              <VersionRow label="Project template" data={info.template} />

              <div className="h-px bg-border-default" />

              {outdated && (
                <div className="flex flex-col gap-2">
                  <label className="flex items-start gap-2 text-xs text-foreground-secondary cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={updatePluginsInProjects}
                      onChange={(e) => setUpdatePluginsInProjects(e.target.checked)}
                      className="mt-0.5 cursor-pointer"
                    />
                    <span>Update Protovibe shell in all projects</span>
                  </label>
                  <button
                    onClick={() => { setOpen(false); onUpdateClick({ updatePluginsInProjects }) }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary-hover text-foreground-on-primary text-sm font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    <Download size={14} />
                    Download new version
                  </button>
                </div>
              )}

              {!outdated && allUpToDate && (
                <div className="flex items-center gap-1.5 text-xs text-foreground-secondary">
                  <Check size={12} />
                  You have the newest version
                </div>
              )}

              {!outdated && fetchFailed && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-start gap-1.5 text-xs text-foreground-destructive">
                    <AlertCircle size={12} className="mt-0.5 shrink-0" />
                    <span>Couldn't reach GitHub to check for updates.</span>
                  </div>
                  <button
                    onClick={check}
                    className="text-xs text-foreground-secondary hover:text-foreground-default self-start cursor-pointer"
                  >
                    Try again
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function VersionRow({ label, data }) {
  const current = data?.current ?? '—'
  const latest = data?.latest
  const error = data?.error
  const sameVersion = latest && current && latest === current

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-foreground-default">{label}</p>

      {sameVersion ? (
        <div className="flex items-center justify-between text-xs text-foreground-secondary">
          <span>Version</span>
          <span className="font-mono text-foreground-default">{current}</span>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-foreground-secondary">
            <span>Installed</span>
            <span className="font-mono text-foreground-default">{current}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-foreground-secondary">
            <span>Latest in repo</span>
            {latest ? (
              <span className={`font-mono ${data?.outdated ? 'text-primary' : 'text-foreground-default'}`}>{latest}</span>
            ) : (
              <span className="text-foreground-tertiary italic" title={error || ''}>unavailable</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
