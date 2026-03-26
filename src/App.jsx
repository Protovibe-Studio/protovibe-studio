import { useState, useEffect, useCallback } from 'react'
import ProjectCard from './components/ProjectCard.jsx'
import ProjectPage from './components/ProjectPage.jsx'
import CreateProjectModal from './components/CreateProjectModal.jsx'
import SetupScreen from './components/SetupScreen.jsx'

async function apiFetch(method, path, body) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  return res
}

export default function App() {
  // Data
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Navigation: 'list' | 'project' | 'setup'
  const [view, setView] = useState('list')
  const [activeProjectId, setActiveProjectId] = useState(null)

  // Modals
  const [createOpen, setCreateOpen] = useState(false)

  // Theme
  const [theme, setTheme] = useState(() => window.ThemeManager?.getPreference() ?? 'auto')

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        setProjects(data)
      }
    } catch {
      // swallow network errors during polling
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
    const interval = setInterval(fetchProjects, 2000)
    return () => clearInterval(interval)
  }, [fetchProjects])

  useEffect(() => {
    const handler = () => setTheme(window.ThemeManager?.getPreference() ?? 'auto')
    window.addEventListener('themechange', handler)
    return () => window.removeEventListener('themechange', handler)
  }, [])

  const handleThemeToggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    window.ThemeManager?.setTheme(next)
    setTheme(next)
  }

  // ── Navigation helpers ──

  const openProject = (id) => {
    setActiveProjectId(id)
    setView('project')
  }

  const openSetup = (id) => {
    setActiveProjectId(id)
    setView('setup')
  }

  const goHome = () => {
    setView('list')
    setActiveProjectId(null)
  }

  // ── Actions ──

  const handleProjectCreated = (project) => {
    setCreateOpen(false)
    fetchProjects()
    openSetup(project.id)
  }

  const handleDuplicate = async (id) => {
    setError('')
    try {
      const res = await apiFetch('POST', `/projects/${id}/duplicate`)
      if (res.ok) {
        const project = await res.json()
        fetchProjects()
        openSetup(project.id)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to duplicate project.')
      }
    } catch {
      setError('Network error. Make sure the dev server is running.')
    }
  }

  const handleDelete = async (id) => {
    setError('')
    try {
      const res = await apiFetch('DELETE', `/projects/${id}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to delete project.')
      }
      fetchProjects()
    } catch {
      setError('Network error. Make sure the dev server is running.')
    }
  }

  // ── Derived state ──

  const activeProject = projects.find((p) => p.id === activeProjectId)
  const activeTheme = window.ThemeManager?.getActiveTheme() ?? 'light'

  // ── Project page view ──

  if (view === 'project' && activeProject) {
    return <ProjectPage project={activeProject} onBack={goHome} onSetup={() => openSetup(activeProjectId)} />
  }

  // ── Setup screen overlay (renders on top of list) ──

  const setupOverlay = view === 'setup' && activeProjectId && (
    <SetupScreen
      projectId={activeProjectId}
      projectName={activeProject?.name ?? 'Project'}
      onBack={goHome}
    />
  )

  // ── List view ──

  return (
    <div className="min-h-screen bg-background-default">
      {/* Header */}
      <header className="border-b border-border-default bg-background-elevated sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 3h4v4H3zM9 3h4v4H9zM3 9h4v4H3zM9 9h4v4H9z" fill="currentColor" className="text-primary-foreground" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-foreground-default tracking-tight">Protovibe Home</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleThemeToggle}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-secondary hover:text-foreground-default hover:bg-background-secondary transition-colors"
              title={`Switch to ${activeTheme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {activeTheme === 'dark' ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M13.5 10.5A6 6 0 015.5 2.5a6 6 0 108 8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium rounded-lg transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              </svg>
              New Project
            </button>
          </div>
        </div>
      </header>

      {/* Error toast */}
      {error && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <div className="flex items-center gap-3 rounded-xl bg-background-destructive-subtle border border-border-destructive px-4 py-3">
            <p className="text-sm text-foreground-destructive flex-1">{error}</p>
            <button
              onClick={() => setError('')}
              className="text-foreground-destructive hover:text-foreground-default transition-colors shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-foreground-tertiary text-sm">
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 rounded-2xl bg-background-secondary flex items-center justify-center text-foreground-tertiary">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="13" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-foreground-default font-medium mb-1">No projects yet</p>
              <p className="text-foreground-tertiary text-sm">Create your first project to get started</p>
            </div>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium rounded-lg transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              </svg>
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={() => openProject(project.id)}
                onDuplicate={() => handleDuplicate(project.id)}
                onDelete={() => handleDelete(project.id)}
              />
            ))}
          </div>
        )}
      </main>

      {createOpen && (
        <CreateProjectModal
          onClose={() => setCreateOpen(false)}
          onCreated={handleProjectCreated}
        />
      )}

      {setupOverlay}
    </div>
  )
}
