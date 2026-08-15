import { useEffect, useState } from 'react'
import ProjectsPanel from './ProjectsPanel'
import ReportsPanel from './ReportsPanel'
import GeneralSettingsPanel from './GeneralSettingsPanel'
import CalendarPanel from './CalendarPanel'
import { useTheme } from './useTheme'

type Tab = 'projects' | 'reports' | 'calendar' | 'general'

export default function App(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('projects')
  const [theme, toggleTheme] = useTheme()

  useEffect(() => {
    return window.api.navigation.onNavigate((t) => setTab(t as Tab))
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>TimeTracker</h1>
        <nav className="tabs">
          <button
            className={`tab-btn ${tab === 'projects' ? 'active' : ''}`}
            onClick={() => setTab('projects')}
          >
            Proyectos y clientes
          </button>
          <button
            className={`tab-btn ${tab === 'reports' ? 'active' : ''}`}
            onClick={() => setTab('reports')}
          >
            Informe
          </button>
          <button
            className={`tab-btn ${tab === 'calendar' ? 'active' : ''}`}
            onClick={() => setTab('calendar')}
          >
            Calendario
          </button>
          <button
            className={`tab-btn ${tab === 'general' ? 'active' : ''}`}
            onClick={() => setTab('general')}
          >
            Ajustes
          </button>
        </nav>
        <div className="header-spacer" />
        <button
          className="icon-btn"
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </header>
      <main className="app-body">
        {tab === 'projects' && <ProjectsPanel />}
        {tab === 'reports' && <ReportsPanel />}
        {tab === 'calendar' && <CalendarPanel />}
        {tab === 'general' && <GeneralSettingsPanel />}
      </main>
    </div>
  )
}
