import type { CarSettings, ChargingSession } from './types'

export function daysSince(isoDate: string, now: Date): number {
  return (now.getTime() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24)
}

function earliestSessionDate(sessions: ChargingSession[]): string | null {
  if (sessions.length === 0) return null
  return sessions.reduce(
    (earliest, session) => (session.createdAt < earliest ? session.createdAt : earliest),
    sessions[0].createdAt,
  )
}

/**
 * A backup reminder only makes sense once there is data worth protecting.
 * The reference point is the last backup, or (if none yet) the oldest session.
 */
export function shouldShowBackupReminder(
  settings: CarSettings,
  sessions: ChargingSession[],
  now: Date = new Date(),
): boolean {
  if (!settings.backupReminder.enabled) return false
  const referenceDate = settings.backupReminder.lastBackupAt ?? earliestSessionDate(sessions)
  if (!referenceDate) return false
  return daysSince(referenceDate, now) >= settings.backupReminder.intervalDays
}
