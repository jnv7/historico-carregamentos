import type { ChargerType, ChargingSession } from './types'

export type ChargerGroup = ChargerType | 'unknown'

export interface ChargerGroupStats {
  group: ChargerGroup
  count: number
  energyKwh: number
  /** Sum of the known costs. */
  cost: number
  /** Energy of the charges with a known cost (the divisor of pricePerKwh). */
  energyWithCost: number
  pricePerKwh: number | null
}

export interface ChargerBreakdown {
  /** Only the groups with charges, in the order home, public_ac, public_dc, other, unknown. */
  groups: ChargerGroupStats[]
  /** €/kWh at home: from the given sessions, or from allSessions when there are none at home. */
  homePricePerKwh: number | null
  homePriceFromPeriod: boolean
  /** What the charges away from home cost beyond the same kWh at the home price. Null without a home price. */
  extraCostVsHome: number | null
  /** Share (0–1) of the energy / cost charged away from home. Charges without a type are left out. */
  awayEnergyShare: number | null
  awayCostShare: number | null
}

const GROUP_ORDER: ChargerGroup[] = ['home', 'public_ac', 'public_dc', 'other', 'unknown']

function groupSessions(sessions: ChargingSession[]): ChargerGroupStats[] {
  const stats = new Map<ChargerGroup, ChargerGroupStats>()
  for (const s of sessions) {
    if (s.isLive) continue
    const group: ChargerGroup = s.chargerType ?? 'unknown'
    const entry = stats.get(group) ?? {
      group,
      count: 0,
      energyKwh: 0,
      cost: 0,
      energyWithCost: 0,
      pricePerKwh: null,
    }
    entry.count += 1
    entry.energyKwh += s.energyKwh
    if (s.cost !== null) {
      entry.cost += s.cost
      entry.energyWithCost += s.energyKwh
    }
    stats.set(group, entry)
  }
  const groups = GROUP_ORDER.flatMap((group) => stats.get(group) ?? [])
  for (const g of groups) {
    g.pricePerKwh = g.energyWithCost > 0 ? g.cost / g.energyWithCost : null
  }
  return groups
}

function isAway(group: ChargerGroup): boolean {
  return group === 'public_ac' || group === 'public_dc' || group === 'other'
}

/** Splits charges by charger type and compares what was paid away from home with the home price. */
export function computeChargerBreakdown(
  sessions: ChargingSession[],
  allSessions: ChargingSession[] = sessions,
): ChargerBreakdown {
  const groups = groupSessions(sessions)

  let homePricePerKwh = groups.find((g) => g.group === 'home')?.pricePerKwh ?? null
  let homePriceFromPeriod = true
  if (homePricePerKwh === null) {
    homePricePerKwh =
      groupSessions(allSessions).find((g) => g.group === 'home')?.pricePerKwh ?? null
    homePriceFromPeriod = false
  }

  const away = groups.filter((g) => isAway(g.group))
  const awayWithCost = away.filter((g) => g.energyWithCost > 0)
  const extraCostVsHome =
    homePricePerKwh === null || awayWithCost.length === 0
      ? null
      : awayWithCost.reduce((acc, g) => acc + g.cost - g.energyWithCost * homePricePerKwh!, 0)

  const home = groups.find((g) => g.group === 'home')
  const sum = (items: (ChargerGroupStats | undefined)[], pick: (g: ChargerGroupStats) => number) =>
    items.reduce((acc, g) => acc + (g ? pick(g) : 0), 0)
  const energyBase = sum([home, ...away], (g) => g.energyKwh)
  const costBase = sum([home, ...away], (g) => g.cost)

  return {
    groups,
    homePricePerKwh,
    homePriceFromPeriod,
    extraCostVsHome,
    // Without any charge at home there is nothing to compare the share with.
    awayEnergyShare: home && energyBase > 0 ? sum(away, (g) => g.energyKwh) / energyBase : null,
    awayCostShare: home && costBase > 0 ? sum(away, (g) => g.cost) / costBase : null,
  }
}
