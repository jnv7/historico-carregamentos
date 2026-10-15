import type { ChargerType, ChargingSession } from '../../domain/types'

/** Os detalhes que se podem saber antes de o carregamento terminar. */
export type LiveDetails = Pick<
  ChargingSession,
  'batteryStartPct' | 'odometerKm' | 'chargerType' | 'location' | 'notes'
>

/** O que está escrito nos campos, sempre como texto. */
export interface LiveDetailsDraft {
  batteryStartPct: string
  odometerKm: string
  chargerType: ChargerType | ''
  location: string
  notes: string
}

export const EMPTY_LIVE_DETAILS_DRAFT: LiveDetailsDraft = {
  batteryStartPct: '',
  odometerKm: '',
  chargerType: '',
  location: '',
  notes: '',
}

export function draftFromSession(session: ChargingSession): LiveDetailsDraft {
  return {
    batteryStartPct: session.batteryStartPct != null ? String(session.batteryStartPct) : '',
    odometerKm: session.odometerKm != null ? String(session.odometerKm) : '',
    chargerType: session.chargerType ?? '',
    location: session.location ?? '',
    notes: session.notes ?? '',
  }
}

export type ParseResult = { ok: true; details: LiveDetails } | { ok: false; error: string }

export function parseLiveDetailsDraft(draft: LiveDetailsDraft): ParseResult {
  const battery = draft.batteryStartPct.trim()
  const odometer = draft.odometerKm.trim()
  const location = draft.location.trim()
  const notes = draft.notes.trim()

  const batteryValue = battery === '' ? null : Number(battery)
  if (batteryValue !== null && !(batteryValue >= 0 && batteryValue <= 100)) {
    return { ok: false, error: 'A bateria inicial tem de estar entre 0 e 100%.' }
  }

  const odometerValue = odometer === '' ? null : Number(odometer)
  if (odometerValue !== null && !(odometerValue >= 0)) {
    return { ok: false, error: 'A quilometragem não pode ser negativa.' }
  }

  return {
    ok: true,
    details: {
      batteryStartPct: batteryValue,
      odometerKm: odometerValue,
      chargerType: draft.chargerType !== '' ? draft.chargerType : null,
      location: location !== '' ? location : null,
      notes: notes !== '' ? notes : null,
    },
  }
}
