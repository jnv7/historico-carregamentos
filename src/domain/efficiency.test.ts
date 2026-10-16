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

describe('fuel intervals between full tanks', () => {
  it('carries a partial fill-up over to the next full tank', () => {
    const fuel = [
      makeFuelEntry({ startAt: '2024-01-01T10:00:00Z', odometerKm: 1000, liters: 40 }),
      makeFuelEntry({
        startAt: '2024-01-05T10:00:00Z',
        odometerKm: 1200,
        liters: 10,
        fullTank: false,
      }),
      makeFuelEntry({ startAt: '2024-01-10T10:00:00Z', odometerKm: 1500, liters: 25 }),
    ]

    const points = computeEfficiencyPoints([], fuel, 'fuel')

    expect(points).toHaveLength(1)
    expect(points[0]).toMatchObject({ quantity: 35, kmDriven: 500 })
    expect(points[0].consumptionPer100Km).toBeCloseTo(7)
  })

  it('treats a record without the full tank field as a full tank', () => {
    const fuel = [
      makeFuelEntry({ startAt: '2024-01-01T10:00:00Z', odometerKm: 1000 }),
      makeFuelEntry({ startAt: '2024-01-10T10:00:00Z', odometerKm: 1500, liters: 25 }),
    ]

    expect(computeEfficiencyPoints([], fuel, 'fuel')).toHaveLength(1)
  })
})

describe('energy from the battery percentage', () => {
  const options = { batteryCapacityKwh: 50 }
  const previous = makeSession({
    startAt: '2024-01-01T10:00:00Z',
    odometerKm: 1000,
    energyKwh: 40,
    cost: 8,
    batteryStartPct: 40,
    batteryEndPct: 80,
  })

  it('uses what left the battery instead of what was charged', () => {
    const current = makeSession({
      startAt: '2024-01-05T10:00:00Z',
      odometerKm: 1300,
      energyKwh: 5,
      batteryStartPct: 20,
    })

    const [point] = computeEfficiencyPoints([previous, current], [], 'electric', options)

    expect(point).toMatchObject({ quantity: 30, consumptionPer100Km: 10, energyMethod: 'battery' })
    expect(point.cost).toBeCloseTo(6) // 30 kWh at the previous charge's 0.20 €/kWh
  })

  it('adds the charges made in between', () => {
    const between = makeSession({
      startAt: '2024-01-03T10:00:00Z',
      energyKwh: 10,
      cost: 2,
    })
    const current = makeSession({
      startAt: '2024-01-05T10:00:00Z',
      odometerKm: 1300,
      energyKwh: 5,
      batteryStartPct: 40,
    })

    const [point] = computeEfficiencyPoints([previous, between, current], [], 'electric', options)

    expect(point.quantity).toBeCloseTo(30) // 20 from the battery + 10 charged in between
    expect(point.cost).toBeCloseTo(6) // 20 × 0.20 + 2
  })

  it('falls back to the energy charged without the starting battery', () => {
    const current = makeSession({ startAt: '2024-01-05T10:00:00Z', odometerKm: 1300, energyKwh: 5 })

    const [point] = computeEfficiencyPoints([previous, current], [], 'electric', options)

    expect(point).toMatchObject({ quantity: 5, energyMethod: 'charged' })
  })

  it('falls back to the energy charged without a capacity', () => {
    const current = makeSession({
      startAt: '2024-01-05T10:00:00Z',
      odometerKm: 1300,
      energyKwh: 5,
      batteryStartPct: 20,
    })

    const [point] = computeEfficiencyPoints([previous, current], [], 'electric', {
      batteryCapacityKwh: null,
    })

    expect(point).toMatchObject({ quantity: 5, energyMethod: 'charged' })
  })

  it('falls back when the battery figures would give negative energy', () => {
    const current = makeSession({
      startAt: '2024-01-05T10:00:00Z',
      odometerKm: 1300,
      energyKwh: 5,
      batteryStartPct: 90,
    })

    const [point] = computeEfficiencyPoints([previous, current], [], 'electric', options)

    expect(point).toMatchObject({ quantity: 5, energyMethod: 'charged' })
  })

  it('does not apply to the combined scope', () => {
    const current = makeSession({
      startAt: '2024-01-05T10:00:00Z',
      odometerKm: 1300,
      energyKwh: 5,
      cost: 1,
      batteryStartPct: 20,
    })

    const [point] = computeEfficiencyPoints([previous, current], [], 'all', options)

    expect(point).toMatchObject({ quantity: null, energyMethod: 'charged', cost: 1 })
  })
})

