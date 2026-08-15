import { ipcMain, BrowserWindow } from 'electron'
import * as db from './db'
import { createMainWindow, openCalendarWindow, sendWidgetToBack, hideWidgetWindow } from './windows'
import { setAutoLaunch } from './autostart'
import { armReminders, disarmReminders } from './reminders'
import type { TimeEntry } from '../shared/types'

let rebuildTrayMenuRef: (() => Promise<void>) | null = null

export function setTrayRefresher(fn: () => Promise<void>): void {
  rebuildTrayMenuRef = fn
}

export function broadcastTimerState(): void {
  db.getRunning().then(({ running }) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('timer:changed', running)
    }
  })
}

export function broadcastProjectsChanged(): void {
  db.listProjects().then((projects) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('projects:changed', projects)
    }
  })
}

export function broadcastClientsChanged(): void {
  db.listClients().then((clients) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('clients:changed', clients)
    }
  })
}

export function broadcastSettingsChanged(): void {
  db.getSettings().then((settings) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('settings:changed', settings)
    }
  })
}

export function registerIpcHandlers(): void {
  ipcMain.handle('clients:list', () => db.listClients())
  ipcMain.handle('clients:upsert', async (_e, input) => {
    const result = await db.upsertClient(input)
    broadcastClientsChanged()
    return result
  })
  ipcMain.handle('clients:archive', async (_e, id: string, archived: boolean) => {
    await db.archiveClient(id, archived)
    broadcastClientsChanged()
  })

  ipcMain.handle('projects:list', () => db.listProjects())
  ipcMain.handle('projects:upsert', async (_e, input) => {
    const result = await db.upsertProject(input)
    await rebuildTrayMenuRef?.()
    broadcastProjectsChanged()
    return result
  })
  ipcMain.handle('projects:archive', async (_e, id: string, archived: boolean) => {
    await db.archiveProject(id, archived)
    await rebuildTrayMenuRef?.()
    broadcastProjectsChanged()
  })

  ipcMain.handle('timer:get', () => db.getRunning())
  ipcMain.handle('timer:start', (_e, projectId: string) => startTimerAction(projectId))
  ipcMain.handle('timer:stop', () => stopTimerAction())

  ipcMain.handle('entries:list', (_e, from?: string, to?: string, projectId?: string) =>
    db.listEntries(from, to, projectId)
  )
  ipcMain.handle('entries:delete', async (_e, id: string) => {
    await db.deleteEntry(id)
  })
  ipcMain.handle('entries:update', (_e, id: string, patch: { startedAt: string; endedAt: string }) =>
    db.updateEntry(id, patch)
  )

  ipcMain.handle('report:monthly', (_e, year: number, month: number) => db.monthlyReport(year, month))
  ipcMain.handle('report:range', (_e, fromISO: string, toISO: string) => db.reportForRange(fromISO, toISO))

  ipcMain.handle('blocks:list', (_e, fromISO: string, toISO: string) => db.listBlocks(fromISO, toISO))
  ipcMain.handle('blocks:upsert', (_e, input) => db.upsertBlock(input))
  ipcMain.handle('blocks:extend', (_e, id: string, minutes: number) => db.extendBlock(id, minutes))
  ipcMain.handle('blocks:delete', async (_e, id: string) => {
    await db.deleteBlock(id)
  })

  ipcMain.handle('settings:get', () => db.getSettings())
  ipcMain.handle('settings:update', async (_e, patch) => {
    if (typeof patch.autoLaunch === 'boolean') {
      await setAutoLaunch(patch.autoLaunch)
    }
    const result = await db.updateSettings(patch)
    broadcastSettingsChanged()
    return result
  })

  ipcMain.handle('window:openSettings', () => {
    createMainWindow()
  })
  ipcMain.handle('window:openCalendar', () => {
    openCalendarWindow()
  })
  ipcMain.handle('window:sendWidgetToBack', () => {
    sendWidgetToBack()
  })
  ipcMain.handle('window:hideWidget', () => {
    hideWidgetWindow()
  })
}

export async function startTimerAction(projectId: string): Promise<void> {
  await db.startTimer(projectId)
  const [projects, clients] = await Promise.all([db.listProjects(), db.listClients()])
  const project = projects.find((p) => p.id === projectId)
  const client = clients.find((c) => c.id === project?.clientId)
  const label = client ? `${client.name} · ${project?.name}` : project?.name ?? 'proyecto'
  armReminders(new Date().toISOString(), label)
  await rebuildTrayMenuRef?.()
  broadcastTimerState()
}

export async function stopTimerAction(): Promise<TimeEntry | null> {
  const entry = await db.stopTimer()
  disarmReminders()
  await rebuildTrayMenuRef?.()
  broadcastTimerState()
  return entry
}
