import { useMemo, useState } from 'react'
import { formatCurrency, formatEnergy, formatLiters } from '../../domain/format'
import { computeCombinedStats, computeElectricStats, computeFuelStats } from '../../domain/stats'
import type { ChargingSession, FuelEntry } from '../../domain/types'

type StatsFilter = 'all' | 'electric' | 'fuel'

const FILTERS: { id: StatsFilter; label: string }[] = [
  { id: 'all', label: 'Total' },
  { id: 'electric', label: 'Elétrico' },
  { id: 'fuel', label: 'Combustível' },
]

export interface StatsScreenProps {
  sessions: ChargingSession[]
  fuelEntries: FuelEntry[]
}

export function StatsScreen({ sessions, fuelEntries }: StatsScreenProps) {
  const [filter, setFilter] = useState<StatsFilter>('all')

  const electricStats = useMemo(() => computeElectricStats(sessions), [sessions])
  const fuelStats = useMemo(() => computeFuelStats(fuelEntries), [fuelEntries])
  const combinedStats = useMemo(
    () => computeCombinedStats(sessions, fuelEntries),
    [sessions, fuelEntries],
  )

  const hasAnyData = sessions.length > 0 || fuelEntries.length > 0

  return (
    <div>
      <h2>Estatísticas</h2>

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

      {!hasAnyData && <p className="muted">Ainda não há registos.</p>}

      {hasAnyData && filter === 'all' && (
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

      {hasAnyData && filter === 'electric' && (
        <div className="stack">
          {electricStats.count === 0 && <p className="muted">Ainda não há carregamentos.</p>}
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

      {hasAnyData && filter === 'fuel' && (
        <div className="stack">
          {fuelStats.count === 0 && <p className="muted">Ainda não há abastecimentos.</p>}
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
