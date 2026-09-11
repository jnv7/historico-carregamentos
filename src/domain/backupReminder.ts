import type { CarSettings } from './types'

export function daysSince(isoDate: string, now: Date): number {
  return (now.getTime() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24)
}

function earliestCreatedAt(items: { createdAt: string }[]): string | null {
  if (items.length === 0) return null
  return items.reduce(
    (earliest, item) => (item.createdAt < earliest ? item.createdAt : earliest),
    items[0].createdAt,
  )
}

/**
 * A backup reminder only makes sense once there is data worth protecting.
 * The reference point is the last backup, or (if none yet) the oldest entry
 * across both charging sessions and fuel entries.
 */
export function shouldShowBackupReminder(
  settings: CarSettings,
  entries: { createdAt: string }[],
  now: Date = new Date(),
): boolean {
  if (!settings.backupReminder.enabled) return false
  const referenceDate = settings.backupReminder.lastBackupAt ?? earliestCreatedAt(entries)
  if (!referenceDate) return false
  return daysSince(referenceDate, now) >= settings.backupReminder.intervalDays
}
