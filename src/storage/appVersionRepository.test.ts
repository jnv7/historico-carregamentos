import { beforeEach, describe, expect, it } from 'vitest'
import { loadLastSeenVersion, saveLastSeenVersion } from './appVersionRepository'
import { resetUnreadableData } from './localStorage'

const KEY = 'historico-carregamentos:lastSeenVersion'

describe('appVersionRepository', () => {
  beforeEach(() => {
    localStorage.clear()
    resetUnreadableData()
  })

  it('has no version when nothing was saved', () => {
    expect(loadLastSeenVersion()).toBeNull()
  })

  it('reads back the saved version', () => {
    saveLastSeenVersion('2026-10-20T10:00:00+01:00')
    expect(loadLastSeenVersion()).toBe('2026-10-20T10:00:00+01:00')
  })

  it('ignores a stored value that is not text', () => {
    localStorage.setItem(KEY, '42')
    expect(loadLastSeenVersion()).toBeNull()
  })
})
