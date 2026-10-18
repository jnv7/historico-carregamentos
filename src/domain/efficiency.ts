import type { ChargingSession, EntryKind, FuelEntry } from './types'

/** Which entries an efficiency series is built from: one energy source, or both together. */
export type EfficiencyScope = 'electric' | 'fuel' | 'all'

export interface EfficiencyOptions {
  /** Usable battery capacity in kWh; null turns off the battery-percentage calculation. */
  batteryCapacityKwh: number | null
  /** For a fully electric car every km is electric, so the "km in electric mode" figures are ignored. */
  ignoreElectricKm?: boolean
}

const DEFAULT_OPTIONS: EfficiencyOptions = { batteryCapacityKwh: null }

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
  /** Km on the odometer since the previous reading. */
  kmDriven: number
  /** Km used as the divisor: the odometer's, or only those driven on this energy when known. */
  distanceKm: number
  /** 'total' = odometer km; 'mode' = only the km driven in electric mode (or only on fuel). */
  kmBasis: 'total' | 'mode'
  /** 'charged' = energy put in; 'battery' = worked out from the battery percentages. */
  energyMethod: 'charged' | 'battery'
  /** kWh or litres; meaningless (and so null) for the 'all' scope, which mixes both. */
  quantity: number | null
  /** Null when any entry in the interval has no known cost. */
  cost: number | null
  entriesInInterval: number
  consumptionPer100Km: number | null
  costPer100Km: number | null
}

export interface EfficiencySummary {
  /** Sum of the km used as divisors (see EfficiencyPoint.distanceKm). */
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
  batteryStartPct: number | null
  batteryEndPct: number | null
  electricKm: number | null
  fullTank: boolean
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
      items.push({
        id: s.id,
        kind: s.kind,
        startAt: s.startAt,
        odometerKm: s.odometerKm,
        quantity: s.energyKwh,
        cost: s.cost,
        batteryStartPct: s.batteryStartPct,
        batteryEndPct: s.batteryEndPct,
        electricKm: s.electricKm ?? null,
        fullTank: true,
      })
    }
  }
  if (scope !== 'electric') {
    for (const e of fuelEntries) {
      items.push({
        id: e.id,
        kind: e.kind,
        startAt: e.startAt,
        odometerKm: e.odometerKm,
        quantity: e.liters,
        cost: e.cost,
        batteryStartPct: null,
        batteryEndPct: null,
        electricKm: null,
        fullTank: e.fullTank !== false,
      })
    }
  }
  return items.sort((a, b) => a.startAt.localeCompare(b.startAt))
}

/**
 * Energy used between two readings, from the battery: what was in it when the previous charge
 * ended, minus what was left when this one started, plus what was charged in between. Null when
 * a figure is missing. The cost follows the average price of the energy in the battery.
 */
function energyFromBattery(
  previous: Item,
  current: Item,
  chargedBetween: number,
  costBetween: number | null,
  capacityKwh: number | null,
  prices: BatteryPrices,
): { quantity: number; cost: number | null } | null {
  if (capacityKwh === null || previous.batteryEndPct === null || current.batteryStartPct === null) {
    return null
  }
  const fromBattery = ((previous.batteryEndPct - current.batteryStartPct) / 100) * capacityKwh
  const quantity = fromBattery + chargedBetween
  if (quantity <= 0) return null
  if (prices.afterPrevious === null || costBetween === null) return { quantity, cost: null }
  // What was in the battery after the previous charge, plus what was paid since, minus what is
  // still in it now — each at the average price of the battery's energy at that moment.
  if (prices.allMixedBetween && prices.beforeCurrent !== null) {
    const kwhAfterPrevious = (previous.batteryEndPct / 100) * capacityKwh
    const kwhBeforeCurrent = (current.batteryStartPct / 100) * capacityKwh
    const cost =
      kwhAfterPrevious * prices.afterPrevious +
      costBetween -
      kwhBeforeCurrent * prices.beforeCurrent
    return { quantity, cost }
  }
  // A charge in between without a starting battery level: its price can't be mixed in.
  return { quantity, cost: fromBattery * prices.afterPrevious + costBetween }
}

interface BatteryPrices {
  /** Average €/kWh in the battery right after the previous reading's charge. */
  afterPrevious: number | null
  /** Average €/kWh in the battery just before this entry's charge. */
  beforeCurrent: number | null
  /** False when a charge in between had no starting battery level, so its price wasn't mixed in. */
  allMixedBetween: boolean
}

/**
 * Average price per kWh of the energy in the battery after an item's charge: what was already
 * there (batteryStartPct × capacity, at the price it had) mixed with what was charged now.
 * When that can't be worked out, assumes the whole battery was bought at this charge's price.
 */
function batteryPriceAfter(
  priceBefore: number | null,
  item: Item,
  capacityKwh: number | null,
): { price: number | null; mixed: boolean } {
  if (item.cost === null || item.quantity <= 0) return { price: null, mixed: false }
  if (priceBefore === null || capacityKwh === null || item.batteryStartPct === null) {
    return { price: item.cost / item.quantity, mixed: false }
  }
  const kwhBefore = (item.batteryStartPct / 100) * capacityKwh
  return {
    price: (kwhBefore * priceBefore + item.cost) / (kwhBefore + item.quantity),
    mixed: true,
  }
}

