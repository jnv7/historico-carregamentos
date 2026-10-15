import { describe, expect, it } from 'vitest'
import { entriesToShow, FIRST_ANNOUNCED_AT, type Changelog } from './whatsNew'

// Seven entries, one per day from 7 November (first, newest) to 1 November.
const entries = [7, 6, 5, 4, 3, 2, 1].map((day) => ({
  hash: `hash${day}`,
  date: `2026-11-0${day}T10:00:00+01:00`,
  items: [`Dia ${day}`],
}))
const changelog: Changelog = { builtFrom: entries[0].date, entries }

const days = (shown: { hash: string }[]) => shown.map((e) => e.hash)

describe('entriesToShow', () => {
  it('shows nothing without a build date', () => {
    expect(entriesToShow({ builtFrom: null, entries }, null, true)).toEqual([])
  })

  it('shows nothing when this build was already seen', () => {
    expect(entriesToShow(changelog, changelog.builtFrom, true)).toEqual([])
  })

  it('shows nothing on a fresh install', () => {
    expect(entriesToShow(changelog, null, false)).toEqual([])
  })

  it('only announces changes made after the popup was introduced to someone who never saw a version', () => {
    const old = { hash: 'old', date: '2026-10-08T10:00:00+01:00', items: ['Antiga'] }
    const recent = { hash: 'new', date: '2026-10-16T10:00:00+01:00', items: ['Nova'] }
    const result = entriesToShow({ builtFrom: recent.date, entries: [recent, old] }, null, true)

    expect(days(result)).toEqual(['new'])
    expect(Date.parse(old.date)).toBeLessThan(Date.parse(FIRST_ANNOUNCED_AT))
  })

  it('shows nothing to an existing user when every change predates the popup', () => {
    const old = { hash: 'old', date: '2026-10-08T10:00:00+01:00', items: ['Antiga'] }
    expect(entriesToShow({ builtFrom: old.date, entries: [old] }, null, true)).toEqual([])
  })

  it('shows only what is newer than the last seen version', () => {
    expect(days(entriesToShow(changelog, '2026-11-05T10:00:00+01:00', true))).toEqual([
      'hash7',
      'hash6',
    ])
  })

  it('never goes back past the popup introduction, whatever the last seen version', () => {
    const old = { hash: 'old', date: '2026-10-08T10:00:00+01:00', items: ['Antiga'] }
    const result = entriesToShow(
      { builtFrom: old.date, entries: [old] },
      '2026-09-01T00:00:00Z',
      true,
    )
    expect(result).toEqual([])
  })

  it('caps the list at five', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      hash: `h${i}`,
      date: `2026-11-0${8 - i}T10:00:00+01:00`,
      items: ['x'],
    }))
    expect(
      entriesToShow({ builtFrom: many[0].date, entries: many }, '2026-10-20T00:00:00Z', true),
    ).toHaveLength(5)
  })

  it('shows only the latest for an unrecognised version', () => {
    expect(days(entriesToShow(changelog, 'xpto', true))).toEqual(['hash7'])
  })

  it('compares instants, not text, across time zone offsets', () => {
    // 09:00Z on the 6th is 10:00+01:00 on the 6th.
    expect(days(entriesToShow(changelog, '2026-11-06T09:00:00Z', true))).toEqual(['hash7'])
  })
})
