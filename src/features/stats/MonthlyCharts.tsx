import { useMemo } from 'react'
import {
  capitalizeFirst,
  formatConsumption,
  formatCurrency,
  formatDecimal,
  formatUnitPrice,
} from '../../domain/format'
import {
  computeMonthlySummaries,
  monthsEndingAt,
  monthsSpanning,
  type YearMonth,
} from '../../domain/monthly'
import type { ChargingSession, FuelEntry } from '../../domain/types'
import { ColumnChart, LineChart, type ChartSeries } from './charts/Charts'
import { ELECTRIC_COLOR, FUEL_COLOR, type Period, type StatsFilter } from './statsShared'

const monthLong = new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' })
const monthShort = new Intl.DateTimeFormat('pt-PT', { month: 'short' })

function monthTickLabels(months: YearMonth[]): (string | null)[] {
  // Label every k-th month counting back from the latest, so the current month is always labelled.
  const every = Math.ceil(months.length / 6)
  return months.map(({ year, month }, i) => {
    if ((months.length - 1 - i) % every !== 0) return null
    const name = monthShort.format(new Date(year, month, 1)).replace('.', '')
    return month === 0 || i < every ? `${name} ${String(year).slice(2)}` : name
  })
}

const currencyTick = (value: number) => `${formatDecimal(value, 2)} €`

export interface MonthlyChartsProps {
  sessions: ChargingSession[]
  fuelEntries: FuelEntry[]
  filter: StatsFilter
  period: Period
  monthCursor: Date
}

/** Month-by-month evolution: the last 12 months up to the selected one, or every month for Total. */
export function MonthlyCharts({
  sessions,
  fuelEntries,
  filter,
  period,
  monthCursor,
}: MonthlyChartsProps) {
  const months = useMemo(
    () =>
      period === 'month'
        ? monthsEndingAt({ year: monthCursor.getFullYear(), month: monthCursor.getMonth() }, 12)
        : monthsSpanning([...sessions, ...fuelEntries]),
    [period, monthCursor, sessions, fuelEntries],
  )
  const summaries = useMemo(
    () => computeMonthlySummaries(sessions, fuelEntries, months),
    [sessions, fuelEntries, months],
  )
  if (months.length === 0) return null

  const categories = months.map(({ year, month }) =>
    capitalizeFirst(monthLong.format(new Date(year, month, 1))),
  )
  const common = {
    categories,
    tickLabels: monthTickLabels(months),
    // In month view the selected month is the last one; keep it selected when the cursor moves.
    initialIndex: period === 'month' ? months.length - 1 : undefined,
  }
  // Remount when the window changes so the selection follows it.
  const chartKey = `${period}-${months[0].year}-${months[0].month}-${months.length}`

  const electricCost: ChartSeries = {
    id: 'electric',
    label: '⚡ Elétrico',
    color: ELECTRIC_COLOR,
    values: summaries.map((m) => m.electricCost),
  }
  const fuelCost: ChartSeries = {
    id: 'fuel',
    label: '⛽ Combustível',
    color: FUEL_COLOR,
    values: summaries.map((m) => m.fuelCost),
  }

  const scope = filter
  const color = filter === 'fuel' ? FUEL_COLOR : ELECTRIC_COLOR
  const unit = filter === 'fuel' ? 'L' : 'kWh'
  const costPer100: ChartSeries = {
    id: 'costPer100',
    label: 'Custo por 100 km',
    color,
    values: summaries.map((m) => m.efficiency[scope].costPer100Km),
  }
  const consumption: ChartSeries = {
    id: 'consumption',
    label: 'Consumo',
    color,
    values: summaries.map((m) => m.efficiency[scope].consumptionPer100Km),
  }
  const price: ChartSeries = {
    id: 'price',
    label: 'Preço médio',
    color,
    values: summaries.map((m) => (filter === 'fuel' ? m.pricePerLiter : m.pricePerKwh)),
  }
  const hasAny = (s: ChartSeries) => s.values.some((v) => v != null)
  const kindWord = filter === 'fuel' ? 'abastecimentos' : 'carregamentos'

  return (
    <section aria-label="Evolução mensal" style={{ marginTop: 16 }}>
      <h3>Evolução</h3>

      <ColumnChart
        key={`cost-${chartKey}`}
        {...common}
        title="Custo por mês"
        series={
          filter === 'all'
            ? [electricCost, fuelCost]
            : [filter === 'fuel' ? fuelCost : electricCost]
        }
        formatValue={formatCurrency}
        formatTick={currencyTick}
      />

      {filter !== 'all' &&
        (hasAny(consumption) ? (
          <LineChart
            key={`consumption-${chartKey}`}
            {...common}
            title={`Consumo (${unit}/100 km)`}
            subtitle={`${unit === 'kWh' ? 'Energia' : 'Litros'} ÷ km percorridos entre ${kindWord}`}
            series={consumption}
            formatValue={(v) => formatConsumption(v, unit)}
          />
        ) : (
          <p className="muted">
            Para ver o consumo, regista os km do conta-quilómetros em pelo menos dois {kindWord}.
          </p>
        ))}

      {filter !== 'all' && hasAny(price) && (
        <LineChart
          key={`price-${chartKey}`}
          {...common}
          title={`Preço médio por ${unit === 'kWh' ? 'kWh' : 'litro'}`}
          series={price}
          formatValue={(v) => formatUnitPrice(v, unit)}
          formatTick={(v) => formatDecimal(v, 3)}
        />
      )}

      {hasAny(costPer100) && (
        <LineChart
          key={`cost100-${chartKey}`}
          {...common}
          title="Custo por 100 km"
          series={costPer100}
          formatValue={formatCurrency}
          formatTick={currencyTick}
        />
      )}
    </section>
  )
}
