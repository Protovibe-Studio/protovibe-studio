import { useState, useRef, useEffect } from 'react'
import { X, Upload } from 'lucide-react'

const NAME_RE = /^[a-zA-Z0-9_-]+$/

function deriveName(filename) {
  return filename.replace(/\.zip$/i, '').replace(/[^a-zA-Z0-9_-]/g, '-')
}

export default function ImportProjectModal({ onClose, onImported }) {
  const [file, setFile] = useState(null)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [conflict, setConflict] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, busy])

  const onFileChange = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setName(deriveName(f.name))
    setError('')
    setConflict(false)
  }

  const upload = async (overwrite) => {
    if (!file) return
    const trimmed = name.trim()
    if (!NAME_RE.test(trimmed)) {
      setError('Name may only contain letters, numbers, hyphens, and underscores.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const params = new URLSearchParams({ name: trimmed })
      if (overwrite) params.set('overwrite', '1')
      const res = await fetch(`/api/projects/import?${params}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/zip' },
        body: file,
      })
      if (res.status === 409) {
        setConflict(true)
        setBusy(false)
        return
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Failed to import project.')
        setBusy(false)
        return
      }
      onImported(data)
    } catch (err) {
      setError(err.message || 'Network error.')
      setBusy(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    upload(false)
  }

  return (
    <div
      className="fixed inset-0 bg-background-overlay z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}
    >
      <div className="bg-background-elevated border border-border-default rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground-default">Import project</h2>
          <button
            onClick={onClose}
            disabled={busy}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-foreground-tertiary hover:text-foreground-default hover:bg-background-secondary transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground-default">ZIP file</label>
            <input
              ref={inputRef}
              type="file"
              accept=".zip,application/zip"
              onChange={onFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border-default text-sm text-foreground-secondary hover:border-border-focus hover:text-foreground-default transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Upload size={14} />
              {file ? file.name : 'Choose ZIP file...'}
            </button>
          </div>

          {file && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="import-name" className="text-sm font-medium text-foreground-default">
                Project name
              </label>
              <input
                id="import-name"
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); setConflict(false) }}
                disabled={busy}
                className="w-full px-3 py-2 rounded-lg border text-sm text-foreground-default bg-background-secondary placeholder-foreground-tertiary outline-none transition-colors disabled:opacity-50 border-border-default focus:border-border-focus focus:ring-2 focus:ring-border-focus/20"
              />
              <p className="text-xs text-foreground-tertiary">
                Letters, numbers, hyphens, and underscores only
              </p>
            </div>
          )}

          {error && <p className="text-xs text-foreground-destructive">{error}</p>}

          {conflict && (
            <div className="flex flex-col gap-2 rounded-xl bg-background-warning-subtle border border-border-default px-3 py-2.5">
              <p className="text-sm text-foreground-default">
                A project named <strong>{name}</strong> already exists. Overwrite it?
              </p>
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setConflict(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-foreground-secondary hover:text-foreground-default hover:bg-background-secondary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => upload(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive hover:bg-destructive-hover text-foreground-on-primary transition-colors cursor-pointer"
                >
                  Overwrite
                </button>
              </div>
            </div>
          )}

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
              type="submit"
              disabled={!file || !name.trim() || busy || conflict}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary-hover text-foreground-on-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {busy ? 'Importing...' : 'Import'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
