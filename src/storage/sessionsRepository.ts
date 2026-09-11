import type { ChargingSession } from '../domain/types'
import { readJson, writeJson } from './localStorage'

const KEY = 'historico-carregamentos:sessions'

export function loadSessions(): ChargingSession[] {
  return readJson<ChargingSession[]>(KEY, [])
}

export function saveSessions(sessions: ChargingSession[]): void {
  writeJson(KEY, sessions)
}
