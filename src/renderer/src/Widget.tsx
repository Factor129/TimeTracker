import { useEffect, useMemo, useState } from 'react'
import type { Client, Project, RunningTimer } from '../../shared/types'
import { EntityAvatar, type AvatarLike } from './EntityAvatar'
import { useTheme } from './useTheme'

const COLORS = ['#f28c28', '#4c8bf5', '#37c07c', '#e6584f', '#a86ef2', '#f2c744']
const NONE_CLIENT_ID = '__none__'

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n: number): string => n.toString().padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

type View = 'clients' | 'projects' | 'timer' | 'create-client' | 'create-project'

interface Selection {
  id: string | null // null = "Sin cliente" bucket
  label: string
}

type Tile = { kind: 'entity'; entity: AvatarLike; onClick: () => void } | { kind: 'more'; count: number; onClick: () => void } | { kind: 'create'; label: string; onClick: () => void }

function buildTiles(
  items: AvatarLike[],
  expanded: boolean,
  onSelect: (entity: AvatarLike) => void,
  onExpand: () => void,
  onCreate: () => void,
  createLabel: string
): Tile[] {
  const visible = expanded ? items : items.slice(0, 3)
  const tiles: Tile[] = visible.map((entity) => ({
    kind: 'entity',
    entity,
    onClick: () => onSelect(entity)
  }))
  if (!expanded && items.length > 3) {
    tiles.push({ kind: 'more', count: items.length - 3, onClick: onExpand })
  } else {
    tiles.push({ kind: 'create', label: createLabel, onClick: onCreate })
  }
  return tiles
}

