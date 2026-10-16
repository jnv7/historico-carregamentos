import { useMemo, useState } from 'react'
import { filterByMonth } from '../../domain/calendar'
import { computeEfficiencyPoints, summarizeEfficiency } from '../../domain/efficiency'
import { capitalizeFirst, formatCurrency, formatEnergy, formatLiters } from '../../domain/format'
import { computeCombinedStats, computeElectricStats, computeFuelStats } from '../../domain/stats'
import type { ChargingSession, FuelEntry } from '../../domain/types'
import { EntryEfficiencyView } from './EntryEfficiencyView'
import { MonthlyCharts } from './MonthlyCharts'
import { SELECTED_BUTTON_STYLE, type Period, type StatsFilter } from './statsShared'

type StatsView = 'summary' | 'entries'

const VIEWS: { id: StatsView; label: string }[] = [
  { id: 'summary', label: 'Resumo' },
  { id: 'entries', label: 'Por registo' },
]

const FILTERS: { id: StatsFilter; label: string }[] = [
  { id: 'all', label: 'Ambos' },
  { id: 'electric', label: 'Elétrico' },
  { id: 'fuel', label: 'Combustível' },
]

const monthLabelFormatter = new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' })

export interface StatsScreenProps {
  sessions: ChargingSession[]
  fuelEntries: FuelEntry[]
  /** Battery capacity used to work out energy from the battery percentages; null when unknown. */
  batteryCapacityKwh: number | null
  /** Only the electric view exists for a fully electric car. */
  fullyElectric?: boolean
}

