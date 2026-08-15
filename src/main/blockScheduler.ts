import { Notification } from 'electron'
import * as db from './db'
import { openCalendarWindow } from './windows'

const CHECK_INTERVAL_MS = 30_000
const WARN_MINUTES_BEFORE = 10

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

async function checkBlocks(): Promise<void> {
  const now = Date.now()
  const blocks = db.getBlocksSync()

  for (const block of blocks) {
    if (block.notified) continue
    const endMs = new Date(block.endAt).getTime()
    const minutesLeft = (endMs - now) / 60_000
    // Only warn inside the upcoming window; skip long-past blocks (e.g. app was closed).
    if (minutesLeft > WARN_MINUTES_BEFORE || minutesLeft < -2) continue

    await db.markBlockNotified(block.id)

    const projects = await db.listProjects()
    const project = projects.find((p) => p.id === block.projectId)
    const notification = new Notification({
      title: 'TimeTracker',
      body: `El bloque de "${project?.name ?? 'proyecto'}" termina a las ${formatTime(block.endAt)}. Ábrelo para ampliarlo si hace falta.`
    })
    notification.on('click', () => openCalendarWindow())
    notification.show()
  }
}

export function startBlockScheduler(): void {
  void checkBlocks()
  setInterval(() => void checkBlocks(), CHECK_INTERVAL_MS)
}
