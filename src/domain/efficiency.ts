import type { ChargingSession, EntryKind, FuelEntry } from './types'

/** Which entries an efficiency series is built from: one energy source, or both together. */
export type EfficiencyScope = 'electric' | 'fuel' | 'all'

/**
 * Efficiency of the distance driven up to one entry. The energy (or fuel) put in at
 * an entry replaces what was used since the previous odometer reading, so each point
 * covers the km since that reading and sums every entry in between — including ones
 * without an odometer reading, which have no point of their own.
 */
export interface EfficiencyPoint {
  id: string
  kind: EntryKind
  startAt: string
  kmDriven: number
  /** kWh or litres; meaningless (and so null) for the 'all' scope, which mixes both. */
  quantity: number | null
  /** Null when any entry in the interval has no known cost. */
  cost: number | null
  entriesInInterval: number
  consumptionPer100Km: number | null
  costPer100Km: number | null
}

export interface EfficiencySummary {
  kmDriven: number
  consumptionPer100Km: number | null
  costPer100Km: number | null
}

interface Item {
  id: string
  kind: EntryKind
  startAt: string
  odometerKm: number | null
  quantity: number
  cost: number | null
}

function toItems(
  sessions: ChargingSession[],
  fuelEntries: FuelEntry[],
  scope: EfficiencyScope,
): Item[] {
  const items: Item[] = []
  if (scope !== 'fuel') {
    for (const s of sessions) {
      if (s.isLive) continue
      items.push({ ...pick(s), quantity: s.energyKwh, cost: s.cost })
    }
  }
  if (scope !== 'electric') {
    for (const e of fuelEntries) {
      items.push({ ...pick(e), quantity: e.liters, cost: e.cost })
    }
  }
  return items.sort((a, b) => a.startAt.localeCompare(b.startAt))
}

function pick(entry: ChargingSession | FuelEntry) {
  return {
    id: entry.id,
    kind: entry.kind,
    startAt: entry.startAt,
    odometerKm: entry.odometerKm,
  }
}

/** Builds one efficiency point per entry that closes an interval between two odometer readings. */
export function computeEfficiencyPoints(
  sessions: ChargingSession[],
  fuelEntries: FuelEntry[],
  scope: EfficiencyScope,
): EfficiencyPoint[] {
  const points: EfficiencyPoint[] = []
  let previousKm: number | null = null
  let quantity = 0
  let cost: number | null = 0
  let entries = 0

  for (const item of toItems(sessions, fuelEntries, scope)) {
    quantity += item.quantity
    cost = cost === null || item.cost === null ? null : cost + item.cost
    entries += 1
    if (item.odometerKm === null) continue

    const kmDriven = previousKm === null ? 0 : item.odometerKm - previousKm
    // A first reading has nothing to compare against; a non-increasing one is a typo or out of order.
    if (kmDriven > 0) {
      const pointQuantity = scope === 'all' ? null : quantity
      points.push({
        id: item.id,
        kind: item.kind,
        startAt: item.startAt,
        kmDriven,
        quantity: pointQuantity,
        cost,
        entriesInInterval: entries,
        consumptionPer100Km: pointQuantity === null ? null : (pointQuantity / kmDriven) * 100,
        costPer100Km: cost === null ? null : (cost / kmDriven) * 100,
      })
    }
    previousKm = item.odometerKm
    quantity = 0
    cost = 0
    entries = 0
  }

  return points
}

/** Distance-weighted averages over a set of points (not an average of per-point ratios). */
export function summarizeEfficiency(points: EfficiencyPoint[]): EfficiencySummary {
  const kmDriven = points.reduce((acc, p) => acc + p.kmDriven, 0)

  const withQuantity = points.filter((p) => p.quantity !== null)
  const quantityKm = withQuantity.reduce((acc, p) => acc + p.kmDriven, 0)
  const quantity = withQuantity.reduce((acc, p) => acc + p.quantity!, 0)

  const withCost = points.filter((p) => p.cost !== null)
  const costKm = withCost.reduce((acc, p) => acc + p.kmDriven, 0)
  const cost = withCost.reduce((acc, p) => acc + p.cost!, 0)

  return {
    kmDriven,
    consumptionPer100Km: quantityKm > 0 ? (quantity / quantityKm) * 100 : null,
    costPer100Km: costKm > 0 ? (cost / costKm) * 100 : null,
  }
}
