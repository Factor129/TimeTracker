import { useEffect, useMemo, useState } from 'react'
import type { Client, Project, TimeBlock } from '../../shared/types'
import { EntityAvatar } from './EntityAvatar'

function todayISODate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dayBounds(dateISO: string): { from: string; to: string } {
  const [y, m, d] = dateISO.split('-').map(Number)
  const from = new Date(y, m - 1, d, 0, 0, 0, 0)
  const to = new Date(y, m - 1, d + 1, 0, 0, 0, 0)
  return { from: from.toISOString(), to: to.toISOString() }
}

function shiftDate(dateISO: string, deltaDays: number): string {
  const [y, m, d] = dateISO.split('-').map(Number)
  const dt = new Date(y, m - 1, d + deltaDays)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

function formatDateLabel(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const label = dt.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function timeOf(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function combineDateTime(dateISO: string, timeHHMM: string): string {
  return new Date(`${dateISO}T${timeHHMM}:00`).toISOString()
}

interface BlockFormState {
  id?: string
  projectId: string
  start: string
  end: string
}

export default function CalendarPanel(): React.JSX.Element {
  const [date, setDate] = useState(todayISODate())
  const [blocks, setBlocks] = useState<TimeBlock[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [form, setForm] = useState<BlockFormState | null>(null)

  useEffect(() => {
    void loadStatic()
  }, [])

  useEffect(() => {
    void loadBlocks()
  }, [date])

  async function loadStatic(): Promise<void> {
    const [p, c] = await Promise.all([window.api.projects.list(), window.api.clients.list()])
    setProjects(p.filter((x) => !x.archived))
    setClients(c)
  }

  async function loadBlocks(): Promise<void> {
    const { from, to } = dayBounds(date)
    const list = await window.api.blocks.list(from, to)
    setBlocks(list.sort((a, b) => a.startAt.localeCompare(b.startAt)))
  }

  const projectLabel = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of projects) {
      const client = clients.find((c) => c.id === p.clientId)
      map.set(p.id, client ? `${client.name} · ${p.name}` : p.name)
    }
    return map
  }, [projects, clients])

  function openNewForm(): void {
    setForm({ projectId: projects[0]?.id ?? '', start: '09:00', end: '10:00' })
  }

  function openEditForm(block: TimeBlock): void {
    setForm({ id: block.id, projectId: block.projectId, start: timeOf(block.startAt), end: timeOf(block.endAt) })
  }

  async function saveForm(): Promise<void> {
    if (!form || !form.projectId) return
    await window.api.blocks.upsert({
      id: form.id,
      projectId: form.projectId,
      startAt: combineDateTime(date, form.start),
      endAt: combineDateTime(date, form.end)
    })
    setForm(null)
    await loadBlocks()
  }

  async function removeBlock(id: string): Promise<void> {
    await window.api.blocks.delete(id)
    await loadBlocks()
  }

  async function extendBlock(id: string, minutes: number): Promise<void> {
    await window.api.blocks.extend(id, minutes)
    await loadBlocks()
  }

  const now = Date.now()

  return (
    <div className="card">
      <div className="month-picker">
        <button className="btn secondary" onClick={() => setDate(shiftDate(date, -1))}>
          ← Anterior
        </button>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button className="btn secondary" onClick={() => setDate(todayISODate())}>
          Hoy
        </button>
        <button className="btn secondary" onClick={() => setDate(shiftDate(date, 1))}>
          Siguiente →
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={openNewForm} disabled={projects.length === 0}>
          + Bloquear tiempo
        </button>
      </div>

      <div style={{ marginBottom: 12, fontWeight: 600, color: 'var(--text-dim)', fontSize: 13 }}>
        {formatDateLabel(date)}
      </div>

      {projects.length === 0 && (
        <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
          Crea al menos un proyecto antes de planificar bloques de tiempo.
        </p>
      )}

      {form && (
        <div className="project-settings-row">
          <div className="form-row">
            <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {projectLabel.get(p.id)}
                </option>
              ))}
            </select>
            <input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
            <span style={{ color: 'var(--text-dim)' }}>a</span>
            <input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
            <button className="btn" onClick={saveForm}>
              Guardar
            </button>
            <button className="btn secondary" onClick={() => setForm(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div>
        {blocks.map((block) => {
          const project = projects.find((p) => p.id === block.projectId)
          const isPast = new Date(block.endAt).getTime() < now
          const isSoon = !isPast && new Date(block.endAt).getTime() - now < 10 * 60_000
          return (
            <div
              key={block.id}
              className="project-settings-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                opacity: isPast ? 0.55 : 1,
                borderColor: isSoon ? 'var(--danger)' : undefined
              }}
            >
              {project && <EntityAvatar entity={project} size={32} className="project-avatar" />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  {timeOf(block.startAt)} – {timeOf(block.endAt)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  {project ? projectLabel.get(project.id) : 'Proyecto eliminado'}
                </div>
              </div>
              <div className="row-actions">
                <button onClick={() => extendBlock(block.id, 15)}>+15 min</button>
                <button onClick={() => extendBlock(block.id, 30)}>+30 min</button>
                <button onClick={() => openEditForm(block)}>Editar</button>
                <button onClick={() => removeBlock(block.id)}>Eliminar</button>
              </div>
            </div>
          )
        })}
        {blocks.length === 0 && (
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>No hay bloques planificados para este día.</p>
        )}
      </div>
    </div>
  )
}
