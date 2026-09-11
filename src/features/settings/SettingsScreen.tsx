import type { CarSettings, ChargingSession, FuelEntry } from '../../domain/types'
import { BackupSection } from './BackupSection'
import { TariffEditor } from './TariffEditor'

export interface SettingsScreenProps {
  settings: CarSettings
  sessions: ChargingSession[]
  fuelEntries: FuelEntry[]
  onSettingsChange: (settings: CarSettings) => void
  onRestoreSessions: (sessions: ChargingSession[]) => void
  onRestoreFuelEntries: (fuelEntries: FuelEntry[]) => void
  onDeleteAll: () => void
}

export function SettingsScreen({
  settings,
  sessions,
  fuelEntries,
  onSettingsChange,
  onRestoreSessions,
  onRestoreFuelEntries,
  onDeleteAll,
}: SettingsScreenProps) {
  return (
    <div className="stack">
      <h2>Definições</h2>

      <div className="field">
        <label htmlFor="car-name">Nome do carro</label>
        <input
          id="car-name"
          type="text"
          value={settings.carName}
          onChange={(e) => onSettingsChange({ ...settings, carName: e.target.value })}
        />
      </div>

      <TariffEditor
        tariffs={settings.tariffs}
        onChange={(tariffs) => onSettingsChange({ ...settings, tariffs })}
      />

      <BackupSection
        settings={settings}
        sessions={sessions}
        fuelEntries={fuelEntries}
        onSettingsChange={onSettingsChange}
        onRestoreSessions={onRestoreSessions}
        onRestoreFuelEntries={onRestoreFuelEntries}
        onDeleteAll={onDeleteAll}
      />
    </div>
  )
}