/**
 * Km driven in electric mode between two fill-ups, from the charges in between (approximate:
 * each charge counts the km since the one before it). Null when there are none or one lacks them.
 */
function electricKmBetween(
  sessions: ChargingSession[],
  fromStartAt: string,
  toStartAt: string,
): number | null {
  const between = sessions.filter(
    (s) => !s.isLive && s.startAt > fromStartAt && s.startAt <= toStartAt,
  )
  if (between.length === 0 || between.some((s) => s.electricKm == null)) return null
  return between.reduce((acc, s) => acc + s.electricKm!, 0)
}

/** Builds one efficiency point per entry that closes an interval between two odometer readings. */
export function computeEfficiencyPoints(
  sessions: ChargingSession[],
  fuelEntries: FuelEntry[],
  scope: EfficiencyScope,
  options: EfficiencyOptions = DEFAULT_OPTIONS,
): EfficiencyPoint[] {
  const points: EfficiencyPoint[] = []
  let previous: Item | null = null
  let quantity = 0
  let cost: number | null = 0
  let entries = 0
  let electricKm: number | null = 0
  // Average €/kWh of the energy in the battery (electric scope only).
  let batteryPrice: number | null = null
  let priceAfterPrevious: number | null = null
  let allMixedBetween = true

  for (const item of toItems(sessions, fuelEntries, scope)) {
    // What was put in before this entry: this entry's own charge happens after its starting battery.
    const chargedBetween = quantity
    const costBetween = cost
    const priceBeforeItem = batteryPrice
    const allMixedBeforeItem = allMixedBetween
    let mixed = true
    if (scope === 'electric') {
      const after = batteryPriceAfter(batteryPrice, item, options.batteryCapacityKwh)
      batteryPrice = after.price
      mixed = after.mixed
    }

    quantity += item.quantity
    cost = cost === null || item.cost === null ? null : cost + item.cost
    electricKm =
      electricKm === null || item.electricKm === null ? null : electricKm + item.electricKm
    entries += 1

    // A partial fill-up does not close a fuel interval: its litres carry over to the next full tank.
    const closesInterval = item.odometerKm !== null && (scope !== 'fuel' || item.fullTank)
    if (!closesInterval) {
      allMixedBetween = allMixedBetween && mixed
      continue
    }

    const kmDriven: number = previous === null ? 0 : item.odometerKm! - previous.odometerKm!
    // A first reading has nothing to compare against; a non-increasing one is a typo or out of order.
    if (kmDriven > 0 && previous !== null) {
      let pointQuantity = scope === 'all' ? null : quantity
      let pointCost = cost
      let energyMethod: EfficiencyPoint['energyMethod'] = 'charged'
      if (scope === 'electric') {
        const fromBattery = energyFromBattery(
          previous,
          item,
          chargedBetween,
          costBetween,
          options.batteryCapacityKwh,
          {
            afterPrevious: priceAfterPrevious,
            beforeCurrent: priceBeforeItem,
            allMixedBetween: allMixedBeforeItem,
          },
        )
        if (fromBattery) {
          pointQuantity = fromBattery.quantity
          pointCost = fromBattery.cost
          energyMethod = 'battery'
        }
      }

      let distanceKm = kmDriven
      let kmBasis: EfficiencyPoint['kmBasis'] = 'total'
      if (
        scope === 'electric' &&
        !options.ignoreElectricKm &&
        electricKm !== null &&
        electricKm > 0
      ) {
        distanceKm = electricKm
        kmBasis = 'mode'
      }
      if (scope === 'fuel') {
        const evKm = electricKmBetween(sessions, previous.startAt, item.startAt)
        if (evKm !== null && kmDriven - evKm > 0) {
          distanceKm = kmDriven - evKm
          kmBasis = 'mode'
        }
      }

      points.push({
        id: item.id,
        kind: item.kind,
        startAt: item.startAt,
        kmDriven,
        distanceKm,
        kmBasis,
        energyMethod,
        quantity: pointQuantity,
        cost: pointCost,
        entriesInInterval: entries,
        consumptionPer100Km: pointQuantity === null ? null : (pointQuantity / distanceKm) * 100,
        costPer100Km: pointCost === null ? null : (pointCost / distanceKm) * 100,
      })
    }
    previous = item
    priceAfterPrevious = batteryPrice
    allMixedBetween = true
    quantity = 0
    cost = 0
    entries = 0
    electricKm = 0
  }

  return points
}

/** Distance-weighted averages over a set of points (not an average of per-point ratios). */
export function summarizeEfficiency(points: EfficiencyPoint[]): EfficiencySummary {
  const kmDriven = points.reduce((acc, p) => acc + p.distanceKm, 0)

  const withQuantity = points.filter((p) => p.quantity !== null)
  const quantityKm = withQuantity.reduce((acc, p) => acc + p.distanceKm, 0)
  const quantity = withQuantity.reduce((acc, p) => acc + p.quantity!, 0)

  const withCost = points.filter((p) => p.cost !== null)
  const costKm = withCost.reduce((acc, p) => acc + p.distanceKm, 0)
  const cost = withCost.reduce((acc, p) => acc + p.cost!, 0)

  return {
    kmDriven,
    consumptionPer100Km: quantityKm > 0 ? (quantity / quantityKm) * 100 : null,
    costPer100Km: costKm > 0 ? (cost / costKm) * 100 : null,
  }
}
