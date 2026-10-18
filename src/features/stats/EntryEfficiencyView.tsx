import { useMemo } from 'react'
import { filterByMonth } from '../../domain/calendar'
import {
  computeEfficiencyPoints,
  summarizeEfficiency,
  type EfficiencyPoint,
} from '../../domain/efficiency'
import { CHARGER_TYPE_LABELS } from '../../domain/chargerTypes'
import {
  formatConsumption,
  formatCurrency,
  formatDateTime,
  formatDecimal,
  formatEnergy,
  formatInterval,
  formatUnitPrice,
} from '../../domain/format'
import type { ChargingSession, FuelEntry } from '../../domain/types'
import { ColumnChart, type ChartSeries } from './charts/Charts'
import {
  AWAY_COLOR,
  ELECTRIC_COLOR,
  FUEL_COLOR,
  TABLE_CELL_STYLE as cell,
  type Period,
  type StatsFilter,
} from './statsShared'

const dayMonth = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit' })
const MIN_COLUMN_WIDTH = 22

export interface EntryEfficiencyViewProps {
  sessions: ChargingSession[]
  fuelEntries: FuelEntry[]
  filter: StatsFilter
  period: Period
  monthCursor: Date
  batteryCapacityKwh: number | null
  fullyElectric?: boolean
}

