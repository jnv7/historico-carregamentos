import { useCallback, useState } from 'react'
import type { CarSettings } from '../domain/types'
import { loadSettings, saveSettings } from '../storage/settingsRepository'

export function useSettings() {
  const [settings, setSettings] = useState<CarSettings>(() => loadSettings())

  const updateSettings = useCallback((next: CarSettings) => {
    setSettings(next)
    saveSettings(next)
  }, [])

  return { settings, updateSettings }
}
