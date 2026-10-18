import type { ChargingSession, FuelEntry } from './types'

export interface ElectricStats {
  count: number
  totalEnergyKwh: number
  totalCost: number
  sessionsWithCost: number
  averageCostPerKwh: number | null
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
}

function sum(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0)
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** Aggregates totals and averages for a set of charging sessions. */
export function computeElectricStats(sessions: ChargingSession[]): ElectricStats {
  const count = sessions.length
  const totalEnergyKwh = round2(sum(sessions.map((s) => s.energyKwh)))

  const withCost = sessions.filter((s): s is ChargingSession & { cost: number } => s.cost !== null)
  const totalCost = round2(sum(withCost.map((s) => s.cost)))
  const energyWithCost = sum(withCost.map((s) => s.energyKwh))
  const averageCostPerKwh =
    withCost.length > 0 && energyWithCost > 0
      ? sum(withCost.map((s) => s.cost)) / energyWithCost
      : null

  return {
    count,
    totalEnergyKwh,
    totalCost,
    sessionsWithCost: withCost.length,
    averageCostPerKwh,
  }
}

/** Aggregates totals and averages for a set of fuel fill-ups. */
export function computeFuelStats(entries: FuelEntry[]): FuelStats {
  const count = entries.length
  const totalLiters = round2(sum(entries.map((e) => e.liters)))
  const totalCost = round2(sum(entries.map((e) => e.cost)))
  const averageCostPerLiter =
    totalLiters > 0 ? sum(entries.map((e) => e.cost)) / sum(entries.map((e) => e.liters)) : null

  return { count, totalLiters, totalCost, averageCostPerLiter }
}

/** Combines electric and fuel entries into a single "total" view of counts and costs. */
export function computeCombinedStats(
  sessions: ChargingSession[],
  fuelEntries: FuelEntry[],
): CombinedStats {
  const electricCost = round2(sum(sessions.filter((s) => s.cost !== null).map((s) => s.cost!)))
  const fuelCost = round2(sum(fuelEntries.map((e) => e.cost)))
  const totalCost = round2(electricCost + fuelCost)
  const count = sessions.length + fuelEntries.length

  return { count, totalCost, electricCost, fuelCost }
}
