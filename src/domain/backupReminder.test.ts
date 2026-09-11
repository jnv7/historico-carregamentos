import { describe, expect, it } from 'vitest'
import { shouldShowBackupReminder } from './backupReminder'
import { DEFAULT_SETTINGS } from '../storage/settingsRepository'
import { DEFAULT_CAR_ID, type ChargingSession } from './types'

const now = new Date('2024-02-01T00:00:00.000Z')

function makeSession(createdAt: string): ChargingSession {
  return {
    id: 'x',
    carId: DEFAULT_CAR_ID,
    startAt: createdAt,
    endAt: null,
    energyKwh: 1,
    cost: null,
    batteryStartPct: null,
    batteryEndPct: null,
    odometerKm: null,
    location: null,
    chargerType: null,
    notes: null,
    isLive: false,
    createdAt,
    updatedAt: createdAt,
  }
}

describe('shouldShowBackupReminder', () => {
  it('is false when reminders are disabled', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      backupReminder: { enabled: false, intervalDays: 1, lastBackupAt: null },
    }
    expect(shouldShowBackupReminder(settings, [makeSession('2024-01-01T00:00:00.000Z')], now)).toBe(
      false,
    )
  })

  it('is false when there are no sessions and no prior backup', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      backupReminder: { enabled: true, intervalDays: 1, lastBackupAt: null },
    }
    expect(shouldShowBackupReminder(settings, [], now)).toBe(false)
  })

  it('is true when enough days passed since the oldest session and no backup was ever made', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      backupReminder: { enabled: true, intervalDays: 30, lastBackupAt: null },
    }
    const sessions = [makeSession('2024-01-01T00:00:00.000Z')]
    expect(shouldShowBackupReminder(settings, sessions, now)).toBe(true)
  })

  it('is false when not enough days passed since the oldest session', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      backupReminder: { enabled: true, intervalDays: 60, lastBackupAt: null },
    }
    const sessions = [makeSession('2024-01-01T00:00:00.000Z')]
    expect(shouldShowBackupReminder(settings, sessions, now)).toBe(false)
  })

  it('uses lastBackupAt as the reference once a backup has been made', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      backupReminder: { enabled: true, intervalDays: 10, lastBackupAt: '2024-01-30T00:00:00.000Z' },
    }
    const sessions = [makeSession('2023-01-01T00:00:00.000Z')]
    expect(shouldShowBackupReminder(settings, sessions, now)).toBe(false)
  })
})
