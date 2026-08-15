import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { randomUUID } from 'crypto'
import type { AppData, AppSettings, Client, Project, TimeEntry, ReportRow } from '../shared/types'

const defaultData: AppData = {
  clients: [],
  projects: [],
  entries: [],
  running: null,
  settings: {
    theme: 'dark',
    autoLaunch: true,
    widgetWidth: 300,
    widgetHeight: 400
  }
}

function uuid(): string {
  return randomUUID()
}

let data: AppData
let filePath: string

export async function initDb(): Promise<void> {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  filePath = join(dir, 'time-tracker-data.json')
  if (existsSync(filePath)) {
    data = { ...structuredClone(defaultData), ...JSON.parse(readFileSync(filePath, 'utf-8')) }
  } else {
    data = structuredClone(defaultData)
    persist()
  }
}

function persist(): void {
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

// Kept async to preserve the call sites/signatures used across the app.
async function write(): Promise<void> {
  persist()
}

function d(): AppData {
  return data
}

// ---- Clients ----
export async function listClients(): Promise<Client[]> {
  return d().clients
}

export async function upsertClient(input: {
  id?: string
  name: string
  color: string
  imageDataUrl?: string | null
}): Promise<Client> {
  const data = d()
  if (input.id) {
    const existing = data.clients.find((c) => c.id === input.id)
    if (!existing) throw new Error('Client not found')
    existing.name = input.name
    existing.color = input.color
    if (input.imageDataUrl !== undefined) existing.imageDataUrl = input.imageDataUrl
    await write()
    return existing
  }
  const client: Client = {
    id: uuid(),
    name: input.name,
    color: input.color,
    imageDataUrl: input.imageDataUrl ?? null,
    archived: false
  }
  data.clients.push(client)
  await write()
  return client
}

export async function archiveClient(id: string, archived: boolean): Promise<void> {
  const client = d().clients.find((c) => c.id === id)
  if (client) {
    client.archived = archived
    await write()
  }
}

// ---- Projects ----
export async function listProjects(): Promise<Project[]> {
  return d().projects
}

export async function upsertProject(input: {
  id?: string
  name: string
  clientId: string | null
  hourlyRate: number | null
  color: string
  imageDataUrl?: string | null
}): Promise<Project> {
  const data = d()
  if (input.id) {
    const existing = data.projects.find((p) => p.id === input.id)
    if (!existing) throw new Error('Project not found')
    existing.name = input.name
    existing.clientId = input.clientId
    existing.hourlyRate = input.hourlyRate
    existing.color = input.color
    if (input.imageDataUrl !== undefined) existing.imageDataUrl = input.imageDataUrl
    await write()
    return existing
  }
  const project: Project = {
    id: uuid(),
    name: input.name,
    clientId: input.clientId,
    hourlyRate: input.hourlyRate,
    color: input.color,
    imageDataUrl: input.imageDataUrl ?? null,
    archived: false
  }
  data.projects.push(project)
  await write()
  return project
}

export async function archiveProject(id: string, archived: boolean): Promise<void> {
  const project = d().projects.find((p) => p.id === id)
  if (project) {
    project.archived = archived
    await write()
  }
}

// ---- Timer ----
export async function getRunning(): Promise<{ running: AppData['running']; entries: TimeEntry[] }> {
  return { running: d().running, entries: d().entries }
}

export async function startTimer(projectId: string): Promise<void> {
  const data = d()
  if (data.running) {
    await stopTimer()
  }
  data.running = { projectId, startedAt: new Date().toISOString() }
  await write()
}

export async function stopTimer(): Promise<TimeEntry | null> {
  const data = d()
  if (!data.running) return null
  const entry: TimeEntry = {
    id: uuid(),
    projectId: data.running.projectId,
    startedAt: data.running.startedAt,
    endedAt: new Date().toISOString(),
    note: ''
  }
  data.entries.push(entry)
  data.running = null
  await write()
  return entry
}

export async function listEntries(
  fromISO?: string,
  toISO?: string,
  projectId?: string
): Promise<TimeEntry[]> {
  let entries = d().entries
  if (fromISO) entries = entries.filter((e) => e.startedAt >= fromISO)
  if (toISO) entries = entries.filter((e) => e.startedAt <= toISO)
  if (projectId) entries = entries.filter((e) => e.projectId === projectId)
  return entries
}

export async function deleteEntry(id: string): Promise<void> {
  const data = d()
  data.entries = data.entries.filter((e) => e.id !== id)
  await write()
}

// ---- Settings ----
export async function getSettings(): Promise<AppSettings> {
  return d().settings
}

/** Synchronous read for callers (window creation) that run before an await is convenient. */
export function getSettingsSync(): AppSettings | undefined {
  return data?.settings
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const data = d()
  data.settings = { ...data.settings, ...patch }
  await write()
  return data.settings
}

// ---- Reports ----
export async function reportForRange(fromISO: string, toISO: string): Promise<ReportRow[]> {
  const data = d()
  const rows = new Map<string, ReportRow>()

  for (const project of data.projects) {
    const client = data.clients.find((c) => c.id === project.clientId)
    rows.set(project.id, {
      projectId: project.id,
      projectName: project.name,
      clientName: client?.name ?? 'Sin cliente',
      hourlyRate: project.hourlyRate,
      totalMs: 0,
      totalHours: 0,
      amount: project.hourlyRate != null ? 0 : null
    })
  }

  const closedEntries = data.entries.filter(
    (e) => e.endedAt && e.startedAt >= fromISO && e.startedAt < toISO
  )

  for (const entry of closedEntries) {
    const row = rows.get(entry.projectId)
    if (!row) continue
    const ms = new Date(entry.endedAt as string).getTime() - new Date(entry.startedAt).getTime()
    row.totalMs += ms
  }

  for (const row of rows.values()) {
    row.totalHours = row.totalMs / 3_600_000
    if (row.hourlyRate != null) {
      row.amount = row.totalHours * row.hourlyRate
    }
  }

  return Array.from(rows.values()).filter((r) => r.totalMs > 0)
}

export async function monthlyReport(year: number, month: number): Promise<ReportRow[]> {
  const start = new Date(year, month - 1, 1).toISOString()
  const end = new Date(year, month, 1).toISOString()
  return reportForRange(start, end)
}
