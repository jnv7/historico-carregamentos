import { readJson, writeJson } from './localStorage'

const KEY = 'historico-carregamentos:lastSeenVersion'

export function loadLastSeenVersion(): string | null {
  return readJson<string | null>(KEY, null, (value) => typeof value === 'string')
}

export function saveLastSeenVersion(version: string): void {
  writeJson(KEY, version)
}