export default function Widget(): React.JSX.Element {
  const [theme, toggleTheme] = useTheme()
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [running, setRunning] = useState<RunningTimer | null>(null)
  const [now, setNow] = useState<number>(Date.now())
  const [view, setView] = useState<View>('clients')
  const [selection, setSelection] = useState<Selection | null>(null)
  const [clientsExpanded, setClientsExpanded] = useState(false)
  const [projectsExpanded, setProjectsExpanded] = useState(false)
  const [createName, setCreateName] = useState('')

  useEffect(() => {
    void refresh()
    const offTimer = window.api.timer.onChanged((r) => setRunning(r))
    const offProjects = window.api.projects.onChanged((p) => setProjects(p.filter((x) => !x.archived)))
    const offClients = window.api.clients.onChanged((c) => setClients(c.filter((x) => !x.archived)))
    const tick = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      offTimer()
      offProjects()
      offClients()
      clearInterval(tick)
    }
  }, [])

  useEffect(() => {
    setView(running ? 'timer' : 'clients')
  }, [running])

  async function refresh(): Promise<void> {
    const [clientList, projectList, timer] = await Promise.all([
      window.api.clients.list(),
      window.api.projects.list(),
      window.api.timer.get()
    ])
    setClients(clientList.filter((c) => !c.archived))
    setProjects(projectList.filter((p) => !p.archived))
    setRunning(timer.running)
  }

  const activeProject = useMemo(
    () => projects.find((p) => p.id === running?.projectId) ?? null,
    [projects, running]
  )
  const activeClient = useMemo(
    () => clients.find((c) => c.id === activeProject?.clientId) ?? null,
    [clients, activeProject]
  )

  const elapsedMs = running ? now - new Date(running.startedAt).getTime() : 0

  const hasOrphanProjects = useMemo(() => projects.some((p) => !p.clientId), [projects])

  const projectsForSelection = useMemo(() => {
    if (!selection) return []
    return projects.filter((p) => (selection.id === null ? !p.clientId : p.clientId === selection.id))
  }, [projects, selection])

  function openClient(client: Client): void {
    setSelection({ id: client.id, label: client.name })
    setProjectsExpanded(false)
    setView('projects')
  }

  function openNoneBucket(): void {
    setSelection({ id: null, label: 'Sin cliente' })
    setProjectsExpanded(false)
    setView('projects')
  }

  async function selectProject(projectId: string): Promise<void> {
    await window.api.timer.start(projectId)
  }

  async function handleStop(): Promise<void> {
    await window.api.timer.stop()
  }

  function switchProject(): void {
    if (activeProject) {
      setSelection(
        activeProject.clientId
          ? { id: activeProject.clientId, label: activeClient?.name ?? 'Cliente' }
          : { id: null, label: 'Sin cliente' }
      )
    }
    setProjectsExpanded(false)
    setView('projects')
  }

  async function handleCreateClient(): Promise<void> {
    const name = createName.trim()
    if (!name) return
    const color = COLORS[clients.length % COLORS.length]
    const client = await window.api.clients.upsert({ name, color, imageDataUrl: null })
    setCreateName('')
    setSelection({ id: client.id, label: client.name })
    setView('projects')
  }

  async function handleCreateProject(): Promise<void> {
    const name = createName.trim()
    if (!name || !selection) return
    const color = COLORS[projects.length % COLORS.length]
    const project = await window.api.projects.upsert({
      name,
      clientId: selection.id,
      hourlyRate: null,
      color,
      imageDataUrl: null
    })
    setCreateName('')
    await window.api.timer.start(project.id)
  }

  const clientEntities: AvatarLike[] = hasOrphanProjects
    ? [...clients, { id: NONE_CLIENT_ID, name: 'Sin cliente', color: '#8a8f9c', imageDataUrl: null }]
    : clients

  return (
    <div className="widget">
      <div className="widget-titlebar">
        <button title="Ajustes" onClick={() => window.api.window.openSettings()}>
          ⚙
        </button>
        <button title="Calendario" onClick={() => window.api.window.openCalendar()}>
          📅
        </button>
        <button title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'} onClick={toggleTheme}>
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        <div className="spacer" />
        <button title="Enviar al escritorio" onClick={() => window.api.window.sendWidgetToBack()}>
          &#x2013;
        </button>
        <button title="Cerrar (sigue en la bandeja)" className="close-btn" onClick={() => window.api.window.hideWidget()}>
          ×
        </button>
      </div>

      <div className="widget-content">
        {view === 'timer' && activeProject && (
          <div className="timer-view">
            <div className="timer-meta">
              <EntityAvatar entity={activeClient ?? activeProject} size={40} className="entity-avatar" />
              <div className="timer-meta-text">
                {activeClient && <div className="timer-client">{activeClient.name}</div>}
                <div className="timer-project">{activeProject.name}</div>
              </div>
            </div>
            <div className="timer-clock">{formatElapsed(elapsedMs)}</div>
            <button className="btn-pill danger" onClick={handleStop}>
              Detener
            </button>
            <button className="link-btn" onClick={switchProject}>
              Cambiar proyecto
            </button>
          </div>
        )}

        {view === 'clients' && (
          <>
            <div className="section-label">Clientes</div>
            <div className="tile-grid">
              {buildTiles(
                clientEntities,
                clientsExpanded,
                (entity) => {
                  if (entity.id === NONE_CLIENT_ID) openNoneBucket()
                  else openClient(clients.find((c) => c.id === entity.id) as Client)
                },
                () => setClientsExpanded(true),
                () => {
                  setCreateName('')
                  setView('create-client')
                },
                'Nuevo cliente'
              ).map((tile, i) => (
                <TileButton key={i} tile={tile} />
              ))}
            </div>
          </>
        )}

        {view === 'projects' && selection && (
          <>
            <div className="section-label with-back">
              <button className="back-btn" onClick={() => setView('clients')}>
                ‹
              </button>
              {selection.label}
            </div>
            <div className="tile-grid">
              {buildTiles(
                projectsForSelection,
                projectsExpanded,
                (entity) => void selectProject(entity.id),
                () => setProjectsExpanded(true),
                () => {
                  setCreateName('')
                  setView('create-project')
                },
                'Nuevo proyecto'
              ).map((tile, i) => (
                <TileButton key={i} tile={tile} />
              ))}
            </div>
          </>
        )}

        {(view === 'create-client' || view === 'create-project') && (
          <div className="create-view">
            <div className="section-label with-back">
              <button
                className="back-btn"
                onClick={() => setView(view === 'create-client' ? 'clients' : 'projects')}
              >
                ‹
              </button>
              {view === 'create-client' ? 'Nuevo cliente' : `Nuevo proyecto · ${selection?.label}`}
            </div>
            <input
              autoFocus
              className="create-input"
              placeholder={view === 'create-client' ? 'Nombre del cliente' : 'Nombre del proyecto'}
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) =>
                e.key === 'Enter' &&
                (view === 'create-client' ? handleCreateClient() : handleCreateProject())
              }
            />
            <button
              className="btn-pill"
              onClick={view === 'create-client' ? handleCreateClient : handleCreateProject}
              disabled={!createName.trim()}
            >
              {view === 'create-client' ? 'Crear cliente' : 'Crear e iniciar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function TileButton({ tile }: { tile: Tile }): React.JSX.Element {
  if (tile.kind === 'entity') {
    return (
      <button className="tile" onClick={tile.onClick}>
        <EntityAvatar entity={tile.entity} size={36} className="tile-avatar" />
        <span className="tile-label">{tile.entity.name}</span>
      </button>
    )
  }
  if (tile.kind === 'more') {
    return (
      <button className="tile tile-ghost" onClick={tile.onClick}>
        <span className="tile-avatar tile-avatar-ghost">+{tile.count}</span>
        <span className="tile-label">Ver más</span>
      </button>
    )
  }
  return (
    <button className="tile tile-ghost" onClick={tile.onClick}>
      <span className="tile-avatar tile-avatar-ghost tile-plus">+</span>
      <span className="tile-label">{tile.label}</span>
    </button>
  )
}
