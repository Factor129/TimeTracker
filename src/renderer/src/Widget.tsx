import { useEffect, useMemo, useRef, useState } from 'react'
import type { Project, RunningTimer } from '../../shared/types'
import { ProjectAvatar } from './ProjectAvatar'
import { useTheme } from './useTheme'

const COLORS = ['#f28c28', '#4c8bf5', '#37c07c', '#e6584f', '#a86ef2', '#f2c744']

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n: number): string => n.toString().padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

type View = 'timer' | 'grid' | 'grid-expanded' | 'create'

const WIDTH_COMPACT = 280
const WIDTH_GRID = 300
const HEIGHT_TIMER = 164
const HEIGHT_GRID = 246
const HEIGHT_GRID_EXPANDED = 420
const HEIGHT_CREATE = 240

export default function Widget(): React.JSX.Element {
  const [theme, toggleTheme] = useTheme()
  const [projects, setProjects] = useState<Project[]>([])
  const [running, setRunning] = useState<RunningTimer | null>(null)
  const [now, setNow] = useState<number>(Date.now())
  const [view, setView] = useState<View>('grid')
  const [createName, setCreateName] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void refresh()
    const offTimer = window.api.timer.onChanged((r) => setRunning(r))
    const offProjects = window.api.projects.onChanged((p) => setProjects(p.filter((x) => !x.archived)))
    const tick = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      offTimer()
      offProjects()
      clearInterval(tick)
    }
  }, [])

  useEffect(() => {
    setView(running ? 'timer' : 'grid')
  }, [running])

  async function refresh(): Promise<void> {
    const [projectList, timer] = await Promise.all([window.api.projects.list(), window.api.timer.get()])
    setProjects(projectList.filter((p) => !p.archived))
    setRunning(timer.running)
  }

  const activeProject = useMemo(
    () => projects.find((p) => p.id === running?.projectId) ?? null,
    [projects, running]
  )

  const elapsedMs = running ? now - new Date(running.startedAt).getTime() : 0

  useEffect(() => {
    let width = WIDTH_COMPACT
    let height = HEIGHT_TIMER
    if (view === 'grid') {
      width = WIDTH_GRID
      height = HEIGHT_GRID
    } else if (view === 'grid-expanded') {
      width = WIDTH_GRID
      height = HEIGHT_GRID_EXPANDED
    } else if (view === 'create') {
      width = WIDTH_GRID
      height = HEIGHT_CREATE
    }
    void window.api.window.resizeWidget(width, height)
  }, [view, projects.length])

  async function handleSelectProject(projectId: string): Promise<void> {
    await window.api.timer.start(projectId)
  }

  async function handleStop(): Promise<void> {
    await window.api.timer.stop()
  }

  async function handleCreate(): Promise<void> {
    const name = createName.trim()
    if (!name) return
    const color = COLORS[projects.length % COLORS.length]
    const project = await window.api.projects.upsert({
      name,
      clientId: null,
      hourlyRate: null,
      color,
      imageDataUrl: null
    })
    setCreateName('')
    await window.api.timer.start(project.id)
  }

  const visibleProjects = view === 'grid-expanded' ? projects : projects.slice(0, 3)
  const hiddenCount = projects.length - visibleProjects.length

  return (
    <div className="widget" ref={rootRef}>
      <div className="widget-titlebar">
        <button title="Ajustes" onClick={() => window.api.window.openSettings()}>
          ⚙
        </button>
        <button title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'} onClick={toggleTheme}>
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        <div className="spacer" />
        <button title="Enviar al fondo" onClick={() => window.api.window.sendWidgetToBack()}>
          &#x2013;
        </button>
        <button
          title="Cerrar"
          className="close-btn"
          onClick={() => window.api.window.hideWidget()}
        >
          ×
        </button>
      </div>

      <div className="widget-content">
        {view === 'timer' && activeProject && (
          <>
            <div className="project-name">
              <ProjectAvatar project={activeProject} size={20} className="project-avatar" />
              {activeProject.name}
            </div>
            <div className="timer">{formatElapsed(elapsedMs)}</div>
            <div className="controls">
              <button className="btn danger" onClick={handleStop}>
                Detener
              </button>
            </div>
            <button className="widget-switch-link" onClick={() => setView('grid')}>
              Cambiar de proyecto
            </button>
          </>
        )}

        {(view === 'grid' || view === 'grid-expanded') && (
          <>
            {view === 'grid-expanded' && (
              <div className="grid-header">
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Todos los proyectos</span>
                <button onClick={() => setView('grid')}>Ver menos</button>
              </div>
            )}
            <div className={`tile-grid ${view === 'grid-expanded' ? 'expanded' : ''}`}>
              {visibleProjects.map((p) => (
                <button key={p.id} className="project-tile" onClick={() => handleSelectProject(p.id)}>
                  <ProjectAvatar project={p} size={34} className="tile-avatar tile-image" />
                  <span className="tile-label">{p.name}</span>
                </button>
              ))}

              {view === 'grid' &&
                (hiddenCount > 0 ? (
                  <button className="project-tile more-tile" onClick={() => setView('grid-expanded')}>
                    <span className="tile-avatar" style={{ fontSize: 16 }}>
                      +{hiddenCount}
                    </span>
                    <span className="tile-label">Ver más</span>
                  </button>
                ) : (
                  <button className="project-tile create-tile" onClick={() => setView('create')}>
                    <span className="tile-avatar">+</span>
                    <span className="tile-label">Crear proyecto</span>
                  </button>
                ))}
            </div>
            {view === 'grid-expanded' && (
              <button className="project-tile create-tile" style={{ marginTop: 8 }} onClick={() => setView('create')}>
                + Crear proyecto nuevo
              </button>
            )}
          </>
        )}

        {view === 'create' && (
          <div className="create-form">
            <input
              autoFocus
              placeholder="Nombre del proyecto"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <div className="create-form-actions">
              <button className="btn secondary" onClick={() => setView('grid')}>
                Cancelar
              </button>
              <button className="btn" onClick={handleCreate} disabled={!createName.trim()}>
                Crear e iniciar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
