import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
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
  it('shows an empty state for the current month with no entries', () => {
    render(<StatsScreen sessions={[]} fuelEntries={[]} />)
    expect(screen.getByText('Sem registos neste mês.')).toBeInTheDocument()
  })

  it('shows an empty state for Total with no entries at all', async () => {
    const user = userEvent.setup()
    render(<StatsScreen sessions={[]} fuelEntries={[]} />)

    await user.click(screen.getByRole('button', { name: 'Total' }))

    expect(screen.getByText('Ainda não há registos.')).toBeInTheDocument()
  })

  it('defaults to the current month and excludes entries from other months', () => {
    const sessions = [makeSession({ startAt: thisMonth, energyKwh: 10, cost: 2 })]
    const olderSessions = [makeSession({ startAt: twoMonthsAgo, energyKwh: 99, cost: 9 })]
    render(<StatsScreen sessions={[...sessions, ...olderSessions]} fuelEntries={[]} />)

    expect(screen.getByText('1')).toBeInTheDocument() // count for this month only
  })

  it('shows entries from other months after navigating with the month arrows', async () => {
    const user = userEvent.setup()
    const sessions = [makeSession({ startAt: twoMonthsAgo, cost: 2 })]
    render(<StatsScreen sessions={sessions} fuelEntries={[]} />)

    expect(screen.getByText('Sem registos neste mês.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mês anterior' }))
    await user.click(screen.getByRole('button', { name: 'Mês anterior' }))

    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('shows every entry when Total is selected, regardless of month', async () => {
    const user = userEvent.setup()
    const sessions = [makeSession({ startAt: thisMonth, cost: 2 })]
    const fuelEntries = [makeFuelEntry({ startAt: twoMonthsAgo, cost: 45 })]
    render(<StatsScreen sessions={sessions} fuelEntries={fuelEntries} />)

    await user.click(screen.getByRole('button', { name: 'Total' }))

    expect(screen.getByText('2')).toBeInTheDocument() // combined count across both months
  })

  it('switches to the electric-only view for the current period', async () => {
    const user = userEvent.setup()
    const sessions = [makeSession({ energyKwh: 10, cost: 2 })]
    const fuelEntries = [makeFuelEntry({ cost: 45 })]
    render(<StatsScreen sessions={sessions} fuelEntries={fuelEntries} />)

    await user.click(screen.getByRole('button', { name: 'Elétrico' }))

    expect(screen.getByText('10 kWh')).toBeInTheDocument()
  })

  it('switches to the fuel-only view for the current period', async () => {
    const user = userEvent.setup()
    const sessions = [makeSession({ energyKwh: 10, cost: 2 })]
    const fuelEntries = [makeFuelEntry({ liters: 30, cost: 45 })]
    render(<StatsScreen sessions={sessions} fuelEntries={fuelEntries} />)

    await user.click(screen.getByRole('button', { name: 'Combustível' }))

    expect(screen.getByText('30 L')).toBeInTheDocument()
  })
})
