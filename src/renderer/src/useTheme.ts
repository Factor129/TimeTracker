import { useEffect, useState } from 'react'
import type { ThemeMode } from '../../shared/types'

export function useTheme(): [ThemeMode, () => void] {
  const [theme, setThemeState] = useState<ThemeMode>('dark')

  useEffect(() => {
    let off: (() => void) | undefined
    void window.api.settings.get().then((s) => {
      setThemeState(s.theme)
      document.documentElement.dataset.theme = s.theme
    })
    off = window.api.settings.onChanged((s) => {
      setThemeState(s.theme)
      document.documentElement.dataset.theme = s.theme
    })
    return () => off?.()
  }, [])

  function toggle(): void {
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark'
    setThemeState(next)
    document.documentElement.dataset.theme = next
    void window.api.settings.update({ theme: next })
  }

  return [theme, toggle]
}
