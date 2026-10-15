import type { ChargingSession } from './types'

/** Only charges that raised the battery by at least this much count (small ones round badly). */
const MIN_PCT_GAIN = 20
const MIN_SAMPLES = 3

/**
 * Estimated capacity in kWh: the median of energy ÷ (% charged / 100) over the charges that have
 * both a starting and an ending battery level. It includes charging losses, which are paid for too.
 * Null when fewer than MIN_SAMPLES charges qualify.
 */
export function estimateBatteryCapacity(sessions: ChargingSession[]): number | null {
  const samples = sessions
    .filter(
      (s) =>
        !s.isLive &&
        s.batteryStartPct != null &&
        s.batteryEndPct != null &&
        s.energyKwh > 0 &&
        s.batteryEndPct - s.batteryStartPct >= MIN_PCT_GAIN,
    )
    .map((s) => s.energyKwh / ((s.batteryEndPct! - s.batteryStartPct!) / 100))
    .sort((a, b) => a - b)
  if (samples.length < MIN_SAMPLES) return null

  const middle = Math.floor(samples.length / 2)
  const median =
    samples.length % 2 === 1 ? samples[middle] : (samples[middle - 1] + samples[middle]) / 2
  return Math.round(median * 10) / 10
}

/** The capacity to use in the calculations: the one the user set or, failing that, the estimate. */
export function effectiveBatteryCapacity(
  setting: number | null,
  sessions: ChargingSession[],
): number | null {
  return setting ?? estimateBatteryCapacity(sessions)
}