export function StatsScreen({
  sessions,
  fuelEntries,
  batteryCapacityKwh,
  fullyElectric = false,
}: StatsScreenProps) {
  const [view, setView] = useState<StatsView>('summary')
  const [chosenFilter, setFilter] = useState<StatsFilter>('all')
  const filter: StatsFilter = fullyElectric ? 'electric' : chosenFilter
  const [period, setPeriod] = useState<Period>('month')
  const [monthCursor, setMonthCursor] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })

  function goToMonth(offset: number) {
    setPeriod('month')
    setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1))
  }

  // A charge that is still running has no energy yet, so it is not counted.
  const finishedSessions = useMemo(() => sessions.filter((s) => !s.isLive), [sessions])
  const periodSessions = useMemo(
    () =>
      period === 'total'
        ? finishedSessions
        : filterByMonth(finishedSessions, monthCursor.getFullYear(), monthCursor.getMonth()),
    [finishedSessions, period, monthCursor],
  )
  const periodFuelEntries = useMemo(
    () =>
      period === 'total'
        ? fuelEntries
        : filterByMonth(fuelEntries, monthCursor.getFullYear(), monthCursor.getMonth()),
    [fuelEntries, period, monthCursor],
  )

  const electricStats = useMemo(() => computeElectricStats(periodSessions), [periodSessions])
  const fuelStats = useMemo(() => computeFuelStats(periodFuelEntries), [periodFuelEntries])
  const combinedStats = useMemo(
    () => computeCombinedStats(periodSessions, periodFuelEntries),
    [periodSessions, periodFuelEntries],
  )

  const efficiencySummary = useMemo(() => {
    const points = computeEfficiencyPoints(sessions, fuelEntries, filter, {
      batteryCapacityKwh,
      ignoreElectricKm: fullyElectric,
    })
    const inPeriod =
      period === 'total'
        ? points
        : filterByMonth(points, monthCursor.getFullYear(), monthCursor.getMonth())
    return summarizeEfficiency(inPeriod)
  }, [sessions, fuelEntries, filter, period, monthCursor, batteryCapacityKwh, fullyElectric])
  const costPerKm =
    efficiencySummary.costPer100Km !== null ? efficiencySummary.costPer100Km / 100 : null

  const costPerKmCard = costPerKm !== null && (
    <div className="card">
      <div className="muted">Custo médio por km</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{formatCurrency(costPerKm)}</div>
      <div className="muted">
        Baseado em {efficiencySummary.kmDriven.toLocaleString('pt-PT')} km percorridos
      </div>
    </div>
  )

  const hasDataInPeriod = periodSessions.length > 0 || periodFuelEntries.length > 0
  const emptyMessage = period === 'total' ? 'Ainda não há registos.' : 'Sem registos neste mês.'

  return (
    <div>
      <h2>Estatísticas</h2>

      <div className="row" role="group" aria-label="Vista" style={{ marginBottom: 12 }}>
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className="btn"
            style={{ flex: 1, ...(view === v.id ? SELECTED_BUTTON_STYLE : {}) }}
            aria-pressed={view === v.id}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="row" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className="btn"
          style={{ padding: '8px 14px' }}
          onClick={() => goToMonth(-1)}
          aria-label="Mês anterior"
        >
          ‹
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 700 }}>
          {period === 'total' ? 'Total' : capitalizeFirst(monthLabelFormatter.format(monthCursor))}
        </div>
        <button
          type="button"
          className="btn"
          style={{ padding: '8px 14px' }}
          onClick={() => goToMonth(1)}
          aria-label="Mês seguinte"
        >
          ›
        </button>
        <button
          type="button"
          className="btn"
          aria-pressed={period === 'total'}
          style={period === 'total' ? SELECTED_BUTTON_STYLE : undefined}
          onClick={() => setPeriod(period === 'total' ? 'month' : 'total')}
        >
          Total
        </button>
      </div>

      {!fullyElectric && (
        <div className="row" style={{ marginBottom: 16 }}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className="btn"
              style={{
                flex: 1,
                ...(filter === f.id ? SELECTED_BUTTON_STYLE : {}),
              }}
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {!hasDataInPeriod && <p className="muted">{emptyMessage}</p>}

      {hasDataInPeriod && view === 'summary' && filter === 'all' && (
        <div className="stack">
          <div className="card">
            <div className="muted">Registos</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{combinedStats.count}</div>
          </div>

          <div className="card">
            <div className="muted">Custo total</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
              {formatCurrency(combinedStats.totalCost)}
            </div>
            <div className="muted">
              ⚡ {formatCurrency(combinedStats.electricCost)} · ⛽{' '}
              {formatCurrency(combinedStats.fuelCost)}
            </div>
          </div>

          {costPerKmCard}
        </div>
      )}

      {hasDataInPeriod && view === 'summary' && filter === 'electric' && (
        <div className="stack">
          {electricStats.count === 0 && <p className="muted">Sem carregamentos neste período.</p>}
          {electricStats.count > 0 && (
            <>
              <div className="card">
                <div className="muted">Carregamentos</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{electricStats.count}</div>
              </div>

              <div className="card">
                <div className="muted">Energia total</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                  {formatEnergy(electricStats.totalEnergyKwh)}
                </div>
                <div className="muted">
                  Média por carregamento:{' '}
                  {formatEnergy(electricStats.totalEnergyKwh / electricStats.count)}
                </div>
              </div>

              <div className="card">
                <div className="muted">Custo total</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                  {formatCurrency(electricStats.totalCost)}
                </div>
                {electricStats.sessionsWithCost < electricStats.count && (
                  <div className="muted">
                    {electricStats.sessionsWithCost} de {electricStats.count} carregamentos têm
                    custo conhecido
                  </div>
                )}
              </div>

              {electricStats.averageCostPerKwh != null && (
                <div className="card">
                  <div className="muted">Custo médio por kWh</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                    {formatCurrency(electricStats.averageCostPerKwh)}
                  </div>
                </div>
              )}

              {costPerKmCard}
            </>
          )}
        </div>
      )}

      {hasDataInPeriod && view === 'summary' && filter === 'fuel' && (
        <div className="stack">
          {fuelStats.count === 0 && <p className="muted">Sem abastecimentos neste período.</p>}
          {fuelStats.count > 0 && (
            <>
              <div className="card">
                <div className="muted">Abastecimentos</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{fuelStats.count}</div>
              </div>

              <div className="card">
                <div className="muted">Combustível total</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                  {formatLiters(fuelStats.totalLiters)}
                </div>
              </div>

              <div className="card">
                <div className="muted">Custo total</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                  {formatCurrency(fuelStats.totalCost)}
                </div>
              </div>

              {fuelStats.averageCostPerLiter != null && (
                <div className="card">
                  <div className="muted">Custo médio por litro</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                    {formatCurrency(fuelStats.averageCostPerLiter)}
                  </div>
                </div>
              )}

              {costPerKmCard}
            </>
          )}
        </div>
      )}

      {hasDataInPeriod && view === 'summary' && (
        <MonthlyCharts
          sessions={sessions}
          fuelEntries={fuelEntries}
          filter={filter}
          period={period}
          monthCursor={monthCursor}
          batteryCapacityKwh={batteryCapacityKwh}
          fullyElectric={fullyElectric}
        />
      )}

      {hasDataInPeriod && view === 'entries' && (
        <EntryEfficiencyView
          sessions={sessions}
          fuelEntries={fuelEntries}
          filter={filter}
          period={period}
          monthCursor={monthCursor}
          batteryCapacityKwh={batteryCapacityKwh}
          fullyElectric={fullyElectric}
        />
      )}
    </div>
  )
}
