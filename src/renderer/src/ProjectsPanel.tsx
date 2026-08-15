import { useEffect, useState } from 'react'
import type { Client, Project } from '../../shared/types'
import { EntityAvatar } from './EntityAvatar'

const COLORS = ['#f28c28', '#4c8bf5', '#37c07c', '#e6584f', '#a86ef2', '#f2c744']

function nextColor(count: number): string {
  return COLORS[count % COLORS.length]
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function firstDayOfMonthISO(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

async function exportProjectCsv(project: Project, fromDate: string, toDate: string): Promise<void> {
  const from = new Date(`${fromDate}T00:00:00`).toISOString()
  const to = new Date(`${toDate}T23:59:59.999`).toISOString()
  const entries = await window.api.entries.list(from, to, project.id)
  const closed = entries.filter((e) => e.endedAt)

  const header = ['Inicio', 'Fin', 'Duración (h)', 'Nota']
  const lines = closed.map((e) => {
    const start = new Date(e.startedAt)
    const end = new Date(e.endedAt as string)
    const hours = (end.getTime() - start.getTime()) / 3_600_000
    return [start.toLocaleString('es-ES'), end.toLocaleString('es-ES'), hours.toFixed(2), e.note]
  })
  const csv = [header, ...lines].map((row) => row.map((v) => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${project.name.replace(/\s+/g, '-')}_${fromDate}_${toDate}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function ClientSettingsCard({
  client,
  onChanged
}: {
  client: Client
  onChanged: () => void
}): React.JSX.Element {
  const [name, setName] = useState(client.name)
  const [saving, setSaving] = useState(false)

  async function save(): Promise<void> {
    setSaving(true)
    try {
      await window.api.clients.upsert({
        id: client.id,
        name: name.trim() || client.name,
        color: client.color
      })
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await fileToDataUrl(file)
    await window.api.clients.upsert({
      id: client.id,
      name: client.name,
      color: client.color,
      imageDataUrl: dataUrl
    })
    onChanged()
  }

  async function toggleArchive(): Promise<void> {
    await window.api.clients.archive(client.id, !client.archived)
    onChanged()
  }

  return (
    <div className="project-settings-row">
      <div className="form-row" style={{ justifyContent: 'space-between' }}>
        <div className="image-upload">
          <EntityAvatar entity={client} size={36} className="project-avatar" />
          <label className="btn secondary" style={{ fontSize: 11, padding: '6px 10px' }}>
            Cambiar logo
            <input type="file" accept="image/*" onChange={handleImage} />
          </label>
        </div>
        <span className="badge">{client.archived ? 'Archivado' : 'Activo'}</span>
      </div>

      <div className="form-row">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del cliente" />
        <button className="btn" onClick={save} disabled={saving}>
          Guardar
        </button>
        <button className="btn secondary" onClick={toggleArchive}>
          {client.archived ? 'Restaurar' : 'Archivar'}
        </button>
      </div>
    </div>
  )
}

function ProjectSettingsCard({
  project,
  clients,
  onChanged
}: {
  project: Project
  clients: Client[]
  onChanged: () => void
}): React.JSX.Element {
  const [name, setName] = useState(project.name)
  const [clientId, setClientId] = useState(project.clientId ?? '')
  const [rate, setRate] = useState(project.hourlyRate != null ? String(project.hourlyRate) : '')
  const [from, setFrom] = useState(firstDayOfMonthISO())
  const [to, setTo] = useState(todayISO())
  const [saving, setSaving] = useState(false)

  async function save(): Promise<void> {
    setSaving(true)
    try {
      await window.api.projects.upsert({
        id: project.id,
        name: name.trim() || project.name,
        clientId: clientId || null,
        hourlyRate: rate ? Number(rate) : null,
        color: project.color
      })
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await fileToDataUrl(file)
    await window.api.projects.upsert({
      id: project.id,
      name: project.name,
      clientId: project.clientId,
      hourlyRate: project.hourlyRate,
      color: project.color,
      imageDataUrl: dataUrl
    })
    onChanged()
  }

  async function toggleArchive(): Promise<void> {
    await window.api.projects.archive(project.id, !project.archived)
    onChanged()
  }

  return (
    <div className="project-settings-row">
      <div className="form-row" style={{ justifyContent: 'space-between' }}>
        <div className="image-upload">
          <EntityAvatar entity={project} size={36} className="project-avatar" />
          <label className="btn secondary" style={{ fontSize: 11, padding: '6px 10px' }}>
            Cambiar imagen
            <input type="file" accept="image/*" onChange={handleImage} />
          </label>
        </div>
        <span className="badge">{project.archived ? 'Archivado' : 'Activo'}</span>
      </div>

      <div className="form-row">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" />
        <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">Sin cliente</option>
          {clients
            .filter((c) => !c.archived)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
        <input
          type="number"
          min="0"
          step="0.01"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          placeholder="€/hora"
          style={{ width: 120 }}
        />
        <button className="btn" onClick={save} disabled={saving}>
          Guardar
        </button>
        <button className="btn secondary" onClick={toggleArchive}>
          {project.archived ? 'Restaurar' : 'Archivar'}
        </button>
      </div>

      <div className="range-export">
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Exportar tiempo entre</span>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>y</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <button className="btn secondary" onClick={() => exportProjectCsv(project, from, to)}>
          Descargar CSV
        </button>
      </div>
    </div>
  )
}

export default function ProjectsPanel(): React.JSX.Element {
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [clientName, setClientName] = useState('')
  const [projectName, setProjectName] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    void refresh()
    const offP = window.api.projects.onChanged((p) => setProjects(p))
    const offC = window.api.clients.onChanged((c) => setClients(c))
    return () => {
      offP()
      offC()
    }
  }, [])

  async function refresh(): Promise<void> {
    const [c, p] = await Promise.all([window.api.clients.list(), window.api.projects.list()])
    setClients(c)
    setProjects(p)
  }

  async function addClient(): Promise<void> {
    if (!clientName.trim()) return
    await window.api.clients.upsert({ name: clientName.trim(), color: nextColor(clients.length) })
    setClientName('')
    await refresh()
  }

  async function addProject(): Promise<void> {
    if (!projectName.trim()) return
    await window.api.projects.upsert({
      name: projectName.trim(),
      clientId: null,
      hourlyRate: null,
      color: nextColor(projects.length)
    })
    setProjectName('')
    await refresh()
  }

  const visibleClients = clients.filter((c) => showArchived || !c.archived)
  const visibleProjects = projects.filter((p) => showArchived || !p.archived)

  return (
    <>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Clientes</h2>
          <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />{' '}
            Mostrar archivados
          </label>
        </div>
        <div className="form-row" style={{ marginTop: 12 }}>
          <input
            placeholder="Nombre del nuevo cliente"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addClient()}
          />
          <button className="btn" onClick={addClient}>
            Añadir cliente
          </button>
        </div>
        <div style={{ marginTop: 8 }}>
          {visibleClients.map((c) => (
            <ClientSettingsCard key={c.id} client={c} onChanged={refresh} />
          ))}
          {visibleClients.length === 0 && (
            <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>No hay clientes todavía.</p>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Proyectos</h2>
        <div className="form-row">
          <input
            placeholder="Nombre del nuevo proyecto"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addProject()}
          />
          <button className="btn" onClick={addProject}>
            Añadir proyecto
          </button>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          Asigna el cliente, la tarifa y la imagen del proyecto una vez creado.
        </span>
        <div style={{ marginTop: 12 }}>
          {visibleProjects.map((p) => (
            <ProjectSettingsCard key={p.id} project={p} clients={clients} onChanged={refresh} />
          ))}
          {visibleProjects.length === 0 && (
            <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>No hay proyectos todavía.</p>
          )}
        </div>
      </div>
    </>
  )
}
