import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { niceTicks } from './scale'
import styles from './Charts.module.css'

export interface ChartSeries {
  id: string
  label: string
  /** A CSS color, e.g. 'var(--accent)'. */
  color: string
  values: (number | null)[]
}

interface BaseChartProps {
  title: string
  subtitle?: string
  /** Full label for each category, shown in the readout when it's selected. */
  categories: string[]
  /** Axis label per category; null skips the label so they don't collide. */
  tickLabels: (string | null)[]
  formatValue: (value: number) => string
  formatTick?: (value: number) => string
  /** Category selected initially (defaults to the last one with data). */
  initialIndex?: number
  /** Extra readout lines for the selected category. */
  renderDetails?: (index: number) => ReactNode
  /** When set, the chart scrolls sideways instead of squeezing columns narrower than this. */
  minColumnWidth?: number
}

export interface ColumnChartProps extends BaseChartProps {
  /** Stacked bottom-to-top in the given order. */
  series: ChartSeries[]
  reference?: { value: number; label: string }
}

export interface LineChartProps extends BaseChartProps {
  series: ChartSeries
}

const VIEW_WIDTH = 320
const HEIGHT = 168
const PAD = { top: 10, right: 10, bottom: 22, left: 40 }
const MAX_BAR = 24
const GAP = 2

function defaultTick(value: number): string {
  return value.toLocaleString('pt-PT', { maximumFractionDigits: 2 })
}

function hasValue(value: number | null | undefined): value is number {
  return value != null && value !== 0
}

function lastIndexWithData(series: ChartSeries[], count: number): number {
  for (let i = count - 1; i >= 0; i -= 1) {
    // A zero (e.g. no cost that month) doesn't count as data worth selecting.
    if (series.some((s) => hasValue(s.values[i]))) return i
  }
  return count - 1
}

/** A bar with a 4px rounded data-end and a square base. */
function columnPath(x: number, y: number, width: number, height: number, rounded: boolean): string {
  const r = rounded ? Math.min(4, height, width / 2) : 0
  return [
    `M${x},${y + height}`,
    `V${y + r}`,
    r > 0 ? `Q${x},${y} ${x + r},${y}` : '',
    `H${x + width - r}`,
    r > 0 ? `Q${x + width},${y} ${x + width},${y + r}` : '',
    `V${y + height}`,
    'Z',
  ].join(' ')
}

function useChartFrame(props: BaseChartProps, allSeries: ChartSeries[]) {
  const count = props.categories.length
  const [selected, setSelected] = useState(
    () => props.initialIndex ?? lastIndexWithData(allSeries, count),
  )
  const index = Math.min(Math.max(selected, 0), count - 1)

  const scrollRef = useRef<HTMLDivElement>(null)
  const plotMinWidth = props.minColumnWidth ? count * props.minColumnWidth : 0
  const scrolls = plotMinWidth > VIEW_WIDTH - PAD.left - PAD.right
  const width = scrolls ? plotMinWidth + PAD.left + PAD.right : VIEW_WIDTH

  useEffect(() => {
    // Start scrolled to the most recent entries.
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [count])

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') setSelected(Math.max(0, index - 1))
    else if (event.key === 'ArrowRight') setSelected(Math.min(count - 1, index + 1))
    else return
    event.preventDefault()
  }

  const plotWidth = width - PAD.left - PAD.right
  const band = count > 0 ? plotWidth / count : plotWidth
  const xCenter = (i: number) => PAD.left + band * i + band / 2

  return { count, index, setSelected, scrollRef, scrolls, width, band, xCenter, handleKeyDown }
}

function ChartShell({
  props,
  frame,
  legend,
  readoutValues,
  children,
  yTicks,
  yFor,
}: {
  props: BaseChartProps
  frame: ReturnType<typeof useChartFrame>
  legend: ChartSeries[]
  readoutValues: ReactNode
  children: ReactNode
  yTicks: number[]
  yFor: (value: number) => number
}) {
  const { count, index, setSelected, scrollRef, scrolls, width, band, xCenter } = frame
  const formatTick = props.formatTick ?? defaultTick

  return (
    <figure className={`card ${styles.figure}`}>
      <figcaption>
        <div className={styles.title}>{props.title}</div>
        {props.subtitle && <div className={`muted ${styles.subtitle}`}>{props.subtitle}</div>}
      </figcaption>

      {legend.length > 1 && (
        <div className={styles.legend}>
          {legend.map((s) => (
            <span key={s.id} className={styles.legendItem}>
              <span className={styles.swatch} style={{ background: s.color }} aria-hidden="true" />
              {s.label}
            </span>
          ))}
        </div>
      )}

      <div className={styles.readout} aria-live="polite">
        <span className={styles.readoutLabel}>{props.categories[index]}</span>
        {readoutValues}
        {props.renderDetails && <div className="muted">{props.renderDetails(index)}</div>}
      </div>

      <div ref={scrollRef} className={scrolls ? styles.scroller : undefined}>
        <svg
          viewBox={`0 0 ${width} ${HEIGHT}`}
          width={scrolls ? width : '100%'}
          className={styles.svg}
          role="img"
          aria-label={`${props.title}. Usa as setas para percorrer.`}
          tabIndex={0}
          onKeyDown={frame.handleKeyDown}
        >
          {/* selected category band */}
          <rect
            x={PAD.left + band * index}
            y={PAD.top}
            width={band}
            height={HEIGHT - PAD.top - PAD.bottom}
            className={styles.selectedBand}
          />

          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={yFor(tick)}
                y2={yFor(tick)}
                className={styles.grid}
              />
              <text x={PAD.left - 6} y={yFor(tick)} className={styles.yTick}>
                {formatTick(tick)}
              </text>
            </g>
          ))}

          {children}

          {props.tickLabels.map((label, i) =>
            label === null ? null : (
              <text key={i} x={xCenter(i)} y={HEIGHT - 6} className={styles.xTick}>
                {label}
              </text>
            ),
          )}

          {/* hit targets: the whole column, larger than the mark */}
          {Array.from({ length: count }, (_, i) => (
            <rect
              key={i}
              x={PAD.left + band * i}
              y={0}
              width={band}
              height={HEIGHT}
              className={styles.hit}
              onClick={() => setSelected(i)}
              onMouseEnter={() => setSelected(i)}
            >
              <title>{props.categories[i]}</title>
            </rect>
          ))}
        </svg>
      </div>
    </figure>
  )
}

