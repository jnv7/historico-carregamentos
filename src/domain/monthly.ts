import { filterByMonth } from './calendar'
import {
  computeEfficiencyPoints,
  summarizeEfficiency,
  type EfficiencyScope,
  type EfficiencySummary,
} from './efficiency'
import type { ChargingSession, FuelEntry } from './types'

export interface YearMonth {
  year: number
  /** 0-indexed, like Date#getMonth. */
  month: number
}

export interface MonthSummary extends YearMonth {
  electricCost: number
  fuelCost: number
  energyKwh: number
  liters: number
  pricePerKwh: number | null
  pricePerLiter: number | null
  efficiency: Record<EfficiencyScope, EfficiencySummary>
}

/** The `count` months ending at (and including) the given month, oldest first. */
export function monthsEndingAt(end: YearMonth, count: number): YearMonth[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(end.year, end.month - (count - 1 - i), 1)
    return { year: date.getFullYear(), month: date.getMonth() }
  })
}

/** Every month from the earliest to the latest entry, oldest first (empty when there are none). */
export function monthsSpanning(entries: { startAt: string }[]): YearMonth[] {
  if (entries.length === 0) return []
  const times = entries.map((e) => new Date(e.startAt).getTime())
  const first = new Date(Math.min(...times))
  const last = new Date(Math.max(...times))
  const count =
    (last.getFullYear() - first.getFullYear()) * 12 + (last.getMonth() - first.getMonth()) + 1
  return monthsEndingAt({ year: last.getFullYear(), month: last.getMonth() }, count)
}

function sum(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0)
}

/**
 * Per-month totals for the evolution charts. Efficiency is computed over all entries
 * first and then bucketed, so a month's first entry still measures the km driven
 * since the last reading of the previous month.
 */
export function computeMonthlySummaries(
  sessions: ChargingSession[],
  fuelEntries: FuelEntry[],
  months: YearMonth[],
): MonthSummary[] {
  const pointsByScope = {
    electric: computeEfficiencyPoints(sessions, fuelEntries, 'electric'),
    fuel: computeEfficiencyPoints(sessions, fuelEntries, 'fuel'),
    all: computeEfficiencyPoints(sessions, fuelEntries, 'all'),
  }

  return months.map(({ year, month }) => {
    const monthSessions = filterByMonth(sessions, year, month).filter((s) => !s.isLive)
    const monthFuel = filterByMonth(fuelEntries, year, month)

    const withCost = monthSessions.filter((s) => s.cost !== null)
    const electricCost = sum(withCost.map((s) => s.cost!))
    const energyWithCost = sum(withCost.map((s) => s.energyKwh))
    const fuelCost = sum(monthFuel.map((e) => e.cost))
    const liters = sum(monthFuel.map((e) => e.liters))

    const summarize = (scope: EfficiencyScope) =>
      summarizeEfficiency(filterByMonth(pointsByScope[scope], year, month))

    return {
      year,
      month,
      electricCost,
      fuelCost,
      energyKwh: sum(monthSessions.map((s) => s.energyKwh)),
      liters,
      pricePerKwh: energyWithCost > 0 ? electricCost / energyWithCost : null,
      pricePerLiter: liters > 0 ? fuelCost / liters : null,
      efficiency: {
        electric: summarize('electric'),
        fuel: summarize('fuel'),
        all: summarize('all'),
      },
    }
  })
}
