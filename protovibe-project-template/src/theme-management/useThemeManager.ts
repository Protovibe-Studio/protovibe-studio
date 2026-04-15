import { useEffect, useState } from 'react'

export type ThemePreference = 'light' | 'dark' | 'auto'
export type ActiveTheme = 'light' | 'dark'

interface ThemeChangeDetail {
  setting: ThemePreference
  resolved: ActiveTheme
}

interface ThemeManagerApi {
  setTheme: (theme: ThemePreference) => void
  getPreference: () => ThemePreference
  getActiveTheme: () => ActiveTheme
}

type ThemeWindow = Window & { ThemeManager?: ThemeManagerApi }

function getThemeManager(): ThemeManagerApi | undefined {
  return (window as ThemeWindow).ThemeManager
}

export function useThemeManager() {
  const [themePreference, setThemePreference] = useState<ThemePreference>('auto')
  const [activeTheme, setActiveTheme] = useState<ActiveTheme>('light')

  useEffect(() => {
    const manager = getThemeManager()
    if (manager) {
      setThemePreference(manager.getPreference())
      setActiveTheme(manager.getActiveTheme())
    }

    const handleThemeChange = (event: Event) => {
      const detail = (event as CustomEvent<ThemeChangeDetail>).detail
      if (detail) {
        setThemePreference(detail.setting)
        setActiveTheme(detail.resolved)
      }
    }

    window.addEventListener('themechange', handleThemeChange)
    return () => {
      window.removeEventListener('themechange', handleThemeChange)
    }
  }, [])

  const updateTheme = (nextTheme: ThemePreference) => {
    const manager = getThemeManager()
    if (!manager) {
      return
    }

    manager.setTheme(nextTheme)
    setThemePreference(manager.getPreference())
    setActiveTheme(manager.getActiveTheme())
  }

  return {
    themePreference,
    activeTheme,
    updateTheme,
  }
}