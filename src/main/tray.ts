import { Menu, Tray, nativeImage, app } from 'electron'
import { join } from 'path'
import * as db from './db'
import { createMainWindow, toggleWidgetWindow, showWidgetWindow } from './windows'
import { broadcastTimerState } from './ipc'
import { isUpdateReady, restartToUpdate } from './autoUpdate'

let tray: Tray | null = null

function resolveTrayIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'tray.png')
    : join(__dirname, '../../resources/tray.png')
}

export async function createTray(): Promise<void> {
  const icon = nativeImage.createFromPath(resolveTrayIconPath()).resize({ width: 16, height: 16 })
  tray = new Tray(icon)
  tray.setToolTip('TimeTracker')
  await rebuildTrayMenu()

  tray.on('click', () => {
    toggleWidgetWindow()
  })
}

export async function rebuildTrayMenu(): Promise<void> {
  if (!tray) return

  const [projects, clients, { running }] = await Promise.all([
    db.listProjects(),
    db.listClients(),
    db.getRunning()
  ])

  const activeProjects = projects.filter((p) => !p.archived)
  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name ?? 'Sin cliente'

  const projectItems = activeProjects.map((p) => ({
    label: running?.projectId === p.id ? `● ${p.name} (${clientName(p.clientId)})` : `${p.name} (${clientName(p.clientId)})`,
    type: 'radio' as const,
    checked: running?.projectId === p.id,
    click: async () => {
      await db.startTimer(p.id)
      await rebuildTrayMenu()
      broadcastTimerState()
      showWidgetWindow()
    }
  }))

  const menu = Menu.buildFromTemplate([
    { label: 'TimeTracker', enabled: false },
    { type: 'separator' },
    ...(projectItems.length
      ? projectItems
      : [{ label: 'Sin proyectos — crea uno en "Gestionar"', enabled: false }]),
    { type: 'separator' },
    {
      label: 'Detener cronómetro',
      enabled: !!running,
      click: async () => {
        await db.stopTimer()
        await rebuildTrayMenu()
        broadcastTimerState()
      }
    },
    { type: 'separator' },
    {
      label: 'Mostrar / ocultar widget',
      click: () => toggleWidgetWindow()
    },
    {
      label: 'Gestionar proyectos y clientes',
      click: () => createMainWindow()
    },
    { type: 'separator' },
    ...(isUpdateReady()
      ? [
          {
            label: 'Actualización lista — reiniciar ahora',
            click: () => restartToUpdate()
          },
          { type: 'separator' as const }
        ]
      : []),
    {
      label: 'Salir',
      click: () => {
        ;(global as any).__appQuitting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(menu)
}
