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

      {tariffs.map((tariff) => {
        const range = tariff.ranges[0] ?? DEFAULT_RANGE
        return (
          <div key={tariff.id} className="card stack">
            <div className="row">
              <div className="field" style={{ flex: 2 }}>
                <label htmlFor={`tariff-label-${tariff.id}`}>Nome</label>
                <input
                  id={`tariff-label-${tariff.id}`}
                  type="text"
                  value={tariff.label}
                  onChange={(e) => updateTariff(tariff.id, { label: e.target.value })}
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
                  value={tariff.pricePerKwh}
                  onChange={(e) => updateTariff(tariff.id, { pricePerKwh: Number(e.target.value) })}
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
                  onChange={(e) => updateRange(tariff.id, { start: e.target.value })}
                />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor={`tariff-end-${tariff.id}`}>Às</label>
                <input
                  id={`tariff-end-${tariff.id}`}
                  type="time"
                  value={range.end}
                  onChange={(e) => updateRange(tariff.id, { end: e.target.value })}
                />
              </div>
            </div>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => removeTariff(tariff.id)}
            >
              Remover tarifa
            </button>
          </div>
        )
      })}
    </div>
  )
}
