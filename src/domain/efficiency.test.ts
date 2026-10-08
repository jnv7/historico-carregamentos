import { describe, expect, it } from 'vitest'
import { computeEfficiencyPoints, summarizeEfficiency } from './efficiency'
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

describe('computeEfficiencyPoints', () => {
  it('measures each charge against the km since the previous reading', () => {
    const sessions = [
      makeSession({
        id: 'b',
        startAt: '2024-01-05T10:00:00Z',
        odometerKm: 1100,
        energyKwh: 15,
        cost: 3,
      }),
      makeSession({
        id: 'a',
        startAt: '2024-01-01T10:00:00Z',
        odometerKm: 1000,
        energyKwh: 99,
        cost: 9,
      }),
    ]

    const points = computeEfficiencyPoints(sessions, [], 'electric')

    expect(points).toHaveLength(1)
    expect(points[0]).toMatchObject({
      id: 'b',
      kmDriven: 100,
      quantity: 15,
      cost: 3,
      entriesInInterval: 1,
      consumptionPer100Km: 15,
      costPer100Km: 3,
    })
  })

  it('folds entries without an odometer reading into the next point', () => {
    const sessions = [
      makeSession({ startAt: '2024-01-01T10:00:00Z', odometerKm: 1000 }),
      makeSession({ startAt: '2024-01-02T10:00:00Z', energyKwh: 5, cost: 1 }),
      makeSession({ startAt: '2024-01-03T10:00:00Z', odometerKm: 1200, energyKwh: 25, cost: 4 }),
    ]

    const [point] = computeEfficiencyPoints(sessions, [], 'electric')

    expect(point).toMatchObject({ kmDriven: 200, quantity: 30, cost: 5, entriesInInterval: 2 })
    expect(point.consumptionPer100Km).toBe(15)
  })

  it('leaves cost unknown when any entry in the interval has no cost', () => {
    const sessions = [
      makeSession({ startAt: '2024-01-01T10:00:00Z', odometerKm: 1000 }),
      makeSession({ startAt: '2024-01-02T10:00:00Z', cost: null }),
      makeSession({ startAt: '2024-01-03T10:00:00Z', odometerKm: 1100, cost: 2 }),
    ]

    const [point] = computeEfficiencyPoints(sessions, [], 'electric')

    expect(point.cost).toBeNull()
    expect(point.costPer100Km).toBeNull()
    expect(point.consumptionPer100Km).toBe(20)
  })

  it('skips readings that do not increase', () => {
    const sessions = [
      makeSession({ startAt: '2024-01-01T10:00:00Z', odometerKm: 1000 }),
      makeSession({ startAt: '2024-01-02T10:00:00Z', odometerKm: 900 }),
      makeSession({ startAt: '2024-01-03T10:00:00Z', odometerKm: 1000, energyKwh: 20 }),
    ]

    const points = computeEfficiencyPoints(sessions, [], 'electric')

    expect(points).toHaveLength(1)
    expect(points[0].kmDriven).toBe(100)
  })

  it('ignores live sessions that have not finished', () => {
    const sessions = [
      makeSession({ startAt: '2024-01-01T10:00:00Z', odometerKm: 1000 }),
      makeSession({ startAt: '2024-01-02T10:00:00Z', odometerKm: 1100, isLive: true }),
    ]

    expect(computeEfficiencyPoints(sessions, [], 'electric')).toEqual([])
  })

  it('computes fuel consumption in L/100 km from fill-ups', () => {
    const fuel = [
      makeFuelEntry({ startAt: '2024-01-01T10:00:00Z', odometerKm: 10000 }),
      makeFuelEntry({ startAt: '2024-01-20T10:00:00Z', odometerKm: 10500, liters: 30, cost: 50 }),
    ]

    const [point] = computeEfficiencyPoints([], fuel, 'fuel')

    expect(point.consumptionPer100Km).toBe(6)
    expect(point.costPer100Km).toBe(10)
  })

  it('mixes both kinds for the combined scope, reporting only cost per 100 km', () => {
    const sessions = [makeSession({ startAt: '2024-01-01T10:00:00Z', odometerKm: 1000, cost: 1 })]
    const fuel = [makeFuelEntry({ startAt: '2024-01-02T10:00:00Z', odometerKm: 1200, cost: 20 })]

    const [point] = computeEfficiencyPoints(sessions, fuel, 'all')

    expect(point).toMatchObject({ kind: 'fuel', kmDriven: 200, quantity: null, cost: 20 })
    expect(point.consumptionPer100Km).toBeNull()
    expect(point.costPer100Km).toBe(10)
  })
})

describe('summarizeEfficiency', () => {
  it('weights by distance instead of averaging the per-point ratios', () => {
    const sessions = [
      makeSession({ startAt: '2024-01-01T10:00:00Z', odometerKm: 1000 }),
      makeSession({ startAt: '2024-01-02T10:00:00Z', odometerKm: 1100, energyKwh: 10, cost: 2 }),
      makeSession({ startAt: '2024-01-03T10:00:00Z', odometerKm: 1400, energyKwh: 60, cost: 6 }),
    ]

    const summary = summarizeEfficiency(computeEfficiencyPoints(sessions, [], 'electric'))

    expect(summary.kmDriven).toBe(400)
    expect(summary.consumptionPer100Km).toBe(17.5)
    expect(summary.costPer100Km).toBe(2)
  })

  it('returns nulls when there are no points', () => {
    expect(summarizeEfficiency([])).toEqual({
      kmDriven: 0,
      consumptionPer100Km: null,
      costPer100Km: null,
    })
  })
})