function ReadoutValue({
  series,
  value,
  format,
}: {
  series: ChartSeries
  value: number
  format: (v: number) => string
}) {
  return (
    <span className={styles.readoutValue}>
      <span className={styles.swatch} style={{ background: series.color }} aria-hidden="true" />
      {format(value)}
    </span>
  )
}

export function ColumnChart(props: ColumnChartProps) {
  const { series, reference, formatValue } = props
  const frame = useChartFrame(props, series)
  const { count, index, band, xCenter } = frame

  const totals = Array.from({ length: count }, (_, i) =>
    series.reduce((acc, s) => acc + (s.values[i] ?? 0), 0),
  )
  const yTicks = niceTicks(0, Math.max(...totals, reference?.value ?? 0, 0), true)
  const yMax = yTicks[yTicks.length - 1]
  const plotHeight = HEIGHT - PAD.top - PAD.bottom
  const yFor = (v: number) => PAD.top + plotHeight * (1 - v / yMax)
  const barWidth = Math.min(MAX_BAR, Math.max(2, band * 0.6))

  const withData = series.filter((s) => hasValue(s.values[index]))
  const readoutValues = (
    <>
      {withData.map((s) => (
        <ReadoutValue key={s.id} series={s} value={s.values[index]!} format={formatValue} />
      ))}
      {withData.length > 1 && (
        <span className={styles.readoutValue}>= {formatValue(totals[index])}</span>
      )}
      {withData.length === 0 && <span className="muted">sem dados</span>}
    </>
  )

  return (
    <ChartShell
      props={props}
      frame={frame}
      legend={series.filter((s) => s.values.some((v) => v != null && v > 0))}
      readoutValues={readoutValues}
      yTicks={yTicks}
      yFor={yFor}
    >
      {Array.from({ length: count }, (_, i) => {
        const stacked = series.filter((s) => (s.values[i] ?? 0) > 0)
        let base = 0
        return stacked.map((s, position) => {
          const value = s.values[i]!
          const top = yFor(base + value)
          const bottom = yFor(base)
          base += value
          const isTop = position === stacked.length - 1
          // the surface gap between stacked segments
          const height = Math.max(0, bottom - top - (position > 0 ? GAP : 0))
          return (
            <path
              key={s.id}
              d={columnPath(xCenter(i) - barWidth / 2, top, barWidth, height, isTop)}
              style={{ fill: s.color }}
            />
          )
        })
      })}

      {reference && (
        <g>
          <line
            x1={PAD.left}
            x2={frame.width - PAD.right}
            y1={yFor(reference.value)}
            y2={yFor(reference.value)}
            className={styles.reference}
          />
          <text
            x={frame.width - PAD.right}
            y={yFor(reference.value) - 4}
            className={styles.referenceLabel}
          >
            {reference.label}
          </text>
        </g>
      )}
    </ChartShell>
  )
}

export function LineChart(props: LineChartProps) {
  const { series, formatValue } = props
  const frame = useChartFrame(props, [series])
  const { index, xCenter } = frame

  const present = series.values.filter((v): v is number => v != null)
  const yTicks = niceTicks(Math.min(...present, Infinity), Math.max(...present, -Infinity), false)
  const lo = present.length > 0 ? yTicks[0] : 0
  const hi = present.length > 0 ? yTicks[yTicks.length - 1] : 1
  const plotHeight = HEIGHT - PAD.top - PAD.bottom
  const yFor = (v: number) => PAD.top + plotHeight * (1 - (v - lo) / (hi - lo))

  // Break the line at months without data instead of drawing across them.
  const segments: string[] = []
  let current: string[] = []
  series.values.forEach((v, i) => {
    if (v == null) {
      if (current.length > 0) segments.push(current.join(' '))
      current = []
    } else {
      current.push(`${current.length === 0 ? 'M' : 'L'}${xCenter(i)},${yFor(v)}`)
    }
  })
  if (current.length > 0) segments.push(current.join(' '))

  const value = series.values[index]
  const readoutValues =
    value != null ? (
      <ReadoutValue series={series} value={value} format={formatValue} />
    ) : (
      <span className="muted">sem dados</span>
    )

  return (
    <ChartShell
      props={props}
      frame={frame}
      legend={[series]}
      readoutValues={readoutValues}
      yTicks={present.length > 0 ? yTicks : []}
      yFor={yFor}
    >
      {segments.map((d, i) => (
        <path key={i} d={d} className={styles.line} style={{ stroke: series.color }} />
      ))}
      {series.values.map((v, i) =>
        v == null ? null : (
          <circle
            key={i}
            cx={xCenter(i)}
            cy={yFor(v)}
            r={i === index ? 5 : 4}
            className={styles.dot}
            style={{ fill: series.color }}
          />
        ),
      )}
    </ChartShell>
  )
}
