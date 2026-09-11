import { useRef, useState, type ChangeEvent } from 'react'
import type { CarSettings, ChargingSession, FuelEntry } from '../../domain/types'
import { createBackup, InvalidBackupError, parseBackup } from '../../storage/backup'
import { downloadTextFile } from '../../utils/download'

export interface BackupSectionProps {
  settings: CarSettings
  sessions: ChargingSession[]
  fuelEntries: FuelEntry[]
  onSettingsChange: (settings: CarSettings) => void
  onRestoreSessions: (sessions: ChargingSession[]) => void
  onRestoreFuelEntries: (fuelEntries: FuelEntry[]) => void
  onDeleteAll: () => void
}

export function BackupSection({
  settings,
  sessions,
  fuelEntries,
  onSettingsChange,
  onRestoreSessions,
  onRestoreFuelEntries,
  onDeleteAll,
}: BackupSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  function handleExport() {
    const backup = createBackup(settings, sessions, fuelEntries)
    const filename = `carregamentos-backup-${new Date().toISOString().slice(0, 10)}.json`
    downloadTextFile(filename, JSON.stringify(backup, null, 2))
    onSettingsChange({
      ...settings,
      backupReminder: { ...settings.backupReminder, lastBackupAt: new Date().toISOString() },
    })
  }

  function handleImportClick() {
    setImportError(null)
    setImportSuccess(false)
    fileInputRef.current?.click()
  }

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setImportError(null)
    setImportSuccess(false)
    try {
      const text = await file.text()
      const backup = parseBackup(text)
      onRestoreSessions(backup.sessions)
      onRestoreFuelEntries(backup.fuelEntries)
      onSettingsChange(backup.settings)
      setImportSuccess(true)
    } catch (err) {
      setImportError(
        err instanceof InvalidBackupError ? err.message : 'Não foi possível importar o ficheiro.',
      )
    }
  }

  function updateReminder(changes: Partial<CarSettings['backupReminder']>) {
    onSettingsChange({ ...settings, backupReminder: { ...settings.backupReminder, ...changes } })
  }

  function handleDeleteAll() {
    onDeleteAll()
    setConfirmingDelete(false)
  }

  return (
    <div className="stack">
      <h3>Cópia de segurança</h3>
      <div className="row">
        <button
          type="button"
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={handleExport}
        >
          Exportar dados
        </button>
        <button type="button" className="btn" style={{ flex: 1 }} onClick={handleImportClick}>
          Importar dados
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        hidden
        aria-label="Selecionar ficheiro de backup"
        onChange={handleFileSelected}
      />
      {importError && (
        <p role="alert" style={{ color: 'var(--danger)' }}>
          {importError}
        </p>
      )}
      {importSuccess && <p style={{ color: 'var(--success)' }}>Dados importados com sucesso.</p>}

      <label className="row">
        <input
          type="checkbox"
          checked={settings.backupReminder.enabled}
          onChange={(e) => updateReminder({ enabled: e.target.checked })}
        />
        Lembrar-me de fazer backup periodicamente
      </label>

      {settings.backupReminder.enabled && (
        <div className="field">
          <label htmlFor="backup-interval">A cada quantos dias</label>
          <input
            id="backup-interval"
            type="number"
            min="1"
            value={settings.backupReminder.intervalDays}
            onChange={(e) => updateReminder({ intervalDays: Number(e.target.value) || 1 })}
          />
        </div>
      )}

      <h3 style={{ marginTop: 20 }}>Zona perigosa</h3>
      {!confirmingDelete ? (
        <button type="button" className="btn btn-danger" onClick={() => setConfirmingDelete(true)}>
          Apagar todos os dados
        </button>
      ) : (
        <div className="card stack">
          <p>
            Tens a certeza? Esta ação apaga todos os carregamentos e abastecimentos e não pode ser
            desfeita.
          </p>
          <div className="row">
            <button
              type="button"
              className="btn"
              style={{ flex: 1 }}
              onClick={() => setConfirmingDelete(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-danger"
              style={{ flex: 1 }}
              onClick={handleDeleteAll}
            >
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
