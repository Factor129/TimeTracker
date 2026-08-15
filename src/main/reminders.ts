import { Notification } from 'electron'
import { setTrayAlert } from './tray'

let reminderTimer: NodeJS.Timeout | null = null

function clearReminderTimer(): void {
  if (reminderTimer) {
    clearTimeout(reminderTimer)
    reminderTimer = null
  }
}

function scheduleNext(startedAtMs: number, label: string, hourMark: number): void {
  const fireAt = startedAtMs + hourMark * 60 * 60 * 1000
  const delay = Math.max(0, fireAt - Date.now())

  reminderTimer = setTimeout(() => {
    new Notification({
      title: 'TimeTracker',
      body: `Llevas ${hourMark}h con el cronómetro en marcha en "${label}". ¿Sigues aquí?`
    }).show()
    setTrayAlert(true)
    scheduleNext(startedAtMs, label, hourMark + 1)
  }, delay)
}

/** Arms hourly reminders (notification + tray alert icon) for a running timer. */
export function armReminders(startedAtISO: string, label: string): void {
  clearReminderTimer()
  setTrayAlert(false)
  scheduleNext(new Date(startedAtISO).getTime(), label, 1)
}

export function disarmReminders(): void {
  clearReminderTimer()
  setTrayAlert(false)
}
