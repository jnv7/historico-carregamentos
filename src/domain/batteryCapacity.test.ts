import { describe, expect, it } from 'vitest'
import { effectiveBatteryCapacity, estimateBatteryCapacity } from './batteryCapacity'
import type { ChargingSession } from './types'

function charge(
  energyKwh: number,
  batteryStartPct: number | null,
  batteryEndPct: number | null,
): ChargingSession {
  return {
    id: Math.random().toString(),
    carId: 'default-car',
    kind: 'electric',
    startAt: '2024-01-01T10:00:00.000Z',
    endAt: null,
    energyKwh,
    cost: null,
    batteryStartPct,
    batteryEndPct,
    odometerKm: null,
    location: null,
    chargerType: null,
    notes: null,
    isLive: false,
    createdAt: '2024-01-01T10:00:00.000Z',
    updatedAt: '2024-01-01T10:00:00.000Z',
  }
}

// 10 kWh for 20% and 15 kWh for 30% and 30 kWh for 60% are all a 50 kWh battery.
const consistent = [charge(10, 20, 40), charge(15, 20, 50), charge(30, 20, 80)]

describe('estimateBatteryCapacity', () => {
  it('has no estimate without charges', () => {
    expect(estimateBatteryCapacity([])).toBeNull()
  })

  it('needs at least three usable charges', () => {
    expect(estimateBatteryCapacity(consistent.slice(0, 2))).toBeNull()
  })

  it('takes the median of energy over the percentage charged', () => {
    expect(estimateBatteryCapacity(consistent)).toBe(50)
  })

  it('averages the two middle values when the count is even', () => {
    const sessions = [charge(24, 0, 50), charge(25, 0, 50), charge(26, 0, 50), charge(30, 0, 50)]
    // 48, 50, 52 and 60 kWh
    expect(estimateBatteryCapacity(sessions)).toBe(51)
  })

  it('ignores charges that raised the battery by less than 20 points', () => {
    expect(estimateBatteryCapacity([...consistent.slice(0, 2), charge(5, 50, 60)])).toBeNull()
  })

  it('ignores charges without both battery levels', () => {
    expect(estimateBatteryCapacity([...consistent.slice(0, 2), charge(10, null, 80)])).toBeNull()
  })
})

describe('effectiveBatteryCapacity', () => {
  it('prefers the capacity set by the user', () => {
    expect(effectiveBatteryCapacity(40, consistent)).toBe(40)
  })

  it('falls back to the estimate', () => {
    expect(effectiveBatteryCapacity(null, consistent)).toBe(50)
  })
})
