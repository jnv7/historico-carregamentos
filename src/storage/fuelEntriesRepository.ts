import type { FuelEntry } from '../domain/types'
import { readJson, writeJson } from './localStorage'

const KEY = 'historico-carregamentos:fuel-entries'

export function loadFuelEntries(): FuelEntry[] {
  return readJson<FuelEntry[]>(KEY, [], Array.isArray)
}

export function saveFuelEntries(entries: FuelEntry[]): void {
  writeJson(KEY, entries)
}
