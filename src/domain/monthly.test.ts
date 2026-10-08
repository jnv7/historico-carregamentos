import { describe, expect, it } from 'vitest'
import { computeMonthlySummaries, monthsEndingAt, monthsSpanning } from './monthly'
import type { ChargingSession, FuelEntry } from './types'

function makeSession(overrides: Partial<ChargingSession>): ChargingSession {
  return {
    id: Math.random().toString(),
    carId: 'default-car',
    kind: 'electric',
    startAt: new Date(2024, 0, 10, 10).toISOString(),
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
    startAt: new Date(2024, 0, 10, 10).toISOString(),
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

describe('monthsEndingAt', () => {
  it('lists months oldest first, crossing year boundaries', () => {
    expect(monthsEndingAt({ year: 2024, month: 1 }, 3)).toEqual([
      { year: 2023, month: 11 },
      { year: 2024, month: 0 },
      { year: 2024, month: 1 },
    ])
  })
})

describe('monthsSpanning', () => {
  it('covers every month between the first and last entry', () => {
    const entries = [
      { startAt: new Date(2024, 2, 15).toISOString() },
      { startAt: new Date(2023, 11, 1).toISOString() },
    ]
    expect(monthsSpanning(entries)).toHaveLength(4)
    expect(monthsSpanning(entries)[0]).toEqual({ year: 2023, month: 11 })
  })

  it('is empty without entries', () => {
    expect(monthsSpanning([])).toEqual([])
  })
})

describe('computeMonthlySummaries', () => {
  it('totals costs and average prices per month', () => {
    const sessions = [
      makeSession({ energyKwh: 10, cost: 2 }),
      makeSession({ energyKwh: 30, cost: 4 }),
      makeSession({ energyKwh: 5, cost: null }),
    ]
    const fuel = [makeFuelEntry({ liters: 20, cost: 36 })]

    const [jan, feb] = computeMonthlySummaries(sessions, fuel, [
      { year: 2024, month: 0 },
      { year: 2024, month: 1 },
    ])

    expect(jan).toMatchObject({ electricCost: 6, fuelCost: 36, energyKwh: 45, liters: 20 })
    expect(jan.pricePerKwh).toBe(0.15)
    expect(jan.pricePerLiter).toBe(1.8)
    expect(feb).toMatchObject({ electricCost: 0, fuelCost: 0, pricePerKwh: null })
  })

  it("measures a month's first charge against the previous month's last reading", () => {
    const sessions = [
      makeSession({ startAt: new Date(2024, 0, 30).toISOString(), odometerKm: 1000 }),
      makeSession({
        startAt: new Date(2024, 1, 3).toISOString(),
        odometerKm: 1100,
        energyKwh: 16,
        cost: 4,
      }),
    ]

    const [, feb] = computeMonthlySummaries(
      sessions,
      [],
      [
        { year: 2024, month: 0 },
        { year: 2024, month: 1 },
      ],
    )

    expect(feb.efficiency.electric).toEqual({
      kmDriven: 100,
      consumptionPer100Km: 16,
      costPer100Km: 4,
    })
  })
})
