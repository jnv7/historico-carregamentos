import { beforeEach, describe, expect, it } from 'vitest'
import type { CarSettings } from '../domain/types'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settingsRepository'

describe('settingsRepository', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns default settings when nothing was saved yet', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('persists and reloads settings', () => {
    const settings: CarSettings = {
      carName: 'Tesla Model 3',
      tariffs: [],
      backupReminder: {
        enabled: true,
        intervalDays: 14,
        lastBackupAt: null,
        askBeforeUpdate: false,
      },
    }

    saveSettings(settings)

    expect(loadSettings()).toEqual(settings)
  })

  it('fills in settings added after the data was first saved', () => {
    localStorage.setItem(
      'historico-carregamentos:settings',
      JSON.stringify({
        carName: 'Antigo',
        tariffs: [],
        backupReminder: { enabled: true, intervalDays: 7, lastBackupAt: null },
      }),
    )

    expect(loadSettings().backupReminder).toEqual({
      enabled: true,
      intervalDays: 7,
      lastBackupAt: null,
      askBeforeUpdate: true,
    })
  })

  it('falls back to defaults when stored data is corrupted', () => {
    localStorage.setItem('historico-carregamentos:settings', '{not json')

    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })
})
