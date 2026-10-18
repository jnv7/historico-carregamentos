import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatCurrency } from '../../domain/format'
import { DEFAULT_CAR_ID, type ChargingSession, type FuelEntry } from '../../domain/types'
import { StatsScreen } from './StatsScreen'

const today = new Date()
const thisMonth = new Date(today.getFullYear(), today.getMonth(), 5, 10, 0).toISOString()
const twoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 5, 10, 0).toISOString()

function makeSession(overrides: Partial<ChargingSession>): ChargingSession {
  return {
    id: Math.random().toString(),
    carId: DEFAULT_CAR_ID,
    kind: 'electric',
    startAt: thisMonth,
    endAt: null,
    energyKwh: 10,
    cost: null,
    batteryStartPct: null,
    batteryEndPct: null,
    odometerKm: null,
    location: null,
    chargerType: null,
    notes: null,
    isLive: false,
    createdAt: thisMonth,
    updatedAt: thisMonth,
    ...overrides,
  }
}

function makeFuelEntry(overrides: Partial<FuelEntry>): FuelEntry {
  return {
    id: Math.random().toString(),
    carId: DEFAULT_CAR_ID,
    kind: 'fuel',
    startAt: thisMonth,
    liters: 30,
    cost: 45,
    odometerKm: null,
    location: null,
    notes: null,
    createdAt: thisMonth,
    updatedAt: thisMonth,
    ...overrides,
  }
}

