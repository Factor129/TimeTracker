import { contextBridge, ipcRenderer } from 'electron'
import type { Client, Project, TimeEntry, RunningTimer, ReportRow, AppSettings } from '../shared/types'

const api = {
  clients: {
    list: (): Promise<Client[]> => ipcRenderer.invoke('clients:list'),
    upsert: (input: {
      id?: string
      name: string
      color: string
      imageDataUrl?: string | null
    }): Promise<Client> => ipcRenderer.invoke('clients:upsert', input),
    archive: (id: string, archived: boolean): Promise<void> =>
      ipcRenderer.invoke('clients:archive', id, archived),
    onChanged: (cb: (clients: Client[]) => void): (() => void) => {
      const listener = (_e: unknown, clients: Client[]): void => cb(clients)
      ipcRenderer.on('clients:changed', listener)
      return () => ipcRenderer.removeListener('clients:changed', listener)
    }
  },
  projects: {
    list: (): Promise<Project[]> => ipcRenderer.invoke('projects:list'),
    upsert: (input: {
      id?: string
      name: string
      clientId: string | null
      hourlyRate: number | null
      color: string
      imageDataUrl?: string | null
    }): Promise<Project> => ipcRenderer.invoke('projects:upsert', input),
    archive: (id: string, archived: boolean): Promise<void> =>
      ipcRenderer.invoke('projects:archive', id, archived),
    onChanged: (cb: (projects: Project[]) => void): (() => void) => {
      const listener = (_e: unknown, projects: Project[]): void => cb(projects)
      ipcRenderer.on('projects:changed', listener)
      return () => ipcRenderer.removeListener('projects:changed', listener)
    }
  },
  timer: {
    get: (): Promise<{ running: RunningTimer | null; entries: TimeEntry[] }> =>
      ipcRenderer.invoke('timer:get'),
    start: (projectId: string): Promise<void> => ipcRenderer.invoke('timer:start', projectId),
    stop: (): Promise<TimeEntry | null> => ipcRenderer.invoke('timer:stop'),
    onChanged: (cb: (running: RunningTimer | null) => void): (() => void) => {
      const listener = (_e: unknown, running: RunningTimer | null): void => cb(running)
      ipcRenderer.on('timer:changed', listener)
      return () => ipcRenderer.removeListener('timer:changed', listener)
    }
  },
  entries: {
    list: (from?: string, to?: string, projectId?: string): Promise<TimeEntry[]> =>
      ipcRenderer.invoke('entries:list', from, to, projectId),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('entries:delete', id)
  },
  report: {
    monthly: (year: number, month: number): Promise<ReportRow[]> =>
      ipcRenderer.invoke('report:monthly', year, month),
    range: (fromISO: string, toISO: string): Promise<ReportRow[]> =>
      ipcRenderer.invoke('report:range', fromISO, toISO)
  },
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
    update: (patch: Partial<AppSettings>): Promise<AppSettings> =>
      ipcRenderer.invoke('settings:update', patch),
    onChanged: (cb: (settings: AppSettings) => void): (() => void) => {
      const listener = (_e: unknown, settings: AppSettings): void => cb(settings)
      ipcRenderer.on('settings:changed', listener)
      return () => ipcRenderer.removeListener('settings:changed', listener)
    }
  },
  window: {
    openSettings: (): Promise<void> => ipcRenderer.invoke('window:openSettings'),
    sendWidgetToBack: (): Promise<void> => ipcRenderer.invoke('window:sendWidgetToBack'),
    hideWidget: (): Promise<void> => ipcRenderer.invoke('window:hideWidget')
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
