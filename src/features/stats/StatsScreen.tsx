import { useMemo, useState } from 'react'
import { filterByMonth } from '../../domain/calendar'
import { capitalizeFirst, formatCurrency, formatEnergy, formatLiters } from '../../domain/format'
import { computeCombinedStats, computeElectricStats, computeFuelStats } from '../../domain/stats'
import type { ChargingSession, FuelEntry } from '../../domain/types'

type StatsFilter = 'all' | 'electric' | 'fuel'
type Period = 'month' | 'total'

const FILTERS: { id: StatsFilter; label: string }[] = [
  { id: 'all', label: 'Ambos' },
  { id: 'electric', label: 'Elétrico' },
  { id: 'fuel', label: 'Combustível' },
]

const monthLabelFormatter = new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' })

export interface StatsScreenProps {
  sessions: ChargingSession[]
  fuelEntries: FuelEntry[]
}

export function StatsScreen({ sessions, fuelEntries }: StatsScreenProps) {
  const [filter, setFilter] = useState<StatsFilter>('all')
  const [period, setPeriod] = useState<Period>('month')
  const [monthCursor, setMonthCursor] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })

  function goToMonth(offset: number) {
    setPeriod('month')
    setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1))
  }

  const periodSessions = useMemo(
    () =>
      period === 'total'
        ? sessions
        : filterByMonth(sessions, monthCursor.getFullYear(), monthCursor.getMonth()),
    [sessions, period, monthCursor],
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

  const hasDataInPeriod = periodSessions.length > 0 || periodFuelEntries.length > 0
  const emptyMessage = period === 'total' ? 'Ainda não há registos.' : 'Sem registos neste mês.'

  return (
    <div>
      <h2>Estatísticas</h2>

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
          style={
            period === 'total'
              ? { background: 'var(--accent)', color: '#032027', borderColor: 'transparent' }
              : undefined
          }
          onClick={() => setPeriod(period === 'total' ? 'month' : 'total')}
        >
          Total
        </button>
      </div>

      <div className="row" style={{ marginBottom: 16 }}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className="btn"
            style={{
              flex: 1,
              ...(filter === f.id
                ? { background: 'var(--accent)', color: '#032027', borderColor: 'transparent' }
                : {}),
            }}
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!hasDataInPeriod && <p className="muted">{emptyMessage}</p>}

      {hasDataInPeriod && filter === 'all' && (
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

          {combinedStats.averageCostPerKm != null && combinedStats.totalKmDriven != null && (
            <div className="card">
              <div className="muted">Custo médio por km</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                {formatCurrency(combinedStats.averageCostPerKm)}
              </div>
              <div className="muted">
                Baseado em {combinedStats.totalKmDriven.toLocaleString('pt-PT')} km percorridos
              </div>
            </div>
          )}
        </div>
      )}

      {hasDataInPeriod && filter === 'electric' && (
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

              {electricStats.averageCostPerKm != null && electricStats.totalKmDriven != null && (
                <div className="card">
                  <div className="muted">Custo médio por km</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                    {formatCurrency(electricStats.averageCostPerKm)}
                  </div>
                  <div className="muted">
                    Baseado em {electricStats.totalKmDriven.toLocaleString('pt-PT')} km percorridos
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {hasDataInPeriod && filter === 'fuel' && (
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
            </>
          )}
        </div>
      )}
    </div>
  )
}
