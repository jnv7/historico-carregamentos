import { useMemo, useState, type FormEvent } from 'react'
import { combineDateAndTime, toDateInputValue, toTimeInputValue } from '../../domain/datetime'
import { inferCost } from '../../domain/tariffs'
import type { ChargerType, ChargingSession, Tariff } from '../../domain/types'
import type { NewChargingSession } from '../../hooks/useSessions'

const CHARGER_TYPE_LABELS: Record<ChargerType, string> = {
  home: 'Casa',
  public_ac: 'Público AC',
  public_dc: 'Público DC (rápido)',
  other: 'Outro',
}

export interface SessionFormProps {
  carId: string
  tariffs: Tariff[]
  initialSession?: ChargingSession
  defaultStartAt?: Date
  submitLabel?: string
  onSubmit: (values: NewChargingSession) => void
  onCancel: () => void
}

export function SessionForm({
  carId,
  tariffs,
  initialSession,
  defaultStartAt,
  submitLabel = 'Guardar',
  onSubmit,
  onCancel,
}: SessionFormProps) {
  const startAtDate = initialSession
    ? new Date(initialSession.startAt)
    : (defaultStartAt ?? new Date())

  const [dateValue, setDateValue] = useState(toDateInputValue(startAtDate))
  const [timeValue, setTimeValue] = useState(toTimeInputValue(startAtDate))
  const [energyKwh, setEnergyKwh] = useState(initialSession ? String(initialSession.energyKwh) : '')
  const [cost, setCost] = useState(initialSession?.cost != null ? String(initialSession.cost) : '')
  const [batteryStartPct, setBatteryStartPct] = useState(
    initialSession?.batteryStartPct != null ? String(initialSession.batteryStartPct) : '',
  )
  const [batteryEndPct, setBatteryEndPct] = useState(
    initialSession?.batteryEndPct != null ? String(initialSession.batteryEndPct) : '',
  )
  const [odometerKm, setOdometerKm] = useState(
    initialSession?.odometerKm != null ? String(initialSession.odometerKm) : '',
  )
  const [location, setLocation] = useState(initialSession?.location ?? '')
  const [chargerType, setChargerType] = useState<ChargerType | ''>(
    initialSession?.chargerType ?? '',
  )
  const [notes, setNotes] = useState(initialSession?.notes ?? '')
  const [error, setError] = useState<string | null>(null)

  const inferredCost = useMemo(() => {
    const energy = Number(energyKwh)
    if (!dateValue || !energy || energy <= 0) return null
    return inferCost(tariffs, combineDateAndTime(dateValue, timeValue), energy)
  }, [tariffs, dateValue, timeValue, energyKwh])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const energy = Number(energyKwh)
    if (!dateValue) {
      setError('A data é obrigatória.')
      return
    }
    if (!energyKwh || Number.isNaN(energy) || energy <= 0) {
      setError('Indica a energia carregada (kWh).')
      return
    }

    const startAt = combineDateAndTime(dateValue, timeValue).toISOString()
    const finalCost = cost.trim() !== '' ? Number(cost) : inferredCost

    onSubmit({
      carId,
      startAt,
      endAt: initialSession?.endAt ?? null,
      energyKwh: energy,
      cost: finalCost,
      batteryStartPct: batteryStartPct.trim() !== '' ? Number(batteryStartPct) : null,
      batteryEndPct: batteryEndPct.trim() !== '' ? Number(batteryEndPct) : null,
      odometerKm: odometerKm.trim() !== '' ? Number(odometerKm) : null,
      location: location.trim() !== '' ? location.trim() : null,
      chargerType: chargerType !== '' ? chargerType : null,
      notes: notes.trim() !== '' ? notes.trim() : null,
      isLive: false,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="stack" aria-label="Registo de carregamento">
      <div className="row">
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="session-date">Data *</label>
          <input
            id="session-date"
            type="date"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
          />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="session-time">Hora</label>
          <input
            id="session-time"
            type="time"
            value={timeValue}
            onChange={(e) => setTimeValue(e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="session-energy">Energia carregada (kWh) *</label>
        <input
          id="session-energy"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={energyKwh}
          onChange={(e) => setEnergyKwh(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="session-cost">
          Custo (€){inferredCost != null ? ` — estimado: ${inferredCost.toFixed(2)} €` : ''}
        </label>
        <input
          id="session-cost"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder={inferredCost != null ? inferredCost.toFixed(2) : 'opcional'}
          value={cost}
          onChange={(e) => setCost(e.target.value)}
        />
      </div>

      <details>
        <summary>Mais detalhes (opcional)</summary>
        <div className="stack" style={{ marginTop: 12 }}>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="battery-start">Bateria inicial (%)</label>
              <input
                id="battery-start"
                type="number"
                inputMode="numeric"
                min="0"
                max="100"
                value={batteryStartPct}
                onChange={(e) => setBatteryStartPct(e.target.value)}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="battery-end">Bateria final (%)</label>
              <input
                id="battery-end"
                type="number"
                inputMode="numeric"
                min="0"
                max="100"
                value={batteryEndPct}
                onChange={(e) => setBatteryEndPct(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="odometer">Quilometragem (km)</label>
            <input
              id="odometer"
              type="number"
              inputMode="numeric"
              min="0"
              value={odometerKm}
              onChange={(e) => setOdometerKm(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="location">Local</label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="charger-type">Tipo de carregador</label>
            <select
              id="charger-type"
              value={chargerType}
              onChange={(e) => setChargerType(e.target.value as ChargerType | '')}
            >
              <option value="">—</option>
              {Object.entries(CHARGER_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="notes">Notas</label>
            <textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      </details>

      {error && (
        <p className="muted" role="alert" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}

      <div className="row">
        <button type="button" className="btn" onClick={onCancel} style={{ flex: 1 }}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
