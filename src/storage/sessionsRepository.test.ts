import { beforeEach, describe, expect, it } from 'vitest'
import type { ChargingSession } from '../domain/types'
import { loadSessions, saveSessions } from './sessionsRepository'

function makeSession(overrides: Partial<ChargingSession> = {}): ChargingSession {
  return {
    id: '1',
    carId: 'default-car',
    startAt: '2024-01-01T10:00:00.000Z',
    endAt: null,
    energyKwh: 10,
    cost: null,
    batteryStartPct: null,
    batteryEndPct: null,
    odometerKm: null,
    location: null,
    chargerType: null,
    notes: null,
    isLive: false,
    createdAt: '2024-01-01T10:00:00.000Z',
    updatedAt: '2024-01-01T10:00:00.000Z',
    ...overrides,
  }
}

describe('sessionsRepository', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns an empty array when nothing was saved yet', () => {
    expect(loadSessions()).toEqual([])
  })

  it('persists and reloads sessions', () => {
    const sessions = [makeSession(), makeSession({ id: '2' })]

    saveSessions(sessions)

    expect(loadSessions()).toEqual(sessions)
  })

  it('falls back to an empty array when stored data is corrupted', () => {
    localStorage.setItem('historico-carregamentos:sessions', '{not json')

    expect(loadSessions()).toEqual([])
  })
})
