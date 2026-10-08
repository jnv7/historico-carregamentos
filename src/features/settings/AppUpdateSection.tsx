import { useState } from 'react'
import type { CarSettings, ChargingSession, FuelEntry } from '../../domain/types'
import { formatDate } from '../../domain/format'
import { updateAndReload } from '../../utils/appUpdate'
import { exportBackup } from './exportBackup'

export interface AppUpdateSectionProps {
  settings: CarSettings
  sessions: ChargingSession[]
  fuelEntries: FuelEntry[]
  onSettingsChange: (settings: CarSettings) => void
}

type Step = 'idle' | 'confirming' | 'updating'

export function AppUpdateSection({
  settings,
  sessions,
  fuelEntries,
  onSettingsChange,
}: AppUpdateSectionProps) {
  const [step, setStep] = useState<Step>('idle')
  const [exported, setExported] = useState(false)
  const { lastBackupAt, askBeforeUpdate } = settings.backupReminder

  function startUpdate() {
    setStep('updating')
    void updateAndReload()
  }

  function handleUpdateClick() {
    if (askBeforeUpdate) {
      setExported(false)
      setStep('confirming')
    } else {
      startUpdate()
    }
  }

  function handleExport() {
    onSettingsChange(exportBackup(settings, sessions, fuelEntries))
    setExported(true)
  }

  return (
    <div className="stack">
      <h3>Aplicação</h3>
      <p style={{ color: 'var(--text-muted)' }}>
        Versão de {new Date(__APP_BUILD_TIME__).toLocaleString('pt-PT')}. Recarregar procura uma
        versão nova sem apagar os teus dados.
      </p>
      {step !== 'confirming' ? (
        <button
          type="button"
          className="btn"
          onClick={handleUpdateClick}
          disabled={step === 'updating'}
        >
          {step === 'updating' ? 'A atualizar…' : 'Procurar atualizações e recarregar'}
        </button>
      ) : (
        <div className="card stack">
          <p>
            Queres fazer uma cópia de segurança antes de atualizar?{' '}
            {lastBackupAt
              ? `A última foi a ${formatDate(lastBackupAt)}.`
              : 'Ainda não fizeste nenhuma.'}
          </p>
          {exported && <p style={{ color: 'var(--success)' }}>Cópia exportada.</p>}
          <button type="button" className="btn btn-primary" onClick={handleExport}>
            Exportar dados
          </button>
          <div className="row">
            <button
              type="button"
              className="btn"
              style={{ flex: 1 }}
              onClick={() => setStep('idle')}
            >
              Cancelar
            </button>
            <button type="button" className="btn" style={{ flex: 1 }} onClick={startUpdate}>
              {exported ? 'Atualizar agora' : 'Atualizar sem cópia'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