describe('km driven in electric mode', () => {
  const first = makeSession({ startAt: '2024-01-01T10:00:00Z', odometerKm: 1000 })

  it('divides the electric energy by the km driven in electric mode', () => {
    const second = makeSession({
      startAt: '2024-01-05T10:00:00Z',
      odometerKm: 1300,
      energyKwh: 30,
      electricKm: 200,
    })

    const [point] = computeEfficiencyPoints([first, second], [], 'electric')

    expect(point).toMatchObject({
      distanceKm: 200,
      kmDriven: 300,
      kmBasis: 'mode',
      consumptionPer100Km: 15,
    })
  })

  it('adds the electric km of charges without an odometer reading', () => {
    const between = makeSession({ startAt: '2024-01-03T10:00:00Z', electricKm: 50 })
    const second = makeSession({
      startAt: '2024-01-05T10:00:00Z',
      odometerKm: 1300,
      electricKm: 150,
    })

    const [point] = computeEfficiencyPoints([first, between, second], [], 'electric')

    expect(point.distanceKm).toBe(200)
  })

  it('uses the odometer km when any charge in the interval lacks them', () => {
    const between = makeSession({ startAt: '2024-01-03T10:00:00Z' })
    const second = makeSession({
      startAt: '2024-01-05T10:00:00Z',
      odometerKm: 1300,
      electricKm: 150,
    })

    const [point] = computeEfficiencyPoints([first, between, second], [], 'electric')

    expect(point).toMatchObject({ distanceKm: 300, kmBasis: 'total' })
  })
})

describe('a fully electric car', () => {
  it('ignores the km in electric mode left over from before', () => {
    const first = makeSession({ startAt: '2024-01-01T10:00:00Z', odometerKm: 1000 })
    const second = makeSession({
      startAt: '2024-01-05T10:00:00Z',
      odometerKm: 1300,
      energyKwh: 30,
      electricKm: 200,
    })

    const [point] = computeEfficiencyPoints([first, second], [], 'electric', {
      batteryCapacityKwh: null,
      ignoreElectricKm: true,
    })

    expect(point).toMatchObject({ distanceKm: 300, kmBasis: 'total', consumptionPer100Km: 10 })
  })
})

describe('fuel consumption of a plug-in hybrid', () => {
  const first = makeFuelEntry({ startAt: '2024-01-01T10:00:00Z', odometerKm: 1000 })

  it('takes the km driven in electric mode out of the distance', () => {
    const charge = makeSession({ startAt: '2024-01-03T10:00:00Z', electricKm: 150 })
    const second = makeFuelEntry({
      startAt: '2024-01-10T10:00:00Z',
      odometerKm: 1500,
      liters: 20,
    })

    const [point] = computeEfficiencyPoints([charge], [first, second], 'fuel')

    expect(point).toMatchObject({ distanceKm: 350, kmDriven: 500, kmBasis: 'mode' })
    expect(point.consumptionPer100Km).toBeCloseTo(5.714, 2)
  })

  it('keeps the odometer km when a charge has no electric km', () => {
    const charge = makeSession({ startAt: '2024-01-03T10:00:00Z' })
    const second = makeFuelEntry({
      startAt: '2024-01-10T10:00:00Z',
      odometerKm: 1500,
      liters: 20,
    })

    const [point] = computeEfficiencyPoints([charge], [first, second], 'fuel')

    expect(point).toMatchObject({ distanceKm: 500, consumptionPer100Km: 4 })
  })

  it('keeps the odometer km when there are no charges in between', () => {
    const second = makeFuelEntry({
      startAt: '2024-01-10T10:00:00Z',
      odometerKm: 1500,
      liters: 20,
    })

    const [point] = computeEfficiencyPoints([], [first, second], 'fuel')

    expect(point.distanceKm).toBe(500)
  })
})

describe('a partial charge followed by a full one', () => {
  it('gives the real consumption instead of absurd values', () => {
    const sessions = [
      makeSession({
        startAt: '2024-01-01T10:00:00Z',
        odometerKm: 1000,
        energyKwh: 30,
        batteryStartPct: 20,
        batteryEndPct: 80,
      }),
      makeSession({
        startAt: '2024-01-05T10:00:00Z',
        odometerKm: 1300,
        energyKwh: 5,
        batteryStartPct: 20,
        batteryEndPct: 30,
      }),
      makeSession({
        startAt: '2024-01-06T10:00:00Z',
        odometerKm: 1305,
        energyKwh: 36,
        batteryStartPct: 29,
        batteryEndPct: 100,
      }),
    ]

    const withBattery = computeEfficiencyPoints(sessions, [], 'electric', {
      batteryCapacityKwh: 50,
    })
    const withoutBattery = computeEfficiencyPoints(sessions, [], 'electric')

    expect(withBattery.map((p) => p.consumptionPer100Km)).toEqual([
      expect.closeTo(10),
      expect.closeTo(10),
    ])
    expect(withoutBattery[0].consumptionPer100Km).toBeCloseTo(1.67, 1)
    expect(withoutBattery[1].consumptionPer100Km).toBeCloseTo(720)
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
