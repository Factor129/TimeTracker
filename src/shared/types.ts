export interface Client {
  id: string
  name: string
  archived: boolean
}

export interface Project {
  id: string
  name: string
  clientId: string | null
  hourlyRate: number | null
  color: string
  imageDataUrl: string | null
  archived: boolean
}

export interface TimeEntry {
  id: string
  projectId: string
  startedAt: string // ISO datetime
  endedAt: string | null // null while running
  note: string
}

export interface RunningTimer {
  projectId: string
  startedAt: string
}

export type ThemeMode = 'light' | 'dark'

export interface AppSettings {
  theme: ThemeMode
  autoLaunch: boolean
}

export interface AppData {
  clients: Client[]
  projects: Project[]
  entries: TimeEntry[]
  running: RunningTimer | null
  settings: AppSettings
}

export interface MonthlyReportRow {
  projectId: string
  projectName: string
  clientName: string
  hourlyRate: number | null
  totalMs: number
  totalHours: number
  amount: number | null
}