/** Efficiency of each entry on its own, compared with the period's average. */
export function EntryEfficiencyView({
  sessions,
  fuelEntries,
  filter,
  period,
  monthCursor,
  batteryCapacityKwh,
  fullyElectric = false,
}: EntryEfficiencyViewProps) {
  // Computed over everything, then filtered, so a month's first entry still has a previous reading.
  const allPoints = useMemo(
    () =>
      computeEfficiencyPoints(sessions, fuelEntries, filter, {
        batteryCapacityKwh,
        ignoreElectricKm: fullyElectric,
      }),
    [sessions, fuelEntries, filter, batteryCapacityKwh, fullyElectric],
  )
  const points = useMemo(
    () =>
      period === 'total'
        ? allPoints
        : filterByMonth(allPoints, monthCursor.getFullYear(), monthCursor.getMonth()),
    [allPoints, period, monthCursor],
  )
  const summary = useMemo(() => summarizeEfficiency(points), [points])

  const usesCost = filter === 'all'
  const unit = filter === 'fuel' ? 'L' : 'kWh'
  const metricOf = (p: EfficiencyPoint) => (usesCost ? p.costPer100Km : p.consumptionPer100Km)
  const average = usesCost ? summary.costPer100Km : summary.consumptionPer100Km
  const formatMetric = (v: number) => (usesCost ? formatCurrency(v) : formatConsumption(v, unit))

  const kindWord =
    filter === 'fuel' ? 'abastecimentos' : filter === 'electric' ? 'carregamentos' : 'registos'

  const series: ChartSeries[] = (['electric', 'fuel'] as const)
    .filter((kind) => filter === 'all' || filter === kind)
    .map((kind) => ({
      id: kind,
      label: kind === 'electric' ? '⚡ Elétrico' : '⛽ Combustível',
      color: kind === 'electric' ? ELECTRIC_COLOR : FUEL_COLOR,
      values: points.map((p) => (p.kind === kind ? metricOf(p) : null)),
    }))

  const approxBand = Math.max(MIN_COLUMN_WIDTH, 270 / points.length)
  const every = Math.ceil(34 / approxBand)
  const tickLabels = points.map((p, i) =>
    (points.length - 1 - i) % every === 0 ? dayMonth.format(new Date(p.startAt)) : null,
  )

  function compareToAverage(value: number | null): string | null {
    if (value === null || average === null || average === 0) return null
    const diff = Math.round(((value - average) / average) * 100)
    if (diff === 0) return 'igual à média'
    return `${Math.abs(diff)}% ${diff > 0 ? 'acima' : 'abaixo'} da média`
  }

  const title = usesCost
    ? 'Custo por 100 km, registo a registo'
    : filter === 'electric'
      ? 'Consumo, carregamento a carregamento'
      : 'Consumo, abastecimento a abastecimento'
  const subtitle = usesCost
    ? 'Tudo o que foi pago ÷ km desde a leitura anterior do conta-quilómetros'
    : filter === 'electric'
      ? 'Energia gasta ÷ km desde o carregamento anterior. Usa a % da bateria quando a registas.'
      : 'Litros ÷ km entre depósitos cheios.'

  const priceChart = filter === 'electric' && (
    <PriceChart sessions={sessions} period={period} monthCursor={monthCursor} />
  )

  if (points.length === 0) {
    return (
      <div>
        <p className="muted">
          Para ver a eficiência de cada um dos {kindWord}, regista os km do conta-quilómetros em
          pelo menos dois deles. Cada registo é comparado com a leitura anterior.
        </p>
        {priceChart}
      </div>
    )
  }

  return (
    <div>
      {average !== null && (
        <div className="card">
          <div className="muted">{usesCost ? 'Custo médio por 100 km' : 'Consumo médio'}</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{formatMetric(average)}</div>
          <div className="muted">
            Em {formatDecimal(summary.kmDriven, 0)} km · {points.length}{' '}
            {points.length === 1 ? 'medição' : 'medições'}
          </div>
        </div>
      )}

      <ColumnChart
        key={`${filter}-${period}-${monthCursor.getTime()}`}
        title={title}
        subtitle={subtitle}
        categories={points.map(
          (p) =>
            `${p.kind === 'electric' ? '⚡' : '⛽'} ${formatInterval(p.previousStartAt, p.startAt)}`,
        )}
        tickLabels={tickLabels}
        series={series}
        formatValue={formatMetric}
        formatTick={(v) => formatDecimal(v, usesCost ? 2 : 1)}
        reference={
          average !== null
            ? { value: average, label: `média ${formatDecimal(average)}` }
            : undefined
        }
        minColumnWidth={MIN_COLUMN_WIDTH}
        renderDetails={(i) => {
          const p = points[i]
          const comparison = compareToAverage(metricOf(p))
          return [
            distanceDetail(p, filter),
            p.energyMethod === 'battery' ? 'calculado pela % da bateria' : null,
            comparison,
            p.entriesInInterval > 1 ? `inclui ${p.entriesInInterval} registos` : null,
            metricOf(p) === null ? 'custo desconhecido' : null,
          ]
            .filter(Boolean)
            .join(' · ')
        }}
      />

      {priceChart}

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr className="muted" style={{ textAlign: 'right' }}>
              <th style={{ ...cell, textAlign: 'left' }}>Período</th>
              <th style={cell}>km</th>
              {!usesCost && <th style={cell}>{unit}/100 km</th>}
              <th style={cell}>€/100 km</th>
            </tr>
          </thead>
          <tbody>
            {[...points].reverse().map((p) => (
              <tr key={p.id} style={{ borderTop: '1px solid var(--border)', textAlign: 'right' }}>
                <td style={{ ...cell, textAlign: 'left', whiteSpace: 'nowrap' }}>
                  {p.kind === 'electric' ? '⚡' : '⛽'}{' '}
                  {formatInterval(p.previousStartAt, p.startAt)}
                </td>
                <td style={cell}>{formatDecimal(p.distanceKm, 0)}</td>
                {!usesCost && (
                  <td style={cell}>
                    {p.consumptionPer100Km !== null ? formatDecimal(p.consumptionPer100Km) : '—'}
                  </td>
                )}
                <td style={cell}>
                  {p.costPer100Km !== null ? formatDecimal(p.costPer100Km, 2) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        Registos sem km não têm linha própria: o que foi carregado ou abastecido conta para o
        registo seguinte com km. Abastecimentos parciais contam para o próximo depósito cheio.
      </p>
    </div>
  )
}

/** The price paid per kWh at each finished charge, coloured by where it was charged. */
function PriceChart({
  sessions,
  period,
  monthCursor,
}: {
  sessions: ChargingSession[]
  period: Period
  monthCursor: Date
}) {
  const charges = useMemo(() => {
    const priced = sessions.filter(
      (s): s is ChargingSession & { cost: number } =>
        !s.isLive && s.cost !== null && s.energyKwh > 0,
    )
    const inPeriod =
      period === 'total'
        ? priced
        : filterByMonth(priced, monthCursor.getFullYear(), monthCursor.getMonth())
    return [...inPeriod].sort((a, b) => a.startAt.localeCompare(b.startAt))
  }, [sessions, period, monthCursor])

  if (charges.length === 0) return null

  const groupOf = (s: ChargingSession) =>
    s.chargerType === null ? 'unknown' : s.chargerType === 'home' ? 'home' : 'away'
  const price = (s: ChargingSession & { cost: number }) => s.cost / s.energyKwh
  const series: ChartSeries[] = [
    { id: 'home', label: '🏠 Casa', color: ELECTRIC_COLOR },
    { id: 'away', label: '🔌 Fora de casa', color: AWAY_COLOR },
    { id: 'unknown', label: 'Sem tipo', color: 'var(--text-muted)' },
  ]
    .map((g) => ({ ...g, values: charges.map((s) => (groupOf(s) === g.id ? price(s) : null)) }))
    .filter((g) => g.values.some((v) => v !== null))

  const totalCost = charges.reduce((acc, s) => acc + s.cost, 0)
  const totalEnergy = charges.reduce((acc, s) => acc + s.energyKwh, 0)
  const average = totalCost / totalEnergy

  const approxBand = Math.max(MIN_COLUMN_WIDTH, 270 / charges.length)
  const every = Math.ceil(34 / approxBand)
  const tickLabels = charges.map((s, i) =>
    (charges.length - 1 - i) % every === 0 ? dayMonth.format(new Date(s.startAt)) : null,
  )

  return (
    <ColumnChart
      key={`price-${period}-${monthCursor.getTime()}`}
      title="Preço por kWh, carregamento a carregamento"
      subtitle="Quanto pagaste por cada kWh. O custo por 100 km de cada viagem está na tabela abaixo."
      categories={charges.map((s) => formatDateTime(s.startAt))}
      tickLabels={tickLabels}
      series={series}
      formatValue={(v) => formatUnitPrice(v, 'kWh')}
      formatTick={(v) => formatDecimal(v, 2)}
      reference={{ value: average, label: 'média' }}
      minColumnWidth={MIN_COLUMN_WIDTH}
      renderDetails={(i) => {
        const s = charges[i]
        const type = s.chargerType === null ? 'Sem tipo' : CHARGER_TYPE_LABELS[s.chargerType]
        return `${type} · ${formatEnergy(s.energyKwh)} · ${formatCurrency(s.cost)}${s.location ? ` · ${s.location}` : ''}`
      }}
    />
  )
}

function distanceDetail(p: EfficiencyPoint, filter: StatsFilter): string {
  if (p.kmBasis === 'mode' && filter !== 'all') {
    const mode = filter === 'electric' ? 'em elétrico' : 'a combustível'
    return `${formatDecimal(p.distanceKm, 0)} km ${mode} (de ${formatDecimal(p.kmDriven, 0)} no total)`
  }
  return `${formatDecimal(p.kmDriven, 0)} km desde a leitura anterior`
}
