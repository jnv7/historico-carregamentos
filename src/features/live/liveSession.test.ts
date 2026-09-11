import { describe, expect, it } from 'vitest'
import { DEFAULT_CAR_ID, type ChargingSession } from '../../domain/types'
import { findLiveSession } from './liveSession'

function makeSession(overrides: Partial<ChargingSession>): ChargingSession {
  return {
    id: Math.random().toString(),
    carId: DEFAULT_CAR_ID,
    kind: 'electric',
    startAt: new Date().toISOString(),
    endAt: null,
    energyKwh: 0,
    cost: null,
    batteryStartPct: null,
    batteryEndPct: null,
    odometerKm: null,
    location: null,
    chargerType: null,
    notes: null,
    isLive: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('findLiveSession', () => {
  it('returns null when there is no live session', () => {
    expect(findLiveSession([makeSession({ isLive: false })])).toBeNull()
  })

  it('returns the session marked as live', () => {
    const live = makeSession({ id: 'live-1', isLive: true })
    expect(findLiveSession([makeSession({ isLive: false }), live])).toEqual(live)
  })
})
