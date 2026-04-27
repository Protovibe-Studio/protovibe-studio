import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, X, FolderRoot } from 'lucide-react'
import ProjectCard from './components/ProjectCard.jsx'
import ProjectPage from './components/ProjectPage.jsx'
import CreateProjectModal from './components/CreateProjectModal.jsx'
import DeleteProjectModal from './components/DeleteProjectModal.jsx'
import SetupScreen from './components/SetupScreen.jsx'
import { ToastViewport, showToast } from './components/ToastViewport.jsx'
import Logo from './assets/Logo.jsx'

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
  const [deleteConfirmProject, setDeleteConfirmProject] = useState(null)
  const [setupStage, setSetupStage] = useState(null)
  const [pendingName, setPendingName] = useState('')

  // Search
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname
      if (path.startsWith('/project/')) {
        const id = path.split('/')[2]
        setActiveProjectId(id)
        setView('project')
      } else {
        setView('list')
        setActiveProjectId(null)
      }
    }
    handlePopState()
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

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

  // ── Navigation helpers ──

  const openProject = (id) => {
    window.history.pushState(null, '', `/project/${id}`)
    setActiveProjectId(id)
    setView('project')
  }

  const openSetup = (id) => {
    setActiveProjectId(id)
    setView('setup')
  }

  const goHome = () => {
    window.history.pushState(null, '', `/`)
    setView('list')
    setActiveProjectId(null)
  }

  // ── Actions ──

  const handleCreateProject = async (name) => {
    setCreateOpen(false)
    setError('')
    setPendingName(name)
    setSetupStage('creating')
    setView('setup')
    setActiveProjectId(null)
    try {
      const res = await apiFetch('POST', '/projects', { name })
      if (res.ok) {
        const project = await res.json()
        fetchProjects()
        setActiveProjectId(project.id)
        setSetupStage(null)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to create project.')
        setSetupStage(null)
        setView('list')
      }
    } catch {
      setError('Network error. Make sure the dev server is running.')
      setSetupStage(null)
      setView('list')
    }
  }

  const handleDuplicate = async (id) => {
    setError('')
    const original = projects.find((p) => p.id === id)
    setPendingName(original?.name ? `${original.name}-copy` : '')
    setSetupStage('duplicating')
    setView('setup')
    setActiveProjectId(null)
    try {
      const res = await apiFetch('POST', `/projects/${id}/duplicate`)
      if (res.ok) {
        const project = await res.json()
        fetchProjects()
        setPendingName(project.name || '')
        setActiveProjectId(project.id)
        setSetupStage(null)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to duplicate project.')
        setSetupStage(null)
        setView('list')
      }
    } catch {
      setError('Network error. Make sure the dev server is running.')
      setSetupStage(null)
      setView('list')
    }
  }

  const handleDelete = (id) => {
    const project = projects.find((p) => p.id === id)
    if (project) setDeleteConfirmProject(project)
  }

  const handleDeleteConfirmed = async () => {
    const { id } = deleteConfirmProject
    const res = await apiFetch('DELETE', `/projects/${id}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to delete project.')
    }
    fetchProjects()
    showToast(`"${deleteConfirmProject.name}" deleted`, 'success')
    if (view === 'project' && activeProjectId === id) goHome()
  }

  const handleStop = async (id) => {
    setError('')
    try {
      const res = await apiFetch('POST', `/projects/${id}/stop`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to stop project.')
      }
      fetchProjects()
    } catch {
      setError('Network error. Make sure the dev server is running.')
    }
  }

  const handleShowFolder = async (id) => {
    try {
      await apiFetch('POST', `/projects/${id}/show-folder`)
    } catch {}
  }

  const handleOpenVSCode = async (id) => {
    try {
      await apiFetch('POST', `/projects/${id}/open-vscode`)
    } catch {}
  }

  // ── Derived state ──

  const activeProject = projects.find((p) => p.id === activeProjectId)

  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))

  // ── Setup screen overlay (renders on top of list) ──

  const setupOverlay = view === 'setup' && (
    <SetupScreen
      projectId={activeProjectId}
      projectName={activeProject?.name ?? pendingName ?? 'Project'}
      onBack={goHome}
      initialStage={setupStage ?? 'installing'}
      onReady={() => { if (activeProjectId) openProject(activeProjectId) }}
    />
  )

  const renderContent = () => {
    if (view === 'project' && activeProject) {
      return <ProjectPage project={activeProject} onBack={goHome} onSetup={() => openSetup(activeProjectId)} onShowFolder={() => handleShowFolder(activeProjectId)} onOpenVSCode={() => handleOpenVSCode(activeProjectId)} onDuplicate={() => handleDuplicate(activeProjectId)} onDelete={() => handleDelete(activeProjectId)} onStop={() => handleStop(activeProjectId)} onRenamed={fetchProjects} />
    }

    // ── List view ──
    return (
      <main className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-foreground-tertiary text-sm">
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 rounded-2xl bg-background-secondary flex items-center justify-center text-foreground-tertiary">
              <FolderRoot size={24} strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="text-foreground-default font-medium mb-1">No projects yet</p>
              <p className="text-foreground-tertiary text-sm">Create your first project to get started</p>
            </div>
            <button
              data-testid="btn-new-project"
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-foreground-on-primary text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              <Plus size={14} />
              Create Project
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground-default tracking-tight">Your projects</h2>
                <button
                  data-testid="btn-new-project"
                  onClick={() => setCreateOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-foreground-on-primary text-sm font-medium rounded-lg transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  New Project
                </button>
              </div>
              <div className="relative w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm text-foreground-default bg-background-secondary placeholder-foreground-tertiary outline-none transition-colors border-border-default focus:border-border-focus focus:ring-2 focus:ring-border-focus/20"
                />
              </div>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-2">
                <p className="text-foreground-default font-medium">No results found</p>
                <p className="text-foreground-tertiary text-sm">Try emptying your search query</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onOpen={() => openProject(project.id)}
                    onDuplicate={() => handleDuplicate(project.id)}
                    onDelete={() => handleDelete(project.id)}
                    onStop={() => handleStop(project.id)}
                    onShowFolder={() => handleShowFolder(project.id)}
                    onOpenVSCode={() => handleOpenVSCode(project.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-background-default">
      {/* Header */}
      <header className="border-b border-border-default bg-background-elevated sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          <button onClick={goHome} className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
            <Logo className="w-auto text-foreground-default" style={{ height: '14px' }} />
          </button>
          <span className="text-xs text-foreground-tertiary">Version 1.0 beta</span>
        </div>
      </header>

      {/* Error toast */}
      {error && (
        <div className="max-w-4xl mx-auto px-6 pt-4">
          <div className="flex items-center gap-3 rounded-xl bg-background-destructive-subtle border border-border-destructive px-4 py-3">
            <p className="text-sm text-foreground-destructive flex-1">{error}</p>
            <button
              onClick={() => setError('')}
              className="text-foreground-destructive hover:text-foreground-default transition-colors shrink-0 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      {renderContent()}

      {createOpen && (
        <CreateProjectModal
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreateProject}
        />
      )}

      {deleteConfirmProject && (
        <DeleteProjectModal
          projectName={deleteConfirmProject.name}
          onConfirm={handleDeleteConfirmed}
          onClose={() => setDeleteConfirmProject(null)}
        />
      )}

      {setupOverlay}
      <ToastViewport />
    </div>
  )
}
