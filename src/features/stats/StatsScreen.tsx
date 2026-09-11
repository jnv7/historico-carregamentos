import { useMemo } from 'react'
import { computeStats } from '../../domain/stats'
import { formatCurrency, formatEnergy } from '../../domain/format'
import type { ChargingSession } from '../../domain/types'

export interface StatsScreenProps {
  sessions: ChargingSession[]
}

export function StatsScreen({ sessions }: StatsScreenProps) {
  const stats = useMemo(() => computeStats(sessions), [sessions])

  if (stats.count === 0) {
    return (
      <div>
        <h2>Estatísticas</h2>
        <p className="muted">Ainda não há carregamentos registados.</p>
      </div>
    )
  }

  const avgEnergyPerSession = stats.totalEnergyKwh / stats.count

  return (
    <div>
      <h2>Estatísticas</h2>
      <div className="stack">
        <div className="card">
          <div className="muted">Carregamentos</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{stats.count}</div>
        </div>

        <div className="card">
          <div className="muted">Energia total</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
            {formatEnergy(stats.totalEnergyKwh)}
          </div>
          <div className="muted">Média por carregamento: {formatEnergy(avgEnergyPerSession)}</div>
        </div>

        <div className="card">
          <div className="muted">Custo total</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
            {formatCurrency(stats.totalCost)}
          </div>
          {stats.sessionsWithCost < stats.count && (
            <div className="muted">
              {stats.sessionsWithCost} de {stats.count} carregamentos têm custo conhecido
            </div>
          )}
        </div>

        {stats.averageCostPerKwh != null && (
          <div className="card">
            <div className="muted">Custo médio por kWh</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
              {formatCurrency(stats.averageCostPerKwh)}
            </div>
          </div>
        )}

        {stats.averageCostPerKm != null && stats.totalKmDriven != null && (
          <div className="card">
            <div className="muted">Custo médio por km</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
              {formatCurrency(stats.averageCostPerKm)}
            </div>
            <div className="muted">
              Baseado em {stats.totalKmDriven.toLocaleString('pt-PT')} km percorridos (pela
              quilometragem registada)
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
