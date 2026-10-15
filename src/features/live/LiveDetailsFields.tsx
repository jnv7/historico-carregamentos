import { CHARGER_TYPE_LABELS } from '../../domain/chargerTypes'
import type { ChargerType } from '../../domain/types'
import type { LiveDetailsDraft } from './liveDetails'

export interface LiveDetailsFieldsProps {
  draft: LiveDetailsDraft
  onChange: (draft: LiveDetailsDraft) => void
}

/** The details that are already known while a charge is still running. */
export function LiveDetailsFields({ draft, onChange }: LiveDetailsFieldsProps) {
  return (
    <div className="stack">
      <div className="field">
        <label htmlFor="live-battery-start">Bateria inicial (%)</label>
        <input
          id="live-battery-start"
          type="number"
          inputMode="numeric"
          min="0"
          max="100"
          value={draft.batteryStartPct}
          onChange={(e) => onChange({ ...draft, batteryStartPct: e.target.value })}
        />
      </div>

      <div className="field">
        <label htmlFor="live-odometer">Quilometragem (km)</label>
        <input
          id="live-odometer"
          type="number"
          inputMode="numeric"
          min="0"
          value={draft.odometerKm}
          onChange={(e) => onChange({ ...draft, odometerKm: e.target.value })}
        />
      </div>

      <div className="field">
        <label htmlFor="live-location">Local</label>
        <input
          id="live-location"
          type="text"
          value={draft.location}
          onChange={(e) => onChange({ ...draft, location: e.target.value })}
        />
      </div>

      <div className="field">
        <label htmlFor="live-charger-type">Tipo de carregador</label>
        <select
          id="live-charger-type"
          value={draft.chargerType}
          onChange={(e) => onChange({ ...draft, chargerType: e.target.value as ChargerType | '' })}
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
        <label htmlFor="live-notes">Notas</label>
        <textarea
          id="live-notes"
          rows={2}
          value={draft.notes}
          onChange={(e) => onChange({ ...draft, notes: e.target.value })}
        />
      </div>
    </div>
  )
}
