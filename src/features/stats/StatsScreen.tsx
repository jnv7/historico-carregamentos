import { useMemo, useState } from 'react'
import { filterByMonth } from '../../domain/calendar'
import { computeChargerBreakdown } from '../../domain/chargerBreakdown'
import { CHARGER_TYPE_LABELS } from '../../domain/chargerTypes'
import { computeEfficiencyPoints, summarizeEfficiency } from '../../domain/efficiency'
import {
  capitalizeFirst,
  formatCurrency,
  formatDecimal,
  formatEnergy,
  formatLiters,
  formatUnitPrice,
} from '../../domain/format'
import { computeCombinedStats, computeElectricStats, computeFuelStats } from '../../domain/stats'
import type { ChargingSession, FuelEntry } from '../../domain/types'
import { EntryEfficiencyView } from './EntryEfficiencyView'
import { MonthlyCharts } from './MonthlyCharts'
import {
  SELECTED_BUTTON_STYLE,
  TABLE_CELL_STYLE as cell,
  type Period,
  type StatsFilter,
} from './statsShared'

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
  const breakdown = useMemo(
    () => computeChargerBreakdown(periodSessions, finishedSessions),
    [periodSessions, finishedSessions],
  )

  const costPer100KmCard = efficiencySummary.costPer100Km !== null && (
    <div className="card">
      <div className="muted">Custo por 100 km</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
        {formatCurrency(efficiencySummary.costPer100Km)}
      </div>
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

          {costPer100KmCard}
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
                  <div className="muted">Preço médio por kWh</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                    {formatUnitPrice(electricStats.averageCostPerKwh, 'kWh')}
                  </div>
                </div>
              )}

              {breakdown.groups.length >= 2 && (
                <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                  <div style={{ padding: '12px 12px 4px' }}>
                    <div className="muted">Onde carregaste</div>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr className="muted" style={{ textAlign: 'right' }}>
                        <th style={{ ...cell, textAlign: 'left' }}>Tipo</th>
                        <th style={cell}>kWh</th>
                        <th style={cell}>Custo</th>
                        <th style={cell}>€/kWh</th>
                        <th style={cell} title="Preço por kWh × consumo médio do período">
                          ≈ €/100 km
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {breakdown.groups.map((g) => (
                        <tr
                          key={g.group}
                          style={{ borderTop: '1px solid var(--border)', textAlign: 'right' }}
                        >
                          <td style={{ ...cell, textAlign: 'left' }}>
                            {g.group === 'unknown' ? 'Sem tipo' : CHARGER_TYPE_LABELS[g.group]}
                          </td>
                          <td style={cell}>{formatDecimal(g.energyKwh, 2)}</td>
                          <td style={cell}>{formatCurrency(g.cost)}</td>
                          <td style={cell}>
                            {g.pricePerKwh !== null ? formatUnitPrice(g.pricePerKwh, 'kWh') : '—'}
                          </td>
                          <td style={cell}>
                            {g.pricePerKwh !== null &&
                            efficiencySummary.consumptionPer100Km !== null
                              ? formatCurrency(
                                  g.pricePerKwh * efficiencySummary.consumptionPer100Km,
                                )
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ padding: 12 }}>
                    {breakdown.awayEnergyShare !== null && breakdown.awayCostShare !== null && (
                      <div>
                        Fora de casa: {Math.round(breakdown.awayEnergyShare * 100)} % da energia e{' '}
                        {Math.round(breakdown.awayCostShare * 100)} % do custo.
                      </div>
                    )}
                    {breakdown.extraCostVsHome !== null &&
                      Math.abs(breakdown.extraCostVsHome) >= 0.01 && (
                        <div>
                          {breakdown.extraCostVsHome > 0
                            ? `Carregar fora de casa custou mais ${formatCurrency(breakdown.extraCostVsHome)} do que em casa.`
                            : `Carregar fora de casa poupou-te ${formatCurrency(-breakdown.extraCostVsHome)} face ao preço de casa.`}
                        </div>
                      )}
                    {breakdown.homePricePerKwh !== null && (
                      <div className="muted">
                        Preço de casa: {formatUnitPrice(breakdown.homePricePerKwh, 'kWh')}
                        {!breakdown.homePriceFromPeriod && ' (média de todos os meses)'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {costPer100KmCard}
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
                  <div className="muted">Preço médio por litro</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                    {formatUnitPrice(fuelStats.averageCostPerLiter, 'L')}
                  </div>
                </div>
              )}

              {costPer100KmCard}
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
