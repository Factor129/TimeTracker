import { app, BrowserWindow } from 'electron'
import { initDb } from './db'
import { createTray, rebuildTrayMenu } from './tray'
import { createWidgetWindow, showWidgetWindow } from './windows'
import { registerIpcHandlers, setTrayRefresher } from './ipc'
import { syncAutoLaunch } from './autostart'
import { initAutoUpdate, onUpdateReady } from './autoUpdate'
import { startBlockScheduler } from './blockScheduler'

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    showWidgetWindow()
  })

  app.whenReady().then(async () => {
    await initDb()
    registerIpcHandlers()
    setTrayRefresher(rebuildTrayMenu)
    await syncAutoLaunch()
    await createTray()
    // Show the widget on the desktop as soon as the app starts (including at Windows login).
    createWidgetWindow().once('ready-to-show', showWidgetWindow)

    onUpdateReady(() => rebuildTrayMenu())
    initAutoUpdate()
    startBlockScheduler()
  })

  app.on('window-all-closed', () => {
    // Keep running in the tray on Windows/Linux.
  })

  app.on('before-quit', () => {
    ;(global as any).__appQuitting = true
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWidgetWindow()
    }
  })
}
