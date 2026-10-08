import type { CarSettings } from '../domain/types'
import { readJson, writeJson } from './localStorage'

const KEY = 'historico-carregamentos:settings'

export const DEFAULT_SETTINGS: CarSettings = {
  carName: 'O meu carro',
  tariffs: [],
  backupReminder: {
    enabled: false,
    intervalDays: 30,
    lastBackupAt: null,
    askBeforeUpdate: true,
  },
}

export function loadSettings(): CarSettings {
  return withSettingsDefaults(readJson(KEY, DEFAULT_SETTINGS, isObject))
}

export function saveSettings(settings: CarSettings): void {
  writeJson(KEY, settings)
}

/** Fills in fields added after the settings were first saved (or exported to a backup). */
export function withSettingsDefaults(settings: CarSettings): CarSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    backupReminder: { ...DEFAULT_SETTINGS.backupReminder, ...settings.backupReminder },
  }
}

function isObject(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
