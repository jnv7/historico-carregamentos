import { describe, expect, it } from 'vitest'
import { computeCombinedStats, computeElectricStats, computeFuelStats } from './stats'
import type { ChargingSession, FuelEntry } from './types'

function makeSession(overrides: Partial<ChargingSession>): ChargingSession {
  return {
    id: Math.random().toString(),
    carId: 'default-car',
    kind: 'electric',
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

function makeFuelEntry(overrides: Partial<FuelEntry>): FuelEntry {
  return {
    id: Math.random().toString(),
    carId: 'default-car',
    kind: 'fuel',
    startAt: '2024-01-01T10:00:00.000Z',
    liters: 30,
    cost: 45,
    odometerKm: null,
    location: null,
    notes: null,
    createdAt: '2024-01-01T10:00:00.000Z',
    updatedAt: '2024-01-01T10:00:00.000Z',
    ...overrides,
  }
}

describe('computeElectricStats', () => {
  it('returns zeroed stats for no sessions', () => {
    expect(computeElectricStats([])).toEqual({
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

    const stats = computeElectricStats(sessions)

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

    const stats = computeElectricStats(sessions)

    expect(stats.totalCost).toBe(2)
    expect(stats.sessionsWithCost).toBe(1)
    expect(stats.averageCostPerKwh).toBe(0.2)
  })

  it('derives km driven and cost per km from the earliest/latest odometer readings', () => {
    const sessions = [
      makeSession({ startAt: '2024-01-01T10:00:00.000Z', odometerKm: 1000, cost: 5 }),
      makeSession({ startAt: '2024-01-10T10:00:00.000Z', odometerKm: 1500, cost: 5 }),
    ]

    const stats = computeElectricStats(sessions)

    expect(stats.totalKmDriven).toBe(500)
    expect(stats.totalCost).toBe(10)
    expect(stats.averageCostPerKm).toBe(0.02)
  })

  it('does not compute km driven with fewer than two odometer readings', () => {
    const sessions = [makeSession({ odometerKm: 1000 })]
    expect(computeElectricStats(sessions).totalKmDriven).toBeNull()
  })
})

describe('computeFuelStats', () => {
  it('returns zeroed stats for no entries', () => {
    expect(computeFuelStats([])).toEqual({
      count: 0,
      totalLiters: 0,
      totalCost: 0,
      averageCostPerLiter: null,
    })
  })

  it('sums litres and cost, and averages cost per litre', () => {
    const entries = [
      makeFuelEntry({ liters: 30, cost: 45 }),
      makeFuelEntry({ liters: 20, cost: 30 }),
    ]

    const stats = computeFuelStats(entries)

    expect(stats.count).toBe(2)
    expect(stats.totalLiters).toBe(50)
    expect(stats.totalCost).toBe(75)
    expect(stats.averageCostPerLiter).toBe(1.5)
  })
})

describe('computeCombinedStats', () => {
  it('combines cost across both kinds', () => {
    const sessions = [makeSession({ cost: 5 }), makeSession({ cost: null })]
    const fuelEntries = [makeFuelEntry({ cost: 45 })]

    const stats = computeCombinedStats(sessions, fuelEntries)

    expect(stats.count).toBe(3)
    expect(stats.electricCost).toBe(5)
    expect(stats.fuelCost).toBe(45)
    expect(stats.totalCost).toBe(50)
  })

  it('derives km driven from odometer readings across both kinds', () => {
    const sessions = [
      makeSession({ startAt: '2024-01-01T10:00:00.000Z', odometerKm: 1000, cost: 5 }),
    ]
    const fuelEntries = [
      makeFuelEntry({ startAt: '2024-01-10T10:00:00.000Z', odometerKm: 1500, cost: 45 }),
    ]

    const stats = computeCombinedStats(sessions, fuelEntries)

    expect(stats.totalKmDriven).toBe(500)
    expect(stats.averageCostPerKm).toBe(round2(50 / 500))
  })
})

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
