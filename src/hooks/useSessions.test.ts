import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_CAR_ID } from '../domain/types'
import { loadSessions } from '../storage/sessionsRepository'
import { useSessions, type NewChargingSession } from './useSessions'

const baseSession: NewChargingSession = {
  carId: DEFAULT_CAR_ID,
  kind: 'electric',
  startAt: '2024-01-01T10:00:00.000Z',
  endAt: null,
  energyKwh: 12,
  cost: null,
  batteryStartPct: null,
  batteryEndPct: null,
  odometerKm: null,
  location: null,
  chargerType: null,
  notes: null,
  isLive: false,
}

describe('useSessions', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts empty when nothing was persisted', () => {
    const { result } = renderHook(() => useSessions())
    expect(result.current.sessions).toEqual([])
  })

  it('adds a session, assigning an id, and persists it', () => {
    const { result } = renderHook(() => useSessions())

    act(() => {
      result.current.addSession(baseSession)
    })

    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.sessions[0].id).toBeTruthy()
    expect(result.current.sessions[0].energyKwh).toBe(12)
    expect(loadSessions()).toHaveLength(1)
  })

  it('updates an existing session', () => {
    const { result } = renderHook(() => useSessions())
    let id = ''
    act(() => {
      id = result.current.addSession(baseSession).id
    })

    act(() => {
      result.current.updateSession(id, { energyKwh: 20 })
    })

    expect(result.current.sessions[0].energyKwh).toBe(20)
    expect(loadSessions()[0].energyKwh).toBe(20)
  })

  it('deletes a session', () => {
    const { result } = renderHook(() => useSessions())
    let id = ''
    act(() => {
      id = result.current.addSession(baseSession).id
    })

    act(() => {
      result.current.deleteSession(id)
    })

    expect(result.current.sessions).toEqual([])
    expect(loadSessions()).toEqual([])
  })

  it('deletes all sessions', () => {
    const { result } = renderHook(() => useSessions())
    act(() => {
      result.current.addSession(baseSession)
      result.current.addSession(baseSession)
    })

    act(() => {
      result.current.deleteAllSessions()
    })

    expect(result.current.sessions).toEqual([])
    expect(loadSessions()).toEqual([])
  })

  it('replaces all sessions, e.g. after restoring a backup', () => {
    const { result } = renderHook(() => useSessions())
    const restored = [{ ...baseSession, id: 'x', createdAt: 'now', updatedAt: 'now' }]

    act(() => {
      result.current.replaceAllSessions(restored)
    })

    expect(result.current.sessions).toEqual(restored)
    expect(loadSessions()).toEqual(restored)
  })
})
