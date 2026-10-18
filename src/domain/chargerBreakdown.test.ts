import { describe, expect, it } from 'vitest'
import { computeChargerBreakdown } from './chargerBreakdown'
import type { ChargingSession } from './types'

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

const home = (energyKwh: number, cost: number | null) =>
  makeSession({ chargerType: 'home', energyKwh, cost })
const dc = (energyKwh: number, cost: number | null) =>
  makeSession({ chargerType: 'public_dc', energyKwh, cost })

describe('computeChargerBreakdown', () => {
  it('groups by charger type, in a fixed order, with the share and extra cost away from home', () => {
    const sessions = [
      makeSession({ chargerType: null, energyKwh: 5, cost: 1 }),
      dc(10, 6),
      makeSession({ chargerType: 'public_ac', energyKwh: 8, cost: null }),
      home(20, 4),
      home(20, 4),
    ]

    const breakdown = computeChargerBreakdown(sessions)

    expect(breakdown.groups).toEqual([
      { group: 'home', count: 2, energyKwh: 40, cost: 8, energyWithCost: 40, pricePerKwh: 0.2 },
      { group: 'public_ac', count: 1, energyKwh: 8, cost: 0, energyWithCost: 0, pricePerKwh: null },
      {
        group: 'public_dc',
        count: 1,
        energyKwh: 10,
        cost: 6,
        energyWithCost: 10,
        pricePerKwh: 0.6,
      },
      { group: 'unknown', count: 1, energyKwh: 5, cost: 1, energyWithCost: 5, pricePerKwh: 0.2 },
    ])
    expect(breakdown.extraCostVsHome).toBeCloseTo(4)
    expect(breakdown.awayEnergyShare).toBeCloseTo(18 / 58)
    expect(breakdown.awayCostShare).toBeCloseTo(6 / 14)
  })

  it('takes the home price from all sessions when there is no home charge in the period', () => {
    const breakdown = computeChargerBreakdown([dc(10, 6)], [dc(10, 6), home(20, 4)])

    expect(breakdown.homePricePerKwh).toBeCloseTo(0.2)
    expect(breakdown.homePriceFromPeriod).toBe(false)
    expect(breakdown.extraCostVsHome).toBeCloseTo(4)
  })

  it('has no comparison without any home charge', () => {
    const breakdown = computeChargerBreakdown([dc(10, 6)])

    expect(breakdown.homePricePerKwh).toBeNull()
    expect(breakdown.extraCostVsHome).toBeNull()
    expect(breakdown.awayEnergyShare).toBeNull()
    expect(breakdown.awayCostShare).toBeNull()
  })

  it('ignores a charge that is still running', () => {
    const live = makeSession({ chargerType: 'home', energyKwh: 0, cost: null, isLive: true })

    expect(computeChargerBreakdown([live]).groups).toEqual([])
  })

  it('gives a negative extra cost for a free charge away from home', () => {
    const breakdown = computeChargerBreakdown([home(20, 4), dc(10, 0)])

    expect(breakdown.extraCostVsHome).toBeCloseTo(-2)
  })
})
