import type { ChargingSession } from '../../domain/types'

/** A live session is one that has been started but not yet finished. */
export function findLiveSession(sessions: ChargingSession[]): ChargingSession | null {
  return sessions.find((session) => session.isLive) ?? null
}
