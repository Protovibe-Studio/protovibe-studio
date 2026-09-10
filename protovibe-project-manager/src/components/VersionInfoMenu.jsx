import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronDown, Loader2, Download, Check, AlertCircle } from 'lucide-react'

export default function VersionInfoMenu({ onUpdateClick }) {
  const [open, setOpen] = useState(false)
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef(null)

  // `force` drives ?refresh=1, which bypasses the server's result cache. Without
  // it "Try again" replayed the cached failure and looked like a dead button.
  const check = useCallback(async (force = false) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/version${force ? '?refresh=1' : ''}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Version check failed (${res.status})`)
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

  const retry = useCallback(() => check(true), [check])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const data = await check()
      if (cancelled || !data) return
      if (sourceUpdateOffered(data)) {
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

  const sourceOutdated = info && (info.manager?.outdated || info.template?.outdated)
  const shellOutdated = info?.shell?.outdated
  // The in-app download is offered only when nothing else will bring the new
  // source along; see sourceUpdateOffered. Under a shell that's about to update
  // itself the button stays neutral and the popover just reports the versions.
  const offerUpdate = sourceUpdateOffered(info)
  const anyOutdated = sourceOutdated || shellOutdated
  // Distinct reasons, deduped: the manager and template share one source error.
  const failures = info
    ? [...new Set([info.manager?.error, info.template?.error, info.shell?.error].filter(Boolean))]
    : []
  const allUpToDate = info && failures.length === 0 && !anyOutdated

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleToggle}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
          offerUpdate
            ? 'bg-primary text-foreground-on-primary hover:bg-primary-hover'
            : 'bg-background-secondary text-foreground-default hover:bg-background-tertiary'
        }`}
      >
        {offerUpdate ? <Download size={14} /> : null}
        {offerUpdate ? 'Update available' : 'Version info'}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        {offerUpdate && (
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
              <RetryButton onClick={retry} />
            </div>
          )}

          {!loading && !error && info && (
            <>
              {info.shell && (
                <>
                  <VersionRow label="Protovibe app" data={info.shell} />
                  <div className="h-px bg-border-default" />
                </>
              )}
              <VersionRow label="Project manager" data={info.manager} />
              <div className="h-px bg-border-default" />
              <VersionRow label="Project template" data={info.template} />

              <div className="h-px bg-border-default" />

              {offerUpdate && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-foreground-secondary">
                    Each of your projects picks up the new Protovibe editor the next time you run it.
                  </p>
                  <button
                    onClick={() => { setOpen(false); onUpdateClick() }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary-hover text-foreground-on-primary text-sm font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    <Download size={14} />
                    Download new version
                  </button>
                </div>
              )}

              {/* The shell has no button of its own: electron-updater downloads it
                  in the background and prompts to restart when it's ready. */}
              {shellOutdated && (
                <p className="text-xs text-foreground-secondary">
                  Protovibe {info.shell.latest} is available. The app downloads it on its
                  own and will ask you to restart when it's ready to install
                  {sourceOutdated ? ', bringing the new project manager and template with it' : ''}.
                </p>
              )}

              {allUpToDate && (
                <div className="flex items-center gap-1.5 text-xs text-foreground-secondary">
                  <Check size={12} />
                  You have the newest version
                </div>
              )}

              {failures.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-start gap-1.5 text-xs text-foreground-destructive">
                    <AlertCircle size={12} className="mt-0.5 shrink-0" />
                    <div className="flex flex-col gap-1">
                      <span>Couldn't check for updates.</span>
                      {/* Verbatim so a rate limit, a TLS failure and a 404 are
                          told apart instead of all reading "couldn't reach GitHub". */}
                      {failures.map((f) => (
                        <span key={f} className="font-mono text-[10px] leading-snug break-words text-foreground-tertiary">{f}</span>
                      ))}
                    </div>
                  </div>
                  <RetryButton onClick={retry} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Whether the popover should push the in-app "Download new version" flow.
// Under the Electron shell, electron-updater ships the manager and template
// inside the next shell release, so a pending shell update already covers any
// newer source. The in-app download is only needed when nothing else will
// deliver it: outside the shell, or when the shell itself is current but the
// manager/template were released on their own without a shell bump.
function sourceUpdateOffered(info) {
  if (!info) return false
  const sourceOutdated = !!(info.manager?.outdated || info.template?.outdated)
  if (!sourceOutdated) return false
  if (!info.shell) return true
  return !info.shell.outdated
}

function RetryButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-xs text-foreground-secondary hover:text-foreground-default self-start cursor-pointer"
    >
      Try again
    </button>
  )
}

function VersionRow({ label, data }) {
  // A null `current` means "running, but this build can't report its version"
  // (an Electron shell older than PROTOVIBE_SHELL_VERSION) — not "not installed".
  const current = data?.current ?? null
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
            {current ? (
              <span className="font-mono text-foreground-default">{current}</span>
            ) : (
              <span className="text-foreground-tertiary italic" title="This build is too old to report its version.">unknown</span>
            )}
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
