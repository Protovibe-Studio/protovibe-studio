import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Search, Lock, RefreshCw, ExternalLink, AlertTriangle, ArrowLeft } from 'lucide-react'
import GithubMark from '../assets/GithubMark.jsx'

const NAME_RE = /^[a-zA-Z0-9_-]+$/

function sanitizeName(repoName) {
  return repoName.replace(/[^a-zA-Z0-9_-]/g, '-')
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} mo ago`
  return `${Math.floor(months / 12)} y ago`
}

// Steps: connect → repos (covers the "install app" empty state) → confirm
export default function GithubConnectModal({ onClose, onClone }) {
  const [step, setStep] = useState('loading')
  const [account, setAccount] = useState(null) // { login, avatarUrl }
  const [connectError, setConnectError] = useState('')
  const [waitingForAuth, setWaitingForAuth] = useState(false)

  const [repoData, setRepoData] = useState(null) // { installations, repos, installUrl }
  const [reposLoading, setReposLoading] = useState(false)
  const [search, setSearch] = useState('')

  const [selectedRepo, setSelectedRepo] = useState(null)
  const [name, setName] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [validating, setValidating] = useState(false)
  const [isProtovibe, setIsProtovibe] = useState(null) // null = unknown/checking
  const [cloneAnyway, setCloneAnyway] = useState(false)
  const [busy, setBusy] = useState(false)

  const closedRef = useRef(false)
  useEffect(() => {
    // Reset on setup: StrictMode mounts effects twice (setup → cleanup →
    // setup), and a stale `true` here would silently discard every fetch.
    closedRef.current = false
    return () => { closedRef.current = true }
  }, [])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, busy])

  const dropToConnect = (message = '') => {
    setStep('connect')
    setAccount(null)
    setRepoData(null)
    setWaitingForAuth(false)
    setConnectError(message)
  }

  const fetchRepos = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setReposLoading(true)
    try {
      const res = await fetch('/api/github/repos')
      if (res.status === 401) {
        if (!closedRef.current) dropToConnect('GitHub connection expired — reconnect to continue.')
        return
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to load repositories.')
      if (closedRef.current) return
      setRepoData(data)
      setAccount({ login: data.login, avatarUrl: data.avatarUrl })
      setStep('repos')
    } catch (err) {
      if (!closedRef.current && !quiet) {
        // The error text only renders on the connect step — never strand the
        // modal on the "Checking connection" spinner with an invisible error.
        setConnectError(err.message || 'Failed to load repositories.')
        setStep('connect')
      }
    } finally {
      if (!closedRef.current) setReposLoading(false)
    }
  }, [])

  // Initial: check whether we're already connected.
  useEffect(() => {
    let cancelled = false
    fetch('/api/github/status')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.connected) {
          setAccount({ login: data.login, avatarUrl: data.avatarUrl })
          fetchRepos()
        } else {
          setStep('connect')
        }
      })
      .catch(() => { if (!cancelled) setStep('connect') })
    return () => { cancelled = true }
  }, [fetchRepos])

  // Connect step: open the OAuth page, then poll status until connected.
  const startConnect = async () => {
    setConnectError('')
    try {
      const res = await fetch('/api/github/oauth/start', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not start GitHub sign-in.')
      window.open(data.url, '_blank', 'noopener')
      setWaitingForAuth(true)
    } catch (err) {
      setConnectError(err.message || 'Could not start GitHub sign-in.')
    }
  }

  useEffect(() => {
    if (!waitingForAuth) return
    const startedAt = Date.now()
    const interval = setInterval(async () => {
      if (Date.now() - startedAt > 5 * 60 * 1000) {
        setWaitingForAuth(false)
        setConnectError('Sign-in timed out. Try again.')
        return
      }
      try {
        const res = await fetch('/api/github/status')
        const data = await res.json()
        if (data.connected) {
          setWaitingForAuth(false)
          setAccount({ login: data.login, avatarUrl: data.avatarUrl })
          fetchRepos()
        }
      } catch {}
    }, 1500)
    return () => clearInterval(interval)
  }, [waitingForAuth, fetchRepos])

  // "Install app" empty state: auto-refetch while the user installs in the
  // other tab.
  const needsInstall = step === 'repos' && repoData && repoData.installations.length === 0
  useEffect(() => {
    if (!needsInstall) return
    const interval = setInterval(() => fetchRepos({ quiet: true }), 3000)
    return () => clearInterval(interval)
  }, [needsInstall, fetchRepos])

  const logout = async () => {
    try { await fetch('/api/github/logout', { method: 'POST' }) } catch {}
    dropToConnect()
  }

  const pickRepo = (repo) => {
    setSelectedRepo(repo)
    setName(sanitizeName(repo.name))
    setConfirmError('')
    setIsProtovibe(null)
    setCloneAnyway(false)
    setStep('confirm')
    setValidating(true)
    const params = new URLSearchParams({ owner: repo.owner, repo: repo.name, branch: repo.defaultBranch || '' })
    fetch(`/api/github/validate?${params}`)
      .then(async (res) => {
        if (res.status === 401) { dropToConnect('GitHub connection expired — reconnect to continue.'); return null }
        return res.json()
      })
      .then((data) => { if (data && !closedRef.current) setIsProtovibe(!!data.isProtovibe) })
      .catch(() => { if (!closedRef.current) setIsProtovibe(true) }) // fail open: don't block cloning on a probe error
      .finally(() => { if (!closedRef.current) setValidating(false) })
  }

  const startClone = async () => {
    const trimmed = name.trim()
    if (!NAME_RE.test(trimmed)) {
      setConfirmError('Name may only contain letters, numbers, hyphens, and underscores.')
      return
    }
    setBusy(true)
    setConfirmError('')
    try {
      // Pre-flight (collision, auth, name) as plain JSON — the SSE stream
      // can't report these inline.
      const params = new URLSearchParams({ owner: selectedRepo.owner, repo: selectedRepo.name, name: trimmed })
      const res = await fetch(`/api/github/clone?${params}&dryRun=1`)
      if (res.status === 401) { dropToConnect('GitHub connection expired — reconnect to continue.'); return }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setConfirmError(data.error || 'Could not start clone.')
        return
      }
      onClone({
        owner: selectedRepo.owner,
        repo: selectedRepo.name,
        name: trimmed,
        sseUrl: `/api/github/clone?${params}`,
      })
    } catch (err) {
      setConfirmError(err.message || 'Network error.')
    } finally {
      setBusy(false)
    }
  }

  const filteredRepos = (repoData?.repos ?? []).filter((r) =>
    r.fullName.toLowerCase().includes(search.toLowerCase()),
  )

  const accountChip = account?.login && (
    <div className="flex items-center gap-2 min-w-0">
      {account.avatarUrl && (
        <img src={account.avatarUrl} alt="" className="w-6 h-6 rounded-full shrink-0" />
      )}
      <div className="flex flex-col min-w-0 leading-tight">
        <span className="text-xs text-foreground-secondary truncate max-w-[160px]">
          {account.login}
        </span>
        <button
          type="button"
          onClick={logout}
          className="self-start text-[11px] text-foreground-tertiary hover:text-foreground-default underline transition-colors cursor-pointer"
        >
          Log out
        </button>
      </div>
    </div>
  )

  return (
    <div
      className="fixed inset-0 bg-background-overlay z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}
    >
      <div className="relative bg-background-elevated border border-border-default rounded-2xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-5 max-h-[85vh]">
        <button
          onClick={onClose}
          disabled={busy}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg text-foreground-tertiary hover:text-foreground-default hover:bg-background-secondary transition-colors disabled:opacity-50 cursor-pointer"
        >
          <X size={14} />
        </button>
        <div className="flex items-center justify-between gap-3 pr-9">
          <h2 className="text-base font-semibold text-foreground-default flex items-center gap-2">
            <GithubMark size={16} />
            Connect to GitHub
          </h2>
          {step !== 'connect' && step !== 'loading' && accountChip}
        </div>

        {step === 'loading' && (
          <p className="text-sm text-foreground-tertiary py-8 text-center">Checking GitHub connection...</p>
        )}

        {step === 'connect' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-foreground-secondary">
              Connect your GitHub account to clone one of your repositories into Protovibe.
              A browser tab will open so you can authorize the Protovibe app.
            </p>
            {connectError && <p className="text-xs text-foreground-destructive">{connectError}</p>}
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-foreground-secondary hover:text-foreground-default hover:bg-background-secondary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={startConnect}
                disabled={waitingForAuth}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary-hover text-foreground-on-primary transition-colors disabled:opacity-50 cursor-pointer"
              >
                <GithubMark size={14} />
                {waitingForAuth ? 'Waiting for GitHub...' : 'Connect GitHub account'}
              </button>
            </div>
            {waitingForAuth && (
              <p className="text-xs text-foreground-tertiary text-center">
                Finish authorizing in the browser tab that just opened, then come back here.
              </p>
            )}
          </div>
        )}

        {step === 'repos' && needsInstall && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-foreground-secondary">
              Your account is connected, but the Protovibe app isn't installed on any account yet.
              Install it and choose which repositories Protovibe may access.
            </p>
            <a
              href={repoData.installUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary-hover text-foreground-on-primary transition-colors"
            >
              <ExternalLink size={14} />
              Install the Protovibe app on GitHub
            </a>
            <p className="text-xs text-foreground-tertiary text-center">
              This screen refreshes automatically once the app is installed.
            </p>
          </div>
        )}

        {step === 'repos' && !needsInstall && repoData && (
          <div className="flex flex-col gap-3 min-h-0">
            <div className="relative w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search repositories..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm text-foreground-default bg-background-secondary placeholder-foreground-tertiary outline-none transition-colors border-border-default focus:border-border-focus focus:ring-2 focus:ring-border-focus/20"
              />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-0.5 -mx-1 px-1">
              {reposLoading ? (
                <p className="text-sm text-foreground-tertiary py-8 text-center">Loading repositories...</p>
              ) : filteredRepos.length === 0 ? (
                <p className="text-sm text-foreground-tertiary py-8 text-center">
                  {search ? 'No repositories match your search.' : 'No repositories available to Protovibe yet.'}
                </p>
              ) : (
                filteredRepos.map((repo) => (
                  <button
                    key={repo.fullName}
                    type="button"
                    onClick={() => pickRepo(repo)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-left rounded-lg hover:bg-background-tertiary transition-colors cursor-pointer"
                  >
                    <span className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-medium text-foreground-default truncate flex items-center gap-1.5">
                        {repo.fullName}
                        {repo.private && <Lock size={11} className="shrink-0 text-foreground-tertiary" />}
                      </span>
                      <span className="text-xs text-foreground-tertiary">Updated {timeAgo(repo.updatedAt)}</span>
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-border-default">
              <a
                href={repoData.installUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-foreground-tertiary hover:text-foreground-default underline transition-colors"
              >
                Add repositories
              </a>
              <button
                type="button"
                onClick={() => fetchRepos()}
                disabled={reposLoading}
                className="flex items-center gap-1.5 text-xs text-foreground-tertiary hover:text-foreground-default transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw size={12} className={reposLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>
        )}

        {step === 'confirm' && selectedRepo && (
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setStep('repos')}
              className="flex items-center gap-1.5 text-xs text-foreground-tertiary hover:text-foreground-default transition-colors self-start cursor-pointer"
            >
              <ArrowLeft size={12} />
              Pick another repository
            </button>

            <p className="text-sm text-foreground-secondary">
              Clone <span className="font-medium text-foreground-default">{selectedRepo.fullName}</span> into
              your projects folder.
            </p>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="clone-name" className="text-sm font-medium text-foreground-default">
                Project name
              </label>
              <input
                id="clone-name"
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setConfirmError('') }}
                disabled={busy}
                className="w-full px-3 py-2 rounded-lg border text-sm text-foreground-default bg-background-secondary placeholder-foreground-tertiary outline-none transition-colors disabled:opacity-50 border-border-default focus:border-border-focus focus:ring-2 focus:ring-border-focus/20"
              />
              <p className="text-xs text-foreground-tertiary">
                Letters, numbers, hyphens, and underscores only
              </p>
            </div>

            {validating && (
              <p className="text-xs text-foreground-tertiary">Checking repository...</p>
            )}

            {isProtovibe === false && !cloneAnyway && (
              <div className="flex flex-col gap-2 rounded-xl bg-background-warning-subtle border border-border-default px-3 py-2.5">
                <p className="text-sm text-foreground-default flex items-start gap-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>
                    This repository has no <code className="font-mono text-xs">protovibe-data.json</code> —
                    you can still clone it, but it won't run inside Protovibe.
                  </span>
                </p>
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setStep('repos')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-foreground-secondary hover:text-foreground-default hover:bg-background-secondary transition-colors cursor-pointer"
                  >
                    Pick another
                  </button>
                  <button
                    type="button"
                    onClick={() => setCloneAnyway(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary hover:bg-primary-hover text-foreground-on-primary transition-colors cursor-pointer"
                  >
                    Clone anyway
                  </button>
                </div>
              </div>
            )}

            {confirmError && <p className="text-xs text-foreground-destructive">{confirmError}</p>}

            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="px-4 py-2 rounded-lg text-sm font-medium text-foreground-secondary hover:text-foreground-default hover:bg-background-secondary transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={startClone}
                disabled={busy || !name.trim() || validating || (isProtovibe === false && !cloneAnyway)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary-hover text-foreground-on-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {busy ? 'Starting...' : 'Clone project'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
