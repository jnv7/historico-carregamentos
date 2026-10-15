import { describe, expect, it } from 'vitest'
import { DEFAULT_CAR_ID, type ChargingSession } from '../../domain/types'
import {
  draftFromSession,
  EMPTY_LIVE_DETAILS_DRAFT,
  parseLiveDetailsDraft,
  type LiveDetailsDraft,
} from './liveDetails'

const BATTERY_ERROR = 'A bateria inicial tem de estar entre 0 e 100%.'
const ODOMETER_ERROR = 'A quilometragem não pode ser negativa.'

function draft(overrides: Partial<LiveDetailsDraft>): LiveDetailsDraft {
  return { ...EMPTY_LIVE_DETAILS_DRAFT, ...overrides }
}

function makeSession(overrides: Partial<ChargingSession> = {}): ChargingSession {
  return {
    id: 'live-1',
    carId: DEFAULT_CAR_ID,
    kind: 'electric',
    startAt: '2024-01-01T10:00:00.000Z',
    endAt: null,
    energyKwh: 0,
    cost: null,
    batteryStartPct: null,
    batteryEndPct: null,
    odometerKm: null,
    location: null,
    chargerType: null,
    notes: null,
    isLive: true,
    createdAt: '2024-01-01T10:00:00.000Z',
    updatedAt: '2024-01-01T10:00:00.000Z',
    ...overrides,
  }
}

describe('parseLiveDetailsDraft', () => {
  it('turns an empty draft into all-null details', () => {
    expect(parseLiveDetailsDraft(EMPTY_LIVE_DETAILS_DRAFT)).toEqual({
      ok: true,
      details: {
        batteryStartPct: null,
        odometerKm: null,
        chargerType: null,
        location: null,
        notes: null,
      },
    })
  })

  it('converts and trims the filled fields', () => {
    const result = parseLiveDetailsDraft({
      batteryStartPct: ' 20 ',
      odometerKm: '12345',
      chargerType: 'public_dc',
      location: ' Ionity ',
      notes: 'x',
    })
    expect(result).toEqual({
      ok: true,
      details: {
        batteryStartPct: 20,
        odometerKm: 12345,
        chargerType: 'public_dc',
        location: 'Ionity',
        notes: 'x',
      },
    })
  })

  it('accepts the battery limits 0 and 100', () => {
    expect(parseLiveDetailsDraft(draft({ batteryStartPct: '0' })).ok).toBe(true)
    expect(parseLiveDetailsDraft(draft({ batteryStartPct: '100' })).ok).toBe(true)
  })

  it('rejects a battery above 100', () => {
    expect(parseLiveDetailsDraft(draft({ batteryStartPct: '101' }))).toEqual({
      ok: false,
      error: BATTERY_ERROR,
    })
  })

  it('rejects a negative battery', () => {
    expect(parseLiveDetailsDraft(draft({ batteryStartPct: '-1' }))).toEqual({
      ok: false,
      error: BATTERY_ERROR,
    })
  })

  it('rejects negative km', () => {
    expect(parseLiveDetailsDraft(draft({ odometerKm: '-5' }))).toEqual({
      ok: false,
      error: ODOMETER_ERROR,
    })
  })

  it('reports the battery error first when both fields are invalid', () => {
    expect(parseLiveDetailsDraft(draft({ batteryStartPct: '150', odometerKm: '-5' }))).toEqual({
      ok: false,
      error: BATTERY_ERROR,
    })
  })

  it('rejects text that is not a number', () => {
    expect(parseLiveDetailsDraft(draft({ batteryStartPct: 'abc' })).ok).toBe(false)
    expect(parseLiveDetailsDraft(draft({ odometerKm: 'abc' })).ok).toBe(false)
  })
})

describe('draftFromSession', () => {
  it('gives an empty draft for a session without details', () => {
    expect(draftFromSession(makeSession())).toEqual(EMPTY_LIVE_DETAILS_DRAFT)
  })

  it('writes numbers as text', () => {
    expect(draftFromSession(makeSession({ batteryStartPct: 35 })).batteryStartPct).toBe('35')
  })
})
