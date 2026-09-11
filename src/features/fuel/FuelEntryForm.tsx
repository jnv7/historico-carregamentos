import { useState, type FormEvent } from 'react'
import { DateTimeFields } from '../../components/DateTimeFields'
import { combineDateAndTime, toDateInputValue, toTimeInputValue } from '../../domain/datetime'
import { deriveFuelField, type FuelField, type FuelFieldsInput } from '../../domain/fuelCalc'
import type { FuelEntry } from '../../domain/types'
import type { NewFuelEntry } from '../../hooks/useFuelEntries'

export interface FuelEntryFormProps {
  carId: string
  initialEntry?: FuelEntry
  defaultStartAt?: Date
  submitLabel?: string
  onSubmit: (values: NewFuelEntry) => void
  onCancel: () => void
}

function initialFields(initialEntry?: FuelEntry): FuelFieldsInput {
  if (!initialEntry) return { liters: '', pricePerLiter: '', cost: '' }
  const pricePerLiter =
    initialEntry.liters > 0
      ? String(Math.round((initialEntry.cost / initialEntry.liters) * 1000) / 1000)
      : ''
  return {
    liters: String(initialEntry.liters),
    pricePerLiter,
    cost: String(initialEntry.cost),
  }
}

export function FuelEntryForm({
  carId,
  initialEntry,
  defaultStartAt,
  submitLabel = 'Guardar',
  onSubmit,
  onCancel,
}: FuelEntryFormProps) {
  const startAtDate = initialEntry ? new Date(initialEntry.startAt) : (defaultStartAt ?? new Date())

  const [dateValue, setDateValue] = useState(toDateInputValue(startAtDate))
  const [timeValue, setTimeValue] = useState(toTimeInputValue(startAtDate))
  const [fields, setFields] = useState<FuelFieldsInput>(() => initialFields(initialEntry))
  // Seeded to the two "real" stored fields in edit mode, so the first edit already knows
  // which field to derive; empty in add mode, until the user has touched two fields.
  const [editOrder, setEditOrder] = useState<FuelField[]>(() =>
    initialEntry ? ['liters', 'cost'] : [],
  )
  const [odometerKm, setOdometerKm] = useState(
    initialEntry?.odometerKm != null ? String(initialEntry.odometerKm) : '',
  )
  const [location, setLocation] = useState(initialEntry?.location ?? '')
  const [notes, setNotes] = useState(initialEntry?.notes ?? '')
  const [error, setError] = useState<string | null>(null)

  function handleFieldChange(field: FuelField, value: string) {
    const newOrder = [...editOrder.filter((f) => f !== field), field]
    setEditOrder(newOrder)
    setFields((prev) => deriveFuelField({ ...prev, [field]: value }, newOrder))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const litersValue = Number(fields.liters)
    const costValue = Number(fields.cost)

    if (!dateValue) {
      setError('A data é obrigatória.')
      return
    }
    if (!fields.liters || Number.isNaN(litersValue) || litersValue <= 0) {
      setError('Indica os litros abastecidos (ou o preço por litro e o total, para calcular).')
      return
    }
    if (!fields.cost || Number.isNaN(costValue) || costValue <= 0) {
      setError('Indica o custo total (ou os litros e o preço por litro, para calcular).')
      return
    }

    const startAt = combineDateAndTime(dateValue, timeValue).toISOString()

    onSubmit({
      carId,
      kind: 'fuel',
      startAt,
      liters: litersValue,
      cost: costValue,
      odometerKm: odometerKm.trim() !== '' ? Number(odometerKm) : null,
      location: location.trim() !== '' ? location.trim() : null,
      notes: notes.trim() !== '' ? notes.trim() : null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="stack" aria-label="Registo de abastecimento">
      <DateTimeFields
        idPrefix="fuel"
        dateValue={dateValue}
        timeValue={timeValue}
        onDateChange={setDateValue}
        onTimeChange={setTimeValue}
      />

      <p className="muted" style={{ margin: '-6px 0 0' }}>
        Preenche 2 destes 3 campos — calculamos o terceiro.
      </p>

      <div className="row">
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="fuel-liters">Litros</label>
          <input
            id="fuel-liters"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={fields.liters}
            onChange={(e) => handleFieldChange('liters', e.target.value)}
          />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="fuel-price-per-liter">€/L</label>
          <input
            id="fuel-price-per-liter"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.001"
            value={fields.pricePerLiter}
            onChange={(e) => handleFieldChange('pricePerLiter', e.target.value)}
          />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="fuel-cost">Total (€)</label>
          <input
            id="fuel-cost"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={fields.cost}
            onChange={(e) => handleFieldChange('cost', e.target.value)}
          />
        </div>
      </div>

      <details>
        <summary>Mais detalhes (opcional)</summary>
        <div className="stack" style={{ marginTop: 12 }}>
          <div className="field">
            <label htmlFor="fuel-odometer">Quilometragem (km)</label>
            <input
              id="fuel-odometer"
              type="number"
              inputMode="numeric"
              min="0"
              value={odometerKm}
              onChange={(e) => setOdometerKm(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="fuel-location">Local</label>
            <input
              id="fuel-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="fuel-notes">Notas</label>
            <textarea
              id="fuel-notes"
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
