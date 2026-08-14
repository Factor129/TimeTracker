import { app, BrowserWindow } from 'electron'
import { initDb } from './db'
import { createTray, rebuildTrayMenu } from './tray'
import { createWidgetWindow, showWidgetWindow } from './windows'
import { registerIpcHandlers, setTrayRefresher } from './ipc'
import { syncAutoLaunch } from './autostart'
import { initAutoUpdate, onUpdateReady } from './autoUpdate'

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
    // Pre-create the widget window hidden; the tray icon reveals it on click.
    createWidgetWindow()

    onUpdateReady(() => rebuildTrayMenu())
    initAutoUpdate()
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
