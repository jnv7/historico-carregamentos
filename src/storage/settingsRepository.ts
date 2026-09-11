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
  },
}

export function loadSettings(): CarSettings {
  return readJson(KEY, DEFAULT_SETTINGS)
}

export function saveSettings(settings: CarSettings): void {
  writeJson(KEY, settings)
}
