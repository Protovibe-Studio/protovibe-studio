import { useState, useEffect, useCallback } from 'react'
import { Search, X, FolderRoot } from 'lucide-react'
import ProjectCard from './components/ProjectCard.jsx'
import ProjectPage from './components/ProjectPage.jsx'
import CreateProjectModal from './components/CreateProjectModal.jsx'
import ImportProjectModal from './components/ImportProjectModal.jsx'
import CloneFromGitModal from './components/CloneFromGitModal.jsx'
import GithubConnectView from './components/GithubConnectView.jsx'
import AddProjectMenu from './components/AddProjectMenu.jsx'
import DeleteProjectModal from './components/DeleteProjectModal.jsx'
import SetupScreen from './components/SetupScreen.jsx'
import VersionInfoMenu from './components/VersionInfoMenu.jsx'
import UpdateAppModal from './components/UpdateAppModal.jsx'
import { ToastViewport, showToast } from './components/ToastViewport.jsx'
import Logo from './assets/Logo.jsx'
import GithubMark from './assets/GithubMark.jsx'

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

  // Deeplink from a project window: /?connect-github=1 opens the GitHub flow.
  // The param is also how we know the window isn't ours — a project opened it
  // via window.open, so Done closes it rather than falling back to home. Read
  // once at first render (not in an effect): the effect stripped the param, so
  // StrictMode's second effect pass couldn't see it and reset the view to home.
  const [openedFromProject] = useState(
    () => new URLSearchParams(window.location.search).get('connect-github') === '1',
  )

  // Navigation: 'list' | 'project' | 'setup' | 'github'
  const [view, setView] = useState(openedFromProject ? 'github' : 'list')
  const [activeProjectId, setActiveProjectId] = useState(null)

  // GitHub flow: 'clone' goes on to the repo list once connected, 'connect'
  // stops at the success screen. `githubFromProject` marks a window opened by a
  // project's Connect GitHub button — that one closes itself when done.
  const [githubIntent, setGithubIntent] = useState('connect')
  const [githubFromProject, setGithubFromProject] = useState(openedFromProject)

  // Modals
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [cloneGitOpen, setCloneGitOpen] = useState(false)
  const [deleteConfirmProject, setDeleteConfirmProject] = useState(null)
  const [setupStage, setSetupStage] = useState(null)
  const [pendingName, setPendingName] = useState('')
  // GitHub clone in progress: { name, sseUrl }
  const [cloneJob, setCloneJob] = useState(null)

  // Search
  const [searchQuery, setSearchQuery] = useState('')

  // Version / self-update
  const [updateModalOpen, setUpdateModalOpen] = useState(false)
  const [updateOptions, setUpdateOptions] = useState({ updatePluginsInProjects: false })

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
    // The deeplink already chose the github view — don't clobber it with the
    // path-based route on mount. Real popstate events still navigate.
    if (!openedFromProject) handlePopState()
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [openedFromProject])

  // Strip the deeplink param. replaceState (not push) keeps this the only
  // history entry, which browsers require before script may close the window.
  useEffect(() => {
    if (openedFromProject) window.history.replaceState(null, '', window.location.pathname)
  }, [openedFromProject])

  // Connected GitHub account for the header chip. Refreshed when the GitHub
  // flow exits (connect and log-out both happen inside it). null = status not
  // known yet (render neither chip nor connect prompt), false = not connected.
  const [githubAccount, setGithubAccount] = useState(null)
  useEffect(() => {
    if (view === 'github') return
    let cancelled = false
    fetch('/api/github/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setGithubAccount(data?.connected ? { login: data.login, avatarUrl: data.avatarUrl } : false)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [view])

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

  const openGithub = (intent) => {
    setGithubIntent(intent)
    setGithubFromProject(false)
    setActiveProjectId(null)
    setView('github')
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

  const handleImported = (project) => {
    setImportOpen(false)
    fetchProjects()
    showToast(`"${project.name}" imported`, 'success')
    setActiveProjectId(project.id)
    setSetupStage('installing')
    setView('setup')
  }

  // Phase A: SetupScreen streams the clone SSE endpoint (installing-git →
  // cloning). Phase B on done: for a Protovibe project, hand over to the
  // regular /api/projects/:id/setup flow (install → dev → ready).
  const handleCloneStart = ({ name, sseUrl }) => {
    setError('')
    setPendingName(name)
    setCloneJob({ name, sseUrl })
    setSetupStage('cloning')
    setActiveProjectId(null)
    setView('setup')
  }

  const handleCloneDone = (data) => {
    setCloneJob(null)
    fetchProjects()
    if (data.isProtovibe) {
      setActiveProjectId(data.id)
      setSetupStage('installing')
    } else {
      showToast(`"${data.name}" cloned — not a Protovibe project, so it can't run here`, 'success')
      goHome()
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
      key={activeProjectId ?? 'clone'}
      projectId={activeProjectId}
      projectName={activeProject?.name ?? pendingName ?? 'Project'}
      onBack={() => { setCloneJob(null); goHome() }}
      initialStage={setupStage ?? 'installing'}
      sseUrl={cloneJob?.sseUrl}
      onDone={handleCloneDone}
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
            <AddProjectMenu
              compact
              onCreateNew={() => setCreateOpen(true)}
              onImportZip={() => setImportOpen(true)}
              onConnectGithub={() => openGithub('clone')}
              onCloneGit={() => setCloneGitOpen(true)}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground-default tracking-tight">Your projects</h2>
                <AddProjectMenu
                  onCreateNew={() => setCreateOpen(true)}
                  onImportZip={() => setImportOpen(true)}
                  onConnectGithub={() => openGithub('clone')}
                  onCloneGit={() => setCloneGitOpen(true)}
                />
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
            <Logo className="w-auto text-foreground-default" style={{ height: '20px' }} />
          </button>
          <div className="flex items-center gap-4">
            {githubAccount ? (
              <button
                onClick={() => openGithub('connect')}
                title="Connected to GitHub — click to manage"
                className="flex items-center gap-2 text-sm text-foreground-secondary hover:text-foreground-default transition-colors cursor-pointer"
              >
                {githubAccount.avatarUrl
                  ? <img src={githubAccount.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
                  : <GithubMark className="w-4 h-4" />}
                <span className="max-w-40 truncate">{githubAccount.login}</span>
              </button>
            ) : githubAccount === false && (
              <button
                onClick={() => openGithub('connect')}
                className="flex items-center gap-2 text-sm text-foreground-secondary hover:text-foreground-default transition-colors cursor-pointer"
              >
                <GithubMark className="w-4 h-4" />
                <span>Connect to GitHub</span>
              </button>
            )}
            <VersionInfoMenu onUpdateClick={(opts) => { setUpdateOptions(opts || {}); setUpdateModalOpen(true) }} />
          </div>
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

      {importOpen && (
        <ImportProjectModal
          onClose={() => setImportOpen(false)}
          onImported={handleImported}
        />
      )}

      {cloneGitOpen && (
        <CloneFromGitModal onClose={() => setCloneGitOpen(false)} />
      )}

      {view === 'github' && (
        <GithubConnectView
          intent={githubIntent}
          fromProject={githubFromProject}
          onExit={goHome}
          onClone={handleCloneStart}
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

      {updateModalOpen && (
        <UpdateAppModal
          updatePluginsInProjects={!!updateOptions.updatePluginsInProjects}
          onClose={() => setUpdateModalOpen(false)}
        />
      )}

      <ToastViewport />
    </div>
  )
}
