import { describe, expect, it } from 'vitest'
import { dayKey, filterByMonth, getMonthGrid, groupByDay } from './calendar'
import type { ChargingSession } from './types'

describe('dayKey', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(dayKey(new Date(2024, 2, 5))).toBe('2024-03-05')
  })
})

describe('getMonthGrid', () => {
  it('starts weeks on Monday and covers the whole month', () => {
    // January 2024: 1st is a Monday, so no leading days needed.
    const weeks = getMonthGrid(2024, 0)
    expect(weeks[0][0]).toEqual(new Date(2024, 0, 1))
    expect(weeks[0][0].getDay()).toBe(1) // Monday
    const lastWeek = weeks[weeks.length - 1]
    expect(lastWeek[lastWeek.length - 1].getDay()).toBe(0) // Sunday
  })

  it('includes leading days from the previous month when the 1st is not a Monday', () => {
    // February 2024 starts on a Thursday.
    const weeks = getMonthGrid(2024, 1)
    expect(weeks[0][0]).toEqual(new Date(2024, 0, 29)) // Monday before Feb 1st
    expect(weeks[0][3]).toEqual(new Date(2024, 1, 1))
  })

  it('produces only full weeks of 7 days', () => {
    const weeks = getMonthGrid(2024, 1)
    for (const week of weeks) {
      expect(week).toHaveLength(7)
    }
  })
})

function makeSession(startAt: string, id: string): ChargingSession {
  return {
    id,
    carId: 'default-car',
    kind: 'electric',
    startAt,
    endAt: null,
    energyKwh: 10,
    cost: null,
    batteryStartPct: null,
    batteryEndPct: null,
    odometerKm: null,
    location: null,
    chargerType: null,
    notes: null,
    isLive: false,
    createdAt: startAt,
    updatedAt: startAt,
  }
}

describe('filterByMonth', () => {
  it('keeps only items whose startAt falls in the given month', () => {
    const jan = makeSession(new Date(2024, 0, 15).toISOString(), 'jan')
    const feb = makeSession(new Date(2024, 1, 1).toISOString(), 'feb')
    const nextYearJan = makeSession(new Date(2025, 0, 15).toISOString(), 'next-year-jan')

    expect(filterByMonth([jan, feb, nextYearJan], 2024, 0)).toEqual([jan])
  })
})

describe('groupByDay', () => {
  it('groups items that fall on the same local day', () => {
    const a = makeSession(new Date(2024, 0, 5, 9, 0).toISOString(), 'a')
    const b = makeSession(new Date(2024, 0, 5, 22, 0).toISOString(), 'b')
    const c = makeSession(new Date(2024, 0, 6, 9, 0).toISOString(), 'c')

    const grouped = groupByDay([a, b, c])

    expect(grouped.get('2024-01-05')).toEqual([a, b])
    expect(grouped.get('2024-01-06')).toEqual([c])
  })
})
