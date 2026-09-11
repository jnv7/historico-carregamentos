import type { ChargingSession, FuelEntry } from './types'

export interface ElectricStats {
  count: number
  totalEnergyKwh: number
  totalCost: number
  sessionsWithCost: number
  averageCostPerKwh: number | null
  totalKmDriven: number | null
  averageCostPerKm: number | null
}

export interface FuelStats {
  count: number
  totalLiters: number
  totalCost: number
  averageCostPerLiter: number | null
}

export interface CombinedStats {
  count: number
  totalCost: number
  electricCost: number
  fuelCost: number
  totalKmDriven: number | null
  averageCostPerKm: number | null
}

function sum(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0)
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Derives km driven and average cost/km from a set of (possibly unsorted) odometer
 * readings — the odometer is an absolute reading, not km driven per entry, so the
 * distance is the gap between the earliest and latest reading in the set.
 */
function deriveDistanceStats(
  readings: { startAt: string; odometerKm: number }[],
  totalCost: number,
): { totalKmDriven: number | null; averageCostPerKm: number | null } {
  const sorted = [...readings].sort((a, b) => a.startAt.localeCompare(b.startAt))
  const totalKmDriven =
    sorted.length >= 2 ? round2(sorted[sorted.length - 1].odometerKm - sorted[0].odometerKm) : null
  const averageCostPerKm =
    totalKmDriven !== null && totalKmDriven > 0 && totalCost > 0
      ? round2(totalCost / totalKmDriven)
      : null
  return { totalKmDriven, averageCostPerKm }
}

/** Aggregates totals and averages for a set of charging sessions. */
export function computeElectricStats(sessions: ChargingSession[]): ElectricStats {
  const count = sessions.length
  const totalEnergyKwh = round2(sum(sessions.map((s) => s.energyKwh)))

  const withCost = sessions.filter((s): s is ChargingSession & { cost: number } => s.cost !== null)
  const totalCost = round2(sum(withCost.map((s) => s.cost)))
  const energyWithCost = sum(withCost.map((s) => s.energyKwh))
  const averageCostPerKwh =
    withCost.length > 0 && energyWithCost > 0 ? round2(totalCost / energyWithCost) : null

  const odometerReadings = sessions.filter(
    (s): s is ChargingSession & { odometerKm: number } => s.odometerKm !== null,
  )
  const { totalKmDriven, averageCostPerKm } = deriveDistanceStats(odometerReadings, totalCost)

  return {
    count,
    totalEnergyKwh,
    totalCost,
    sessionsWithCost: withCost.length,
    averageCostPerKwh,
    totalKmDriven,
    averageCostPerKm,
  }
}

/** Aggregates totals and averages for a set of fuel fill-ups. */
export function computeFuelStats(entries: FuelEntry[]): FuelStats {
  const count = entries.length
  const totalLiters = round2(sum(entries.map((e) => e.liters)))
  const totalCost = round2(sum(entries.map((e) => e.cost)))
  const averageCostPerLiter = totalLiters > 0 ? round2(totalCost / totalLiters) : null

  return { count, totalLiters, totalCost, averageCostPerLiter }
}

/**
 * Combines electric and fuel entries into a single "total" view. Km driven uses
 * odometer readings from both kinds, since the odometer belongs to the car, not
 * the energy source.
 */
export function computeCombinedStats(
  sessions: ChargingSession[],
  fuelEntries: FuelEntry[],
): CombinedStats {
  const electricCost = round2(sum(sessions.filter((s) => s.cost !== null).map((s) => s.cost!)))
  const fuelCost = round2(sum(fuelEntries.map((e) => e.cost)))
  const totalCost = round2(electricCost + fuelCost)
  const count = sessions.length + fuelEntries.length

  const odometerReadings = [
    ...sessions
      .filter((s): s is ChargingSession & { odometerKm: number } => s.odometerKm !== null)
      .map((s) => ({ startAt: s.startAt, odometerKm: s.odometerKm })),
    ...fuelEntries
      .filter((e): e is FuelEntry & { odometerKm: number } => e.odometerKm !== null)
      .map((e) => ({ startAt: e.startAt, odometerKm: e.odometerKm })),
  ]
  const { totalKmDriven, averageCostPerKm } = deriveDistanceStats(odometerReadings, totalCost)

  return { count, totalCost, electricCost, fuelCost, totalKmDriven, averageCostPerKm }
}
