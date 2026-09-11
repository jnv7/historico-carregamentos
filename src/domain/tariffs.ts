import type { Tariff } from './types'

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function rangeContains(range: { start: string; end: string }, minutes: number): boolean {
  const start = toMinutes(range.start)
  const end = toMinutes(range.end)
  if (start === end) return true // 24h range
  if (start < end) return minutes >= start && minutes < end
  // wraps past midnight, e.g. 22:00 -> 08:00
  return minutes >= start || minutes < end
}

/** Finds the tariff whose time ranges cover the given moment, if any. */
export function findTariffForDate(tariffs: Tariff[], date: Date): Tariff | null {
  const minutes = date.getHours() * 60 + date.getMinutes()
  return (
    tariffs.find((tariff) => tariff.ranges.some((range) => rangeContains(range, minutes))) ?? null
  )
}

/** Computes the inferred cost (EUR) for a charging session using the tariff active at startAt. */
export function inferCost(tariffs: Tariff[], startAt: Date, energyKwh: number): number | null {
  const tariff = findTariffForDate(tariffs, startAt)
  if (!tariff) return null
  return Math.round(tariff.pricePerKwh * energyKwh * 100) / 100
}
