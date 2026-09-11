import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { DEFAULT_CAR_ID, type ChargingSession, type FuelEntry } from '../../domain/types'
import { StatsScreen } from './StatsScreen'

function makeSession(overrides: Partial<ChargingSession>): ChargingSession {
  return {
    id: Math.random().toString(),
    carId: DEFAULT_CAR_ID,
    kind: 'electric',
    startAt: '2024-01-01T10:00:00.000Z',
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
    createdAt: '2024-01-01T10:00:00.000Z',
    updatedAt: '2024-01-01T10:00:00.000Z',
    ...overrides,
  }
}

function makeFuelEntry(overrides: Partial<FuelEntry>): FuelEntry {
  return {
    id: Math.random().toString(),
    carId: DEFAULT_CAR_ID,
    kind: 'fuel',
    startAt: '2024-01-01T10:00:00.000Z',
    liters: 30,
    cost: 45,
    odometerKm: null,
    location: null,
    notes: null,
    createdAt: '2024-01-01T10:00:00.000Z',
    updatedAt: '2024-01-01T10:00:00.000Z',
    ...overrides,
  }
}

describe('StatsScreen', () => {
  it('shows an empty state with no entries of any kind', () => {
    render(<StatsScreen sessions={[]} fuelEntries={[]} />)
    expect(screen.getByText(/Ainda não há registos/)).toBeInTheDocument()
  })

  it('shows the combined total by default', () => {
    const sessions = [makeSession({ energyKwh: 10, cost: 2 })]
    const fuelEntries = [makeFuelEntry({ cost: 45 })]
    render(<StatsScreen sessions={sessions} fuelEntries={fuelEntries} />)

    expect(screen.getByText('2')).toBeInTheDocument() // combined count
    expect(screen.getByText(/47,00/)).toBeInTheDocument() // combined cost
  })

  it('switches to the electric-only view', async () => {
    const user = userEvent.setup()
    const sessions = [makeSession({ energyKwh: 10, cost: 2 })]
    const fuelEntries = [makeFuelEntry({ cost: 45 })]
    render(<StatsScreen sessions={sessions} fuelEntries={fuelEntries} />)

    await user.click(screen.getByRole('button', { name: 'Elétrico' }))

    expect(screen.getByText('10 kWh')).toBeInTheDocument()
    expect(screen.queryByText('Combustível total')).not.toBeInTheDocument()
  })

  it('switches to the fuel-only view', async () => {
    const user = userEvent.setup()
    const sessions = [makeSession({ energyKwh: 10, cost: 2 })]
    const fuelEntries = [makeFuelEntry({ liters: 30, cost: 45 })]
    render(<StatsScreen sessions={sessions} fuelEntries={fuelEntries} />)

    await user.click(screen.getByRole('button', { name: 'Combustível' }))

    expect(screen.getByText('30 L')).toBeInTheDocument()
    expect(screen.queryByText('Energia total')).not.toBeInTheDocument()
  })

  it('shows cost per km in the total view when odometer readings allow it', () => {
    const sessions = [
      makeSession({ startAt: '2024-01-01T10:00:00.000Z', odometerKm: 1000, cost: 5 }),
    ]
    const fuelEntries = [
      makeFuelEntry({ startAt: '2024-01-10T10:00:00.000Z', odometerKm: 1500, cost: 45 }),
    ]
    render(<StatsScreen sessions={sessions} fuelEntries={fuelEntries} />)

    expect(screen.getByText('Custo médio por km')).toBeInTheDocument()
  })
})
