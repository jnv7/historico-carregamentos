import { useCallback, useState } from 'react'
import { createId } from '../domain/id'
import type { ChargingSession } from '../domain/types'
import { loadSessions, saveSessions } from '../storage/sessionsRepository'

export type NewChargingSession = Omit<ChargingSession, 'id' | 'createdAt' | 'updatedAt'>

export function useSessions() {
  const [sessions, setSessions] = useState<ChargingSession[]>(() => loadSessions())

  const addSession = useCallback((data: NewChargingSession): ChargingSession => {
    const now = new Date().toISOString()
    const session: ChargingSession = { ...data, id: createId(), createdAt: now, updatedAt: now }
    setSessions((prev) => {
      const next = [...prev, session]
      saveSessions(next)
      return next
    })
    return session
  }, [])

  const updateSession = useCallback((id: string, changes: Partial<ChargingSession>) => {
    setSessions((prev) => {
      const next = prev.map((session) =>
        session.id === id
          ? { ...session, ...changes, updatedAt: new Date().toISOString() }
          : session,
      )
      saveSessions(next)
      return next
    })
  }, [])

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((session) => session.id !== id)
      saveSessions(next)
      return next
    })
  }, [])

  const deleteAllSessions = useCallback(() => {
    setSessions([])
    saveSessions([])
  }, [])

  const replaceAllSessions = useCallback((next: ChargingSession[]) => {
    setSessions(next)
    saveSessions(next)
  }, [])

  return {
    sessions,
    addSession,
    updateSession,
    deleteSession,
    deleteAllSessions,
    replaceAllSessions,
  }
}
