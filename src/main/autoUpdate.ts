import { app } from 'electron'
import { autoUpdater } from 'electron-updater'

let updateReady = false
let onReadyCallback: (() => void) | null = null

export function isUpdateReady(): boolean {
  return updateReady
}

/** Called by the tray to know whether to show "restart to update". */
export function onUpdateReady(cb: () => void): void {
  onReadyCallback = cb
}

export function restartToUpdate(): void {
  if (!updateReady) return
  ;(global as any).__appQuitting = true
  autoUpdater.quitAndInstall()
}

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000 // every 4 hours

export function initAutoUpdate(): void {
  if (!app.isPackaged) return // no update feed while running from source

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-downloaded', () => {
    updateReady = true
    onReadyCallback?.()
  })

  autoUpdater.on('error', () => {
    // Silent: updates are best-effort and shouldn't disturb the user.
  })

  autoUpdater.checkForUpdates().catch(() => {})
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, CHECK_INTERVAL_MS)
}
