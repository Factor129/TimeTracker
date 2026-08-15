import { useEffect, useState } from 'react'
import type { Client, Project, TimeEntry } from '../../shared/types'

function toLocalInputValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatRange(startedAt: string, endedAt: string): string {
  const start = new Date(startedAt)
  const end = new Date(endedAt)
  const sameDay = start.toDateString() === end.toDateString()
  const dateFmt: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }
  const timeFmt: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
  if (sameDay) {
    return `${start.toLocaleDateString('es-ES', dateFmt)} · ${start.toLocaleTimeString('es-ES', timeFmt)} – ${end.toLocaleTimeString('es-ES', timeFmt)}`
  }
  return `${start.toLocaleString('es-ES')} – ${end.toLocaleString('es-ES')}`
}

export default function EntriesList({
  fromISO,
  toISO,
  onChange
}: {
  fromISO: string
  toISO: string
  onChange?: () => void
}): React.JSX.Element {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')

  useEffect(() => {
    void load()
  }, [fromISO, toISO])

  async function load(): Promise<void> {
    const [e, p, c] = await Promise.all([
      window.api.entries.list(fromISO, toISO),
      window.api.projects.list(),
      window.api.clients.list()
    ])
    setEntries(
      e.filter((x): x is TimeEntry & { endedAt: string } => !!x.endedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    )
    setProjects(p)
    setClients(c)
  }

  function projectName(id: string): string {
    return projects.find((p) => p.id === id)?.name ?? 'Proyecto eliminado'
  }

  function clientName(id: string): string {
    const project = projects.find((p) => p.id === id)
    const client = clients.find((c) => c.id === project?.clientId)
    return client?.name ?? 'Sin cliente'
  }

  function startEdit(entry: TimeEntry): void {
    setEditingId(entry.id)
    setEditStart(toLocalInputValue(entry.startedAt))
    setEditEnd(toLocalInputValue(entry.endedAt as string))
  }

  async function saveEdit(id: string): Promise<void> {
    await window.api.entries.update(id, {
      startedAt: new Date(editStart).toISOString(),
      endedAt: new Date(editEnd).toISOString()
    })
    setEditingId(null)
    await load()
    onChange?.()
  }

  async function remove(id: string): Promise<void> {
    await window.api.entries.delete(id)
    await load()
    onChange?.()
  }

  return (
    <div style={{ marginTop: 20 }}>
      <h2 style={{ marginBottom: 10 }}>Registros</h2>
      {entries.length === 0 && (
        <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Sin registros individuales en este periodo.</p>
      )}
      {entries.map((entry) => (
        <div key={entry.id} className="project-settings-row">
          {editingId === entry.id ? (
            <div className="form-row">
              <input type="datetime-local" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
              <span style={{ color: 'var(--text-dim)' }}>a</span>
              <input type="datetime-local" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
              <button className="btn" onClick={() => saveEdit(entry.id)}>
                Guardar
              </button>
              <button className="btn secondary" onClick={() => setEditingId(null)}>
                Cancelar
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  {projectName(entry.projectId)} · <span style={{ color: 'var(--text-dim)' }}>{clientName(entry.projectId)}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  {formatRange(entry.startedAt, entry.endedAt as string)}
                </div>
              </div>
              <div className="row-actions">
                <button onClick={() => startEdit(entry)}>Editar</button>
                <button onClick={() => remove(entry.id)}>Eliminar</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
