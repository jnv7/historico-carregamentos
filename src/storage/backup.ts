import type { CarSettings, ChargingSession } from '../domain/types'

export const BACKUP_VERSION = 1

export interface BackupFile {
  version: number
  exportedAt: string
  settings: CarSettings
  sessions: ChargingSession[]
}

export function createBackup(settings: CarSettings, sessions: ChargingSession[]): BackupFile {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    sessions,
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

  return data
}

function isBackupFile(data: unknown): data is BackupFile {
  if (typeof data !== 'object' || data === null) return false
  const candidate = data as Record<string, unknown>
  return (
    typeof candidate.version === 'number' &&
    typeof candidate.exportedAt === 'string' &&
    typeof candidate.settings === 'object' &&
    candidate.settings !== null &&
    Array.isArray(candidate.sessions)
  )
}
