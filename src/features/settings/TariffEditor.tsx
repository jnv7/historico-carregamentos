import { useState } from 'react'
import { createId } from '../../domain/id'
import type { Tariff, TariffTimeRange } from '../../domain/types'

const MAX_TARIFFS = 3
const DEFAULT_RANGE: TariffTimeRange = { start: '00:00', end: '23:59' }

export interface TariffEditorProps {
  tariffs: Tariff[]
  onChange: (tariffs: Tariff[]) => void
}

export function TariffEditor({ tariffs, onChange }: TariffEditorProps) {
  function updateTariff(id: string, changes: Partial<Tariff>) {
    onChange(tariffs.map((tariff) => (tariff.id === id ? { ...tariff, ...changes } : tariff)))
  }

  function updateRange(id: string, changes: Partial<TariffTimeRange>) {
    onChange(
      tariffs.map((tariff) =>
        tariff.id === id
          ? { ...tariff, ranges: [{ ...(tariff.ranges[0] ?? DEFAULT_RANGE), ...changes }] }
          : tariff,
      ),
    )
  }

  function addTariff() {
    if (tariffs.length >= MAX_TARIFFS) return
    onChange([
      ...tariffs,
      {
        id: createId(),
        label: `Tarifa ${tariffs.length + 1}`,
        pricePerKwh: 0,
        ranges: [DEFAULT_RANGE],
      },
    ])
  }

  function removeTariff(id: string) {
    onChange(tariffs.filter((tariff) => tariff.id !== id))
  }

  return (
    <div className="stack">
      <div className="row-between">
        <h3>Tarifas</h3>
        <button
          type="button"
          className="btn"
          onClick={addTariff}
          disabled={tariffs.length >= MAX_TARIFFS}
        >
          + Tarifa
        </button>
      </div>

      {tariffs.length === 0 && (
        <p className="muted">
          Sem tarifas configuradas — o custo terá de ser inserido manualmente.
        </p>
      )}

      {tariffs.map((tariff) => (
        <TariffRow
          key={tariff.id}
          tariff={tariff}
          onUpdate={(changes) => updateTariff(tariff.id, changes)}
          onUpdateRange={(changes) => updateRange(tariff.id, changes)}
          onRemove={() => removeTariff(tariff.id)}
        />
      ))}
    </div>
  )
}

interface TariffRowProps {
  tariff: Tariff
  onUpdate: (changes: Partial<Tariff>) => void
  onUpdateRange: (changes: Partial<TariffTimeRange>) => void
  onRemove: () => void
}

function TariffRow({ tariff, onUpdate, onUpdateRange, onRemove }: TariffRowProps) {
  // Kept as local string state (rather than deriving straight from tariff.pricePerKwh) so
  // typing a decimal like "0,15" doesn't get reformatted back to "0" mid-keystroke. A price
  // of exactly 0 only ever means "a new tariff, price not set yet", so show it as blank
  // rather than a literal "0" that digits would otherwise get typed after.
  const [priceInput, setPriceInput] = useState(() =>
    tariff.pricePerKwh === 0 ? '' : String(tariff.pricePerKwh),
  )
  const range = tariff.ranges[0] ?? DEFAULT_RANGE

  function handlePriceChange(value: string) {
    setPriceInput(value)
    const parsed = Number(value)
    if (value.trim() !== '' && !Number.isNaN(parsed)) {
      onUpdate({ pricePerKwh: parsed })
    }
  }

  return (
    <div className="card stack">
      <div className="row">
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor={`tariff-label-${tariff.id}`}>Nome</label>
          <input
            id={`tariff-label-${tariff.id}`}
            type="text"
            value={tariff.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
          />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor={`tariff-price-${tariff.id}`}>€/kWh</label>
          <input
            id={`tariff-price-${tariff.id}`}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.0001"
            value={priceInput}
            onChange={(e) => handlePriceChange(e.target.value)}
          />
        </div>
      </div>
      <div className="row">
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor={`tariff-start-${tariff.id}`}>Das</label>
          <input
            id={`tariff-start-${tariff.id}`}
            type="time"
            value={range.start}
            onChange={(e) => onUpdateRange({ start: e.target.value })}
          />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor={`tariff-end-${tariff.id}`}>Às</label>
          <input
            id={`tariff-end-${tariff.id}`}
            type="time"
            value={range.end}
            onChange={(e) => onUpdateRange({ end: e.target.value })}
          />
        </div>
      </div>
      <button type="button" className="btn btn-danger" onClick={onRemove}>
        Remover tarifa
      </button>
    </div>
  )
}