describe('StatsScreen', () => {
  afterEach(() => vi.useRealTimers())

  it('shows an empty state for the current month with no entries', () => {
    render(<StatsScreen sessions={[]} fuelEntries={[]} batteryCapacityKwh={null} />)
    expect(screen.getByText('Sem registos neste mês.')).toBeInTheDocument()
  })

  it('shows an empty state for Total with no entries at all', async () => {
    const user = userEvent.setup()
    render(<StatsScreen sessions={[]} fuelEntries={[]} batteryCapacityKwh={null} />)

    await user.click(screen.getByRole('button', { name: 'Total' }))

    expect(screen.getByText('Ainda não há registos.')).toBeInTheDocument()
  })

  it('defaults to the current month and excludes entries from other months', () => {
    const sessions = [makeSession({ startAt: thisMonth, energyKwh: 10, cost: 2 })]
    const olderSessions = [makeSession({ startAt: twoMonthsAgo, energyKwh: 99, cost: 9 })]
    render(
      <StatsScreen
        sessions={[...sessions, ...olderSessions]}
        fuelEntries={[]}
        batteryCapacityKwh={null}
      />,
    )

    expect(screen.getByText('1')).toBeInTheDocument() // count for this month only
  })

  it('shows entries from other months after navigating with the month arrows', async () => {
    const user = userEvent.setup()
    const sessions = [makeSession({ startAt: twoMonthsAgo, cost: 2 })]
    render(<StatsScreen sessions={sessions} fuelEntries={[]} batteryCapacityKwh={null} />)

    expect(screen.getByText('Sem registos neste mês.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mês anterior' }))
    await user.click(screen.getByRole('button', { name: 'Mês anterior' }))

    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('shows every entry when Total is selected, regardless of month', async () => {
    const user = userEvent.setup()
    const sessions = [makeSession({ startAt: thisMonth, cost: 2 })]
    const fuelEntries = [makeFuelEntry({ startAt: twoMonthsAgo, cost: 45 })]
    render(<StatsScreen sessions={sessions} fuelEntries={fuelEntries} batteryCapacityKwh={null} />)

    await user.click(screen.getByRole('button', { name: 'Total' }))

    expect(screen.getByText('2')).toBeInTheDocument() // combined count across both months
  })

  it('switches to the electric-only view for the current period', async () => {
    const user = userEvent.setup()
    const sessions = [makeSession({ energyKwh: 10, cost: 2 })]
    const fuelEntries = [makeFuelEntry({ cost: 45 })]
    render(<StatsScreen sessions={sessions} fuelEntries={fuelEntries} batteryCapacityKwh={null} />)

    await user.click(screen.getByRole('button', { name: 'Elétrico' }))

    expect(screen.getByText('10 kWh')).toBeInTheDocument()
  })

  it('switches to the fuel-only view for the current period', async () => {
    const user = userEvent.setup()
    const sessions = [makeSession({ energyKwh: 10, cost: 2 })]
    const fuelEntries = [makeFuelEntry({ liters: 30, cost: 45 })]
    render(<StatsScreen sessions={sessions} fuelEntries={fuelEntries} batteryCapacityKwh={null} />)

    await user.click(screen.getByRole('button', { name: 'Combustível' }))

    expect(screen.getByText('30 L')).toBeInTheDocument()
  })

  it('shows the monthly evolution charts under the summary', () => {
    const sessions = [makeSession({ cost: 2 })]
    render(<StatsScreen sessions={sessions} fuelEntries={[]} batteryCapacityKwh={null} />)

    expect(screen.getByRole('img', { name: /Custo por mês/ })).toBeInTheDocument()
  })

  it('shows the efficiency of each charge in the per-entry view', async () => {
    const user = userEvent.setup()
    const day = (d: number) => new Date(today.getFullYear(), today.getMonth(), d, 10).toISOString()
    const sessions = [
      makeSession({ startAt: day(1), odometerKm: 1000 }),
      makeSession({ startAt: day(3), odometerKm: 1100, energyKwh: 15, cost: 3 }),
      makeSession({ startAt: day(5), odometerKm: 1300, energyKwh: 34, cost: 5 }),
    ]
    render(<StatsScreen sessions={sessions} fuelEntries={[]} batteryCapacityKwh={null} />)

    await user.click(screen.getByRole('button', { name: 'Por registo' }))
    await user.click(screen.getByRole('button', { name: 'Elétrico' }))

    expect(screen.getByText('Consumo médio')).toBeInTheDocument()
    // (15 + 34) kWh over 300 km
    expect(screen.getAllByText('16,3 kWh/100 km').length).toBeGreaterThan(0)
    // the latest charge is selected and compared with the average
    expect(
      screen.getByText(/200 km desde a leitura anterior · 4% acima da média/),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(3) // header + 2 measurements
  })

  it('shows the price per kWh of each charge in the electric per-entry view', async () => {
    const user = userEvent.setup()
    const sessions = [
      makeSession({ chargerType: 'home', energyKwh: 20, cost: 4 }),
      makeSession({ chargerType: 'public_dc', energyKwh: 10, cost: 6 }),
    ]
    render(<StatsScreen sessions={sessions} fuelEntries={[]} batteryCapacityKwh={null} />)

    await user.click(screen.getByRole('button', { name: 'Por registo' }))
    await user.click(screen.getByRole('button', { name: 'Elétrico' }))

    expect(screen.getByText('Preço por kWh, carregamento a carregamento')).toBeInTheDocument()
    // no odometer readings, so only the price chart has something to show
    expect(screen.getByText(/regista os km do conta-quilómetros/)).toBeInTheDocument()
  })

  it('explains how to get per-entry efficiency when there are no odometer readings', async () => {
    const user = userEvent.setup()
    render(<StatsScreen sessions={[makeSession({})]} fuelEntries={[]} batteryCapacityKwh={null} />)

    await user.click(screen.getByRole('button', { name: 'Por registo' }))

    expect(screen.getByText(/regista os km do conta-quilómetros/)).toBeInTheDocument()
  })

  it('does not count a charge that is still running', async () => {
    const user = userEvent.setup()
    const sessions = [
      makeSession({ energyKwh: 10, cost: 2 }),
      makeSession({ isLive: true, energyKwh: 0 }),
    ]
    render(<StatsScreen sessions={sessions} fuelEntries={[]} batteryCapacityKwh={null} />)

    await user.click(screen.getByRole('button', { name: 'Elétrico' }))

    expect(screen.getByText('Carregamentos').nextSibling).toHaveTextContent('1')
  })

  it('uses the same cost per 100 km as the per-entry view, ignoring km from other months', async () => {
    const user = userEvent.setup()
    const month = (offset: number, day: number) =>
      new Date(today.getFullYear(), today.getMonth() + offset, day, 10).toISOString()
    const sessions = [
      makeSession({ startAt: month(-1, 20), odometerKm: 1000, cost: 10 }),
      makeSession({ startAt: month(0, 5), odometerKm: 1100, cost: 10 }),
      makeSession({ startAt: month(0, 20), odometerKm: 1300, cost: 10 }),
    ]
    render(<StatsScreen sessions={sessions} fuelEntries={[]} batteryCapacityKwh={null} />)

    await user.click(screen.getByRole('button', { name: 'Elétrico' }))

    // This month: 20 € over the 300 km since last month's reading.
    const card = screen.getByText('Baseado em 300 km percorridos').parentElement!
    expect(within(card).getByText('Custo por 100 km').nextSibling?.textContent).toBe(
      formatCurrency(2000 / 300),
    )
  })

  it('compares home charging with charging away from home', () => {
    const sessions = [
      makeSession({ chargerType: 'home', energyKwh: 20, cost: 4 }),
      makeSession({ chargerType: 'public_dc', energyKwh: 10, cost: 6 }),
    ]
    render(
      <StatsScreen sessions={sessions} fuelEntries={[]} batteryCapacityKwh={null} fullyElectric />,
    )

    expect(screen.getByText('Onde carregaste')).toBeInTheDocument()
    expect(screen.getByText(/Fora de casa: 33 % da energia e 60 % do custo\./)).toBeInTheDocument()
    expect(screen.getByText(/custou mais 4,00 € do que em casa/)).toBeInTheDocument()
  })

  it('has no charger breakdown when every charge was at home', () => {
    const sessions = [
      makeSession({ chargerType: 'home', energyKwh: 20, cost: 4 }),
      makeSession({ chargerType: 'home', energyKwh: 10, cost: 2 }),
    ]
    render(
      <StatsScreen sessions={sessions} fuelEntries={[]} batteryCapacityKwh={null} fullyElectric />,
    )

    expect(screen.queryByText('Onde carregaste')).not.toBeInTheDocument()
  })

  it('projects the cost to the end of the current month', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 18, 12))
    const sessions = [makeSession({ startAt: new Date(2026, 9, 5, 10).toISOString(), cost: 18 })]
    render(<StatsScreen sessions={sessions} fuelEntries={[]} batteryCapacityKwh={null} />)

    expect(screen.getByText('Ao ritmo atual, cerca de 31 € no fim do mês')).toBeInTheDocument()
  })

  it('does not project the cost in the first days of the month', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 3, 12))
    const sessions = [makeSession({ startAt: new Date(2026, 9, 2, 10).toISOString(), cost: 18 })]
    render(<StatsScreen sessions={sessions} fuelEntries={[]} batteryCapacityKwh={null} />)

    expect(screen.queryByText(/Ao ritmo atual/)).not.toBeInTheDocument()
  })

  it('shows the km driven between odometer readings', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 18, 12))
    const sessions = [
      makeSession({ startAt: new Date(2026, 9, 2, 10).toISOString(), odometerKm: 1000 }),
      makeSession({ startAt: new Date(2026, 9, 9, 10).toISOString(), odometerKm: 1300 }),
    ]
    render(<StatsScreen sessions={sessions} fuelEntries={[]} batteryCapacityKwh={null} />)

    expect(screen.getByText('Km percorridos').nextSibling).toHaveTextContent('300 km')
  })

  it('only offers the electric view for a fully electric car', () => {
    const sessions = [makeSession({ energyKwh: 10, cost: 2 })]
    const fuelEntries = [makeFuelEntry({ liters: 30, cost: 45 })]
    render(
      <StatsScreen
        sessions={sessions}
        fuelEntries={fuelEntries}
        batteryCapacityKwh={null}
        fullyElectric
      />,
    )

    expect(screen.queryByRole('button', { name: 'Combustível' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ambos' })).not.toBeInTheDocument()
    expect(screen.getByText('10 kWh')).toBeInTheDocument()
    expect(screen.queryByText('30 L')).not.toBeInTheDocument()
  })
})
