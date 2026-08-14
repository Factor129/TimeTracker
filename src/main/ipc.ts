import { ipcMain, BrowserWindow } from 'electron'
import * as db from './db'
import { createMainWindow, resizeWidgetWindow, sendWidgetToBack, hideWidgetWindow } from './windows'
import { setAutoLaunch } from './autostart'

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

export function broadcastSettingsChanged(): void {
  db.getSettings().then((settings) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('settings:changed', settings)
    }
  })
}

export function registerIpcHandlers(): void {
  ipcMain.handle('clients:list', () => db.listClients())
  ipcMain.handle('clients:upsert', (_e, input) => db.upsertClient(input))
  ipcMain.handle('clients:archive', (_e, id: string, archived: boolean) => db.archiveClient(id, archived))

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
  ipcMain.handle('timer:start', async (_e, projectId: string) => {
    await db.startTimer(projectId)
    await rebuildTrayMenuRef?.()
    broadcastTimerState()
  })
  ipcMain.handle('timer:stop', async () => {
    const entry = await db.stopTimer()
    await rebuildTrayMenuRef?.()
    broadcastTimerState()
    return entry
  })

  ipcMain.handle('entries:list', (_e, from?: string, to?: string, projectId?: string) =>
    db.listEntries(from, to, projectId)
  )
  ipcMain.handle('entries:delete', async (_e, id: string) => {
    await db.deleteEntry(id)
  })

  ipcMain.handle('report:monthly', (_e, year: number, month: number) => db.monthlyReport(year, month))

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
  ipcMain.handle('window:sendWidgetToBack', () => {
    sendWidgetToBack()
  })
  ipcMain.handle('window:hideWidget', () => {
    hideWidgetWindow()
  })
  ipcMain.handle('window:resizeWidget', (_e, width: number, height: number) => {
    resizeWidgetWindow(width, height)
  })
}
