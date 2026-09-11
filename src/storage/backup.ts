import type { CarSettings, ChargingSession, FuelEntry } from '../domain/types'

export const BACKUP_VERSION = 2

export interface BackupFile {
  version: number
  exportedAt: string
  settings: CarSettings
  sessions: ChargingSession[]
  fuelEntries: FuelEntry[]
}

export function createBackup(
  settings: CarSettings,
  sessions: ChargingSession[],
  fuelEntries: FuelEntry[],
): BackupFile {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    sessions,
    fuelEntries,
  }
}

export class InvalidBackupError extends Error {}

export function parseBackup(raw: string): BackupFile {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    throw new InvalidBackupError('O ficheiro não é um JSON válido.')
  }

  if (!isBackupFile(data)) {
    throw new InvalidBackupError('O ficheiro não tem o formato esperado de uma cópia de segurança.')
  }

  // Backups from before fuel entries existed (version 1) simply have none.
  return { ...data, fuelEntries: data.fuelEntries ?? [] }
}

function isBackupFile(data: unknown): data is BackupFile & { fuelEntries?: FuelEntry[] } {
  if (typeof data !== 'object' || data === null) return false
  const candidate = data as Record<string, unknown>
  return (
    typeof candidate.version === 'number' &&
    typeof candidate.exportedAt === 'string' &&
    typeof candidate.settings === 'object' &&
    candidate.settings !== null &&
    Array.isArray(candidate.sessions) &&
    (candidate.fuelEntries === undefined || Array.isArray(candidate.fuelEntries))
  )
}
