import type { ChargingSession } from './types'

export interface SessionStats {
  count: number
  totalEnergyKwh: number
  totalCost: number
  sessionsWithCost: number
  averageCostPerKwh: number | null
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
 * Aggregates totals and averages for a set of sessions.
 * Cost per km is derived from the earliest and latest odometer readings among the
 * sessions (odometer is recorded as an absolute reading, not km driven per charge).
 */
export function computeStats(sessions: ChargingSession[]): SessionStats {
  const count = sessions.length
  const totalEnergyKwh = round2(sum(sessions.map((s) => s.energyKwh)))

  const withCost = sessions.filter((s): s is ChargingSession & { cost: number } => s.cost !== null)
  const totalCost = round2(sum(withCost.map((s) => s.cost)))
  const energyWithCost = sum(withCost.map((s) => s.energyKwh))
  const averageCostPerKwh =
    withCost.length > 0 && energyWithCost > 0 ? round2(totalCost / energyWithCost) : null

  const odometerReadings = sessions
    .filter((s): s is ChargingSession & { odometerKm: number } => s.odometerKm !== null)
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
  const totalKmDriven =
    odometerReadings.length >= 2
      ? round2(
          odometerReadings[odometerReadings.length - 1].odometerKm - odometerReadings[0].odometerKm,
        )
      : null
  const averageCostPerKm =
    totalKmDriven !== null && totalKmDriven > 0 && totalCost > 0
      ? round2(totalCost / totalKmDriven)
      : null

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
