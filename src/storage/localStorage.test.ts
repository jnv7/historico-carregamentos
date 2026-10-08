import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getUnreadableData, readJson, resetUnreadableData, writeJson } from './localStorage'

const KEY = 'historico-carregamentos:sessions'

function recoveredKeys(): string[] {
  return Object.keys(localStorage).filter((k) => k.startsWith('historico-carregamentos:recovered:'))
}

describe('localStorage helpers', () => {
  beforeEach(() => {
    localStorage.clear()
    resetUnreadableData()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reads back what was written', () => {
    writeJson(KEY, [{ id: '1' }])
    expect(readJson(KEY, [], Array.isArray)).toEqual([{ id: '1' }])
    expect(getUnreadableData()).toEqual([])
  })

  it('keeps a copy of unparseable data before returning the fallback', () => {
    localStorage.setItem(KEY, '{not json')

    expect(readJson(KEY, [], Array.isArray)).toEqual([])

    const [copyKey] = recoveredKeys()
    expect(localStorage.getItem(copyKey)).toBe('{not json')
    expect(getUnreadableData()).toEqual([{ key: KEY, raw: '{not json', preservedAs: copyKey }])
  })

  it('treats data with the wrong shape as unreadable', () => {
    localStorage.setItem(KEY, '{"a":1}')

    expect(readJson(KEY, [], Array.isArray)).toEqual([])
    expect(recoveredKeys()).toHaveLength(1)
  })

  it('does not lose the unreadable data when the next save overwrites the key', () => {
    localStorage.setItem(KEY, '{not json')
    readJson(KEY, [], Array.isArray)

    writeJson(KEY, [{ id: 'new' }])

    expect(localStorage.getItem(KEY)).toBe('[{"id":"new"}]')
    expect(localStorage.getItem(recoveredKeys()[0])).toBe('{not json')
  })

  it('does not duplicate the copy when the same unreadable data is read again', () => {
    localStorage.setItem(KEY, '{not json')
    readJson(KEY, [], Array.isArray)
    readJson(KEY, [], Array.isArray)

    expect(recoveredKeys()).toHaveLength(1)
  })

  it('refuses to overwrite unreadable data when no copy could be kept', () => {
    localStorage.setItem(KEY, '{not json')
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    readJson(KEY, [], Array.isArray)
    setItem.mockRestore()

    writeJson(KEY, [{ id: 'new' }])

    expect(localStorage.getItem(KEY)).toBe('{not json')
    expect(getUnreadableData()[0].preservedAs).toBeNull()
  })
})
