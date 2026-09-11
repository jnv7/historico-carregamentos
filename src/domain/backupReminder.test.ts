import { describe, expect, it } from 'vitest'
import { shouldShowBackupReminder } from './backupReminder'
import { DEFAULT_SETTINGS } from '../storage/settingsRepository'

const now = new Date('2024-02-01T00:00:00.000Z')

function makeEntry(createdAt: string): { createdAt: string } {
  return { createdAt }
}

describe('shouldShowBackupReminder', () => {
  it('is false when reminders are disabled', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      backupReminder: { enabled: false, intervalDays: 1, lastBackupAt: null },
    }
    expect(shouldShowBackupReminder(settings, [makeEntry('2024-01-01T00:00:00.000Z')], now)).toBe(
      false,
    )
  })

  it('is false when there are no entries and no prior backup', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      backupReminder: { enabled: true, intervalDays: 1, lastBackupAt: null },
    }
    expect(shouldShowBackupReminder(settings, [], now)).toBe(false)
  })

  it('is true when enough days passed since the oldest entry and no backup was ever made', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      backupReminder: { enabled: true, intervalDays: 30, lastBackupAt: null },
    }
    const entries = [makeEntry('2024-01-01T00:00:00.000Z')]
    expect(shouldShowBackupReminder(settings, entries, now)).toBe(true)
  })

  it('is false when not enough days passed since the oldest entry', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      backupReminder: { enabled: true, intervalDays: 60, lastBackupAt: null },
    }
    const entries = [makeEntry('2024-01-01T00:00:00.000Z')]
    expect(shouldShowBackupReminder(settings, entries, now)).toBe(false)
  })

  it('uses lastBackupAt as the reference once a backup has been made', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      backupReminder: { enabled: true, intervalDays: 10, lastBackupAt: '2024-01-30T00:00:00.000Z' },
    }
    const entries = [makeEntry('2023-01-01T00:00:00.000Z')]
    expect(shouldShowBackupReminder(settings, entries, now)).toBe(false)
  })
})
