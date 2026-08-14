import { app } from 'electron'
import * as db from './db'

/** Applies the persisted autoLaunch setting as a Windows login item. */
export async function syncAutoLaunch(): Promise<void> {
  if (!app.isPackaged) return // avoid registering the dev electron.exe as a login item
  const settings = await db.getSettings()
  app.setLoginItemSettings({
    openAtLogin: settings.autoLaunch,
    path: process.execPath
  })
}

export async function setAutoLaunch(enabled: boolean): Promise<void> {
  await db.updateSettings({ autoLaunch: enabled })
  await syncAutoLaunch()
}
