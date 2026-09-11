import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './settingsRepository'
import { createBackup, InvalidBackupError, parseBackup } from './backup'

describe('backup', () => {
  it('creates a backup with the current settings and sessions', () => {
    const backup = createBackup(DEFAULT_SETTINGS, [])

    expect(backup.version).toBe(1)
    expect(backup.settings).toEqual(DEFAULT_SETTINGS)
    expect(backup.sessions).toEqual([])
    expect(() => new Date(backup.exportedAt).toISOString()).not.toThrow()
  })

  it('round-trips a backup through JSON', () => {
    const backup = createBackup(DEFAULT_SETTINGS, [])

    const parsed = parseBackup(JSON.stringify(backup))

    expect(parsed).toEqual(backup)
  })

  it('rejects invalid JSON', () => {
    expect(() => parseBackup('{not json')).toThrow(InvalidBackupError)
  })

  it('rejects JSON that does not look like a backup', () => {
    expect(() => parseBackup(JSON.stringify({ hello: 'world' }))).toThrow(InvalidBackupError)
  })
})
