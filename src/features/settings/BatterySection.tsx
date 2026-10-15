import { useMemo, useState } from 'react'
import { estimateBatteryCapacity } from '../../domain/batteryCapacity'
import type { CarSettings, ChargingSession } from '../../domain/types'

export interface BatterySectionProps {
  settings: CarSettings
  sessions: ChargingSession[]
  onSettingsChange: (settings: CarSettings) => void
}

export function BatterySection({ settings, sessions, onSettingsChange }: BatterySectionProps) {
  const [value, setValue] = useState(
    settings.batteryCapacityKwh != null ? String(settings.batteryCapacityKwh) : '',
  )
  const estimate = useMemo(() => estimateBatteryCapacity(sessions), [sessions])

  function handleChange(text: string) {
    setValue(text)
    if (text.trim() === '') {
      onSettingsChange({ ...settings, batteryCapacityKwh: null })
      return
    }
    const capacity = Number(text)
    if (capacity > 0) onSettingsChange({ ...settings, batteryCapacityKwh: capacity })
  }

  return (
    <div className="stack">
      <h3>Bateria</h3>
      <div className="field">
        <label htmlFor="battery-capacity">Capacidade útil (kWh)</label>
        <input
          id="battery-capacity"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.1"
          placeholder={estimate != null ? String(estimate) : ''}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
        />
      </div>
      <p className="muted">
        {estimate != null
          ? `Estimada pelos teus carregamentos: ${estimate} kWh. Deixa vazio para usar a estimativa.`
          : 'Para estimar, regista a bateria inicial e final em pelo menos 3 carregamentos.'}
      </p>
    </div>
  )
}
