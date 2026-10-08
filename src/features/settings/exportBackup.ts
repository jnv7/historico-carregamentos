import type { CarSettings, ChargingSession, FuelEntry } from '../../domain/types'
import { createBackup } from '../../storage/backup'
import { downloadTextFile } from '../../utils/download'

/** Downloads a backup file and returns the settings with the backup time recorded. */
export function exportBackup(
  settings: CarSettings,
  sessions: ChargingSession[],
  fuelEntries: FuelEntry[],
): CarSettings {
  const backup = createBackup(settings, sessions, fuelEntries)
  const filename = `carregamentos-backup-${new Date().toISOString().slice(0, 10)}.json`
  downloadTextFile(filename, JSON.stringify(backup, null, 2))
  return {
    ...settings,
    backupReminder: { ...settings.backupReminder, lastBackupAt: new Date().toISOString() },
  }
}
