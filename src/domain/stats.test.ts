import { describe, expect, it } from 'vitest'
import { computeStats } from './stats'
import type { ChargingSession } from './types'

function makeSession(overrides: Partial<ChargingSession>): ChargingSession {
  return {
    id: Math.random().toString(),
    carId: 'default-car',
    startAt: '2024-01-01T10:00:00.000Z',
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
    createdAt: '2024-01-01T10:00:00.000Z',
    updatedAt: '2024-01-01T10:00:00.000Z',
    ...overrides,
  }
}

describe('computeStats', () => {
  it('returns zeroed stats for no sessions', () => {
    expect(computeStats([])).toEqual({
      count: 0,
      totalEnergyKwh: 0,
      totalCost: 0,
      sessionsWithCost: 0,
      averageCostPerKwh: null,
      totalKmDriven: null,
      averageCostPerKm: null,
    })
  })

  it('sums energy and cost across sessions', () => {
    const sessions = [
      makeSession({ energyKwh: 10, cost: 2 }),
      makeSession({ energyKwh: 15, cost: 3 }),
    ]

    const stats = computeStats(sessions)

    expect(stats.count).toBe(2)
    expect(stats.totalEnergyKwh).toBe(25)
    expect(stats.totalCost).toBe(5)
    expect(stats.sessionsWithCost).toBe(2)
    expect(stats.averageCostPerKwh).toBe(0.2)
  })

  it('ignores sessions without a known cost when averaging cost per kWh', () => {
    const sessions = [
      makeSession({ energyKwh: 10, cost: 2 }),
      makeSession({ energyKwh: 15, cost: null }),
    ]

    const stats = computeStats(sessions)

    expect(stats.totalCost).toBe(2)
    expect(stats.sessionsWithCost).toBe(1)
    expect(stats.averageCostPerKwh).toBe(0.2)
  })

  it('derives km driven and cost per km from the earliest/latest odometer readings', () => {
    const sessions = [
      makeSession({ startAt: '2024-01-01T10:00:00.000Z', odometerKm: 1000, cost: 5 }),
      makeSession({ startAt: '2024-01-10T10:00:00.000Z', odometerKm: 1500, cost: 5 }),
    ]

    const stats = computeStats(sessions)

    expect(stats.totalKmDriven).toBe(500)
    expect(stats.totalCost).toBe(10)
    expect(stats.averageCostPerKm).toBe(0.02)
  })

  it('does not compute km driven with fewer than two odometer readings', () => {
    const sessions = [makeSession({ odometerKm: 1000 })]
    expect(computeStats(sessions).totalKmDriven).toBeNull()
  })
})
