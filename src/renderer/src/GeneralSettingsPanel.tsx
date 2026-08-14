import { useEffect, useState } from 'react'
import type { AppSettings } from '../../shared/types'

export default function GeneralSettingsPanel(): React.JSX.Element {
  const [settings, setSettings] = useState<AppSettings | null>(null)

  useEffect(() => {
    void window.api.settings.get().then(setSettings)
  }, [])

  async function toggleAutoLaunch(): Promise<void> {
    if (!settings) return
    const updated = await window.api.settings.update({ autoLaunch: !settings.autoLaunch })
    setSettings(updated)
  }

  if (!settings) return <div className="card">Cargando…</div>

  return (
    <div className="card">
      <h2>General</h2>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
        <input type="checkbox" checked={settings.autoLaunch} onChange={toggleAutoLaunch} />
        Iniciar TimeTracker automáticamente al encender el equipo (queda oculto en la bandeja)
      </label>
    </div>
  )
}
